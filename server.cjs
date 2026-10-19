require('dotenv').config();
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

class Redis extends IORedis {
    constructor(...args) {
        super(...args);
        this.on('error', (err) => {
            if (err.code !== 'ECONNREFUSED') {
                console.error('[Redis] Error:', err.message);
            }
        });
    }
}
const pino = require('pino');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    downloadMediaMessage,
    Browsers,
    proto,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const messageCache = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of messageCache.entries()) {
        if (now - data.timestamp > 7200000) {
            messageCache.delete(id);
        }
    }
}, 600000);

const saveMessage = (key, message) => {
    if (key && key.id && message) {
        messageCache.set(key.id, { message, timestamp: Date.now() });
    }
};

const getMessage = async (key) => {
    if (key && key.id) {
        const data = messageCache.get(key.id);
        if (data && data.message) return data.message;

        try {
            const res = await pool.query('SELECT text, content FROM chat_messages WHERE id = $1', [key.id]);
            if (res.rows.length > 0) {
                const txt = res.rows[0].text || res.rows[0].content;
                if (txt) {
                    return { conversation: txt };
                }
            }
        } catch (e) {}
    }
    return proto.Message.fromObject({});
};


// Helper to handle worker import safely
let setupWorker;
try {
    const workerModule = require('./queue-worker');
    setupWorker = workerModule.setupWorker;
} catch (e) {
    console.warn('[System] Queue Worker module not found. Background processing disabled.');
    setupWorker = () => console.log('Worker placeholder active');
}



// --- CONFIGURATION ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL is not defined in .env');
}

// Global memory for active WhatsApp Sockets
const instancesMap = new Map();

// Instruction: Configure CORS policy for frontend and external REST API integrations
// Logic: Allows credentials, custom authorization headers, and third-party CRM requests across domain origins
app.use(cors({
    origin: (origin, callback) => {
        const allowed = [
            'https://ifastx.in', 
            'http://ifastx.in',
            'https://wa-api.ifastx.in',
            'http://localhost:3000', 
            'http://localhost:5173'
        ];
        if (!origin || allowed.includes(origin) || origin.endsWith('.ifastx.in')) {
            callback(null, true);
        } else {
            callback(null, true); 
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-API-Key', 'X-Role', 'X-Instance-Key', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());

// Disable caching for all API responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Increased limit to 150MB to support larger video uploads via base64
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Instruction: Serve /uploads with Cross-Origin headers, byte range, and direct download support
// Logic: Prevents media blocking and corruption when downloading or streaming chat images, audios, and videos
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    if (req.query.download === '1') {
        const fname = path.basename(req.path) || 'whatsapp_media';
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    }
    next();
}, express.static(uploadsDir));

// Database Pool
const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: false 
});

pool.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
        console.error('[Database] Pool Error:', err.message);
    }
});

// Immediate Connectivity & Permission Test
pool.connect(async (err, client, release) => {
    if (err) {
        if (err.code !== 'ECONNREFUSED') {
            console.error('[Database] Connection Error:', err.message);
        }
        return;
    }
    try {
        await client.query('SELECT 1 FROM instances LIMIT 1');
        console.log('[Database] Permission test passed: "instances" table is accessible.');
        
        // Create messages table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id VARCHAR(100) PRIMARY KEY,
                instance_id VARCHAR(50),
                remote_jid VARCHAR(50),
                from_me BOOLEAN DEFAULT FALSE,
                text TEXT,
                media_url TEXT,
                media_type VARCHAR(20),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[Database] chat_messages table verified.');

        // High-performance database indexes for instant chatbox loading
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_chat_messages_instance_remote_ts ON chat_messages(instance_id, remote_jid, timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_instance_unread ON chat_messages(instance_id, from_me, status);
                CREATE INDEX IF NOT EXISTS idx_chat_messages_instance_inbound ON chat_messages(instance_id, from_me, timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_chat_contacts_inst_jid ON chat_contacts(instance_id, jid);
            `);
            console.log('[Database] chat_messages query acceleration indexes verified.');
        } catch (idxErr) {
            console.warn('[Database] Index optimization notice:', idxErr.message);
        }

        // Verify message_logs has content column
        try {
            await client.query('ALTER TABLE instances ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;');
            console.log('[Database] Added ai_enabled column to instances');
        } catch (alterErr) {
            if (alterErr.code === '42701') {
                // column exists
            }
        }
        

        // Verify instances table columns
        const instanceColQueries = [
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'baileys'",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS meta_access_token TEXT",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS meta_phone_number_id VARCHAR(50)",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS meta_waba_id VARCHAR(50)",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS instance_key VARCHAR(100)",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS qr_code TEXT",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'gemini'",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_api_key TEXT",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'gemini-3.8-flash'",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_temperature NUMERIC DEFAULT 0.7",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_auto_reply_groups BOOLEAN DEFAULT FALSE",
            "ALTER TABLE instances ADD COLUMN IF NOT EXISTS ai_max_tokens INTEGER DEFAULT 1800"
        ];
        for (const colQuery of instanceColQueries) {
            try {
                await client.query(colQuery);
            } catch (e) {
                // Column already exists or handled
            }
        }

        // Verify users table AI columns
        const userColQueries = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_ai_prompt TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_ai_provider VARCHAR(50) DEFAULT 'gemini'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS default_ai_model VARCHAR(100) DEFAULT 'gemini-3.8-flash'"
        ];
        for (const colQuery of userColQueries) {
            try {
                await client.query(colQuery);
            } catch (e) {
                // Column already exists or handled
            }
        }
        try {
            await client.query("UPDATE instances SET instance_key = id WHERE instance_key IS NULL OR instance_key = ''");
            console.log('[Database] Added Meta and instance_key columns to instances');
        } catch (e) {
            console.warn('[Database] Instance Key Notice:', e.message);
        }

        try {
            await client.query('ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100);');
            await client.query('ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS content TEXT;');
            console.log('[Database] Verified campaign_id and content columns on message_logs');
        } catch (alterErr) {
            console.warn('[Database] message_logs column update notice:', alterErr.message);
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS scheduled_campaigns (
                id VARCHAR(100) PRIMARY KEY,
                user_id VARCHAR(50),
                instance_id VARCHAR(50),
                name VARCHAR(255),
                message TEXT,
                media_url TEXT,
                media_type VARCHAR(20),
                buttons_json TEXT,
                numbers TEXT,
                options TEXT,
                total_recipients INT DEFAULT 0,
                scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                executed_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'scheduled',
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[Database] scheduled_campaigns table verified.');

        // Create system_settings table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[Database] system_settings table verified.');
        try {
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,4) DEFAULT 0.00;');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);');
            console.log('[Database] Added wallet_balance and full_name columns to users');
        } catch (e) { }

        await client.query(`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                amount DECIMAL(10,4),
                type VARCHAR(20),
                description TEXT,
                message_number VARCHAR(50),
                message_id TEXT,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Instruction: Create and alter ai_automation_logs table
        // Logic: Ensures table and all columns exist in PostgreSQL database for AI auto-reply history tracking
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_automation_logs (
                id SERIAL PRIMARY KEY,
                instance_id VARCHAR(255) NOT NULL,
                instance_name VARCHAR(255),
                provider VARCHAR(50) DEFAULT 'baileys',
                remote_jid VARCHAR(255),
                user_prompt TEXT,
                ai_response TEXT,
                model_used VARCHAR(100),
                api_key_masked VARCHAR(100),
                status VARCHAR(50) DEFAULT 'success',
                latency_ms INT DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Ensure all columns exist on pre-existing database tables
        const aiLogColQueries = [
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS instance_name VARCHAR(255)",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'baileys'",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS remote_jid VARCHAR(255)",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS user_prompt TEXT",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS ai_response TEXT",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS model_used VARCHAR(100)",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS api_key_masked VARCHAR(100)",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'success'",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0",
            "ALTER TABLE ai_automation_logs ADD COLUMN IF NOT EXISTS error_message TEXT"
        ];
        for (const colQ of aiLogColQueries) {
            try {
                await client.query(colQ);
            } catch (colErr) { }
        }
        console.log('[Database] ai_automation_logs table and schema columns verified.');
        
        try {
            await client.query(`
                INSERT INTO system_settings (key, value) VALUES 
                    ('baileys_credit_cost', '1.00'), 
                    ('meta_template_credit_cost', '1.00'), 
                    ('meta_regular_credit_cost', '0.50'),
                    ('meta_utility_credit_cost', '0.50'),
                    ('meta_marketing_credit_cost', '1.00'),
                    ('meta_authentication_credit_cost', '0.40')
                ON CONFLICT (key) DO NOTHING;
            `);
        } catch(e) {}

    } catch (dbErr) {
        console.error('[Database] Permission test FAILED:', dbErr.message);
        console.error('[Database] ACTION REQUIRED: Run the GRANT commands in database.sql');
    } finally {
        release();
    }
});

// Redis & Queue
let outboundQueue;
let redisConnection;
try {
    redisConnection = new Redis(REDIS_URL, { 
        maxRetriesPerRequest: null,
        retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
        }
    });
    redisConnection.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') console.error('[Redis] Error:', err.message);
    });
    outboundQueue = new Queue('whatsapp-outbound', { connection: redisConnection });
    outboundQueue.on('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
            console.error('[Queue] Error:', err.message);
        }
    });
    console.log('[Redis] Outbound Messaging Queue Online');
} catch (e) {
    console.error('[Redis] Setup Error:', e.message);
}

// --- SYSTEM NOTIFICATIONS & CRON JOBS ---
const cron = require('node-cron');

async function sendSystemNotification(targetUserId, messageText, additionalNumbers = []) {
    try {
        if (!outboundQueue) {
            console.log('[System Notification] Queue offline, skipping.');
            return;
        }
        
        // Find an active superadmin instance to send the notification
        const sysRes = await pool.query(`
            SELECT i.id, i.user_id 
            FROM instances i 
            JOIN users u ON i.user_id = u.id 
            WHERE u.role = 'superadmin' AND i.status = 'open' 
            LIMIT 1
        `);
        
        if (sysRes.rows.length === 0) {
            console.log('[System Notification] No active superadmin instance found to send alert.');
            return;
        }
        
        const systemInstanceId = sysRes.rows[0].id;
        const systemUserId = sysRes.rows[0].user_id;

        // Get target user's mobile number
        const userRes = await pool.query('SELECT mobile FROM users WHERE id = $1', [targetUserId]);
        if (userRes.rows.length === 0) {
            console.log(`[System Notification] User ${targetUserId} not found.`);
            return;
        }
        const userMobile = userRes.rows[0].mobile;

        // Get target user's active instances' phone numbers
        const instRes = await pool.query("SELECT id, phone_number FROM instances WHERE user_id = $1 AND status = 'open' AND phone_number IS NOT NULL", [targetUserId]);
        
        const targetNumbers = new Set();
        if (userMobile) targetNumbers.add(userMobile);
        
        if (Array.isArray(additionalNumbers)) {
            additionalNumbers.forEach(n => {
                if (n && !String(n).startsWith('inst_')) targetNumbers.add(n);
            });
        }
        
        instRes.rows.forEach(row => {
            targetNumbers.add(row.phone_number);
        });

        console.log(`[System Notification] Sending to numbers:`, Array.from(targetNumbers));

        for (const number of targetNumbers) {
            if (!number) continue;
            const cleanNumber = String(number).replace(/\D/g, '');
            if (!cleanNumber) continue;

            await outboundQueue.add('send-message', {
                userId: systemUserId,
                instanceId: systemInstanceId,
                number: cleanNumber,
                message: messageText,
                options: { complianceMode: false }
            });
            console.log(`[System Notification] Queued message to ${cleanNumber}`);
        }
    } catch (err) {
        console.error('[System Notification Error]', err.message);
    }
}

// Daily Count Alert at 12:10 AM

cron.schedule('0 0 * * *', async () => {
    try {
        console.log('[Cron] Resetting daily limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_today = 0');
    } catch (err) {
        console.error('[Cron Error] Resetting daily limits:', err.message);
    }
}, { timezone: 'Asia/Kolkata' });

cron.schedule('0 0 1 * *', async () => {
    try {
        console.log('[Cron] Resetting monthly limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_this_month = 0');
    } catch (err) {}
}, {
    timezone: "Asia/Kolkata"
});

cron.schedule('0 0 1 1 *', async () => {
    try {
        console.log('[Cron] Resetting yearly limits...');
        await pool.query('UPDATE subscriptions SET messages_sent_this_year = 0');
    } catch (err) {}
});

cron.schedule('10 0 * * *', async () => {
    try {
        console.log('[Cron] Running daily count alert...');
        const usersRes = await pool.query('SELECT id FROM users');
        for (const user of usersRes.rows) {
            const countRes = await pool.query(`
                SELECT COUNT(*) FROM message_logs 
                WHERE user_id = $1 
                AND status != 'failed'
                AND created_at >= current_date - interval '1 day'
                AND created_at < current_date
            `, [user.id]);
            const count = parseInt(countRes.rows[0].count, 10);
            
            if (count > 0) {
                await sendSystemNotification(user.id, `📊 *Daily Usage Report*\n\nYou have sent ${count} messages yesterday.`);
            }
        }
    } catch (err) {
        console.error('[Cron Error] Daily Count Alert:', err.message);
    }
}, { timezone: 'Asia/Kolkata' });

// --- AUTHENTICATION MIDDLEWARE ---

const authenticate = async (req, res, next) => {
    let userId = req.headers['x-user-id'];
    let role = req.headers['x-role'];
    let apiKey = req.headers['x-api-key'] || req.headers['x-instance-key'] || req.headers['wa_api_key'] || req.headers['wa_instance_id'];

    // Support Bearer authorization token header
    if (!apiKey && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            apiKey = authHeader.substring(7).trim();
        } else {
            apiKey = authHeader.trim();
        }
    }

    // Support query parameters
    if (!apiKey) {
        apiKey = req.query?.access_token || req.query?.api_key || req.query?.apiKey || req.query?.wa_api_key || req.query?.wa_instance_id || req.query?.instance_key || req.query?.instanceKey || req.query?.insta_id || req.query?.instaId || req.query?.token;
    }

    // Support body parameters
    if (!apiKey && req.body) {
        apiKey = req.body.api_key || req.body.apiKey || req.body.wa_api_key || req.body.wa_instance_id || req.body.instance_key || req.body.instanceKey || req.body.insta_id || req.body.instaId || req.body.token;
    }

    if (!userId && req.query?.user_id) userId = req.query.user_id;
    if (!userId && req.body?.user_id) userId = req.body.user_id;

    // Special Case: Allow POST /api/users for signups or initial setup
    if (req.path === '/api/users' && req.method === 'POST') {
        req.user = { id: userId || 'anonymous', role: role || 'admin' };
        return next();
    }

    if (!userId && !apiKey) {
        return res.status(401).json({ error: 'Identification header or parameter (X-API-Key, X-Instance-Key, access_token, or Bearer token) missing' });
    }

    try {
        let userResult;
        let authInstance = null;

        if (userId) {
            userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        } else if (apiKey) {
            userResult = await pool.query('SELECT * FROM users WHERE api_key = $1', [apiKey]);
            
            // If key is not a user API key, check if it matches an instance ID, instance_key, or Meta IDs
            if (!userResult || userResult.rows.length === 0) {
                const instRes = await pool.query(
                    'SELECT * FROM instances WHERE id = $1 OR instance_key = $1 OR meta_phone_number_id = $1 OR meta_waba_id = $1 OR meta_access_token = $1', 
                    [apiKey]
                );
                if (instRes.rows.length > 0) {
                    authInstance = instRes.rows[0];
                    req.authInstanceId = authInstance.id;
                    userResult = await pool.query('SELECT * FROM users WHERE id = $1', [authInstance.user_id]);
                }
            }
        }

        if (userResult && userResult.rows.length > 0) {
            const dbUser = userResult.rows[0];
            const subResult = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [dbUser.id]);
            let subscription = subResult.rows[0] || null;
            
            if (subscription && subscription.status === 'active' && subscription.expiry_date && new Date(subscription.expiry_date) < new Date()) {
                subscription.status = 'expired';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['expired', subscription.user_id]).catch(() => {});
            } else if (subscription && subscription.status === 'expired' && (subscription.expiry_date === null || new Date(subscription.expiry_date) > new Date())) {
                subscription.status = 'active';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['active', subscription.user_id]).catch(() => {});
            }

            req.user = { 
                ...dbUser, 
                subscription: subscription 
            };
            if (req.user.id === 'u_super_9595') {
                req.user.role = 'superadmin';
            }
            if (authInstance) {
                req.authInstanceId = authInstance.id;
            }
        } else if (userId === 'u_super_9595') {
            req.user = { id: 'u_super_9595', role: 'superadmin' };
        } else {
            return res.status(403).json({ error: 'Invalid API Key or Instance Key provided.' });
        }
    } catch (e) {
        if (e.message && (e.message.includes('ECONNREFUSED') || e.message.includes('connection'))) {
            req.user = { id: userId || 'u_super_9595', role: role || 'superadmin' };
            return next();
        }
        console.error(`[Auth] User lookup failed:`, e);
        return res.status(500).json({ error: 'Internal Auth Failure: ' + e.message });
    }
    
    next();
};

// =========================================================================
// AI AUTO-REPLY SMART CHAT ENGINE (Autoresponder.io style)
// -------------------------------------------------------------------------
// Features:
// 1. Multi-Key Pool & Free-Tier Auto-Shift (shifts on 429/RESOURCE_EXHAUSTED)
// 2. Ultra-Fast Response Time (~300-800ms) with token-capping (180 tokens)
// 3. Round-Robin Key Load Distribution (multiplies Free Tier quotas)
// 4. Fallback from Instance Keys to User Profile Keys to Env Keys
// 5. Automatic Recovery from Cooldowns
// =========================================================================

// Parse any string, comma-separated, newline-separated, or JSON array of keys
function parseApiKeyList(rawKeyString) {
    if (!rawKeyString) return [];
    if (Array.isArray(rawKeyString)) {
        return rawKeyString.map(k => String(k).trim()).filter(k => k.length > 5);
    }
    if (typeof rawKeyString !== 'string') return [];
    const trimmed = rawKeyString.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map(k => String(k).trim()).filter(k => k.length > 5);
            }
        } catch (e) {}
    }
    return trimmed
        .split(/[\r\n,;]+/)
        .map(k => k.trim())
        .filter(k => k.length > 5);
}

function maskApiKey(key) {
    if (!key || typeof key !== 'string') return '***';
    if (key.length <= 10) return '***';
    return key.substring(0, 6) + '...' + key.slice(-4);
}

// In-Memory Key Health and Quota Tracker
const keyPoolHealth = new Map();

// Default AI model failover fallback sequence for Gemini and OpenAI engines
const GEMINI_MODEL_FALLBACKS = [
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

const OPENAI_MODEL_FALLBACKS = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-3.5-turbo'
];

// In-Memory Tracker to monitor active model and auto-shift model failovers per instance
const instanceActiveModelMap = new Map();

function isRateLimitOrQuotaExhausted(err) {
    if (!err) return false;
    const msg = (err.message || String(err)).toLowerCase();
    const status = err.status || err.statusCode || 0;
    return (
        status === 429 ||
        status === 403 ||
        msg.includes('429') ||
        msg.includes('resource_exhausted') ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('rate_limit_exceeded') ||
        msg.includes('insufficient_quota') ||
        msg.includes('too many requests') ||
        msg.includes('per minute') ||
        msg.includes('per day') ||
        msg.includes('exceeded your current quota') ||
        msg.includes('free tier') ||
        msg.includes('overloaded')
    );
}

// Helper function to insert AI interaction logs into DB and emit real-time Socket.IO updates
async function logAiAutomationEvent({ instanceId, instanceName, provider, remoteJid, userPrompt, aiResponse, modelUsed, apiKeyMasked, status, latencyMs, errorMessage }) {
    try {
        // Query to insert AI execution record into PostgreSQL ai_automation_logs
        const res = await pool.query(
            `INSERT INTO ai_automation_logs 
            (instance_id, instance_name, provider, remote_jid, user_prompt, ai_response, model_used, api_key_masked, status, latency_ms, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                instanceId || 'unknown',
                instanceName || 'WhatsApp Instance',
                provider || 'baileys',
                remoteJid || 'system',
                userPrompt || '',
                aiResponse || '',
                modelUsed || 'gemini-3.8-flash',
                apiKeyMasked || '***',
                status || 'success',
                latencyMs || 0,
                errorMessage || ''
            ]
        );
        // Emit socket event so UI updates live instantly
        if (res.rows.length > 0 && io) {
            io.emit('ai_log_created', res.rows[0]);
        }
    } catch (e) {
        console.error('[AI Log DB Error]', e.message);
    }
}

// Records key cooldown / failover status in key pool memory tracker
function recordKeyCooldown(apiKey, errorMsg) {
    const cleanKey = String(apiKey || '').trim();
    if (!cleanKey) return;

    const existing = keyPoolHealth.get(cleanKey) || {
        cooldownUntil: 0,
        failCount: 0,
        successCount: 0,
        lastError: '',
        lastLatencyMs: 0,
        lastUsed: 0
    };
    const msg = (errorMsg || '').toLowerCase();
    const isDaily = msg.includes('day') || msg.includes('daily');
    const isInvalidKey = msg.includes('api_key_invalid') || msg.includes('invalid api key') || msg.includes('401') || msg.includes('403');
    
    // Cooldown duration: 24h for invalid key, 15m for daily quota, 60s for RPM burst limits
    let cooldownMs = 60 * 1000;
    if (isInvalidKey) {
        cooldownMs = 24 * 60 * 60 * 1000;
    } else if (isDaily) {
        cooldownMs = 15 * 60 * 1000;
    }

    existing.cooldownUntil = Date.now() + cooldownMs;
    existing.failCount = (existing.failCount || 0) + 1;
    existing.lastError = errorMsg || 'Quota or Rate Limit reached';
    keyPoolHealth.set(cleanKey, existing);

    // Broadcast key status update to connected UI instances
    if (io) {
        io.emit('key_pool_updated', {
            apiKeyMasked: maskApiKey(cleanKey),
            status: 'cooldown',
            cooldownUntil: existing.cooldownUntil,
            error: existing.lastError
        });
    }
}

// Records successful API key usage in key pool memory tracker
function recordKeySuccess(apiKey, latencyMs) {
    const cleanKey = String(apiKey || '').trim();
    if (!cleanKey) return;

    const existing = keyPoolHealth.get(cleanKey) || {
        cooldownUntil: 0,
        failCount: 0,
        successCount: 0,
        lastError: '',
        lastLatencyMs: 0,
        lastUsed: 0
    };
    existing.cooldownUntil = 0;
    existing.successCount = (existing.successCount || 0) + 1;
    existing.lastUsed = Date.now();
    existing.lastLatencyMs = latencyMs || existing.lastLatencyMs || 0;
    existing.lastError = '';
    keyPoolHealth.set(cleanKey, existing);

    // Broadcast key status update to connected UI instances
    if (io) {
        io.emit('key_pool_updated', {
            apiKeyMasked: maskApiKey(cleanKey),
            status: 'active',
            latencyMs: existing.lastLatencyMs
        });
    }
}

// Execute single AI call with flexible token capping and fast failover
async function executeSingleAiCall({ provider, apiKey, model, systemPrompt, historyRows = [], incomingText, temperature, maxTokens }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const effectiveMaxTokens = (maxTokens && Number(maxTokens) > 0) ? Number(maxTokens) : 1800;
    const basePrompt = (systemPrompt && systemPrompt.trim()) 
        ? systemPrompt 
        : "You are a professional, helpful WhatsApp customer assistant for our business. Answer inquiries politely, accurately, and thoroughly.";

    try {
        if (provider === 'openai') {
            const chosenModel = model || 'gpt-4o-mini';
            const messages = [{ 
                role: 'system', 
                content: basePrompt 
            }];
            for (const row of historyRows) {
                if (row.text) {
                    messages.push({
                        role: row.from_me ? 'assistant' : 'user',
                        content: row.text
                    });
                }
            }
            const lastRow = historyRows[historyRows.length - 1];
            if (!lastRow || lastRow.from_me || lastRow.text !== incomingText) {
                messages.push({ role: 'user', content: incomingText });
            }

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: chosenModel,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: effectiveMaxTokens
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                const errMsg = errJson.error?.message || `HTTP ${res.status} ${res.statusText}`;
                const err = new Error(errMsg);
                err.status = res.status;
                throw err;
            }

            const data = await res.json();
            return data.choices?.[0]?.message?.content || null;
        } else {
            // Google Gemini (Fast REST Endpoint with user-customizable maxOutputTokens)
            const chosenModel = model || 'gemini-3.8-flash';
            const historySummary = historyRows.slice(-4).map(r => (r.from_me ? "Assistant: " : "Customer: ") + (r.text || '')).join('\n');
            const userPromptText = historySummary 
                ? `Recent chat:\n${historySummary}\nCustomer: ${incomingText}\nAssistant:` 
                : incomingText;

            const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:generateContent?key=${apiKey}`;
            const restRes = await fetch(restUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: basePrompt }]
                    },
                    contents: [{
                        role: 'user',
                        parts: [{ text: userPromptText }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: effectiveMaxTokens
                    }
                })
            });

            if (restRes.ok) {
                const restData = await restRes.json();
                const candidate = restData.candidates?.[0];
                const parts = candidate?.content?.parts;
                if (Array.isArray(parts) && parts.length > 0) {
                    const fullText = parts.map(p => p.text || '').join('').trim();
                    if (fullText) return fullText;
                }
            } else {
                const errJson = await restRes.json().catch(() => ({}));
                const errMsg = errJson.error?.message || `HTTP ${restRes.status} ${restRes.statusText}`;
                const err = new Error(errMsg);
                err.status = restRes.status;
                throw err;
            }

            // Fallback to GoogleGenAI SDK if empty
            const ai = new GoogleGenAI({ apiKey });
            const resp = await ai.models.generateContent({
                model: chosenModel,
                contents: `${basePrompt}\n\nCustomer: ${incomingText}\nAssistant:`,
                config: {
                    maxOutputTokens: effectiveMaxTokens,
                    temperature: temperature
                }
            });
            return resp.text;
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

async function generateAiChatReply({ instanceId, from, incomingText }) {
    // Validate input text content
    if (!incomingText || typeof incomingText !== 'string' || !incomingText.trim()) {
        return null;
    }
    try {
        // Query instance and user configuration from DB
        const instRes = await pool.query(`
            SELECT i.id, i.name, i.provider, i.user_id, i.ai_enabled, i.ai_provider, i.ai_api_key, i.ai_model, 
                   i.ai_system_prompt, i.ai_temperature, i.ai_auto_reply_groups, i.ai_max_tokens,
                   u.gemini_api_key, u.openai_api_key, u.default_ai_prompt, 
                   u.default_ai_provider, u.default_ai_model
            FROM instances i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = $1
            LIMIT 1
        `, [instanceId]);

        if (instRes.rows.length === 0) return null;
        const inst = instRes.rows[0];

        // Check if AI auto-responder is toggled ON for this instance
        if (!inst.ai_enabled) return null;

        // Skip broadcast messages and status updates
        if (from === 'status@broadcast') return null;

        // Skip group chats if auto-reply for groups is disabled
        if (from && from.endsWith('@g.us') && !inst.ai_auto_reply_groups) {
            return null;
        }

        const instanceName = inst.name || 'WhatsApp Instance';
        const instanceCategory = inst.provider === 'meta' ? 'meta' : 'baileys';
        const provider = (inst.ai_provider || inst.default_ai_provider || 'gemini').toLowerCase();

        // Gather all candidate API keys from instance settings, user profile, and env (trimmed & deduplicated)
        const instanceKeys = parseApiKeyList(inst.ai_api_key);
        const userKeys = parseApiKeyList(provider === 'openai' ? inst.openai_api_key : inst.gemini_api_key);
        const envKeys = parseApiKeyList(provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY);

        const rawAllKeys = [...instanceKeys, ...userKeys, ...envKeys];
        const allKeys = Array.from(new Set(rawAllKeys.map(k => String(k).trim()).filter(k => k.length > 5)));

        if (allKeys.length === 0) {
            console.warn(`[AI Auto-Reply] Notice: AI enabled for instance ${instanceId} but no ${provider.toUpperCase()} API key configured.`);
            await logAiAutomationEvent({
                instanceId,
                instanceName,
                provider: instanceCategory,
                remoteJid: from,
                userPrompt: incomingText,
                aiResponse: '',
                modelUsed: inst.ai_model || 'gemini-3.8-flash',
                apiKeyMasked: 'None Configured',
                status: 'failed',
                latencyMs: 0,
                errorMessage: `No API key configured for ${provider.toUpperCase()} engine`
            });
            return null;
        }

        // Prioritize active healthy keys first, followed by keys in cooldown
        const now = Date.now();
        const availableKeys = allKeys.filter(k => {
            const h = keyPoolHealth.get(k);
            return !h || !h.cooldownUntil || h.cooldownUntil <= now;
        }).sort((a, b) => {
            const aUsed = (keyPoolHealth.get(a)?.lastUsed) || 0;
            const bUsed = (keyPoolHealth.get(b)?.lastUsed) || 0;
            return aUsed - bUsed;
        });

        const cooldownKeys = allKeys.filter(k => {
            const h = keyPoolHealth.get(k);
            return h && h.cooldownUntil && h.cooldownUntil > now;
        }).sort((a, b) => {
            const aWait = (keyPoolHealth.get(a)?.cooldownUntil) || 0;
            const bWait = (keyPoolHealth.get(b)?.cooldownUntil) || 0;
            return aWait - bWait;
        });

        const prioritizedKeys = [...availableKeys, ...cooldownKeys];

        // Determine primary model and construct fallback model sequence
        let primaryModel = inst.ai_model || inst.default_ai_model;
        if (!primaryModel) {
            primaryModel = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash';
        }

        const modelFallbackChain = provider === 'openai' ? OPENAI_MODEL_FALLBACKS : GEMINI_MODEL_FALLBACKS;
        const candidateModels = Array.from(new Set([primaryModel, ...modelFallbackChain]));

        const defaultPrompt = "You are a professional, polite, and helpful WhatsApp customer assistant for our business. Answer customer inquiries politely, thoroughly, and accurately. Do not include prefixes like 'Assistant:' or 'Bot:'.";
        const systemPrompt = (inst.ai_system_prompt && inst.ai_system_prompt.trim()) || 
                             (inst.default_ai_prompt && inst.default_ai_prompt.trim()) || 
                             defaultPrompt;

        const temperature = inst.ai_temperature !== null && inst.ai_temperature !== undefined 
            ? parseFloat(inst.ai_temperature) 
            : 0.7;

        const maxTokens = (inst.ai_max_tokens && Number(inst.ai_max_tokens) > 0) 
            ? Number(inst.ai_max_tokens) 
            : 1800;

        // Fetch recent 4 chat messages for conversation context
        const historyRes = await pool.query(
            'SELECT from_me, text FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 ORDER BY timestamp DESC LIMIT 4',
            [instanceId, from]
        );
        const historyRows = (historyRes.rows || []).reverse();

        console.log(`[AI Auto-Reply] Generating reply for ${from} on instance ${instanceId} (${instanceCategory}) using ${provider} (${primaryModel}) with ${prioritizedKeys.length} key(s) in pool`);

        let replyText = null;

        // Loop through candidate keys with dual API key and Model failover
        keyLoop: for (let i = 0; i < prioritizedKeys.length; i++) {
            const currentKey = prioritizedKeys[i];
            const masked = maskApiKey(currentKey);

            // Loop through candidate models for current API key
            for (let m = 0; m < candidateModels.length; m++) {
                const currentModel = candidateModels[m];

                try {
                    const startTime = Date.now();
                    replyText = await executeSingleAiCall({
                        provider,
                        apiKey: currentKey,
                        model: currentModel,
                        systemPrompt,
                        historyRows,
                        incomingText,
                        temperature,
                        maxTokens
                    });

                    if (replyText && replyText.trim()) {
                        const elapsed = Date.now() - startTime;
                        recordKeySuccess(currentKey, elapsed);

                        // If auto model failover occurred, update active model tracker & emit socket update
                        const isShiftedModel = currentModel !== primaryModel;
                        if (isShiftedModel) {
                            instanceActiveModelMap.set(String(instanceId), {
                                activeModel: currentModel,
                                primaryModel: primaryModel,
                                isShifted: true,
                                shiftReason: `Auto-shifted to ${currentModel} due to tier limit on ${primaryModel}`,
                                shiftTimestamp: Date.now()
                            });
                            if (io) {
                                io.emit('model_failover_updated', {
                                    instanceId,
                                    activeModel: currentModel,
                                    primaryModel: primaryModel,
                                    isShifted: true
                                });
                            }
                        } else {
                            // Primary model succeeded, clear any previous failover shift
                            instanceActiveModelMap.delete(String(instanceId));
                        }

                        console.log(`[AI Auto-Reply] Success in ${elapsed}ms using key ${masked} with model ${currentModel} (Key ${i+1}/${prioritizedKeys.length})`);

                        // Log successful AI interaction into ai_automation_logs DB
                        await logAiAutomationEvent({
                            instanceId,
                            instanceName,
                            provider: instanceCategory,
                            remoteJid: from,
                            userPrompt: incomingText,
                            aiResponse: replyText.replace(/^(assistant|bot|ai):\s*/i, '').trim(),
                            modelUsed: currentModel,
                            apiKeyMasked: masked,
                            status: isShiftedModel ? 'model_failover' : 'success',
                            latencyMs: elapsed,
                            errorMessage: isShiftedModel ? `Model failover triggered: ${primaryModel} -> ${currentModel}` : ''
                        });

                        break keyLoop;
                    }
                } catch (err) {
                    const isLimit = isRateLimitOrQuotaExhausted(err);

                    // If more fallback models exist for current key, failover to next model
                    if (m < candidateModels.length - 1 && isLimit) {
                        console.warn(`[AI Model Failover] Key ${masked} hit limit on ${currentModel} (${err.message}). Auto-switching to fallback model ${candidateModels[m + 1]}...`);
                        await logAiAutomationEvent({
                            instanceId,
                            instanceName,
                            provider: instanceCategory,
                            remoteJid: from,
                            userPrompt: incomingText,
                            aiResponse: '',
                            modelUsed: currentModel,
                            apiKeyMasked: masked,
                            status: 'model_failover',
                            latencyMs: 0,
                            errorMessage: `Model ${currentModel} limit: ${err.message}. Auto-switching to ${candidateModels[m + 1]}`
                        });
                        continue; // Try next model in loop
                    }

                    // Record key cooldown if all models for key failed
                    recordKeyCooldown(currentKey, err.message);

                    // Log failed key attempt into DB logs
                    await logAiAutomationEvent({
                        instanceId,
                        instanceName,
                        provider: instanceCategory,
                        remoteJid: from,
                        userPrompt: incomingText,
                        aiResponse: '',
                        modelUsed: currentModel,
                        apiKeyMasked: masked,
                        status: isLimit ? 'rate_limited' : 'failed',
                        latencyMs: 0,
                        errorMessage: err.message || 'Key & Model failover triggered'
                    });

                    break; // Move to next API key
                }
            }
        }

        if (!replyText || !replyText.trim()) return null;

        // Strip unwanted leading prefixes
        replyText = replyText.replace(/^(assistant|bot|ai):\s*/i, '').trim();
        return replyText;
    } catch (err) {
        console.error('[AI Auto-Reply Error]', err.message);
        return null;
    }
}

// --- WHATSAPP ENGINE ---
const offlineAlerts = new Map();

async function connectToWhatsApp(instanceId) {
    console.log(`[DEBUG] connectToWhatsApp called for ${instanceId}`);
    try {
        const sessionDir = path.join(__dirname, 'sessions', instanceId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        console.log(`[DEBUG] Fetching auth state for ${instanceId}...`);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        console.log(`[DEBUG] Fetching latest Baileys version for ${instanceId}...`);
        const { version } = await fetchLatestBaileysVersion();
        console.log(`[DEBUG] Baileys version for ${instanceId}:`, version);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Desktop'),
                        agent: process.env.PROXY_URL ? 
                (process.env.PROXY_URL.startsWith('socks') ? 
                    new (require('socks-proxy-agent').SocksProxyAgent)(process.env.PROXY_URL) : 
                    new (require('https-proxy-agent').HttpsProxyAgent)(process.env.PROXY_URL)
                ) : new (require('https')).Agent({ 
                family: 4,
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2',
                ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384'
            }),
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 250,
            getMessage,
            options: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://web.whatsapp.com'
                }
            }
        });

        console.log(`[DEBUG] Socket created for ${instanceId}`);
        instancesMap.set(instanceId, { sock, status: 'connecting', qr: null, phone: null });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            console.log(`[Instance ${instanceId}] Connection update:`, { connection, qr: qr ? 'yes' : 'no', error: lastDisconnect?.error?.message });

            if (qr) {
                instancesMap.set(instanceId, { ...instancesMap.get(instanceId), qr, status: 'qr_required' });
                await pool.query('UPDATE instances SET status = $1, qr_code = $2 WHERE id = $3', ['qr_required', qr, instanceId]).catch(e => console.error('QR Update Error:', e.message));
                io.emit('qr', { instanceId, qr });
                io.emit('status', { instanceId, status: 'qr', qr });
                io.emit('instances_updated', { instanceId });
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                // Only require re-scanning QR (by deleting session) if explicitly logged out (401).
                // Do not delete session on badSession (500) or other errors, as they often reconnect successfully.
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                const instanceData = instancesMap.get(instanceId);
                const phone = instanceData?.phone || instanceId;

                io.emit('status', { instanceId, status: shouldReconnect ? 'connecting' : 'closed', phoneNumber: phone });
                io.emit('instances_updated', { instanceId });

                if (!shouldReconnect) {
                    instancesMap.delete(instanceId);
                    await pool.query('UPDATE instances SET status = $1, qr_code = NULL, phone_number = NULL WHERE id = $2 RETURNING user_id', ['closed', instanceId])
                        .then(res => {
                            if (res.rows.length > 0) {
                                const uid = res.rows[0].user_id;
                                const reason = statusCode === DisconnectReason.badSession ? 'due to a corrupted session' : 'by the user';
                                sendSystemNotification(uid, `🚨 *Instance Logged Out*\n\nYour WhatsApp instance (${phone}) has been logged out ${reason}. Please re-login to resume services.`, [phone]);
                            }
                        })
                        .catch(() => {});
                    try {
                        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                    } catch (fsErr) {
                        console.error('Session Dir Remove Error:', fsErr.message);
                    }
                } else {
                    const now = Date.now();
                    const lastAlert = offlineAlerts.get(instanceId) || 0;
                    // Only send offline alert once every 1 hour (3600000 ms) per instance
                    if (now - lastAlert > 3600000) {
                        offlineAlerts.set(instanceId, now);
                        pool.query('SELECT user_id FROM instances WHERE id = $1', [instanceId]).then(res => {
                            if (res.rows.length > 0) {
                                const uid = res.rows[0].user_id;
                                sendSystemNotification(uid, `⚠️ *Instance Offline*\n\nYour WhatsApp instance (${phone}) is currently offline or disconnected. We are attempting to reconnect.`, [phone]);
                            }
                        }).catch(() => {});
                    }
                    setTimeout(() => connectToWhatsApp(instanceId), 5000);
                }
            } else if (connection === 'open') {
                // We intentionally do NOT delete offlineAlerts here to prevent spam if the connection is flapping
                const phone = sock.user && sock.user.id ? sock.user.id.split(':')[0] : instanceId;
                instancesMap.set(instanceId, { sock, status: 'open', qr: null, phone });
                await pool.query('UPDATE instances SET status = $1, phone_number = $2, qr_code = NULL WHERE id = $3', ['open', phone, instanceId]).catch(e => console.error('Open State Update Error:', e.message));
                console.log(`[Instance ${instanceId}] Connected as ${phone}`);
                io.emit('status', { instanceId, status: 'open', phoneNumber: phone });
                io.emit('instances_updated', { instanceId });

                // Synchronize Group Names in Background for accurate group identification
                if (sock.groupFetchAllParticipating) {
                    sock.groupFetchAllParticipating().then(async (groups) => {
                        if (groups && typeof groups === 'object') {
                            for (const [gid, gdata] of Object.entries(groups)) {
                                if (gdata && gdata.subject) {
                                    await pool.query(
                                        'INSERT INTO chat_contacts (instance_id, jid, group_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET group_name = EXCLUDED.group_name',
                                        [instanceId, gid, gdata.subject]
                                    ).catch(() => {});
                                }
                            }
                            console.log(`[Instance ${instanceId}] Synced ${Object.keys(groups).length} WhatsApp group names`);
                        }
                    }).catch(() => {});
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // --- CONTACTS AND GROUPS METADATA SYNC ---
        // Instruction: Synchronize address book contacts, group names, and chat metadata on connect & updates
        // Logic: Stores contact push names, saved names, and group subjects into chat_contacts so chat displays real names instead of raw IDs
        sock.ev.on('contacts.upsert', async (contacts) => {
            try {
                for (const c of contacts) {
                    const name = c.name || c.notify || c.verifiedName;
                    if (name && c.id) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = EXCLUDED.push_name',
                            [instanceId, c.id, name]
                        ).catch(() => {});
                    }
                }
            } catch (e) {}
        });

        // Instruction: Capture incremental contact name changes
        // Logic: Updates chat_contacts when a user updates their WhatsApp profile name or phone contact syncs
        sock.ev.on('contacts.update', async (updates) => {
            try {
                for (const c of updates) {
                    const name = c.name || c.notify || c.verifiedName;
                    if (name && c.id) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = EXCLUDED.push_name',
                            [instanceId, c.id, name]
                        ).catch(() => {});
                    }
                }
            } catch (e) {}
        });

        // Instruction: Capture group subjects on group settings or title update
        // Logic: Updates group_name in chat_contacts so group chats display their subject title
        sock.ev.on('groups.update', async (groupUpdates) => {
            try {
                for (const g of groupUpdates) {
                    if (g.id && g.subject) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, group_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET group_name = EXCLUDED.group_name',
                            [instanceId, g.id, g.subject]
                        ).catch(() => {});
                    }
                }
            } catch (e) {}
        });

        // Instruction: Capture chats, contacts, and historical messages on initial connection history sync
        // Logic: Baileys emits messaging-history.set on first connection; extracts all contact names, group subjects, and past message history immediately so sent & received chats appear right away
        sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
            try {
                if (contacts && Array.isArray(contacts)) {
                    for (const c of contacts) {
                        const name = c.name || c.notify || c.verifiedName;
                        if (name && c.id) {
                            const cleanJid = (c.id.includes(':') && !c.id.endsWith('@g.us')) ? `${c.id.split('@')[0].split(':')[0]}@${c.id.split('@')[1] || 's.whatsapp.net'}` : c.id;
                            await pool.query(
                                'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = EXCLUDED.push_name',
                                [instanceId, cleanJid, name]
                            ).catch(() => {});
                        }
                    }
                }
                if (chats && Array.isArray(chats)) {
                    for (const ch of chats) {
                        if (ch.id && ch.name) {
                            const isGroup = ch.id.endsWith('@g.us');
                            const col = isGroup ? 'group_name' : 'push_name';
                            const cleanJid = (ch.id.includes(':') && !isGroup) ? `${ch.id.split('@')[0].split(':')[0]}@${ch.id.split('@')[1] || 's.whatsapp.net'}` : ch.id;
                            await pool.query(
                                `INSERT INTO chat_contacts (instance_id, jid, ${col}) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET ${col} = EXCLUDED.${col}`,
                                [instanceId, cleanJid, ch.name]
                            ).catch(() => {});
                        }
                    }
                }
                if (messages && Array.isArray(messages)) {
                    for (const msg of messages) {
                        if (!msg || !msg.message) continue;
                        saveMessage(msg.key, msg.message);
                        let from = msg.key.remoteJid;
                        if (!from || from === 'status@broadcast') continue;
                        if (from.includes(':') && !from.endsWith('@g.us')) {
                            const userPart = from.split('@')[0].split(':')[0];
                            const domain = from.split('@')[1] || 's.whatsapp.net';
                            from = `${userPart}@${domain}`;
                        }
                        const fromMe = Boolean(msg.key.fromMe);
                        const mContent = msg.message?.ephemeralMessage?.message || 
                                         msg.message?.viewOnceMessage?.message || 
                                         msg.message?.viewOnceMessageV2?.message || 
                                         msg.message?.documentWithCaptionMessage?.message || 
                                         msg.message;
                        const text = mContent?.conversation || 
                                     mContent?.extendedTextMessage?.text || 
                                     mContent?.imageMessage?.caption || 
                                     mContent?.videoMessage?.caption || 
                                     mContent?.documentMessage?.caption || '';
                        let rawTs = msg.messageTimestamp;
                        let tsMillis = Date.now();
                        if (typeof rawTs === 'object' && rawTs !== null) {
                            const low = rawTs.low !== undefined ? rawTs.low : Number(rawTs.toString());
                            tsMillis = (!isNaN(low) && low > 0) ? (low < 10000000000 ? low * 1000 : low) : Date.now();
                        } else if (typeof rawTs === 'number') {
                            tsMillis = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
                        }
                        const parsedDate = new Date(tsMillis);
                        await pool.query(
                            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                            [msg.key.id, instanceId, from, fromMe, text, parsedDate, fromMe ? 'sent' : 'delivered']
                        ).catch(() => {});
                    }
                }
            } catch (e) {}
        });

        // Instruction: Listen for new chat creation or subject assignment
        // Logic: Ensures newly created groups or direct chats have their names recorded immediately
        sock.ev.on('chats.upsert', async (newChats) => {
            try {
                for (const ch of newChats) {
                    if (ch.id && ch.name) {
                        const isGroup = ch.id.endsWith('@g.us');
                        const col = isGroup ? 'group_name' : 'push_name';
                        await pool.query(
                            `INSERT INTO chat_contacts (instance_id, jid, ${col}) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET ${col} = EXCLUDED.${col}`,
                            [instanceId, ch.id, ch.name]
                        ).catch(() => {});
                    }
                }
            } catch (e) {}
        });

        // --- MESSAGE STATUS UPDATES (Ticks) ---
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update.status) {
                    const statusMap = {
                        [proto.WebMessageInfo.Status.PENDING]: 'sent',
                        [proto.WebMessageInfo.Status.SERVER_ACK]: 'sent',
                        [proto.WebMessageInfo.Status.DELIVERY_ACK]: 'delivered',
                        [proto.WebMessageInfo.Status.READ]: 'read',
                        [proto.WebMessageInfo.Status.PLAYED]: 'read'
                    };
                    const status = statusMap[update.update.status];
                    if (status) {
                        try {
                            await pool.query('UPDATE chat_messages SET status = $1 WHERE id = $2', [status, update.key.id]);
                            io.emit('message_status', {
                                instanceId,
                                msgId: update.key.id,
                                status,
                                remoteJid: update.key.remoteJid
                            });
                        } catch (err) {
                            console.error('Message Status Update Error:', err.message);
                        }
                    }
                }
            }
        });

        // --- PRESENCE UPDATES (Typing / Online) ---
        sock.ev.on('presence.update', (update) => {
            const { id, presences } = update;
            // presences is a map of user JID -> { lastKnownPresence: 'available' | 'unavailable' | 'composing' | 'recording' }
            if (presences) {
                Object.keys(presences).forEach(jid => {
                    const presence = presences[jid];
                    io.emit('presence_update', {
                        instanceId,
                        remoteJid: id, // The chat JID (could be group or user)
                        userJid: jid,  // The specific user (same as remoteJid for DM)
                        status: presence.lastKnownPresence
                    });
                });
            }
        });

        // --- AUTO RESPONDER & CHAT LISTENER ---
        // Logic: Listen for incoming and outgoing messages (both notify and append from phone), saving binary media to uploads/
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify' && m.type !== 'append') return;
            const msgsList = m.messages || [];
            
            for (const msg of msgsList) {
                if (!msg || !msg.message) continue;

                saveMessage(msg.key, msg.message);

                let from = msg.key.remoteJid;
                if (!from || from === 'status@broadcast') continue;

                // Instruction: Normalize multi-device JID colon suffix (e.g. 919876543210:0@s.whatsapp.net -> 919876543210@s.whatsapp.net)
                // Logic: Phone-sent messages in Baileys contain device suffixes; cleaning them ensures all sent and received messages attach to the same contact session
                if (from.includes(':') && !from.endsWith('@g.us')) {
                    const userPart = from.split('@')[0].split(':')[0];
                    const domain = from.split('@')[1] || 's.whatsapp.net';
                    from = `${userPart}@${domain}`;
                }

                const fromMe = Boolean(msg.key.fromMe);
                const pushName = msg.pushName;
                
                // Capture Metadata (PushName / Group Name)
                try {
                    if (from.endsWith('@g.us')) {
                        // Check if we need to fetch group name
                        const existing = await pool.query('SELECT group_name FROM chat_contacts WHERE instance_id = $1 AND jid = $2', [instanceId, from]);
                        if (existing.rows.length === 0 || !existing.rows[0].group_name) {
                            const meta = await sock.groupMetadata(from);
                            if (meta && meta.subject) {
                                await pool.query(
                                    'INSERT INTO chat_contacts (instance_id, jid, group_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET group_name = $3',
                                    [instanceId, from, meta.subject]
                                );
                            }
                        }
                    } else if (pushName && !fromMe) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = $3',
                            [instanceId, from, pushName]
                        );
                    }
                } catch (metaErr) {
                    // Silent fail for metadata fetch to not block message processing
                }
                
                // Instruction: Unwrap nested message structures (ephemeral, view-once, document-with-caption)
                // Logic: WhatsApp wraps messages in ephemeral/viewOnce layers; unwrapping gets to the actual conversation or media payload
                const mContent = msg.message?.ephemeralMessage?.message || 
                                 msg.message?.viewOnceMessage?.message || 
                                 msg.message?.viewOnceMessageV2?.message || 
                                 msg.message?.documentWithCaptionMessage?.message || 
                                 msg.message;

                // Extract Text Content from all standard and interactive fields
                let text = mContent?.conversation || 
                           mContent?.extendedTextMessage?.text || 
                           mContent?.imageMessage?.caption || 
                           mContent?.videoMessage?.caption || 
                           mContent?.documentMessage?.caption || 
                           mContent?.buttonsResponseMessage?.selectedDisplayText || 
                           mContent?.listResponseMessage?.title || '';

                let mediaType = null;

                if (mContent?.interactiveResponseMessage?.nativeFlowResponseMessage) {
                    try {
                        const rawParams = mContent.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
                        const params = typeof rawParams === 'string' ? JSON.parse(rawParams) : rawParams;
                        let flowSummary = '📋 [Flow Response Received]\n';
                        if (typeof params === 'object' && params !== null) {
                            Object.entries(params).forEach(([k, v]) => {
                                if (k !== 'flow_token') {
                                    const cleanKey = k.replace(/screen_\d+_/i, '').replace(/_\d+$/, '').replace(/_/g, ' ');
                                    const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                                    flowSummary += `• ${cleanKey}: ${valStr}\n`;
                                }
                            });
                            if (params.flow_token) {
                                flowSummary += `\n(Token: ${params.flow_token})`;
                            }
                            text = flowSummary.trim();
                        } else {
                            text = params.id || rawParams || text;
                        }
                        mediaType = 'flow_response';
                    } catch (e) {
                        text = mContent.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson || text;
                        mediaType = 'flow_response';
                    }
                }
                
                // Instruction: Extract binary media and save with correct extension to uploads/
                // Logic: Accurately checks mimetype so voice notes are saved as .ogg (not .mp3) and images/videos/docs maintain their true format without corruption
                let mediaUrl = null;

                try {
                    if (mContent?.imageMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const mime = mContent.imageMessage.mimetype || 'image/jpeg';
                        let ext = mime.split('/')[1]?.split(';')[0] || 'jpg';
                        if (ext === 'jpeg') ext = 'jpg';
                        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        mediaType = 'image';
                    } else if (mContent?.videoMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const isGif = Boolean(mContent.videoMessage.gifPlayback);
                        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
                        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        mediaType = isGif ? 'gif' : 'video';
                    } else if (mContent?.audioMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const isPtt = Boolean(mContent.audioMessage.ptt);
                        const mime = (mContent.audioMessage.mimetype || '').toLowerCase();
                        let ext = 'ogg';
                        if (mime.includes('mp4') || mime.includes('m4a')) ext = 'm4a';
                        else if (mime.includes('opus') || mime.includes('ogg')) ext = 'ogg';
                        else if (mime.includes('mpeg') || mime.includes('mp3')) ext = 'mp3';
                        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        mediaType = isPtt ? 'voice' : 'audio';
                    } else if (mContent?.documentMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const origName = mContent.documentMessage.fileName || 'document.pdf';
                        let ext = path.extname(origName) || '.pdf';
                        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
                        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        mediaType = 'document';
                    } else if (mContent?.stickerMessage) {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });
                        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
                        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        mediaType = 'image';
                    }
                } catch (mediaErr) {
                    console.error('[Media Download Error]', mediaErr.message);
                }

                // Extract Quoted Message context
                let quotedMsgId = null;
                let quotedMsgJson = null;
                try {
                    const contextInfo = mContent?.extendedTextMessage?.contextInfo || 
                                        mContent?.imageMessage?.contextInfo || 
                                        mContent?.videoMessage?.contextInfo;
                    if (contextInfo && contextInfo.stanzaId) {
                        quotedMsgId = contextInfo.stanzaId;
                        const qMsg = contextInfo.quotedMessage;
                        if (qMsg) {
                            const qText = qMsg.conversation || qMsg.extendedTextMessage?.text || '';
                            const qType = qMsg.imageMessage ? 'image' : qMsg.videoMessage ? 'video' : 'text';
                            quotedMsgJson = JSON.stringify({ text: qText, mediaType: qType });
                        }
                    }
                } catch (e) {}

                // Instruction: Safe date timestamp parsing supporting protobuf Long objects
                // Logic: Avoids Invalid Date / NaN syntax errors in PostgreSQL when WhatsApp syncs sent or history messages
                let rawTs = msg.messageTimestamp;
                let tsMillis = Date.now();
                if (typeof rawTs === 'object' && rawTs !== null) {
                    const low = rawTs.low !== undefined ? rawTs.low : Number(rawTs.toString());
                    tsMillis = (!isNaN(low) && low > 0) ? (low < 10000000000 ? low * 1000 : low) : Date.now();
                } else if (typeof rawTs === 'number') {
                    tsMillis = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
                } else if (typeof rawTs === 'string') {
                    const parsedNum = Number(rawTs);
                    if (!isNaN(parsedNum) && parsedNum > 0) {
                        tsMillis = parsedNum < 10000000000 ? parsedNum * 1000 : parsedNum;
                    }
                }
                const parsedDate = new Date(tsMillis);

                // Store message in DB (both incoming and owner sent messages from WhatsApp app)
                try {
                    const msgId = msg.key.id;
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status, quoted_msg_id, quoted_msg_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, text = COALESCE(NULLIF(EXCLUDED.text, \'\'), chat_messages.text), media_url = COALESCE(EXCLUDED.media_url, chat_messages.media_url), media_type = COALESCE(EXCLUDED.media_type, chat_messages.media_type)',
                        [msgId, instanceId, from, fromMe, text, mediaUrl, mediaType, parsedDate, fromMe ? 'sent' : 'delivered', quotedMsgId, quotedMsgJson]
                    );

                    // Instruction: Broadcast message immediately over Socket.io
                    // Logic: Live updates the chat interface for both received messages and messages sent by the owner from their phone
                    io.emit('new_message', {
                        id: msgId,
                        instanceId,
                        remoteJid: from,
                        fromMe,
                        pushName: pushName || null,
                        text,
                        mediaUrl,
                        mediaType,
                        timestamp: parsedDate.toISOString(),
                        status: fromMe ? 'sent' : 'delivered',
                        quotedMsgId,
                        quotedMsg: quotedMsgJson ? JSON.parse(quotedMsgJson) : null
                    });
                } catch (dbErr) {
                    console.error('[Chat Storage Error]', dbErr.message);
                }

                // Send Webhook if configured
                try {
                    const instanceRes = await pool.query('SELECT webhook_url FROM instances WHERE id = $1', [instanceId]);
                    const webhookUrl = instanceRes.rows[0]?.webhook_url;
                    if (webhookUrl) {
                        fetch(webhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                event: "message.received",
                                instanceId,
                                data: {
                                    from,
                                    pushName,
                                    text,
                                    timestamp: Math.floor(Date.now() / 1000)
                                }
                            })
                        }).catch(err => console.error('[Webhook Send Error]', err.message));
                    }
                } catch (webhookErr) {
                    console.error('[Webhook Fetch Error]', webhookErr.message);
                }

                // Check for Keyword-based Auto-Responder Rules first
                let ruleMatched = false;

                if (!fromMe && text && from !== 'status@broadcast') {
                    try {
                        // Fetch active auto-responder rules for this instance
                        const ruleResult = await pool.query(
                            'SELECT * FROM auto_responder_rules WHERE instance_id = $1 AND is_active = TRUE',
                            [instanceId]
                        );

                        const msgLower = text.trim().toLowerCase();
                        const matchedRule = ruleResult.rows.find(rule => {
                            const rawKw = (rule.trigger_keyword || '').toLowerCase();
                            const keywords = rawKw.split(',').map(k => k.trim()).filter(Boolean);
                            if (keywords.length === 0) return false;
                            return keywords.some(k => msgLower === k || msgLower.includes(k) || k.includes(msgLower));
                        });

                        if (matchedRule) {
                            ruleMatched = true;
                            const rule = matchedRule;
                            console.log(`[AutoResponder] Rule match found for "${text}" on instance ${instanceId}`);
                            
                            // Construct response payload
                            let payload = {};
                            if (rule.media_url) {
                                const type = rule.media_type || 'image';
                                payload = { [type]: { url: rule.media_url }, caption: rule.response_message };
                            } else {
                                payload = { text: rule.response_message };
                            }

                            // Process button options if configured
                            let useInteractive = false;
                            let interactiveMessageContent = {};

                            if (rule.buttons_json) {
                                try {
                                    const btns = typeof rule.buttons_json === 'string' ? JSON.parse(rule.buttons_json) : rule.buttons_json;
                                    if (btns.length > 0) {
                                        const buttons = btns.map(btn => {
                                          const type = String(btn.type).toLowerCase();
                                          if (type === 'url' || type === 'link') {
                                            return {
                                              name: 'cta_url',
                                              buttonParamsJson: JSON.stringify({
                                                display_text: btn.displayText,
                                                url: btn.url,
                                                merchant_url: btn.url
                                              })
                                            };
                                          } else if (type === 'call') {
                                            return {
                                              name: 'cta_call',
                                              buttonParamsJson: JSON.stringify({
                                                display_text: btn.displayText,
                                                phone_number: btn.phoneNumber || btn.url
                                              })
                                            };
                                          } else {
                                            return {
                                              name: 'quick_reply',
                                              buttonParamsJson: JSON.stringify({
                                                display_text: btn.displayText,
                                                id: String(btn.id || btn.displayText)
                                              })
                                            };
                                          }
                                        });

                                        let headerOptions = { hasMediaAttachment: false };

                                        if (rule.media_url) {
                                          const type = (rule.media_type === 'video' || rule.media_type === 'document') ? rule.media_type : 'image';
                                          const mediaPayload = { [type]: { url: rule.media_url } };
                                          const preparedMedia = await prepareWAMessageMedia(mediaPayload, { upload: sock.waUploadToServer });
                                          
                                          headerOptions.hasMediaAttachment = true;
                                          if (type === 'image') headerOptions.imageMessage = preparedMedia.imageMessage;
                                          else if (type === 'video') headerOptions.videoMessage = preparedMedia.videoMessage;
                                          else if (type === 'document') headerOptions.documentMessage = preparedMedia.documentMessage;
                                        }

                                        const interactiveMessage = {
                                          body: proto.Message.InteractiveMessage.Body.create({ text: rule.response_message || ' ' }),
                                          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                            buttons: buttons,
                                            messageVersion: 1
                                          })
                                        };

                                        if (rule.media_url) {
                                          interactiveMessage.header = proto.Message.InteractiveMessage.Header.create(headerOptions);
                                        }

                                        interactiveMessageContent = {
                                          viewOnceMessage: {
                                            message: {
                                              messageContextInfo: {
                                                deviceListMetadata: {},
                                                deviceListMetadataVersion: 2
                                              },
                                              interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
                                            }
                                          }
                                        };
                                        useInteractive = true;
                                    }
                                } catch (e) {
                                    console.error('[AutoResponder Button Setup Error]', e);
                                }
                            }

                            let autoMsgId = 'auto_' + Date.now();
                            if (useInteractive) {
                                const msgGen = generateWAMessageFromContent(from, interactiveMessageContent, { 
                                  userJid: sock.user.id,
                                  upload: sock.waUploadToServer
                                });
                                await sock.relayMessage(from, msgGen.message, { messageId: msgGen.key.id });
                                if (msgGen && msgGen.key && msgGen.message) {
                                    saveMessage(msgGen.key, msgGen.message);
                                    if (msgGen.key.id) autoMsgId = msgGen.key.id;
                                }
                            } else {
                                const sent = await sock.sendMessage(from, payload);
                                if (sent && sent.key && sent.message) {
                                    saveMessage(sent.key, sent.message);
                                    if (sent.key.id) autoMsgId = sent.key.id;
                                }
                            }
                            
                            // Log auto-response event in database
                            const responseText = rule.response_message || 'Media Auto-Response';
                            await pool.query(
                                'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ((SELECT user_id FROM instances WHERE id = $1), $1, $2, $3, $4, $5)',
                                [instanceId, from, 'auto_responded', autoMsgId, responseText]
                            );

                            // Instruction: Save auto-responder message to chat_messages and emit socket event
                            // Logic: Makes keyword rule auto-responses immediately visible in the chat conversation history
                            await pool.query(
                                'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                                [autoMsgId, instanceId, from, true, responseText, rule.media_url || null, rule.media_type || null, new Date(), 'sent']
                            ).catch(() => {});

                            io.emit('new_message', {
                                id: autoMsgId,
                                instanceId,
                                remoteJid: from,
                                fromMe: true,
                                text: responseText,
                                mediaUrl: rule.media_url || null,
                                mediaType: rule.media_type || null,
                                timestamp: new Date().toISOString(),
                                status: 'sent'
                            });
                        }
                    } catch (err) {
                        console.error('[AutoResponder Keyword Error]', err.message);
                    }
                }

                // AI Auto-Responder Logic (Smart persona fallback when no keyword rule matched)
                if (!fromMe && text && !ruleMatched && from !== 'status@broadcast') {
                    try {
                        try { sock.sendPresenceUpdate('composing', from).catch(() => {}); } catch (pe) {}
                        const aiReply = await generateAiChatReply({ instanceId, from, incomingText: text });
                        if (aiReply) {
                            console.log(`[Baileys AI Auto-Reply] Successfully generated reply for ${from}: ${aiReply.substring(0, 50)}...`);
                            const sentMsg = await sock.sendMessage(from, { text: aiReply });
                            const aiMsgId = sentMsg?.key?.id || ('ai_' + Date.now());
                            if (sentMsg && sentMsg.key && sentMsg.message) {
                                saveMessage(sentMsg.key, sentMsg.message);
                            }

                            // Instruction: Save AI bot response to chat_messages and emit socket event
                            // Logic: Ensures AI auto-replies are permanently logged in chat history and show live in ChatInterface
                            await pool.query(
                                'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                                [aiMsgId, instanceId, from, true, aiReply, new Date(), 'sent']
                            ).catch(() => {});

                            io.emit('new_message', {
                                id: aiMsgId,
                                instanceId,
                                remoteJid: from,
                                fromMe: true,
                                text: aiReply,
                                timestamp: new Date().toISOString(),
                                status: 'sent'
                            });
                        }
                    } catch (aiErr) {
                        console.error('[Baileys AI Auto-Responder Error]', aiErr.message);
                    } finally {
                        try { sock.sendPresenceUpdate('paused', from).catch(() => {}); } catch (pe) {}
                    }
                }
            }
        });

    } catch (err) {
        console.error(`[Instance ${instanceId}] Socket Init Failed:`, err.message);
    }
}

// --- API ENDPOINTS ---

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // 1. Check Master Credentials
    if (username === '9595956392' && password === 'iFastX@Admin2024') {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const sub = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [user.id]);
            return res.json({ 
                ...user, 
                role: 'superadmin', // Force superadmin role
                subscription: sub.rows[0] || { plan_id: 'p_enterprise', status: 'active', expiry_date: '2030-01-01' }
            });
        }
    }

    // 2. Check Database Users
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const sub = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [user.id]);
            const subRow = sub.rows[0] || null;
            return res.json({ 
                ...user,
                id: user.id,
                username: user.username,
                fullName: user.full_name || user.username,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                parentId: user.parent_id,
                apiKey: user.api_key,
                permissions: user.permissions || [],
                subscription: subRow ? {
                    planId: subRow.plan_id,
                    status: subRow.status,
                    expiryDate: subRow.expiry_date,
                    customMaxInstances: subRow.custom_max_instances,
                    customDailyLimit: subRow.custom_daily_limit
                } : null
            });
        }
        res.status(401).json({ error: 'Invalid username or password' });
    } catch (err) {
        res.status(500).json({ error: 'Login service failure' });
    }
});

// --- META API WEBHOOK ---
app.get('/api/meta/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/api/meta/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
            const statuses = body.entry[0].changes[0].value.statuses;
            for (const statusObj of statuses) {
                const msgId = statusObj.id;
                const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
                const errorObj = statusObj.errors ? statusObj.errors[0] : null;
                const errorMsg = errorObj ? (errorObj.message || errorObj.title || JSON.stringify(errorObj)) : null;

                console.log(`[Meta Webhook] Status update for ${msgId}: ${status}${errorMsg ? ` (Error: ${errorMsg})` : ''}`);

                try {
                    // Update message logs (bulk sender)
                    if (errorMsg) {
                        await pool.query('UPDATE message_logs SET status = $1, error = $2 WHERE message_id = $3', [status, errorMsg, msgId]);
                    } else {
                        await pool.query('UPDATE message_logs SET status = $1 WHERE message_id = $2', [status, msgId]);
                    }
                    // Update chat messages (chat interface)
                    await pool.query('UPDATE chat_messages SET status = $1 WHERE id = $2', [status, msgId]);
                    
                    io.emit('message_status', { id: msgId, msgId: msgId, status, error: errorMsg });
                } catch (e) {
                    console.error('[Meta Webhook Status DB Error]', e.message);
                }
            }
        }

        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
            const msg = body.entry[0].changes[0].value.messages[0];
            const from = msg.from; 
            const pushName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || '';
            
            let text = msg.text ? msg.text.body : '';
            let mediaUrl = null;
            let mediaType = null;
            
            if (msg.interactive) {
                if (msg.interactive.type === 'nfm_reply' || msg.interactive.nfm_reply) {
                    const nfm = msg.interactive.nfm_reply || {};
                    let parsedData = {};
                    try {
                        parsedData = typeof nfm.response_json === 'string' ? JSON.parse(nfm.response_json) : (nfm.response_json || {});
                    } catch (e) {
                        parsedData = { raw: nfm.response_json };
                    }
                    
                    let flowSummary = '📋 [Flow Response Received]\n';
                    if (nfm.body && nfm.body !== 'Sent') {
                        flowSummary += `Flow: ${nfm.body}\n`;
                    }
                    if (typeof parsedData === 'object' && parsedData !== null) {
                        const entries = Object.entries(parsedData);
                        if (entries.length > 0) {
                            entries.forEach(([key, val]) => {
                                if (key !== 'flow_token') {
                                    const cleanKey = key.replace(/screen_\d+_/i, '').replace(/_\d+$/, '').replace(/_/g, ' ');
                                    const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                                    flowSummary += `• ${cleanKey}: ${valStr}\n`;
                                }
                            });
                            if (parsedData.flow_token) {
                                flowSummary += `\n(Token: ${parsedData.flow_token})`;
                            }
                        } else {
                            flowSummary += `Flow completed (${nfm.name || 'Flow'})`;
                        }
                    } else {
                        flowSummary += String(nfm.response_json || nfm.body || 'Completed');
                    }
                    
                    text = flowSummary.trim();
                    mediaType = 'flow_response';
                } else if (msg.interactive.button_reply) {
                    text = msg.interactive.button_reply.title || msg.interactive.button_reply.id || '[Button Reply]';
                } else if (msg.interactive.list_reply) {
                    text = msg.interactive.list_reply.title || msg.interactive.list_reply.id || '[List Selection]';
                } else if (msg.interactive.address_message) {
                    text = `📍 [Address Selected]: ${JSON.stringify(msg.interactive.address_message)}`;
                } else {
                    text = msg.interactive.body?.text || msg.interactive.header?.text || '[Interactive Message]';
                }
            } else if (msg.type === 'button') {
                text = msg.button?.text || msg.button?.payload || text;
            } else if (msg.type === 'image') {
                text = msg.image?.caption || '[Image]';
                mediaType = 'image';
                mediaUrl = msg.image?.id || msg.image?.url;
            } else if (msg.type === 'video') {
                text = msg.video?.caption || '[Video]';
                mediaType = 'video';
                mediaUrl = msg.video?.id || msg.video?.url;
            } else if (msg.type === 'document') {
                text = msg.document?.caption || msg.document?.filename || '[Document]';
                mediaType = 'document';
                mediaUrl = msg.document?.id || msg.document?.url;
            } else if (msg.type === 'audio') {
                text = '[Audio]';
                mediaType = 'audio';
                mediaUrl = msg.audio?.id || msg.audio?.url;
            } else if (msg.type === 'sticker') {
                text = '[Sticker]';
                mediaType = 'image';
                mediaUrl = msg.sticker?.id || msg.sticker?.url;
            } else if (msg.type === 'location') {
                text = `📍 Location: ${msg.location?.name || ''} (${msg.location?.latitude}, ${msg.location?.longitude})`;
            } else if (msg.type === 'contacts') {
                text = `👤 Contact: ${msg.contacts?.[0]?.name?.formatted_name || 'Contact card'}`;
            }
            
            const msgId = msg.id;
            const fromMe = false;
            const timestamp = msg.timestamp;
            
            try {
                const instanceRes = await pool.query('SELECT id, ai_enabled, webhook_url, meta_access_token FROM instances WHERE meta_phone_number_id = $1 LIMIT 1', [phoneNumberId]);
                if (instanceRes.rows.length > 0) {
                    const instance = instanceRes.rows[0];
                    const instanceId = instance.id;
                    
                    if (pushName) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = EXCLUDED.push_name',
                            [instanceId, from, pushName]
                        ).catch(() => {});
                    }

                    if (mediaUrl && !mediaUrl.startsWith('/')) {
                        mediaUrl = `/api/meta/media/${instanceId}/${mediaUrl}`;
                    }
                    
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, from, fromMe, text, mediaUrl, mediaType, new Date(timestamp * 1000), 'delivered']
                    );
                    
                    io.emit('new_message', {
                        id: msgId,
                        instanceId,
                        remoteJid: from,
                        fromMe,
                        text,
                        mediaUrl,
                        mediaType,
                        timestamp: new Date(timestamp * 1000).toISOString(),
                        status: 'delivered'
                    });
                    
                    if (instance.webhook_url) {
                        fetch(instance.webhook_url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                event: "message.received",
                                instanceId,
                                data: {
                                    from,
                                    pushName,
                                    text,
                                    timestamp
                                }
                            })
                        }).catch(e => console.error('[Meta Webhook Out] Error:', e.message));
                    }
                    
                    // Process Automations
                    if (text && fromMe === false) {
                        try {
                            const autoRes = await pool.query('SELECT * FROM automations WHERE instance_id = $1', [instanceId]);
                            let isFirstMessage = null;

                            // Tree-based Automation Logic
                            let matchedNode = null;
                            const msgText = text.toLowerCase().trim();
                            
                            // 1. Check current state
                            const stateRes = await pool.query('SELECT current_node_id FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                            if (stateRes.rows.length > 0 && stateRes.rows[0].current_node_id) {
                                const currentNodeId = stateRes.rows[0].current_node_id;
                                const childOptions = autoRes.rows.filter(r => r.parent_id == currentNodeId);
                                
                                // Step 1a: Check exact keyword match
                                let childNode = childOptions.find(r => {
                                    if (r.match_type === 'contains' || r.match_type === 'all') return false;
                                    const kList = (r.keyword || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
                                    return kList.some(k => k !== '*' && msgText === k);
                                });

                                // Step 1b: Check contains keyword match
                                if (!childNode) {
                                    childNode = childOptions.find(r => {
                                        if (r.match_type !== 'contains') return false;
                                        const kList = (r.keyword || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
                                        return kList.some(k => k !== '*' && msgText.includes(k));
                                    });
                                }

                                // Step 1c: Check wildcard/fallback '*'
                                if (!childNode) {
                                    childNode = childOptions.find(r => {
                                        const kList = (r.keyword || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
                                        return r.match_type === 'all' || kList.includes('*') || (r.keyword && r.keyword.trim() === '*');
                                    });
                                }

                                if (childNode) {
                                    matchedNode = childNode;
                                }
                            }
                            
                            // 2. If no option matched, check global roots (parent_id IS NULL)
                            if (!matchedNode) {
                                const rootNodes = autoRes.rows.filter(rule => !rule.parent_id);

                                // Step 2a: Check exact keyword match on root nodes
                                matchedNode = rootNodes.find(rule => {
                                    if (rule.match_type !== 'exact') return false;
                                    const rawKw = rule.keyword ? rule.keyword.toLowerCase().trim() : '';
                                    const kList = rawKw.split(',').map(k => k.trim()).filter(Boolean);
                                    return kList.some(k => k !== '*' && msgText === k);
                                });

                                // Step 2b: Check contains keyword match on root nodes
                                if (!matchedNode) {
                                    matchedNode = rootNodes.find(rule => {
                                        if (rule.match_type !== 'contains') return false;
                                        const rawKw = rule.keyword ? rule.keyword.toLowerCase().trim() : '';
                                        const kList = rawKw.split(',').map(k => k.trim()).filter(Boolean);
                                        return kList.some(k => k !== '*' && msgText.includes(k));
                                    });
                                }

                                // Step 2c: Check welcome rules for new users
                                if (!matchedNode) {
                                    const welcomeRule = rootNodes.find(rule => rule.match_type === 'welcome');
                                    if (welcomeRule) {
                                        const msgCountRes = await pool.query('SELECT COUNT(*) as count FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false', [instanceId, from]);
                                        const isFirst = parseInt(msgCountRes.rows[0].count, 10) <= 1;
                                        if (isFirst) matchedNode = welcomeRule;
                                    }
                                }

                                // Step 2d: Check wildcard / catch-all '*' or match_type === 'all'
                                if (!matchedNode) {
                                    matchedNode = rootNodes.find(rule => {
                                        if (rule.match_type === 'all') return true;
                                        const rawKw = rule.keyword ? rule.keyword.toLowerCase().trim() : '';
                                        const kList = rawKw.split(',').map(k => k.trim()).filter(Boolean);
                                        return kList.includes('*') || rawKw === '*';
                                    });
                                }
                            }
                            
                            if (matchedNode) {
                                console.log(`[Meta Automation] Matched Node ${matchedNode.id} for ${from}`);
                                
                                let executionNode = matchedNode;
                                
                                if (matchedNode.action_type === 'go_back') {
                                    // Find parent
                                    const parentNode = autoRes.rows.find(r => r.id == matchedNode.parent_id);
                                    if (parentNode) {
                                        // Go to grandparent
                                        const grandParent = autoRes.rows.find(r => r.id == parentNode.parent_id);
                                        if (grandParent) {
                                            executionNode = grandParent;
                                        } else {
                                            // No grandparent, means root
                                            await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                            executionNode = null; 
                                        }
                                    }
                                } else if (matchedNode.action_type === 'go_main') {
                                    await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                    executionNode = null;
                                }
                                
                                // If they went back to main menu, try to find a welcome or exact root to resend
                                if (!executionNode && (matchedNode.action_type === 'go_back' || matchedNode.action_type === 'go_main')) {
                                     const rootMenu = autoRes.rows.find(r => !r.parent_id && r.match_type === 'welcome') || autoRes.rows.find(r => !r.parent_id);
                                     if (rootMenu) executionNode = rootMenu;
                                }
                                
                                if (!executionNode && matchedNode.action_type !== 'go_back' && matchedNode.action_type !== 'go_main') {
                                    executionNode = matchedNode;
                                }

                                if (executionNode) {
                                    // Update State
                                    if (executionNode.action_type === 'end') {
                                        await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                    } else {
                                        await pool.query(
                                            'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                            [from, instanceId, executionNode.id]
                                        );
                                    }
                                    
                                    // Send Message
                                    let msgData = {
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        to: from.replace(/[^0-9]/g, '')
                                    };
                                    
                                    if (executionNode.reply_type === 'text') {
                                        let hasButtons = false;
                                        let opts = [];
                                        try {
                                            if (typeof executionNode.options === 'string') {
                                                opts = JSON.parse(executionNode.options);
                                            } else if (Array.isArray(executionNode.options)) {
                                                opts = executionNode.options;
                                            }
                                        } catch (e) {}

                                        if (opts.length > 0) {
                                            hasButtons = true;
                                            msgData.type = 'interactive';
                                            msgData.interactive = {
                                                type: 'button',
                                                body: { text: executionNode.text_content },
                                                action: {
                                                    buttons: opts.map((b, i) => ({
                                                        type: 'reply',
                                                        reply: { id: `btn_${i}`, title: b.text || b.title || String(b).substring(0,20) }
                                                    }))
                                                }
                                            };
                                            if (executionNode.media_url) {
                                                let hType = 'image';
                                                if (executionNode.media_url.endsWith('.pdf')) hType = 'document';
                                                else if (executionNode.media_url.endsWith('.mp4')) hType = 'video';
                                                msgData.interactive.header = {
                                                    type: hType,
                                                    [hType]: { link: executionNode.media_url }
                                                };
                                            }
                                        }

                                        if (!hasButtons) {
                                            if (executionNode.media_url) {
                                                let pType = 'image';
                                                if (executionNode.media_url.endsWith('.pdf')) pType = 'document';
                                                else if (executionNode.media_url.endsWith('.mp4')) pType = 'video';
                                                msgData.type = pType;
                                                msgData[pType] = { link: executionNode.media_url, caption: executionNode.text_content };
                                            } else {
                                                msgData.type = 'text';
                                                msgData.text = { body: executionNode.text_content };
                                            }
                                        }
                                    } else if (executionNode.reply_type === 'template') {
                                        msgData.type = 'template';
                                        msgData.template = {
                                            name: executionNode.template_name,
                                            language: { code: executionNode.template_language }
                                        };
                                        if (executionNode.media_url) {
                                            let pType = 'image';
                                            if (executionNode.media_url.endsWith('.pdf')) pType = 'document';
                                            else if (executionNode.media_url.endsWith('.mp4')) pType = 'video';
                                            
                                            msgData.template.components = [
                                                {
                                                    type: "header",
                                                    parameters: [
                                                        {
                                                            type: pType,
                                                            [pType]: {
                                                                link: executionNode.media_url
                                                            }
                                                        }
                                                    ]
                                                }
                                            ];
                                        }
                                    }
                                    
                                    let resp = await fetch(`https://graph.facebook.com/v26.0/${phoneNumberId}/messages`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${instance.meta_access_token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(msgData)
                                    });
                                let data = await resp.json();
                                console.log("[Meta Automation Send Result]", data);
                                
                                if (data.messages && data.messages[0]) {
                                    const msgId = data.messages[0].id;
                                    const savedText = executionNode.reply_type === 'template' ? '[Template: ' + executionNode.template_name + ']' : executionNode.text_content;
                                    await pool.query(
                                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                                        [msgId, instanceId, from, true, savedText, new Date(), 'sent']
                                    );
                                    io.emit('new_message', {
                                        id: msgId,
                                        instanceId,
                                        remoteJid: from,
                                        fromMe: true,
                                        text: savedText,
                                        timestamp: new Date().toISOString(),
                                        status: 'sent'
                                    });
                                }
                                }
                            }
                        } catch (e) {
                            console.error('[Automation Error]', e.message); fs.appendFileSync('/workspace/error.log', e.message + '\n');
                        }
                    }

                    // AI Auto-Responder Logic for Meta WABA (Autoresponder.io style)
                    if (text) {
                        try {
                            const aiReply = await generateAiChatReply({ instanceId, from, incomingText: text });
                            if (aiReply) {
                                console.log(`[Meta AI Auto-Reply] Successfully sending reply to ${from}: ${aiReply.substring(0, 50)}...`);
                                const toNum = from.replace(/[^0-9]/g, '');
                                fetch(`https://graph.facebook.com/v26.0/${phoneNumberId}/messages`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${instance.meta_access_token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        to: toNum,
                                        type: "text",
                                        text: { body: aiReply }
                                    })
                                }).then(res => res.json()).then(async metaJson => {
                                    if (metaJson.messages && metaJson.messages[0]) {
                                        const msgId = metaJson.messages[0].id;
                                        await pool.query(
                                            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                                            [msgId, instanceId, from, true, aiReply, new Date(), 'sent']
                                        );
                                        io.emit('new_message', {
                                            id: msgId,
                                            instanceId,
                                            remoteJid: from,
                                            fromMe: true,
                                            text: aiReply,
                                            timestamp: new Date().toISOString(),
                                            status: 'sent'
                                        });
                                    }
                                }).catch(e => console.error('[Meta AI Reply Send Error]', e.message));
                            }
                        } catch (metaAiErr) {
                            console.error('[Meta AI Auto-Responder Error]', metaAiErr.message);
                        }
                    }
                }
            } catch (e) {
                console.error('[Meta Webhook DB Error]', e.message);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});


app.get('/api/message-logs', authenticate, async (req, res) => {
    try {
        const { instanceId, limit = 50, page = 1, month, year, status } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        let baseWhereClauses = ['user_id = $1'];
        let baseParams = [req.user.id];

        if (instanceId) {
            baseParams.push(instanceId);
            baseWhereClauses.push(`instance_id = $${baseParams.length}`);
        }

        if (year && year !== 'all') {
            baseParams.push(parseInt(year, 10));
            baseWhereClauses.push(`EXTRACT(YEAR FROM created_at) = $${baseParams.length}`);
        }

        if (month && month !== 'all') {
            baseParams.push(parseInt(month, 10));
            baseWhereClauses.push(`EXTRACT(MONTH FROM created_at) = $${baseParams.length}`);
        }

        const baseWhereSql = baseWhereClauses.join(' AND ');

        // Calculate overall stats for the instance/month/year selection
        const statsRes = await pool.query(
            `SELECT 
               COUNT(*) as total_count,
               COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'success' OR status = 'sent') as delivered_count,
               COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
               COUNT(*) FILTER (WHERE status != 'delivered' AND status != 'success' AND status != 'sent' AND status != 'failed') as pending_count
             FROM message_logs WHERE ${baseWhereSql}`,
            baseParams
        );

        // Filter by status if specified
        let filteredWhereClauses = [...baseWhereClauses];
        let filteredParams = [...baseParams];

        if (status && status !== 'all') {
            if (status === 'delivered' || status === 'sent' || status === 'success') {
                filteredWhereClauses.push(`(status = 'delivered' OR status = 'success' OR status = 'sent')`);
            } else if (status === 'failed') {
                filteredWhereClauses.push(`status = 'failed'`);
            } else if (status === 'pending') {
                filteredWhereClauses.push(`(status != 'delivered' AND status != 'success' AND status != 'sent' AND status != 'failed')`);
            } else {
                filteredParams.push(status);
                filteredWhereClauses.push(`status = $${filteredParams.length}`);
            }
        }

        const filteredWhereSql = filteredWhereClauses.join(' AND ');

        const countRes = await pool.query(`SELECT COUNT(*) FROM message_logs WHERE ${filteredWhereSql}`, filteredParams);
        const total = parseInt(countRes.rows[0].count, 10) || 0;

        let dataParams = [...filteredParams];
        dataParams.push(limitNum);
        const limitIdx = dataParams.length;
        dataParams.push(offset);
        const offsetIdx = dataParams.length;

        const dataRes = await pool.query(
            `SELECT * FROM message_logs WHERE ${filteredWhereSql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            dataParams
        );

        const stats = statsRes.rows[0] || {};

        res.json({
            logs: dataRes.rows,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            stats: {
                total: parseInt(stats.total_count, 10) || 0,
                delivered: parseInt(stats.delivered_count, 10) || 0,
                failed: parseInt(stats.failed_count, 10) || 0,
                pending: parseInt(stats.pending_count, 10) || 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER MANAGEMENT ---


app.get('/api/wallet/ledger', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' && req.query.userId 
            ? 'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100'
            : 'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100';
            
        const userId = req.user.role === 'superadmin' && req.query.userId ? req.query.userId : req.user.id;
        
        const result = await pool.query(query, [userId]);
        const balanceRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        
        res.json({ 
            balance: balanceRes.rows.length > 0 ? parseFloat(balanceRes.rows[0].wallet_balance) : 0,
            ledger: result.rows 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallet/fund', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Unauthorized' });
    const { userId, amount, description } = req.body;
    try {
        await pool.query('UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2', [amount, userId]);
        await pool.query(
            'INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES ($1, $2, $3, $4, $5)',
            [userId, amount, amount >= 0 ? 'credit' : 'debit', description || 'Manual Adjustment', 'completed']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/wallet/settings', authenticate, async (req, res) => {
    try {
        const keys = ['baileys_credit_cost', 'meta_template_credit_cost', 'meta_regular_credit_cost', 'meta_utility_credit_cost', 'meta_marketing_credit_cost', 'meta_authentication_credit_cost'];
        const result = await pool.query('SELECT key, value FROM system_settings WHERE key = ANY($1)', [keys]);
        res.json({ settings: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallet/settings', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Unauthorized' });
    const { settings } = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', 
                [key, value]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallet/refill-intent', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;
        
        if (!amount || amount < 500) {
            return res.status(400).json({ error: 'Minimum amount is 500' });
        }

        // Just return a mock order ID
        res.json({ success: true, orderId: 'rzp_order_' + Date.now() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/wallet/refill-success', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentId } = req.body;
        
        await pool.query(
            "INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES ($1, $2, 'credit', $3, 'completed')",
            [userId, amount, `Razorpay Refill (${paymentId})`]
        );
        
        await pool.query(
            "UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2",
            [amount, userId]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    console.log('[DEBUG /api/users] User:', req.user);
    try {
        let query = `
            SELECT u.*, 
            s.plan_id as sub_plan_id, s.status as sub_status, s.expiry_date as sub_expiry,
            GREATEST(
              CASE WHEN s.last_reset_date < CURRENT_DATE THEN 0 ELSE COALESCE(s.messages_sent_today, 0) END,
              COALESCE((SELECT COUNT(*) FROM message_logs WHERE user_id = u.id AND status != 'failed' AND created_at >= CURRENT_DATE), 0)
            ) as messages_sent_today, 
            GREATEST(
              COALESCE(s.messages_sent_this_month, 0),
              COALESCE(s.messages_sent_today, 0),
              COALESCE((SELECT COUNT(*) FROM message_logs WHERE user_id = u.id AND status != 'failed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)
            ) as messages_sent_this_month, 
            GREATEST(
              COALESCE(s.messages_sent_this_year, 0),
              COALESCE(s.messages_sent_this_month, 0),
              COALESCE(s.messages_sent_today, 0),
              COALESCE((SELECT COUNT(*) FROM message_logs WHERE user_id = u.id AND status != 'failed' AND created_at >= DATE_TRUNC('year', CURRENT_DATE)), 0)
            ) as messages_sent_this_year,
            COALESCE((SELECT COUNT(*) FROM message_logs WHERE user_id = u.id AND status = 'failed' AND created_at >= CURRENT_DATE), 0) as undelivered_today,
            COALESCE((SELECT COUNT(*) FROM message_logs WHERE user_id = u.id AND status = 'failed'), 0) as undelivered_total,
            s.custom_max_instances, s.custom_daily_limit, s.meta_setup_waived, s.custom_meta_setup_fee
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id
        `;
        let params = [];

        if (req.user.role === 'superadmin') {
            // See everyone
        } else if (req.user.role === 'reseller') {
            query += ' WHERE u.parent_id = $1 OR u.id = $1';
            params = [req.user.id];
        } else {
            query += ' WHERE u.id = $1';
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        const mapped = result.rows.map(u => {
            let status = u.sub_status;
            if (status === 'active' && u.sub_expiry && new Date(u.sub_expiry) < new Date()) {
                status = 'expired';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['expired', u.id]).catch(() => {});
                sendSystemNotification(u.id, `⚠️ *Account Expired*\n\nYour subscription has expired. Please renew your plan to continue sending messages.`);
            } else if (status === 'expired' && (u.sub_expiry === null || new Date(u.sub_expiry) > new Date())) {
                status = 'active';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['active', u.id]).catch(() => {});
            }

            return {
                id: u.id,
                username: u.username,
                fullName: u.full_name || u.username,
                email: u.email,
                mobile: u.mobile,
                role: u.role,
                parentId: u.parent_id,
                apiKey: u.api_key,
                createdAt: u.created_at,
                subscription: {
                    planId: u.sub_plan_id,
                    status: status,
                    expiryDate: u.sub_expiry,
                    messagesSentToday: parseInt(u.messages_sent_today, 10) || 0,
                    messagesSentThisMonth: parseInt(u.messages_sent_this_month, 10) || 0,
                    messagesSentThisYear: parseInt(u.messages_sent_this_year, 10) || 0,
                    undeliveredToday: parseInt(u.undelivered_today, 10) || 0,
                    undeliveredTotal: parseInt(u.undelivered_total, 10) || 0,
                    customMaxInstances: u.custom_max_instances,
                    customDailyLimit: u.custom_daily_limit,
                    metaSetupWaived: Boolean(u.meta_setup_waived),
                    customMetaSetupFee: u.custom_meta_setup_fee !== null && u.custom_meta_setup_fee !== undefined ? u.custom_meta_setup_fee : null
                }
            };
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticate, async (req, res) => {
    const { id, username, fullName, email, mobile, password, role, parentId, apiKey, subscription } = req.body;
    
    // Determine appropriate role and parent_id
    let targetRole = role || 'admin';
    let targetParentId = parentId || (req.user.role === 'superadmin' ? null : req.user.id);
    
    // Non-superadmins cannot create reseller or superadmin roles
    if (req.user.role !== 'superadmin' && (targetRole === 'reseller' || targetRole === 'superadmin')) {
        targetRole = 'team_member';
    }

    console.log(`[Backend] Attempting to create user: ${username} (${fullName || 'No Full Name'}) with ID ${id}, role: ${targetRole}`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Ensure uniqueness - strict check
        const existing = await client.query('SELECT id FROM users WHERE username = $1 OR email = $2 OR id = $3', [username, email, id]);
        if (existing.rows.length > 0) {
            console.error(`[Backend] User Conflict: Account already exists with this username, email, or ID.`);
            throw new Error('User already exists with this username, email, or ID.');
        }

        await client.query(
            'INSERT INTO users (id, username, full_name, email, mobile, password, role, parent_id, api_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, username, fullName || username, email, mobile, password, targetRole, targetParentId, apiKey]
        );

        let finalSub = null;
        if (subscription) {
            const subRes = await client.query(
                'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date) VALUES ($1, $2, $3, $4) RETURNING *',
                [id, subscription.planId, subscription.status || 'active', subscription.expiryDate]
            );
            finalSub = subRes.rows[0];
        }

        await client.query('COMMIT');
        console.log(`[Backend] Successfully created user: ${username}`);

        // Return the full object for consistency and immediate frontend use
        res.status(201).json({
            id,
            username,
            fullName: fullName || username,
            email,
            mobile,
            role: targetRole,
            parentId: targetParentId,
            apiKey,
            createdAt: new Date().toISOString(),
            subscription: finalSub ? {
                planId: finalSub.plan_id,
                status: finalSub.status,
                expiryDate: finalSub.expiry_date,
                messagesSentToday: finalSub.messages_sent_today,
                messagesSentThisMonth: finalSub.messages_sent_this_month,
                messagesSentThisYear: finalSub.messages_sent_this_year
            } : null
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Backend] User Creation Failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/users/:id', authenticate, async (req, res) => {
    const { username, fullName, email, mobile, password, role, planId, expiryDate, customMaxInstances, customDailyLimit, metaSetupWaived, customMetaSetupFee } = req.body;
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check permission
        const target = await client.query('SELECT parent_id, role FROM users WHERE id = $1', [id]);
        if (target.rows.length === 0) throw new Error('User not found');
        
        if (req.user.role !== 'superadmin' && target.rows[0].parent_id !== req.user.id) {
            throw new Error('Permission denied');
        }

        // Update User
        const userUpdates = [];
        const userValues = [id];
        let userIdx = 2;

        if (username !== undefined) { userUpdates.push(`username = $${userIdx++}`); userValues.push(username); }
        if (fullName !== undefined) { userUpdates.push(`full_name = $${userIdx++}`); userValues.push(fullName); }
        if (email !== undefined) { userUpdates.push(`email = $${userIdx++}`); userValues.push(email); }
        if (mobile !== undefined) { userUpdates.push(`mobile = $${userIdx++}`); userValues.push(mobile); }
        if (password) { userUpdates.push(`password = $${userIdx++}`); userValues.push(password); }
        if (role !== undefined) { userUpdates.push(`role = $${userIdx++}`); userValues.push(role); }

        if (userUpdates.length > 0) {
            await client.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $1`, userValues);
        }

        // Update Subscription
        const subUpdates = [];
        const subValues = [id];
        let subIdx = 2;

        if (planId !== undefined) { subUpdates.push(`plan_id = $${subIdx++}`); subValues.push(planId); }
        if (expiryDate !== undefined) { 
            subUpdates.push(`expiry_date = $${subIdx++}`); 
            subValues.push(expiryDate); 
            if (expiryDate === null || new Date(expiryDate) > new Date()) {
                subUpdates.push(`status = $${subIdx++}`);
                subValues.push('active');
            }
        }
        if (customMaxInstances !== undefined) { subUpdates.push(`custom_max_instances = $${subIdx++}`); subValues.push(customMaxInstances === '' ? null : customMaxInstances); }
        if (customDailyLimit !== undefined) { subUpdates.push(`custom_daily_limit = $${subIdx++}`); subValues.push(customDailyLimit === '' ? null : customDailyLimit); }
        if (metaSetupWaived !== undefined) { subUpdates.push(`meta_setup_waived = $${subIdx++}`); subValues.push(Boolean(metaSetupWaived)); }
        if (customMetaSetupFee !== undefined) { subUpdates.push(`custom_meta_setup_fee = $${subIdx++}`); subValues.push(customMetaSetupFee === '' || customMetaSetupFee === null ? null : parseInt(customMetaSetupFee)); }

        if (subUpdates.length > 0) {
            const existingSub = await client.query('SELECT user_id FROM subscriptions WHERE user_id = $1', [id]);
            if (existingSub.rows.length > 0) {
                await client.query(`UPDATE subscriptions SET ${subUpdates.join(', ')} WHERE user_id = $1`, subValues);
            } else if (planId) {
                await client.query(
                    'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date, custom_max_instances, custom_daily_limit, meta_setup_waived, custom_meta_setup_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [id, planId, 'active', expiryDate || null, customMaxInstances === '' ? null : customMaxInstances, customDailyLimit === '' ? null : customDailyLimit, Boolean(metaSetupWaived), customMetaSetupFee === '' || customMetaSetupFee === null ? null : parseInt(customMetaSetupFee)]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Backend] User Update Failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        const target = await pool.query('SELECT parent_id FROM users WHERE id = $1', [req.params.id]);
        if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        if (req.user.role !== 'superadmin' && target.rows[0].parent_id !== req.user.id) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/users/:id/password', authenticate, async (req, res) => {
    const { password } = req.body;
    try {
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/profile', authenticate, async (req, res) => {
    const { username, fullName, email, mobile, password } = req.body;
    const userId = req.user.id;

    try {
        const userUpdates = [];
        const userValues = [userId];
        let userIdx = 2;

        if (username) { userUpdates.push(`username = $${userIdx++}`); userValues.push(username); }
        if (fullName !== undefined) { userUpdates.push(`full_name = $${userIdx++}`); userValues.push(fullName); }
        if (email !== undefined) { userUpdates.push(`email = $${userIdx++}`); userValues.push(email); }
        if (mobile !== undefined) { userUpdates.push(`mobile = $${userIdx++}`); userValues.push(mobile); }
        if (password) { userUpdates.push(`password = $${userIdx++}`); userValues.push(password); }

        if (userUpdates.length > 0) {
            await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $1`, userValues);
        }

        const updatedRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const u = updatedRes.rows[0];
        res.json({
            success: true,
            user: {
                id: u.id,
                username: u.username,
                fullName: u.full_name || u.username,
                email: u.email,
                mobile: u.mobile,
                role: u.role,
                apiKey: u.api_key
            }
        });
    } catch (err) {
        console.error(`[Backend] Profile Update Failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
});

// --- SYSTEM SETTINGS ---

app.get('/api/settings/hidden-modules', authenticate, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'hidden_modules'");
        if (result.rows.length > 0) {
            res.json(JSON.parse(result.rows[0].value));
        } else {
            res.json([]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/hidden-modules', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmins can manage settings' });
    
    const { hiddenModules } = req.body;
    try {
        await pool.query(
            "INSERT INTO system_settings (key, value) VALUES ('hidden_modules', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [JSON.stringify(hiddenModules)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PLAN MANAGEMENT ---

app.get('/api/plans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM plans ORDER BY price ASC');
        const plans = result.rows.map(r => {
            let parsedFeatures = [];
            try {
                if (Array.isArray(r.features)) {
                    parsedFeatures = r.features;
                } else if (typeof r.features === 'string' && r.features.trim()) {
                    parsedFeatures = JSON.parse(r.features);
                }
            } catch (e) {
                if (typeof r.features === 'string' && r.features.trim()) {
                    parsedFeatures = r.features.split('\n').map(s => s.trim()).filter(Boolean);
                }
            }

            if (!parsedFeatures || !parsedFeatures.length) {
                const prov = r.allowed_providers || 'baileys';
                if (prov === 'meta') {
                    parsedFeatures = [
                        'Official Meta Cloud API (100% Zero Ban Risk)',
                        'Meta Verified Business Account (WABA)',
                        'Pre-Approved Rich Media Templates (Buttons & Media)',
                        `${r.max_instances || 1} Registered Phone Number${(r.max_instances || 1) > 1 ? 's' : ''}`,
                        'High-Throughput Official Meta Cloud Webhooks',
                        'Direct Wallet Billing at Official Meta Conversation Rates',
                        '24/7 Priority Support in India & Global'
                    ];
                } else if (prov === 'both') {
                    parsedFeatures = [
                        'Dual-Engine: Official Meta Cloud + Baileys Web QR',
                        'Unlimited WhatsApp Multi-Session Messaging',
                        `${r.max_instances || 1} Connected Accounts / Instances`,
                        'Anti-Ban Rotation & Smart Fallback Routing',
                        'Excel (.xlsx / .csv) 1-Click Bulk Broadcast',
                        'High-Speed Webhooks & Unified REST API',
                        'VIP Dedicated Priority Support'
                    ];
                } else {
                    const daily = r.daily_limit || 0;
                    parsedFeatures = [
                        `${daily === 0 ? 'Unlimited' : daily.toLocaleString()} Messages / Day Quota`,
                        `${r.max_instances || 1} Multi-Session WhatsApp Web QR Instance${(r.max_instances || 1) > 1 ? 's' : ''}`,
                        'Smart Anti-Ban Engine with Spintax & Delay Interval',
                        'Excel (.xlsx / .csv) Contact List 1-Click Dispatch',
                        'Auto-Responder Keyword Bot & Rule Builder',
                        'REST API Access & Real-Time Incoming Webhooks',
                        '24/7 Priority Support in India & Global'
                    ];
                }
            }

            return {
                id: r.id,
                name: r.name,
                dailyLimit: r.daily_limit,
                daily_limit: r.daily_limit,
                maxInstances: r.max_instances,
                max_instances: r.max_instances,
                price: parseFloat(r.price || 0),
                description: r.description,
                icon: r.icon,
                allowedProviders: r.allowed_providers || 'baileys',
                allowed_providers: r.allowed_providers || 'baileys',
                metaSetupFee: parseFloat(r.meta_setup_fee || 0),
                meta_setup_fee: parseFloat(r.meta_setup_fee || 0),
                features: parsedFeatures
            };
        });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/plans', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmins can manage plans' });
    
    // Robustly extract properties sent from frontend (camelCase) or legacy (snake_case)
    const { id, name, price, description, icon } = req.body;
    const daily_limit = req.body.dailyLimit || req.body.daily_limit || 0;
    const max_instances = req.body.maxInstances || req.body.max_instances || 1;
    const allowed_providers = req.body.allowedProviders || req.body.allowed_providers || 'baileys';
    const meta_setup_fee = req.body.metaSetupFee !== undefined ? req.body.metaSetupFee : (req.body.meta_setup_fee !== undefined ? req.body.meta_setup_fee : 0);
    const featuresStr = Array.isArray(req.body.features) 
        ? JSON.stringify(req.body.features) 
        : (typeof req.body.features === 'string' && req.body.features.trim() ? req.body.features : JSON.stringify([]));

    try {
        await pool.query(
            'INSERT INTO plans (id, name, daily_limit, max_instances, price, description, icon, allowed_providers, meta_setup_fee, features) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [id, name, daily_limit, max_instances, price, description, icon, allowed_providers, meta_setup_fee, featuresStr]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/plans/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmins can manage plans' });
    
    // Robustly extract properties sent from frontend (camelCase) or legacy (snake_case)
    const { name, price, description, icon } = req.body;
    const daily_limit = req.body.dailyLimit !== undefined ? req.body.dailyLimit : (req.body.daily_limit !== undefined ? req.body.daily_limit : 0);
    const max_instances = req.body.maxInstances !== undefined ? req.body.maxInstances : (req.body.max_instances !== undefined ? req.body.max_instances : 1);
    const allowed_providers = req.body.allowedProviders || req.body.allowed_providers || 'baileys';
    const meta_setup_fee = req.body.metaSetupFee !== undefined ? req.body.metaSetupFee : (req.body.meta_setup_fee !== undefined ? req.body.meta_setup_fee : 0);
    const featuresStr = req.body.features !== undefined
        ? (Array.isArray(req.body.features) ? JSON.stringify(req.body.features) : String(req.body.features))
        : null;

    try {
        if (featuresStr !== null) {
            await pool.query(
                'UPDATE plans SET name = $1, price = $2, daily_limit = $3, max_instances = $4, description = $5, icon = $6, allowed_providers = $7, meta_setup_fee = $8, features = $9 WHERE id = $10',
                [name, price, daily_limit, max_instances, description, icon, allowed_providers, meta_setup_fee, featuresStr, req.params.id]
            );
        } else {
            await pool.query(
                'UPDATE plans SET name = $1, price = $2, daily_limit = $3, max_instances = $4, description = $5, icon = $6, allowed_providers = $7, meta_setup_fee = $8 WHERE id = $9',
                [name, price, daily_limit, max_instances, description, icon, allowed_providers, meta_setup_fee, req.params.id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/plans/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmins can manage plans' });
    try {
        await pool.query('DELETE FROM plans WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subscription/activate', authenticate, async (req, res) => {
    const { planId, paymentId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    try {
        const planRes = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
        if (planRes.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        const plan = planRes.rows[0];

        const currentSub = await pool.query('SELECT expiry_date FROM subscriptions WHERE user_id = $1', [req.user.id]);
        let baseDate = new Date();
        if (currentSub.rows.length > 0 && currentSub.rows[0].expiry_date) {
            const existingExp = new Date(currentSub.rows[0].expiry_date);
            if (existingExp > baseDate) {
                baseDate = existingExp;
            }
        }
        const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const existingSub = await pool.query('SELECT user_id FROM subscriptions WHERE user_id = $1', [req.user.id]);
        if (existingSub.rows.length > 0) {
            await pool.query(
                'UPDATE subscriptions SET plan_id = $1, status = $2, expiry_date = $3, custom_max_instances = NULL, custom_daily_limit = NULL WHERE user_id = $4',
                [planId, 'active', newExpiry, req.user.id]
            );
        } else {
            await pool.query(
                'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date, custom_max_instances, custom_daily_limit) VALUES ($1, $2, $3, $4, NULL, NULL)',
                [req.user.id, planId, 'active', newExpiry]
            );
        }

        console.log(`[Subscription] User ${req.user.username} (${req.user.id}) activated plan ${planId} (${plan.name})`);

        res.json({
            success: true,
            planId,
            expiryDate: newExpiry,
            planName: plan.name,
            allowedProviders: plan.allowed_providers,
            maxInstances: plan.max_instances,
            customMaxInstances: null
        });
    } catch (err) {
        console.error('[Subscription Activate Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// --- INSTANCE MANAGEMENT ---

app.get('/api/instances', authenticate, async (req, res) => {
    try {
        const isSuper = req.user.role === 'superadmin';
        let query = 'SELECT * FROM instances WHERE user_id = $1';
        let params = [req.user.id];

        if (isSuper) {
            query = 'SELECT * FROM instances';
            params = [];
        } else if (req.user.role === 'team_member' && req.user.parent_id) {
            query = 'SELECT * FROM instances WHERE user_id = $1 OR user_id = $2';
            params = [req.user.id, req.user.parent_id];
        } else if (req.user.role === 'reseller' || req.user.role === 'admin') {
            query = 'SELECT DISTINCT i.* FROM instances i LEFT JOIN users u ON i.user_id = u.id WHERE i.user_id = $1 OR u.parent_id = $1';
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        
        const merged = result.rows.map(inst => {
            const live = instancesMap.get(inst.id);
            return {
                ...inst,
                instanceKey: inst.instance_key || inst.id,
                instance_key: inst.instance_key || inst.id,
                userId: inst.user_id,
                status: live ? live.status : inst.status,
                qrCode: live ? live.qr : inst.qr_code,
                phoneNumber: live ? (live.phone || inst.phone_number) : inst.phone_number,
                isVisible: inst.is_visible !== false, // Handle DB field
                webhookUrl: inst.webhook_url,
                aiEnabled: !!inst.ai_enabled,
                aiProvider: inst.ai_provider || 'gemini',
                aiApiKey: inst.ai_api_key || '',
                aiModel: inst.ai_model || (inst.ai_provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash'),
                aiSystemPrompt: inst.ai_system_prompt || '',
                aiTemperature: inst.ai_temperature !== null && inst.ai_temperature !== undefined ? Number(inst.ai_temperature) : 0.7,
                aiAutoReplyGroups: !!inst.ai_auto_reply_groups,
                aiMaxTokens: inst.ai_max_tokens ? Number(inst.ai_max_tokens) : 1800,
                metaPhoneNumberId: inst.meta_phone_number_id,
                metaWabaId: inst.meta_waba_id,
                metaAccessToken: inst.meta_access_token
            };
        });
        res.json(merged);
    } catch (err) {
        console.error('[API GET Instances] Database Error:', err.message);
        res.status(500).json({ error: 'Database access failure', details: err.message });
    }
});


app.post('/api/meta/exchange-code', authenticate, async (req, res) => {
    try {
        const { code } = req.body;
        const appId = process.env.META_APP_ID || '4126835067540230';
        const appSecret = process.env.META_APP_SECRET; 

        if (!appSecret) {
            return res.status(500).json({ error: 'META_APP_SECRET not configured on the server. Please add it to your server configuration.' });
        }

        const tokenResponse = await fetch(`https://graph.facebook.com/v26.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error.message });
        }

        const accessToken = tokenData.access_token;
        
        // Let's get the WABAs associated with this user
        const debugResponse = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
        const debugData = await debugResponse.json();
        
        let wabaId = '';
        let phoneNumberId = '';
        
        // This is a simplified extraction. In a real scenario, the Embedded Signup flow returns shared WABAs via granular_scopes or you query the user's business integrations.
        if (debugData.data?.granular_scopes) {
            const wabaScope = debugData.data.granular_scopes.find(s => s.scope === 'whatsapp_business_management');
            if (wabaScope && wabaScope.target_ids && wabaScope.target_ids.length > 0) {
                wabaId = wabaScope.target_ids[0];
                
                // Fetch Phone Numbers for this WABA
                const pnResponse = await fetch(`https://graph.facebook.com/v26.0/${wabaId}/phone_numbers`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const pnData = await pnResponse.json();
                if (pnData.data && pnData.data.length > 0) {
                    phoneNumberId = pnData.data[0].id;
                }
            }
        }

        res.json({ success: true, accessToken, wabaId, phoneNumberId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/create', authenticate, async (req, res) => {
    const { name, provider, metaAccessToken, metaPhoneNumberId, metaWabaId } = req.body;
    const id = `inst_${Date.now()}`;
    const instProvider = provider === 'meta' ? 'meta' : 'baileys';
    try {
        if (req.user.role !== 'superadmin') {
            const userRes = await pool.query(`
                SELECT u.id, s.plan_id, s.custom_max_instances, p.max_instances, p.allowed_providers 
                FROM users u 
                LEFT JOIN subscriptions s ON u.id = s.user_id 
                LEFT JOIN plans p ON s.plan_id = p.id 
                WHERE u.id = $1
            `, [req.user.id]);
            
            if (userRes.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userData = userRes.rows[0];
            if (!userData.plan_id) {
                return res.status(403).json({ error: 'No active plan found. Please subscribe to a plan.' });
            }
            
            const allowedProviders = userData.allowed_providers || 'baileys';
            if (instProvider === 'meta' && allowedProviders !== 'meta' && allowedProviders !== 'both') {
                return res.status(403).json({ error: 'Your current plan does not allow Meta Cloud API instances. Please subscribe to a Meta Cloud API plan.' });
            }
            if (instProvider === 'baileys' && allowedProviders !== 'baileys' && allowedProviders !== 'both') {
                return res.status(403).json({ error: 'Your current plan does not allow Baileys instances. Please subscribe to a Baileys plan.' });
            }

            const maxInstances = userData.custom_max_instances !== null ? userData.custom_max_instances : (userData.max_instances || 0);
            
            if (maxInstances !== 0) {
                const countRes = await pool.query('SELECT COUNT(*) FROM instances WHERE user_id = $1', [req.user.id]);
                const currentCount = parseInt(countRes.rows[0].count, 10);
                
                if (currentCount >= maxInstances) {
                    return res.status(403).json({ error: `Plan limit reached. Your plan allows a maximum of ${maxInstances} instance(s).` });
                }
            }
        }

        if (instProvider === 'meta') {
            await pool.query(
                'INSERT INTO instances (id, instance_key, user_id, name, status, provider, meta_access_token, meta_phone_number_id, meta_waba_id) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)',
                [id, req.user.id, name, 'open', 'meta', metaAccessToken, metaPhoneNumberId, metaWabaId]
            );
            instancesMap.set(id, { status: 'open', phone: metaPhoneNumberId, provider: 'meta', metaAccessToken, metaPhoneNumberId });
            io.emit('instances_updated', { instanceId: id, action: 'create' });
            res.status(201).json({ id, instanceKey: id, instance_key: id, name, status: 'open', provider: 'meta' });
        } else {
            await pool.query('INSERT INTO instances (id, instance_key, user_id, name, status, provider) VALUES ($1, $1, $2, $3, $4, $5)', [id, req.user.id, name, 'connecting', 'baileys']);
            connectToWhatsApp(id);
            io.emit('instances_updated', { instanceId: id, action: 'create' });
            res.status(201).json({ id, instanceKey: id, instance_key: id, name, status: 'connecting', provider: 'baileys' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/instance/:id/rename', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE instances SET name = $1 WHERE id = $2', [req.body.name, req.params.id]);
        io.emit('instances_updated', { instanceId: req.params.id, action: 'rename' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/instance/:id/visibility', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    try {
        // We'll simulate the column existence or just return success if the table doesn't have it yet
        // In a real prod env, you'd run an ALTER TABLE command
        await pool.query('UPDATE instances SET is_visible = $1 WHERE id = $2', [req.body.isVisible, req.params.id]).catch(e => {
            console.warn("Visibility column might not exist yet. Run migrations.");
        });
        io.emit('instances_updated', { instanceId: req.params.id, action: 'visibility' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get Instance AI Configuration
app.get('/api/instance/:id/ai-config', authenticate, async (req, res) => {
    try {
        const check = await pool.query(`
            SELECT i.id, i.user_id, i.ai_enabled, i.ai_provider, i.ai_api_key, i.ai_model, 
                   i.ai_system_prompt, i.ai_temperature, i.ai_auto_reply_groups, i.ai_max_tokens,
                   u.gemini_api_key, u.openai_api_key, u.default_ai_prompt
            FROM instances i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = $1
        `, [req.params.id]);

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }
        const row = check.rows[0];
        if (req.user.role !== 'superadmin' && row.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json({
            aiEnabled: !!row.ai_enabled,
            aiProvider: row.ai_provider || 'gemini',
            aiApiKey: row.ai_api_key || '',
            aiModel: row.ai_model || (row.ai_provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash'),
            aiSystemPrompt: row.ai_system_prompt || '',
            aiTemperature: row.ai_temperature !== null && row.ai_temperature !== undefined ? Number(row.ai_temperature) : 0.7,
            aiAutoReplyGroups: !!row.ai_auto_reply_groups,
            aiMaxTokens: row.ai_max_tokens ? Number(row.ai_max_tokens) : 1800,
            hasUserGeminiKey: !!row.gemini_api_key,
            hasUserOpenAiKey: !!row.openai_api_key,
            defaultAiPrompt: row.default_ai_prompt || ''
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update Instance AI Configuration
app.put('/api/instance/:id/ai-config', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            const check = await pool.query('SELECT user_id FROM instances WHERE id = $1', [req.params.id]);
            if (check.rows.length === 0 || check.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const {
            aiEnabled,
            aiProvider = 'gemini',
            aiApiKey = '',
            aiModel,
            aiSystemPrompt = '',
            aiTemperature = 0.7,
            aiAutoReplyGroups = false,
            aiMaxTokens = 1800
        } = req.body;

        const effectiveModel = aiModel || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash');
        const effectiveTokens = (aiMaxTokens && Number(aiMaxTokens) > 0) ? Number(aiMaxTokens) : 1800;

        await pool.query(`
            UPDATE instances SET 
                ai_enabled = $1,
                ai_provider = $2,
                ai_api_key = $3,
                ai_model = $4,
                ai_system_prompt = $5,
                ai_temperature = $6,
                ai_auto_reply_groups = $7,
                ai_max_tokens = $8
            WHERE id = $9
        `, [
            !!aiEnabled,
            aiProvider,
            aiApiKey,
            effectiveModel,
            aiSystemPrompt,
            aiTemperature,
            !!aiAutoReplyGroups,
            effectiveTokens,
            req.params.id
        ]);

        io.emit('instances_updated', { instanceId: req.params.id, action: 'ai_config' });
        res.json({ success: true });
    } catch (e) {
        console.error("AI CONFIG SAVE ERROR:", e);
        res.status(500).json({ error: e.message });
    }
});

// Quick toggle AI for instance
app.patch('/api/instance/:id/ai', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            const check = await pool.query('SELECT user_id FROM instances WHERE id = $1', [req.params.id]);
            if (check.rows.length === 0 || check.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        await pool.query('UPDATE instances SET ai_enabled = $1 WHERE id = $2', [req.body.aiEnabled, req.params.id]);
        io.emit('instances_updated', { instanceId: req.params.id, action: 'ai' });
        res.json({ success: true });
    } catch (e) {
        console.error("SYNC ERROR:", e);
        res.status(500).json({ error: e.message });
    }
});

// Interactive AI Live Tester endpoint with Multi-Key Pool support & Latency measurement
app.post('/api/ai/test', authenticate, async (req, res) => {
    try {
        const { provider = 'gemini', apiKey, model, systemPrompt, testMessage, maxTokens = 1800 } = req.body;
        let rawKeys = apiKey ? String(apiKey).trim() : '';

        // If not provided in body, check user profile settings
        if (!rawKeys) {
            try {
                const userRes = await pool.query('SELECT gemini_api_key, openai_api_key FROM users WHERE id = $1', [req.user.id]);
                if (userRes.rows.length > 0) {
                    rawKeys = provider === 'openai' 
                        ? (userRes.rows[0].openai_api_key || '')
                        : (userRes.rows[0].gemini_api_key || '');
                }
            } catch (dbErr) {}
        }

        const candidateKeys = parseApiKeyList(rawKeys);

        if (candidateKeys.length === 0) {
            return res.status(400).json({ error: `Please enter at least one API Key for ${provider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini'} or save it in your Profile.` });
        }

        const userPrompt = testMessage || 'Hi, can you introduce yourself and tell me what you do?';
        const defaultPrompt = "You are a professional, polite, and helpful WhatsApp customer assistant for our business. Answer inquiries politely, thoroughly, and accurately.";
        const sysPrompt = (systemPrompt && systemPrompt.trim()) || defaultPrompt;

        let reply = '';
        let fastestLatency = 0;
        let activeKeyUsed = '';
        const keyResults = [];
        let anySuccess = false;

        // Test each key in the pool (first key generates the reply; others validated for quota/rate limit)
        for (let i = 0; i < candidateKeys.length; i++) {
            const currentKey = candidateKeys[i];
            const masked = maskApiKey(currentKey);
            const startT = Date.now();

            try {
                const text = await executeSingleAiCall({
                    provider,
                    apiKey: currentKey,
                    model,
                    systemPrompt: sysPrompt,
                    historyRows: [],
                    incomingText: userPrompt,
                    temperature: 0.7,
                    maxTokens: maxTokens || 1800
                });

                const latency = Date.now() - startT;
                recordKeySuccess(currentKey, latency);

                if (!reply && text) {
                    reply = text;
                    fastestLatency = latency;
                    activeKeyUsed = masked;
                }

                keyResults.push({
                    index: i + 1,
                    keyMasked: masked,
                    status: 'active',
                    latencyMs: latency,
                    isHealthy: true
                });
                anySuccess = true;
            } catch (kErr) {
                const isLimit = isRateLimitOrQuotaExhausted(kErr);
                recordKeyCooldown(currentKey, kErr.message);
                keyResults.push({
                    index: i + 1,
                    keyMasked: masked,
                    status: isLimit ? 'rate_limited' : 'error',
                    error: kErr.message,
                    isHealthy: false
                });
            }
        }

        if (!anySuccess) {
            const firstErr = keyResults[0]?.error || 'Failed to authenticate API key.';
            return res.status(400).json({ 
                error: `All keys in pool failed: ${firstErr}`,
                keyResults 
            });
        }

        reply = (reply || '').replace(/^(assistant|bot|ai):\s*/i, '').trim();
        res.json({ 
            success: true, 
            reply, 
            latencyMs: fastestLatency,
            activeKey: activeKeyUsed,
            totalKeys: candidateKeys.length,
            maxTokensUsed: maxTokens || 1800,
            keyResults 
        });
    } catch (e) {
        console.error('[AI Test Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// Real-time AI Key Pool Health & Free-Tier Quota Status Synchronization
app.post('/api/ai/pool-status', authenticate, async (req, res) => {
    try {
        const { provider = 'gemini', apiKey, instanceId } = req.body;
        let rawKeys = apiKey ? String(apiKey).trim() : '';

        if (!rawKeys && instanceId) {
            const instRes = await pool.query('SELECT ai_api_key, ai_provider FROM instances WHERE id = $1', [instanceId]);
            if (instRes.rows.length > 0) {
                rawKeys = instRes.rows[0].ai_api_key || '';
            }
        }

        if (!rawKeys) {
            const userRes = await pool.query('SELECT gemini_api_key, openai_api_key FROM users WHERE id = $1', [req.user.id]);
            if (userRes.rows.length > 0) {
                rawKeys = provider === 'openai' 
                    ? (userRes.rows[0].openai_api_key || '')
                    : (userRes.rows[0].gemini_api_key || '');
            }
        }

        const candidateKeys = parseApiKeyList(rawKeys);
        const now = Date.now();

        const poolStatus = candidateKeys.map((key, idx) => {
            const cleanKey = String(key || '').trim();
            const masked = maskApiKey(cleanKey);
            const h = keyPoolHealth.get(cleanKey);
            const inCooldown = h && h.cooldownUntil && h.cooldownUntil > now;
            const cooldownRemainingSec = inCooldown ? Math.ceil((h.cooldownUntil - now) / 1000) : 0;
            const hasSuccess = h && h.successCount > 0;

            let status = 'ready';
            if (inCooldown) {
                status = 'cooldown';
            } else if (hasSuccess) {
                status = 'active';
            }

            return {
                index: idx + 1,
                keyMasked: masked,
                status,
                isHealthy: !inCooldown,
                isPrimary: idx === 0,
                cooldownRemainingSec,
                failCount: h ? (h.failCount || 0) : 0,
                successCount: h ? (h.successCount || 0) : 0,
                lastLatencyMs: h ? (h.lastLatencyMs || null) : null,
                lastError: h ? (h.lastError || null) : null
            };
        });

        const activeKey = poolStatus.find(k => k.isHealthy) || poolStatus[0] || null;

        res.json({
            success: true,
            provider,
            totalKeys: candidateKeys.length,
            pool: poolStatus,
            activeKeyIndex: activeKey ? activeKey.index : 1,
            autoShiftActive: poolStatus.some(k => k.status === 'cooldown')
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET active model status & auto-shift failover info for an instance
app.get('/api/ai/active-model/:instanceId', authenticate, async (req, res) => {
    try {
        const instId = String(req.params.instanceId);
        const instRes = await pool.query('SELECT ai_model, ai_provider FROM instances WHERE id = $1', [instId]);
        if (instRes.rows.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const primaryModel = instRes.rows[0].ai_model || (instRes.rows[0].ai_provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash');
        const activeInfo = instanceActiveModelMap.get(instId);

        res.json({
            success: true,
            instanceId: instId,
            primaryModel: primaryModel,
            activeModel: activeInfo ? activeInfo.activeModel : primaryModel,
            isShifted: activeInfo ? activeInfo.isShifted : false,
            shiftReason: activeInfo ? activeInfo.shiftReason : '',
            shiftTimestamp: activeInfo ? activeInfo.shiftTimestamp : null
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST reset active model back to primary model for an instance
app.post('/api/ai/reset-active-model/:instanceId', authenticate, async (req, res) => {
    try {
        const instId = String(req.params.instanceId);
        instanceActiveModelMap.delete(instId);
        if (io) {
            io.emit('model_failover_updated', { instanceId: instId, isShifted: false });
        }
        res.json({ success: true, message: 'Active model reset to primary configuration' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/ai/logs: Retrieve AI automation logs with filtering by instance, category, status, and search query
app.get('/api/ai/logs', authenticate, async (req, res) => {
    try {
        const { instanceId, provider, status, search, limit = 50, page = 1 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        let whereClauses = [];
        let params = [];

        // Restrict non-superadmin users to logs from instances they own
        if (req.user.role !== 'superadmin') {
            params.push(req.user.id);
            whereClauses.push(`instance_id IN (SELECT id FROM instances WHERE user_id = $${params.length})`);
        }

        // Filter by specific instance ID
        if (instanceId && instanceId !== 'all') {
            params.push(instanceId);
            whereClauses.push(`instance_id = $${params.length}`);
        }

        // Filter by provider category (meta or baileys)
        if (provider && provider !== 'all') {
            params.push(provider);
            whereClauses.push(`provider = $${params.length}`);
        }

        // Filter by status (success, rate_limited, failed)
        if (status && status !== 'all') {
            params.push(status);
            whereClauses.push(`status = $${params.length}`);
        }

        // Search in user prompt, AI response, remote JID, or masked key
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            whereClauses.push(`(user_prompt ILIKE $${params.length} OR ai_response ILIKE $${params.length} OR remote_jid ILIKE $${params.length} OR api_key_masked ILIKE $${params.length})`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query total count for pagination
        const countRes = await pool.query(`SELECT COUNT(*) as total FROM ai_automation_logs ${whereSql}`, params);
        const total = parseInt(countRes.rows[0]?.total || 0, 10);

        // Fetch paginated log rows sorted newest first
        const queryParams = [...params, limitNum, offset];
        const logsRes = await pool.query(
            `SELECT * FROM ai_automation_logs ${whereSql} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
            queryParams
        );

        res.json({
            success: true,
            logs: logsRes.rows,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/ai/logs: Clear AI automation logs for an instance or user
app.delete('/api/ai/logs', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.query;
        if (instanceId) {
            await pool.query('DELETE FROM ai_automation_logs WHERE instance_id = $1', [instanceId]);
        } else if (req.user.role === 'superadmin') {
            await pool.query('DELETE FROM ai_automation_logs');
        } else {
            await pool.query('DELETE FROM ai_automation_logs WHERE instance_id IN (SELECT id FROM instances WHERE user_id = $1)', [req.user.id]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// User Account AI Settings (Profile defaults)
app.get('/api/user/ai-settings', authenticate, async (req, res) => {
    try {
        const userRes = await pool.query('SELECT gemini_api_key, openai_api_key, default_ai_prompt, default_ai_provider, default_ai_model FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const u = userRes.rows[0];
        res.json({
            geminiApiKey: u.gemini_api_key || '',
            openaiApiKey: u.openai_api_key || '',
            defaultAiPrompt: u.default_ai_prompt || '',
            defaultAiProvider: u.default_ai_provider || 'gemini',
            defaultAiModel: u.default_ai_model || 'gemini-3.8-flash'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/user/ai-settings', authenticate, async (req, res) => {
    try {
        const { geminiApiKey, openaiApiKey, defaultAiPrompt, defaultAiProvider = 'gemini', defaultAiModel = 'gemini-3.8-flash' } = req.body;
        await pool.query(`
            UPDATE users SET 
                gemini_api_key = $1,
                openai_api_key = $2,
                default_ai_prompt = $3,
                default_ai_provider = $4,
                default_ai_model = $5
            WHERE id = $6
        `, [
            geminiApiKey !== undefined ? geminiApiKey : null,
            openaiApiKey !== undefined ? openaiApiKey : null,
            defaultAiPrompt !== undefined ? defaultAiPrompt : null,
            defaultAiProvider,
            defaultAiModel,
            req.user.id
        ]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/instance/:id/webhook', authenticate, async (req, res) => {
    try {
        // Verify ownership or superadmin
        if (req.user.role !== 'superadmin') {
            const check = await pool.query('SELECT user_id FROM instances WHERE id = $1', [req.params.id]);
            if (check.rows.length === 0 || check.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        await pool.query('UPDATE instances SET webhook_url = $1 WHERE id = $2', [req.body.webhookUrl, req.params.id]).catch(e => {
            console.warn("Webhook column might not exist yet. Run migrations.");
        });
        io.emit('instances_updated', { instanceId: req.params.id, action: 'webhook' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/instance/:id/reboot', authenticate, async (req, res) => {
    const { id } = req.params;
    const instance = instancesMap.get(id);
    if (instance?.sock) {
        instance.sock.end();
        // The connection.update event will handle the reconnection after 5 seconds
    } else {
        connectToWhatsApp(id);
    }
    io.emit('instances_updated', { instanceId: id, action: 'reboot' });
    res.json({ success: true });
});

app.delete('/api/instance/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const instance = instancesMap.get(id);
    if (instance?.sock) await instance.sock.logout().catch(() => {});
    instancesMap.delete(id);
    await pool.query('DELETE FROM instances WHERE id = $1', [id]);
    io.emit('instances_updated', { instanceId: id, action: 'delete' });
    res.json({ success: true });
});

app.post('/api/check-number', authenticate, async (req, res) => {
    const { instanceId, number } = req.body;
    const instance = instancesMap.get(instanceId);
    if (!instance || instance.status !== 'open') return res.status(400).json({ error: 'Instance offline' });
    try {
        const [result] = await instance.sock.onWhatsApp(number);
        res.json({ exists: !!result?.exists, jid: result?.jid });
    } catch (e) {
        res.json({ exists: false });
    }
});

async function handleSendApiMessage(req, res) {
    if (!outboundQueue) return res.status(503).json({ success: false, error: 'Messaging queue offline', message: 'Messaging queue offline' });

    const body = req.body || {};
    const query = req.query || {};

    const rawInstance = body.instanceId || body.instance_id || body.instanceKey || body.instance_key || body.instance || body.id || body.instaId || body.insta_id || query.instanceId || query.instance_id || query.instanceKey || query.instance_key || query.instance || query.id || query.instaId || query.insta_id || req.authInstanceId;
    const number = body.number || body.to || body.phone || body.recipient || body.receiver || body.mobile || query.number || query.to || query.phone || query.recipient;
    const message = body.message || body.text || body.body || body.caption || body.msg || query.message || query.text || query.body;
    const mediaUrl = body.mediaUrl || body.media_url || body.media || body.url;
    const mediaType = body.mediaType || body.media_type || body.type;
    const buttons = body.buttons || body.waButtons || body.wa_buttons;
    const options = body.options || {};

    const templateName = body.templateName || body.template_name || body.template || options.templateName || options.template_name;
    let templateLanguage = body.templateLanguage || body.template_language || body.language || options.templateLanguage || options.template_language;
    if (typeof templateLanguage === 'object' && templateLanguage !== null && templateLanguage.code) {
        templateLanguage = templateLanguage.code;
    }
    const templateVariables = body.templateVariables || body.template_variables || body.variables || body.components || body.parameters || options.templateVariables || options.template_variables || options.components || options.parameters;

    if (!rawInstance) {
        return res.status(400).json({ success: false, error: 'instanceId or instanceKey parameter is required', message: 'API Hub Error: Missing WhatsApp instanceId, instance_key, or insta_id parameter.' });
    }
    if (!number) {
        return res.status(400).json({ success: false, error: 'Recipient phone number (number / to / phone) is required', message: 'API Hub Error: Missing recipient phone number.' });
    }

    // Look up instance in database by ID, instance_key, Meta phone ID, or Meta WABA ID
    let instance;
    try {
        const instRes = await pool.query(
            'SELECT * FROM instances WHERE id = $1 OR instance_key = $1 OR meta_phone_number_id = $1 OR meta_waba_id = $1', 
            [rawInstance]
        );
        if (instRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Instance '${rawInstance}' not found.`, message: `Instance '${rawInstance}' not found in database.` });
        }
        instance = instRes.rows[0];
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Instance database lookup failed: ' + err.message, message: 'Instance database lookup failed: ' + err.message });
    }

    // Check ownership / permission
    if (req.user.role !== 'superadmin' && instance.user_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You do not have permission to use this instance.', message: 'You do not have permission to use this instance.' });
    }

    // Check subscription status
    if (req.user.role !== 'superadmin') {
        const sub = req.user.subscription;
        if (!sub || sub.status !== 'active' || (sub.expiry_date && new Date(sub.expiry_date) < new Date())) {
            return res.status(403).json({ success: false, error: 'Subscription expired or inactive. Please renew your plan to send messages.', message: 'Subscription expired or inactive. Please renew your plan to send messages.' });
        }
    }

    // If Meta instance, check wallet balance before queueing
    if (instance.provider === 'meta') {
        let costType = 'meta_regular_credit_cost';
        if (templateName) {
            costType = 'meta_utility_credit_cost';
            try {
                const tplRes = await pool.query('SELECT category FROM meta_templates WHERE name = $1 AND instance_id = $2', [templateName, instance.id]);
                if (tplRes.rows.length > 0) {
                    const cat = (tplRes.rows[0].category || '').toUpperCase();
                    if (cat === 'MARKETING') costType = 'meta_marketing_credit_cost';
                    else if (cat === 'AUTHENTICATION') costType = 'meta_authentication_credit_cost';
                    else if (cat === 'UTILITY') costType = 'meta_utility_credit_cost';
                }
            } catch (e) {}
        }

        let cost = 1;
        try {
            const settingsRes = await pool.query('SELECT value FROM system_settings WHERE key = $1', [costType]);
            if (settingsRes.rows.length > 0 && settingsRes.rows[0].value) {
                cost = parseFloat(settingsRes.rows[0].value) || 1;
            }
        } catch (e) {}

        const userBalRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id]);
        const walletBalance = userBalRes.rows.length > 0 ? (parseFloat(userBalRes.rows[0].wallet_balance) || 0) : 0;

        if (walletBalance < cost) {
            const errMsg = `Insufficient wallet balance. Sending this Meta message requires ₹${cost.toFixed(2)}, but current balance is ₹${walletBalance.toFixed(2)}. Please recharge wallet.`;
            return res.status(402).json({
                success: false,
                error: errMsg,
                message: errMsg
            });
        }
    }

    const mergedOptions = {
        ...options,
        templateName,
        templateLanguage: templateLanguage || 'en',
        templateVariables,
        components: body.components || options.components
    };

    try {
        const job = await outboundQueue.add('send-message', {
            userId: req.user.id,
            instanceId: instance.id,
            number,
            message,
            mediaUrl,
            mediaType,
            waButtons: buttons,
            options: mergedOptions
        });
        res.json({
            success: true,
            status: 'queued',
            message: 'Message queued successfully',
            messageId: `msg_${Date.now()}`,
            id: `msg_${Date.now()}`,
            jobId: job.id,
            instanceId: instance.id,
            instance_key: instance.instance_key || instance.id,
            provider: instance.provider
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, message: err.message });
    }
}

app.post('/api/send', authenticate, handleSendApiMessage);
app.post('/api/send-message', authenticate, handleSendApiMessage);
app.post('/api/meta/send', authenticate, handleSendApiMessage);

// --- SEO & CRAWLER ROUTES ---
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://ifastx.in/sitemap.xml
Sitemap: https://ifastx.in/wa/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ifastx.in/</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ifastx.in/wa/</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://ifastx.in/wa/#features</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://ifastx.in/wa/#pricing</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://ifastx.in/wa/#developers</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://ifastx.in/wa/#faq</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
});
app.post('/api/send-template', authenticate, handleSendApiMessage);
app.post('/v1/messages', authenticate, handleSendApiMessage);

app.post('/api/send-bulk', authenticate, async (req, res) => {
    const { instanceId, numbers, message, mediaUrl, mediaType, buttons, options } = req.body;
    if (!outboundQueue) return res.status(503).json({ error: 'Messaging queue offline' });
    
    if (!Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'Numbers array is required' });
    }

    // Check subscription status
    if (req.user.role !== 'superadmin') {
        const sub = req.user.subscription;
        if (!sub || sub.status !== 'active' || (sub.expiry_date && new Date(sub.expiry_date) < new Date())) {
            return res.status(403).json({ error: 'Subscription expired or inactive. Please renew your plan to send messages.' });
        }

        // Check daily message limit
        try {
            const limitRes = await pool.query(`
                SELECT CASE WHEN s.last_reset_date < CURRENT_DATE THEN 0 ELSE s.messages_sent_today END as messages_sent_today, s.custom_daily_limit, p.daily_limit 
                FROM subscriptions s 
                LEFT JOIN plans p ON s.plan_id = p.id 
                WHERE s.user_id = $1
            `, [req.user.id]);
            
            if (limitRes.rows.length > 0) {
                const limitData = limitRes.rows[0];
                const maxDaily = limitData.custom_daily_limit !== null ? limitData.custom_daily_limit : (limitData.daily_limit || 0);
                
                /* Limits are now handled by wallet fallback in worker */
            }
        } catch (err) {
            console.error('[API Send Bulk] Limit Check Error:', err.message);
        }
    }

    console.log(`[API Send Bulk] Processing bulk request for ${numbers.length} numbers.`);

    try {
        const campaignId = 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        
        let isMeta = false;
        if (instanceId) {
            const instObj = instancesMap.get(instanceId);
            if (instObj) {
                isMeta = instObj.provider === 'meta' || Boolean(instObj.metaPhoneNumberId || instObj.meta_phone_number_id);
            } else if (pool) {
                const instDb = await pool.query('SELECT provider, meta_phone_number_id FROM instances WHERE id = $1', [instanceId]);
                if (instDb.rows.length > 0) {
                    isMeta = instDb.rows[0].provider === 'meta' || Boolean(instDb.rows[0].meta_phone_number_id);
                }
            }
        }

        let currentDelay = 0;
        const dMin = Math.max(1, parseInt(options?.delayMin, 10) || 5);
        const dMax = Math.max(dMin, parseInt(options?.delayMax, 10) || 15);

        const jobs = numbers.map((num, idx) => {
            let jobDelay = 0;
            if (!isMeta && idx > 0) {
                const stepDelay = Math.floor(Math.random() * (dMax - dMin + 1) + dMin) * 1000;
                currentDelay += stepDelay;
                jobDelay = currentDelay;
            }
            return {
                name: 'send-bulk-message',
                data: {
                    campaignId,
                    userId: req.user.id,
                    instanceId,
                    number: num,
                    message,
                    mediaUrl,
                    mediaType,
                    waButtons: buttons,
                    options: {
                        ...options,
                        campaignId,
                        isMeta
                    }
                },
                opts: {
                    delay: jobDelay,
                    removeOnComplete: true
                }
            };
        });

        const chunkSize = 100;
        for (let i = 0; i < jobs.length; i += chunkSize) {
            const chunk = jobs.slice(i, i + chunkSize);
            if (outboundQueue) {
                await outboundQueue.addBulk(chunk);
            }
        }

        const campaignName = req.body.name?.trim() || options?.campaignName || `Bulk Campaign (${numbers.length} recipients)`;
        
        if (pool) {
            await pool.query(`
                INSERT INTO scheduled_campaigns (id, user_id, instance_id, name, message, media_url, media_type, buttons_json, numbers, options, total_recipients, scheduled_at, executed_at, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), 'processing')
                ON CONFLICT (id) DO UPDATE SET status = 'processing', total_recipients = EXCLUDED.total_recipients
            `, [
                campaignId,
                req.user.id,
                instanceId || '',
                campaignName,
                message || '',
                mediaUrl || '',
                mediaType || 'image',
                JSON.stringify(buttons || []),
                JSON.stringify(numbers),
                JSON.stringify(options || {}),
                numbers.length
            ]).catch(e => console.warn('[Bulk Send DB save notice]', e.message));
        }

        res.json({ 
            success: true, 
            campaignId,
            message: `${numbers.length} messages queued for bulk sending` 
        });
    } catch (err) {
        console.error('[API Send Bulk] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- BULK CAMPAIGN SCHEDULER ENGINE & ENDPOINTS ---

const inMemoryScheduledCampaigns = new Map();

// Executes a scheduled campaign by chunking numbers and queueing message dispatch jobs
async function executeScheduledCampaign(campaign) {
    if (!campaign || campaign.status !== 'scheduled') return;

    // Check Redis cancellation flag before execution start
    if (redisConnection) {
        try {
            const isCancelled = await redisConnection.get(`campaign_cancelled:${campaign.id}`);
            if (isCancelled) {
                campaign.status = 'cancelled';
                return;
            }
        } catch (e) {}
    }

    // Set campaign status to processing while messages are queued & dispatched
    campaign.status = 'processing';
    console.log(`[Scheduler] Executing scheduled campaign: ${campaign.id} (${campaign.name}) with ${campaign.numbers?.length || 0} recipients.`);

    // Persist processing status into database
    if (pool) {
        await pool.query(
            `UPDATE scheduled_campaigns SET status = 'processing', executed_at = NOW() WHERE id = $1`,
            [campaign.id]
        ).catch(() => {});
    }

    try {
        const { instanceId, numbers, message, mediaUrl, mediaType, buttons, options, userId } = campaign;
        let isMeta = false;
        if (instanceId) {
            const instObj = instancesMap.get(instanceId);
            if (instObj) {
                isMeta = instObj.provider === 'meta' || Boolean(instObj.metaPhoneNumberId || instObj.meta_phone_number_id);
            } else if (pool) {
                const instDb = await pool.query('SELECT provider, meta_phone_number_id FROM instances WHERE id = $1', [instanceId]);
                if (instDb.rows.length > 0) {
                    isMeta = instDb.rows[0].provider === 'meta' || Boolean(instDb.rows[0].meta_phone_number_id);
                }
            }
        }

        let currentDelay = 0;
        const dMin = Math.max(1, parseInt(options?.delayMin, 10) || 5);
        const dMax = Math.max(dMin, parseInt(options?.delayMax, 10) || 15);

        // Map recipient numbers into BullMQ queue job definitions
        const jobs = (numbers || []).map((num, idx) => {
            let jobDelay = 0;
            if (!isMeta && idx > 0) {
                const stepDelay = Math.floor(Math.random() * (dMax - dMin + 1) + dMin) * 1000;
                currentDelay += stepDelay;
                jobDelay = currentDelay;
            }
            return {
                name: 'send-scheduled-message',
                data: {
                    campaignId: campaign.id,
                    userId: userId || campaign.userId,
                    instanceId,
                    number: num,
                    message,
                    mediaUrl,
                    mediaType,
                    waButtons: buttons,
                    options: {
                        ...options,
                        campaignId: campaign.id,
                        isMeta
                    }
                },
                opts: {
                    delay: jobDelay,
                    removeOnComplete: true
                }
            };
        });

        // Add jobs in chunks to outbound BullMQ queue
        const chunkSize = 100;
        for (let i = 0; i < jobs.length; i += chunkSize) {
            const chunk = jobs.slice(i, i + chunkSize);
            if (outboundQueue) {
                await outboundQueue.addBulk(chunk);
            }
        }

        // Keep status as processing while jobs are being dispatched out of queue
        campaign.executedAt = new Date().toISOString();

        if (io) io.emit('campaign_status_updated', { id: campaign.id, status: 'processing' });
    } catch (err) {
        console.error(`[Scheduler] Execution error for campaign ${campaign.id}:`, err);
        campaign.status = 'failed';
        campaign.error = err.message;

        if (pool) {
            await pool.query(
                `UPDATE scheduled_campaigns SET status = 'failed', error = $2 WHERE id = $1`,
                [campaign.id, err.message]
            ).catch(() => {});
        }

        if (io) io.emit('campaign_status_updated', { id: campaign.id, status: 'failed', error: err.message });
    }
}

// Background scheduler tick checking for due campaigns every 15 seconds
setInterval(async () => {
    try {
        const now = new Date();

        // 1. Process in-memory due campaigns
        for (const [id, campaign] of inMemoryScheduledCampaigns.entries()) {
            if (campaign.status === 'scheduled' && new Date(campaign.scheduledAt) <= now) {
                await executeScheduledCampaign(campaign);
            }
        }

        // 2. Process database due campaigns
        if (pool) {
            const res = await pool.query(
                `SELECT * FROM scheduled_campaigns WHERE status = 'scheduled' AND scheduled_at <= NOW() ORDER BY scheduled_at ASC LIMIT 10`
            ).catch(() => ({ rows: [] }));

            for (const row of res.rows) {
                const mapped = {
                    id: row.id,
                    userId: row.user_id,
                    instanceId: row.instance_id,
                    name: row.name,
                    message: row.message,
                    mediaUrl: row.media_url,
                    mediaType: row.media_type,
                    buttons: typeof row.buttons_json === 'string' ? JSON.parse(row.buttons_json || '[]') : (row.buttons_json || []),
                    numbers: typeof row.numbers === 'string' ? JSON.parse(row.numbers || '[]') : (row.numbers || []),
                    options: typeof row.options === 'string' ? JSON.parse(row.options || '{}') : (row.options || {}),
                    totalRecipients: row.total_recipients,
                    scheduledAt: row.scheduled_at,
                    status: row.status
                };
                inMemoryScheduledCampaigns.set(mapped.id, mapped);
                await executeScheduledCampaign(mapped);
            }
        }
    } catch (e) {
        // Scheduler loop resilience
    }
}, 15000);

app.post('/api/campaigns/schedule', authenticate, async (req, res) => {
    const { instanceId, name, numbers, message, mediaUrl, mediaType, buttons, options, scheduledAt } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ error: 'At least one recipient phone number is required' });
    }
    if (!message && !mediaUrl) {
        return res.status(400).json({ error: 'Campaign message or media attachment is required' });
    }
    if (!scheduledAt) {
        return res.status(400).json({ error: 'Scheduled date and time is required' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduled date format' });
    }

    // Allow slight leeway (up to 30 seconds in the past due to network latency, else require future)
    if (scheduledDate.getTime() < Date.now() - 30000) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const campaignId = 'sched_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const campaign = {
        id: campaignId,
        userId: req.user.id,
        instanceId: instanceId || '',
        name: name?.trim() || `Campaign ${new Date(scheduledAt).toLocaleString()}`,
        message: message || '',
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'image',
        buttons: buttons || [],
        numbers,
        options: options || { delayMin: 5, delayMax: 15 },
        totalRecipients: numbers.length,
        scheduledAt: scheduledDate.toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString()
    };

    inMemoryScheduledCampaigns.set(campaignId, campaign);

    if (pool) {
        await pool.query(`
            INSERT INTO scheduled_campaigns (id, user_id, instance_id, name, message, media_url, media_type, buttons_json, numbers, options, total_recipients, scheduled_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled')
        `, [
            campaign.id,
            campaign.userId,
            campaign.instanceId,
            campaign.name,
            campaign.message,
            campaign.mediaUrl,
            campaign.mediaType,
            JSON.stringify(campaign.buttons),
            JSON.stringify(campaign.numbers),
            JSON.stringify(campaign.options),
            campaign.totalRecipients,
            campaign.scheduledAt
        ]).catch(e => console.warn('[Scheduler DB save warning]', e.message));
    }

    res.json({ 
        success: true, 
        message: `Campaign "${campaign.name}" scheduled for ${scheduledDate.toLocaleString()}`, 
        campaign 
    });
});

app.get('/api/campaigns/scheduled', authenticate, async (req, res) => {
    const userCampaigns = [];

    if (pool) {
        try {
            const q = req.user.role === 'superadmin'
                ? 'SELECT * FROM scheduled_campaigns ORDER BY scheduled_at DESC LIMIT 200'
                : 'SELECT * FROM scheduled_campaigns WHERE user_id = $1 ORDER BY scheduled_at DESC LIMIT 200';
            const params = req.user.role === 'superadmin' ? [] : [req.user.id];
            const dbRes = await pool.query(q, params);
            for (const r of dbRes.rows) {
                userCampaigns.push({
                    id: r.id,
                    userId: r.user_id,
                    instanceId: r.instance_id,
                    name: r.name,
                    message: r.message,
                    mediaUrl: r.media_url,
                    mediaType: r.media_type,
                    buttons: typeof r.buttons_json === 'string' ? JSON.parse(r.buttons_json || '[]') : (r.buttons_json || []),
                    numbers: typeof r.numbers === 'string' ? JSON.parse(r.numbers || '[]') : (r.numbers || []),
                    options: typeof r.options === 'string' ? JSON.parse(r.options || '{}') : (r.options || {}),
                    totalRecipients: r.total_recipients,
                    scheduledAt: r.scheduled_at,
                    status: r.status,
                    createdAt: r.created_at,
                    executedAt: r.executed_at,
                    error: r.error
                });
            }
        } catch (e) {}
    }

    // Merge in-memory campaigns if not already present
    for (const c of inMemoryScheduledCampaigns.values()) {
        if (req.user.role === 'superadmin' || c.userId === req.user.id) {
            if (!userCampaigns.some(existing => existing.id === c.id)) {
                userCampaigns.push(c);
            }
        }
    }

    userCampaigns.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    res.json({ success: true, campaigns: userCampaigns });
});

app.post(['/api/campaigns/scheduled/:id/cancel', '/api/campaigns/:id/stop'], authenticate, async (req, res) => {
    const { id } = req.params;
    let found = false;

    // 1. Set campaign cancellation flag in Redis so queue worker skips any remaining jobs
    try {
        if (redisConnection) {
            await redisConnection.set(`campaign_cancelled:${id}`, '1', 'EX', 86400 * 7);
        }
    } catch (e) {
        console.warn('[Cancel Campaign Redis Warning]', e.message);
    }

    // 2. Mark in-memory scheduled campaign record as cancelled
    if (inMemoryScheduledCampaigns.has(id)) {
        const c = inMemoryScheduledCampaigns.get(id);
        if (req.user.role === 'superadmin' || c.userId === req.user.id) {
            c.status = 'cancelled';
            found = true;
        }
    }

    // 3. Update database record status to cancelled regardless of current status
    if (pool) {
        const q = req.user.role === 'superadmin'
            ? `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE id = $1`
            : `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE id = $1 AND user_id = $2`;
        const params = req.user.role === 'superadmin' ? [id] : [id, req.user.id];
        const dbRes = await pool.query(q, params).catch(() => ({ rowCount: 0 }));
        if (dbRes.rowCount > 0) found = true;
    }

    // 4. Drain matching delayed, waiting, or active jobs from BullMQ queue
    if (outboundQueue) {
        try {
            const jobs = await outboundQueue.getJobs(['delayed', 'waiting', 'active', 'paused', 'prioritized']);
            for (const job of jobs) {
                if (job && job.data && (job.data.campaignId === id || job.data.options?.campaignId === id)) {
                    await job.remove().catch(() => {});
                    found = true;
                }
            }
        } catch (qErr) {
            console.warn('[Queue Cleanup Warning]', qErr.message);
        }
    }

    // Emit realtime socket event for campaign status update
    if (io) {
        io.emit('campaign_status_updated', { id, status: 'cancelled' });
    }

    res.json({ success: true, message: 'Campaign cancelled / stopped successfully' });
});

app.post(['/api/campaigns/stop-active', '/api/queue/stop-active'], authenticate, async (req, res) => {
    const userId = req.user.id;
    const nowTs = Date.now().toString();
    const campaignId = req.body?.campaignId;

    let clearedJobsCount = 0;

    // 1. Signal Redis to immediately drop all current jobs from this user timestamp or campaign
    try {
        if (redisConnection) {
            await redisConnection.set(`user_queue_stopped:${userId}`, nowTs, 'EX', 86400 * 7);
            if (campaignId) {
                await redisConnection.set(`campaign_cancelled:${campaignId}`, '1', 'EX', 86400 * 7);
            }
        }
    } catch (e) {
        console.warn('[Stop Active Redis Warning]', e.message);
    }

    // 2. Mark in-memory campaign status as cancelled
    for (const [cId, c] of inMemoryScheduledCampaigns.entries()) {
        if ((req.user.role === 'superadmin' || c.userId === userId) && (!campaignId || cId === campaignId)) {
            c.status = 'cancelled';
        }
    }

    // 3. Mark database campaign status as cancelled
    if (pool) {
        try {
            if (campaignId) {
                const q = req.user.role === 'superadmin'
                    ? `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE id = $1`
                    : `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE id = $1 AND user_id = $2`;
                await pool.query(q, req.user.role === 'superadmin' ? [campaignId] : [campaignId, userId]);
            } else {
                const q = req.user.role === 'superadmin'
                    ? `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE status IN ('scheduled', 'processing')`
                    : `UPDATE scheduled_campaigns SET status = 'cancelled' WHERE user_id = $1 AND status IN ('scheduled', 'processing')`;
                await pool.query(q, req.user.role === 'superadmin' ? [] : [userId]);
            }
        } catch (dbErr) {
            console.warn('[Stop Active DB Warning]', dbErr.message);
        }
    }

    // 4. Actively purge pending/delayed/active jobs from BullMQ queue
    if (outboundQueue) {
        try {
            const jobs = await outboundQueue.getJobs(['delayed', 'waiting', 'active', 'paused', 'prioritized']);
            for (const job of jobs) {
                if (job && job.data && (job.data.userId === userId || req.user.role === 'superadmin')) {
                    if (!campaignId || job.data.campaignId === campaignId || job.data.options?.campaignId === campaignId) {
                        await job.remove().catch(() => {});
                        clearedJobsCount++;
                    }
                }
            }
        } catch (qErr) {
            console.warn('[Queue Stop Warning]', qErr.message);
        }
    }

    // Emit realtime socket events
    if (io) {
        io.emit('user_queue_stopped', { userId, campaignId, stoppedAt: nowTs });
        if (campaignId) {
            io.emit('campaign_status_updated', { id: campaignId, status: 'cancelled' });
        }
    }

    console.log(`[Campaign Stop] User ${userId} stopped active campaign ${campaignId || 'all'}. Cleared ${clearedJobsCount} queued jobs.`);
    res.json({
        success: true,
        message: 'Active campaign & outbound queue stopped successfully.',
        clearedJobs: clearedJobsCount
    });
});

app.post('/api/campaigns/scheduled/:id/execute-now', authenticate, async (req, res) => {
    const { id } = req.params;
    let campaign = inMemoryScheduledCampaigns.get(id);

    if (!campaign && pool) {
        const q = req.user.role === 'superadmin'
            ? `SELECT * FROM scheduled_campaigns WHERE id = $1`
            : `SELECT * FROM scheduled_campaigns WHERE id = $1 AND user_id = $2`;
        const params = req.user.role === 'superadmin' ? [id] : [id, req.user.id];
        const dbRes = await pool.query(q, params).catch(() => ({ rows: [] }));
        if (dbRes.rows.length > 0) {
            const r = dbRes.rows[0];
            campaign = {
                id: r.id,
                userId: r.user_id,
                instanceId: r.instance_id,
                name: r.name,
                message: r.message,
                mediaUrl: r.media_url,
                mediaType: r.media_type,
                buttons: typeof r.buttons_json === 'string' ? JSON.parse(r.buttons_json || '[]') : (r.buttons_json || []),
                numbers: typeof r.numbers === 'string' ? JSON.parse(r.numbers || '[]') : (r.numbers || []),
                options: typeof r.options === 'string' ? JSON.parse(r.options || '{}') : (r.options || {}),
                totalRecipients: r.total_recipients,
                scheduledAt: r.scheduled_at,
                status: r.status
            };
            inMemoryScheduledCampaigns.set(campaign.id, campaign);
        }
    }

    if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'scheduled') {
        return res.status(400).json({ error: `Campaign cannot be executed because status is "${campaign.status}"` });
    }

    await executeScheduledCampaign(campaign);
    res.json({ success: true, message: 'Campaign execution started immediately' });
});

app.delete('/api/campaigns/scheduled/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    inMemoryScheduledCampaigns.delete(id);

    if (pool) {
        const q = req.user.role === 'superadmin'
            ? `DELETE FROM scheduled_campaigns WHERE id = $1`
            : `DELETE FROM scheduled_campaigns WHERE id = $1 AND user_id = $2`;
        const params = req.user.role === 'superadmin' ? [id] : [id, req.user.id];
        await pool.query(q, params).catch(() => {});
    }

    res.json({ success: true, message: 'Scheduled campaign deleted' });
});

app.get('/api/campaigns/active', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const isSuper = req.user.role === 'superadmin';

        let campaigns = [];
        if (pool) {
            const q = isSuper
                ? `SELECT sc.*, i.name as instance_name, i.provider as instance_provider 
                   FROM scheduled_campaigns sc 
                   LEFT JOIN instances i ON sc.instance_id = i.id 
                   ORDER BY COALESCE(sc.executed_at, sc.created_at, sc.scheduled_at, NOW()) DESC LIMIT 50`
                : `SELECT sc.*, i.name as instance_name, i.provider as instance_provider 
                   FROM scheduled_campaigns sc 
                   LEFT JOIN instances i ON sc.instance_id = i.id 
                   WHERE sc.user_id = $1
                   ORDER BY COALESCE(sc.executed_at, sc.created_at, sc.scheduled_at, NOW()) DESC LIMIT 50`;
            const params = isSuper ? [] : [userId];
            const dbRes = await pool.query(q, params).catch(() => ({ rows: [] }));
            campaigns = dbRes.rows;
        }

        const activeCampaigns = [];
        for (const r of campaigns) {
            let sentCount = 0;
            let failedCount = 0;

            if (pool) {
                const metricsRes = await pool.query(`
                    SELECT 
                        COUNT(CASE WHEN status IN ('sent', 'delivered', 'success', 'read', 'resolved_sent') THEN 1 END) as sent_count,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
                    FROM message_logs 
                    WHERE campaign_id = $1
                `, [r.id]).catch(() => ({ rows: [{ sent_count: 0, failed_count: 0 }] }));

                if (metricsRes.rows && metricsRes.rows.length > 0) {
                    sentCount = parseInt(metricsRes.rows[0].sent_count, 10) || 0;
                    failedCount = parseInt(metricsRes.rows[0].failed_count, 10) || 0;
                }
            }

            const total = parseInt(r.total_recipients, 10) || 0;
            const pending = Math.max(0, total - sentCount - failedCount);

            let status = r.status || 'processing';
            if ((status === 'processing' || status === 'scheduled') && (sentCount + failedCount >= total || pending === 0) && total > 0) {
                status = 'completed';
                if (pool) {
                    pool.query("UPDATE scheduled_campaigns SET status = 'completed' WHERE id = $1", [r.id]).catch(() => {});
                }
            }

            activeCampaigns.push({
                id: r.id,
                userId: r.user_id,
                instanceId: r.instance_id,
                instanceName: r.instance_name || 'Default Instance',
                instanceProvider: r.instance_provider || 'baileys',
                name: r.name,
                message: r.message,
                totalRecipients: total,
                sentCount,
                failedCount,
                pendingCount: pending,
                status,
                createdAt: r.created_at,
                scheduledAt: r.scheduled_at,
                executedAt: r.executed_at
            });
        }

        res.json({ success: true, campaigns: activeCampaigns });
    } catch (err) {
        console.error('[Active Campaigns Endpoint Error]', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/campaigns/:id/status', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user.id;
        const isSuper = req.user.role === 'superadmin';

        let campaign = null;
        if (pool) {
            const q = isSuper
                ? `SELECT sc.*, i.name as instance_name FROM scheduled_campaigns sc LEFT JOIN instances i ON sc.instance_id = i.id WHERE sc.id = $1`
                : `SELECT sc.*, i.name as instance_name FROM scheduled_campaigns sc LEFT JOIN instances i ON sc.instance_id = i.id WHERE sc.id = $1 AND sc.user_id = $2`;
            const params = isSuper ? [id] : [id, userId];
            const dbRes = await pool.query(q, params).catch(() => ({ rows: [] }));
            if (dbRes.rows.length > 0) campaign = dbRes.rows[0];
        }

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        let logs = [];
        if (pool) {
            const logsRes = await pool.query(`
                SELECT recipient, status, error, message_id, content, created_at 
                FROM message_logs 
                WHERE campaign_id = $1 
                ORDER BY created_at DESC 
                LIMIT 1000
            `, [id]).catch(() => ({ rows: [] }));
            logs = logsRes.rows;
        }

        const sentCount = logs.filter(l => ['sent', 'delivered', 'success', 'read', 'resolved_sent'].includes(l.status)).length;
        const failedCount = logs.filter(l => l.status === 'failed').length;
        const total = parseInt(campaign.total_recipients, 10) || 0;

        res.json({
            success: true,
            campaign: {
                id: campaign.id,
                name: campaign.name,
                instanceId: campaign.instance_id,
                instanceName: campaign.instance_name || 'Default Instance',
                status: campaign.status,
                totalRecipients: total,
                sentCount,
                failedCount,
                pendingCount: Math.max(0, total - sentCount - failedCount),
                createdAt: campaign.created_at,
                logs
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MEDIA MANAGEMENT ---

app.post('/api/upload', authenticate, async (req, res) => {
    const { fileName, fileType, base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'No file data provided' });
    
    try {
        const uniqueName = Date.now() + '-' + fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
        
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const baseUrl = process.env.APP_URL || (protocol + '://' + host);
        const url = baseUrl + '/uploads/' + uniqueName;
        
        res.json({ url });
    } catch (e) {
        console.error("Upload error:", e);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
    
    

app.post('/api/media', authenticate, async (req, res) => {
    const { id, name, url, type, caption, tag } = req.body;
    try {
        await pool.query(
            `INSERT INTO media_assets (id, user_id, name, url, type, caption, tag) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, type = EXCLUDED.type, caption = EXCLUDED.caption, tag = EXCLUDED.tag`,
            [id, req.user.id, name, url, type, caption || null, tag || null]
        );
        io.emit('media_updated', { userId: req.user.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/media', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' 
            ? 'SELECT * FROM media_assets ORDER BY created_at DESC' 
            : 'SELECT * FROM media_assets WHERE user_id = $1 ORDER BY created_at DESC';
        const params = req.user.role === 'superadmin' ? [] : [req.user.id];
        const result = await pool.query(query, params);
        // Map database fields to camelCase for the frontend
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            url: row.url,
            type: row.type,
            caption: row.caption || null,
            tag: row.tag || null,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/media/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM media_assets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        io.emit('media_updated', { userId: req.user.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- CONTACTS ---

app.get('/api/contacts/groups', authenticate, async (req, res) => {
    try {
        // Fetch groups
        const groupResult = await pool.query('SELECT * FROM contact_groups WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        if (groupResult.rows.length === 0) {
            return res.json([]);
        }

        const groups = groupResult.rows.map(g => ({
            id: g.id,
            name: g.name,
            userId: g.user_id,
            createdAt: g.created_at ? new Date(g.created_at).toISOString() : null,
            contacts: []
        }));

        const groupIds = groups.map(g => g.id);

        // Fetch all contacts in a single batch query instead of N+1 sequential loop
        const contactResult = await pool.query(
            'SELECT id, group_id, number, original, status_exists FROM contacts WHERE group_id = ANY($1::text[])',
            [groupIds]
        );

        const contactsByGroup = {};
        for (const c of contactResult.rows || []) {
            if (!contactsByGroup[c.group_id]) contactsByGroup[c.group_id] = [];
            contactsByGroup[c.group_id].push({
                id: c.id,
                number: c.number,
                original: c.original,
                isVerified: true,
                exists: c.status_exists
            });
        }

        for (const g of groups) {
            g.contacts = contactsByGroup[g.id] || [];
        }

        res.json(groups);
    } catch (e) { 
        console.error('[GET /api/contacts/groups] Error:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/contacts/groups', authenticate, async (req, res) => {
    const { id, name, contacts } = req.body;
    
    if (!id || !name) {
        return res.status(400).json({ error: 'Group ID and Name are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Persist the Group
        const groupRes = await client.query(
            'INSERT INTO contact_groups (id, user_id, name) VALUES ($1, $2, $3) RETURNING created_at', 
            [id, req.user.id, name]
        );
        
        const serverCreatedAt = groupRes.rows[0].created_at;
        const savedContacts = [];
        
        // 2. Persist individual contacts if they exist
        if (contacts && Array.isArray(contacts) && contacts.length > 0) {
            console.log(`[Contacts] Saving ${contacts.length} contacts for group ${name} (${id})`);
            for (const c of contacts) {
                const cleanNumber = String(c.number).replace(/\D/g, '');
                
                await client.query(
                    'INSERT INTO contacts (id, group_id, number, original, status_exists) VALUES ($1, $2, $3, $4, $5)',
                    [c.id, id, cleanNumber, c.original, c.exists || false]
                );
                
                savedContacts.push({
                    id: c.id,
                    number: cleanNumber,
                    original: c.original,
                    isVerified: true,
                    exists: c.exists || false
                });
            }
        }
        
        await client.query('COMMIT');
        io.emit('contacts_updated', { userId: req.user.id });
        
        // 3. Return full persisted object with correct field mapping
        res.json({ 
            success: true, 
            group: {
                id,
                name,
                userId: req.user.id,
                contacts: savedContacts,
                createdAt: serverCreatedAt ? new Date(serverCreatedAt).toISOString() : new Date().toISOString()
            }
        });
    } catch (e) { 
        await client.query('ROLLBACK');
        console.error('[POST /api/contacts/groups] Database Transaction Failed:', e.message);
        res.status(500).json({ error: `Internal persistence error: ${e.message}` }); 
    } finally {
        client.release();
    }
});

// Added missing DELETE endpoint to handle group removal
app.delete('/api/contacts/groups/:id', authenticate, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM contact_groups WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Group not found or unauthorized' });
        }
        io.emit('contacts_updated', { userId: req.user.id });
        res.json({ success: true });
    } catch (e) {
        console.error('[DELETE /api/contacts/groups] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});


// --- META TEMPLATES & AUTOMATIONS ---

app.get('/api/meta/templates/sync/:instanceId', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        if (!inst.meta_waba_id || !inst.meta_access_token) return res.status(400).json({ error: 'Not a properly configured Meta instance' });

        const url = `https://graph.facebook.com/v26.0/${inst.meta_waba_id}/message_templates`;
        console.log(`[META SYNC] Fetching templates for WABA ID ${inst.meta_waba_id}...`);
        const fetchRes = await fetch(url, { headers: { 'Authorization': `Bearer ${inst.meta_access_token}` } });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            console.error("[META SYNC ERROR] API returned error:", JSON.stringify(json));
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        console.log(`[META SYNC] Successfully fetched ${json.data ? json.data.length : 0} templates`);
        
        const templates = json.data || [];
        for (const t of templates) {
            const compositeId = `${req.params.instanceId}_${t.id || (t.name + '_' + t.language)}`;
            await pool.query(
                'INSERT INTO meta_templates (id, instance_id, name, language, status, category, components) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (instance_id, name, language) DO UPDATE SET status = EXCLUDED.status, category = EXCLUDED.category, components = EXCLUDED.components',
                [compositeId, req.params.instanceId, t.name, t.language, t.status, t.category, JSON.stringify(t.components)]
            );
        }
        
        res.json({ success: true, count: templates.length });
    } catch (e) {
        console.error("META TEMPLATE SYNC ERROR:", e);
        res.status(500).json({ error: e.message });
    }
});

async function getMetaMediaObjectServer(linkUrl, instance, mType = 'image') {
    const DEFAULT_IMAGE = 'https://dummyimage.com/600x400/25d366/ffffff.png';
    const DEFAULT_DOC = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const DEFAULT_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

    const getFallback = (t) => {
        const clean = (t || 'image').toLowerCase();
        if (clean === 'document' || clean === 'pdf') return DEFAULT_DOC;
        if (clean === 'video') return DEFAULT_VIDEO;
        return DEFAULT_IMAGE;
    };

    if (!linkUrl || linkUrl.includes('ifastx.in/sample.jpg')) return { link: getFallback(mType) };

    if (typeof linkUrl === 'object' && linkUrl !== null) {
        if (linkUrl.id) return { id: linkUrl.id };
        if (linkUrl.link) linkUrl = linkUrl.link;
    }

    if (typeof linkUrl !== 'string') return { link: getFallback(mType) };

    try {
        let buffer = null;
        let mimeType = 'image/jpeg';

        if (linkUrl.startsWith('data:')) {
            const mimeMatch = linkUrl.match(/^data:(.*?);base64,/);
            if (mimeMatch) mimeType = mimeMatch[1];
            const base64Data = linkUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else if (linkUrl.startsWith('/uploads/') || linkUrl.startsWith('uploads/') || linkUrl.includes('uploads/')) {
            const fs = require('fs');
            const path = require('path');
            const cleanRel = linkUrl.substring(linkUrl.indexOf('uploads/'));
            const localPath = path.join(__dirname, cleanRel);
            if (fs.existsSync(localPath)) {
                buffer = fs.readFileSync(localPath);
                let ext = path.extname(localPath).slice(1).toLowerCase() || 'jpg';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'png') mimeType = 'image/png';
                else if (ext === 'pdf') mimeType = 'application/pdf';
                else if (ext === 'mp4') mimeType = 'video/mp4';
            }
        } else if (linkUrl.startsWith('http')) {
            const headers = {};
            const token = instance.metaAccessToken || instance.meta_access_token || instance.metaToken;
            if (linkUrl.includes('fbsbx.com') || linkUrl.includes('fbcdn.net') || linkUrl.includes('facebook.com') || linkUrl.includes('graph.facebook.com')) {
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            console.log(`[Server Meta Media] Fetching source media: ${linkUrl.substring(0, 90)}...`);
            const fetchRes = await fetch(linkUrl, { headers });
            if (!fetchRes.ok) {
                console.error(`[Server Meta Media] Fetch failed with HTTP status ${fetchRes.status}`);
                throw new Error(`Media download status ${fetchRes.status}`);
            }
            mimeType = fetchRes.headers.get('content-type') || mimeType;
            const arrayBuf = await fetchRes.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
        }

        const phoneId = instance.metaPhoneNumberId || instance.meta_phone_number_id || instance.phone;
        const token = instance.metaAccessToken || instance.meta_access_token || instance.metaToken;

        if (buffer && phoneId && token) {
            const cleanType = (mType || 'image').toLowerCase();
            if (cleanType === 'image' && !mimeType.startsWith('image/')) mimeType = 'image/jpeg';
            if (cleanType === 'video' && !mimeType.startsWith('video/')) mimeType = 'video/mp4';
            if (cleanType === 'document' && !mimeType.includes('pdf')) {
                if (!mimeType || mimeType === 'application/octet-stream') mimeType = 'application/pdf';
            }
            if (cleanType === 'audio' || cleanType === 'voice') {
                if (!mimeType || !mimeType.startsWith('audio/')) {
                    mimeType = 'audio/ogg; codecs=opus';
                }
            }

            let ext = mimeType.split('/')[1] || 'jpg';
            if (ext.includes(';')) ext = ext.split(';')[0];
            if (cleanType === 'audio' || cleanType === 'voice') {
                ext = ext.replace('codecs=opus', '').trim() || 'ogg';
            }

            const form = new FormData();
            form.append('messaging_product', 'whatsapp');
            form.append('type', mimeType);
            const blob = new Blob([buffer], { type: mimeType });
            form.append('file', blob, `upload_${Date.now()}.${ext}`);

            console.log(`[Server Meta Media] Uploading media to WhatsApp API for phoneId ${phoneId}...`);
            const uploadRes = await fetch(`https://graph.facebook.com/v26.0/${phoneId}/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: form
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok && uploadData.id) {
                console.log(`[Server Meta Media] Generated Meta Media ID: ${uploadData.id}`);
                return { id: uploadData.id };
            } else {
                console.error(`[Server Meta Media] WhatsApp Media API upload error:`, uploadData);
            }
        }
    } catch (err) {
        console.error(`[Server Meta Media] Error during media upload:`, err.message);
    }

    return { link: linkUrl };
}

async function processMetaTemplateComponents(components, accessToken, appId) {
    if (!Array.isArray(components)) return components;
    
    for (let comp of components) {
        if (comp && comp.type === 'HEADER' && comp.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format)) {
            if (comp.example && (comp.example.header_handle || comp.example.header_url)) {
                const urlArr = comp.example.header_handle || comp.example.header_url;
                if (urlArr && urlArr.length > 0) {
                    const sampleUrl = urlArr[0];
                    if (typeof sampleUrl === 'string' && sampleUrl.startsWith('http')) {
                        try {
                            console.log("[Meta Template] Downloading example media from:", sampleUrl);
                            const mediaRes = await fetch(sampleUrl);
                            if (!mediaRes.ok) throw new Error(`Media fetch returned status ${mediaRes.status}`);
                            const mediaBuffer = await mediaRes.arrayBuffer();
                            const fileLength = mediaBuffer.byteLength;
                            let mimeType = mediaRes.headers.get('content-type') || 'image/jpeg';
                            if (comp.format === 'IMAGE' && !mimeType.startsWith('image/')) mimeType = 'image/jpeg';
                            if (comp.format === 'VIDEO' && !mimeType.startsWith('video/')) mimeType = 'video/mp4';
                            if (comp.format === 'DOCUMENT' && !mimeType.includes('pdf')) mimeType = 'application/pdf';
                            
                            let targetApp = appId;
                            if (!targetApp) {
                                try {
                                    const appRes = await fetch(`https://graph.facebook.com/v26.0/app`, {
                                        headers: { 'Authorization': `Bearer ${accessToken}` }
                                    });
                                    const appData = await appRes.json();
                                    targetApp = appData.id;
                                } catch (err) {}
                            }
                            
                            const sessionEndpoint = targetApp ? 
                                `https://graph.facebook.com/v26.0/${targetApp}/uploads?file_length=${fileLength}&file_type=${encodeURIComponent(mimeType)}` :
                                `https://graph.facebook.com/v26.0/app/uploads?file_length=${fileLength}&file_type=${encodeURIComponent(mimeType)}`;

                            console.log("[Meta Template] Starting upload session:", sessionEndpoint);
                            const sessionRes = await fetch(sessionEndpoint, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            const sessionData = await sessionRes.json();
                            
                            if (sessionData.id) {
                                const sessionId = sessionData.id;
                                console.log("[Meta Template] Session ID created:", sessionId);
                                const uploadRes = await fetch(`https://graph.facebook.com/v26.0/${sessionId}`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `OAuth ${accessToken}`,
                                        'file_offset': '0'
                                    },
                                    body: Buffer.from(mediaBuffer)
                                });
                                const uploadData = await uploadRes.json();
                                console.log("[Meta Template] Upload handle result:", uploadData);
                                if (uploadData.h) {
                                    comp.example = { header_handle: [uploadData.h] };
                                } else {
                                    delete comp.example.header_url;
                                    console.error("[Meta Template] Failed to get handle from session:", uploadData);
                                }
                            } else {
                                delete comp.example.header_url;
                                console.error("[Meta Template] Failed to create upload session:", sessionData);
                            }
                        } catch (e) {
                            delete comp.example.header_url;
                            console.error("[Meta Template] Error processing example media:", e.message);
                        }
                    } else if (Array.isArray(comp.example.header_handle)) {
                        comp.example = { header_handle: comp.example.header_handle };
                    }
                }
            }
        }
    }
    return components;
}

app.post('/api/meta/templates/create/:instanceId', authenticate, async (req, res) => {
    try {
        const { name, category, language, components } = req.body;
        const instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND user_id = $2', [req.params.instanceId, req.user.id]);
        if (instRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        const inst = instRes.rows[0];
        
        if (inst.provider !== 'meta' || !inst.meta_waba_id) {
            return res.status(400).json({ error: 'Not a valid Meta instance with WABA ID' });
        }
        
        // Process components for handles
        const processedComponents = await processMetaTemplateComponents(components, inst.meta_access_token, inst.meta_app_id);

        const payload = {
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            language: language || 'en',
            category: category || 'MARKETING',
            components: processedComponents
        };

        const response = await fetch(`https://graph.facebook.com/v26.0/${inst.meta_waba_id}/message_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${inst.meta_access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log("[Meta Template Create Payload]", JSON.stringify(payload, null, 2));
        console.log("[Meta Template Create Response]", JSON.stringify(data, null, 2));
        if (!response.ok || data.error) {
            let errMsg = data.error?.error_user_msg || data.error?.message || 'Meta API error';
            if (data.error?.error_data) {
                errMsg += " Details: " + JSON.stringify(data.error.error_data);
            }
            return res.status(400).json({ error: errMsg });
        }
        
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



app.delete('/api/meta/templates/:instanceId/:templateName', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        
        const url = `https://graph.facebook.com/v26.0/${inst.meta_waba_id}/message_templates?name=${req.params.templateName}`;
        const fetchRes = await fetch(url, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${inst.meta_access_token}` } 
        });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        await pool.query('DELETE FROM meta_templates WHERE instance_id = $1 AND name = $2', [req.params.instanceId, req.params.templateName]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/meta/templates/edit/:instanceId/:templateId', authenticate, async (req, res) => {
    try {
        const { components } = req.body;
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        
        for (let comp of components) {
            if (comp.type === 'HEADER' && comp.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format)) {
                if (comp.example && (comp.example.header_handle || comp.example.header_url)) {
                    const urlArr = comp.example.header_handle || comp.example.header_url;
                    if (urlArr && urlArr.length > 0) {
                        const sampleUrl = urlArr[0];
                        if (sampleUrl && sampleUrl.startsWith('http')) {
                            try {
                                console.log("[Meta Template] Downloading example media from:", sampleUrl);
                                const debugRes = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${inst.meta_access_token}&access_token=${inst.meta_access_token}`);
                                const debugData = await debugRes.json();
                                const appId = debugData.data?.app_id;
                                
                                if (appId) {
                                    const mediaRes = await fetch(sampleUrl);
                                    const mediaBuffer = await mediaRes.arrayBuffer();
                                    const fileLength = mediaBuffer.byteLength;
                                    const mimeType = mediaRes.headers.get('content-type') || 'image/jpeg';
                                    
                                    const sessionRes = await fetch(`https://graph.facebook.com/v26.0/${appId}/uploads?file_length=${fileLength}&file_type=${mimeType}`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${inst.meta_access_token}` }
                                    });
                                    const sessionData = await sessionRes.json();
                                    const sessionId = sessionData.id;
                                    
                                    if (sessionId) {
                                        const uploadRes = await fetch(`https://graph.facebook.com/v26.0/${sessionId}`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${inst.meta_access_token}`,
                                                'file_offset': '0'
                                            },
                                            body: Buffer.from(mediaBuffer)
                                        });
                                        const uploadData = await uploadRes.json();
                                        if (uploadData.h) {
                                            comp.example.header_handle = [uploadData.h];
                                            delete comp.example.header_url;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("[Meta Template] Error uploading media example:", e.message);
                            }
                        }
                    }
                }
            }
        }

        const url = `https://graph.facebook.com/v26.0/${req.params.templateId}`;
        const fetchRes = await fetch(url, { 
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${inst.meta_access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ components })
        });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        await pool.query('UPDATE meta_templates SET components = $1, status = $2 WHERE id = $3', [JSON.stringify(components), 'PENDING', req.params.templateId]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

async function handleFetchAndGetTemplates(req, res) {
    try {
        const body = req.body || {};
        const query = req.query || {};
        const params = req.params || {};

        const rawInstance = params.instanceId || params.id || params.instance_key ||
            query.instanceId || query.instance_id || query.wa_instance_id || query.instanceKey || query.instance_key || query.instaId || query.insta_id || query.instance ||
            body.instanceId || body.instance_id || body.wa_instance_id || body.instanceKey || body.instance_key || body.instaId || body.insta_id || body.instance ||
            req.authInstanceId;

        let instance = null;

        if (rawInstance) {
            const instRes = await pool.query(
                'SELECT * FROM instances WHERE id = $1 OR instance_key = $1 OR meta_phone_number_id = $1 OR meta_waba_id = $1',
                [rawInstance]
            );
            if (instRes.rows.length > 0) {
                instance = instRes.rows[0];
            }
        }

        if (!instance && req.user) {
            const userInstRes = await pool.query(
                "SELECT * FROM instances WHERE user_id = $1 AND provider = 'meta' ORDER BY created_at DESC LIMIT 1",
                [req.user.id]
            );
            if (userInstRes.rows.length > 0) {
                instance = userInstRes.rows[0];
            } else {
                const anyInstRes = await pool.query(
                    "SELECT * FROM instances WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                    [req.user.id]
                );
                if (anyInstRes.rows.length > 0) {
                    instance = anyInstRes.rows[0];
                }
            }
        }

        let liveTemplates = [];
        let fetchedFromMeta = false;

        if (instance && instance.meta_waba_id && instance.meta_access_token) {
            try {
                const metaUrl = `https://graph.facebook.com/v26.0/${instance.meta_waba_id}/message_templates?limit=100`;
                console.log(`[META TEMPLATE FETCH] Fetching templates for WABA ID ${instance.meta_waba_id}...`);
                const fetchRes = await fetch(metaUrl, {
                    headers: { 'Authorization': `Bearer ${instance.meta_access_token}` }
                });
                const metaJson = await fetchRes.json();

                if (fetchRes.ok && metaJson.data) {
                    liveTemplates = metaJson.data;
                    fetchedFromMeta = true;

                    for (const t of liveTemplates) {
                        const compositeId = `${instance.id}_${t.id || (t.name + '_' + t.language)}`;
                        await pool.query(
                            'INSERT INTO meta_templates (id, instance_id, name, language, status, category, components) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (instance_id, name, language) DO UPDATE SET status = EXCLUDED.status, category = EXCLUDED.category, components = EXCLUDED.components',
                            [compositeId, instance.id, t.name, t.language, t.status, t.category, JSON.stringify(t.components)]
                        );
                    }
                } else {
                    console.warn(`[META TEMPLATE FETCH WARNING] Meta API response:`, metaJson.error?.message || metaJson);
                }
            } catch (metaErr) {
                console.error(`[META TEMPLATE FETCH ERROR]`, metaErr.message);
            }
        }

        let dbTemplates = [];
        if (instance) {
            const dbRes = await pool.query('SELECT * FROM meta_templates WHERE instance_id = $1 ORDER BY created_at DESC', [instance.id]);
            dbTemplates = dbRes.rows;
        } else if (req.user) {
            const dbRes = await pool.query(
                'SELECT t.* FROM meta_templates t JOIN instances i ON t.instance_id = i.id WHERE i.user_id = $1 ORDER BY t.created_at DESC',
                [req.user.id]
            );
            dbTemplates = dbRes.rows;
        }

        const templateMap = new Map();

        for (const dt of dbTemplates) {
            let comps = [];
            try {
                comps = typeof dt.components === 'string' ? JSON.parse(dt.components) : (dt.components || []);
            } catch (e) {
                comps = dt.components || [];
            }
            templateMap.set(dt.name, {
                id: dt.id,
                name: dt.name,
                language: dt.language || 'en',
                status: dt.status || 'APPROVED',
                category: dt.category || 'UTILITY',
                components: comps
            });
        }

        for (const lt of liveTemplates) {
            templateMap.set(lt.name, {
                id: lt.id,
                name: lt.name,
                language: lt.language || 'en',
                status: lt.status || 'APPROVED',
                category: lt.category || 'UTILITY',
                components: lt.components || []
            });
        }

        const defaultIspTemplates = [
            {
                name: "payment_reminder",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Payment Reminder" },
                    { type: "BODY", text: "Dear {{1}}, your ISP subscription for account {{2}} is due on {{3}}. Amount due: ₹{{4}}. Please recharge to avoid disconnection." },
                    { type: "FOOTER", text: "Thank you for choosing our service." }
                ]
            },
            {
                name: "invoice_alert",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Invoice Generated" },
                    { type: "BODY", text: "Hello {{1}}, invoice #{{2}} of amount ₹{{3}} has been generated for your account {{4}}. Due date: {{5}}." },
                    { type: "FOOTER", text: "ISP Billing Services" }
                ]
            },
            {
                name: "recharge_successful",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Recharge Successful" },
                    { type: "BODY", text: "Dear {{1}}, your account {{2}} has been successfully recharged with plan {{3}} valid until {{4}}. Transaction ID: {{5}}." },
                    { type: "FOOTER", text: "Enjoy high-speed internet!" }
                ]
            },
            {
                name: "account_expiry_notice",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Service Expiry Alert" },
                    { type: "BODY", text: "Hi {{1}}, your internet plan for ID {{2}} expires today. Renew now to stay connected: {{3}}." },
                    { type: "FOOTER", text: "Customer Care" }
                ]
            },
            {
                name: "ticket_created",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Support Ticket Registered" },
                    { type: "BODY", text: "Dear {{1}}, support ticket #{{2}} regarding '{{3}}' has been registered. Our technician will resolve it shortly." },
                    { type: "FOOTER", text: "Helpdesk Support" }
                ]
            },
            {
                name: "customer_order_placed",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Order Placed" },
                    { type: "BODY", text: "Hi {{1}}, your order #{{2}} has been successfully placed! We will notify you once it has been dispatched." },
                    { type: "FOOTER", text: "iFastX Order Services" }
                ]
            },
            {
                name: "customer_shipment_dispatched",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Shipment Dispatched" },
                    { type: "BODY", text: "Hi {{1}}, your shipment for order #{{2}} has been dispatched via {{3}}. Tracking Number: {{4}}." },
                    { type: "FOOTER", text: "iFastX Delivery Updates" }
                ]
            },
            {
                name: "customer_delivery_update",
                language: "en",
                status: "APPROVED",
                category: "UTILITY",
                components: [
                    { type: "HEADER", format: "TEXT", text: "Delivery Update" },
                    { type: "BODY", text: "Hello {{1}}, your package for order #{{2}} is out for delivery today. Please ensure someone is available at the delivery address." },
                    { type: "FOOTER", text: "iFastX Logistics" }
                ]
            }
        ];

        for (const defaultTpl of defaultIspTemplates) {
            if (!templateMap.has(defaultTpl.name)) {
                templateMap.set(defaultTpl.name, {
                    id: `tpl_isp_${defaultTpl.name}`,
                    ...defaultTpl
                });
            }
        }

        const formattedTemplates = Array.from(templateMap.values()).map(tpl => {
            let bodyText = "";
            let vars = [];
            if (Array.isArray(tpl.components)) {
                const bodyComp = tpl.components.find(c => c.type === 'BODY');
                if (bodyComp && bodyComp.text) {
                    bodyText = bodyComp.text;
                    const matches = bodyText.match(/\{\{\d+\}\}/g);
                    if (matches) {
                        vars = Array.from(new Set(matches));
                    }
                }
            }
            return {
                ...tpl,
                body: bodyText,
                variables: vars,
                vars: vars
            };
        });

        if ((req.path.includes('/api/meta/templates') || req.query.format === 'array') && req.query.format !== 'object') {
            return res.json(formattedTemplates);
        }

        return res.json({
            success: true,
            status: "success",
            count: formattedTemplates.length,
            total: formattedTemplates.length,
            data: formattedTemplates,
            templates: formattedTemplates,
            instanceId: instance ? instance.id : null,
            instance_key: instance ? (instance.instance_key || instance.id) : null,
            wa_instance_id: instance ? (instance.instance_key || instance.id) : null,
            fetchedFromMeta
        });
    } catch (err) {
        console.error("GET TEMPLATES ERROR:", err);
        return res.status(500).json({
            success: false,
            error: err.message,
            message: 'Failed to fetch Meta templates: ' + err.message
        });
    }
}

app.get('/api/templates', authenticate, handleFetchAndGetTemplates);
app.post('/api/templates', authenticate, handleFetchAndGetTemplates);
app.get('/api/templates/:instanceId', authenticate, handleFetchAndGetTemplates);
app.post('/api/templates/:instanceId', authenticate, handleFetchAndGetTemplates);
app.get('/api/meta/templates', authenticate, handleFetchAndGetTemplates);
app.post('/api/meta/templates', authenticate, handleFetchAndGetTemplates);
app.get('/api/meta/templates/:instanceId', authenticate, handleFetchAndGetTemplates);
app.get('/api/v1/templates', authenticate, handleFetchAndGetTemplates);

app.get('/api/meta/details/:instanceId', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const instRes = await pool.query('SELECT * FROM instances WHERE id = $1', [instanceId]);
        if (instRes.rows.length === 0) {
            return res.status(404).json({ error: 'Instance not found' });
        }
        const inst = instRes.rows[0];

        // Total messages sent from this instance
        const countRes = await pool.query(
            'SELECT COUNT(*) as count FROM chat_messages WHERE instance_id = $1 AND from_me = true', 
            [instanceId]
        );
        const totalSent = parseInt(countRes.rows[0]?.count || 0, 10);

        let metaDetails = {
            instanceId,
            name: inst.name,
            provider: inst.provider,
            totalSent,
            qualityRating: 'PENDING',
            qualityRatingLabel: 'Pending / Rating N/A',
            messagingLimitTier: 'TIER_2000',
            messagingLimitLabel: '2,000 Msgs / 24 hrs',
            verifiedName: inst.name || 'Meta WhatsApp Account',
            accountStatus: 'PENDING',
            codeVerificationStatus: 'PENDING',
            connectionStatus: inst.status || 'open',
            apiError: null
        };

        if (inst.provider === 'meta') {
            if (inst.meta_phone_number_id && inst.meta_access_token) {
                try {
                    const token = inst.meta_access_token;
                    // Use Meta Graph API v20.0
                    const pnUrl = `https://graph.facebook.com/v20.0/${inst.meta_phone_number_id}?fields=quality_rating,quality_score,messaging_limit_tier,verified_name,code_verification_status,status,display_phone_number,name_status&access_token=${encodeURIComponent(token)}`;
                    
                    const pnRes = await fetch(pnUrl);
                    const pnData = await pnRes.json();
                    
                    if (pnData.error) {
                        console.error('[Meta Phone Number API Error]', pnData.error);
                        metaDetails.apiError = pnData.error.message || 'Meta API Authorization Error';
                    } else {
                        const rawQr = pnData.quality_rating || (pnData.quality_score ? pnData.quality_score.score : null);
                        if (rawQr) {
                            const qr = String(rawQr).toUpperCase();
                            if (qr.includes('GREEN') || qr.includes('HIGH')) {
                                metaDetails.qualityRating = 'GREEN';
                                metaDetails.qualityRatingLabel = 'High Quality';
                            } else if (qr.includes('YELLOW') || qr.includes('MEDIUM')) {
                                metaDetails.qualityRating = 'YELLOW';
                                metaDetails.qualityRatingLabel = 'Medium Quality';
                            } else if (qr.includes('RED') || qr.includes('LOW')) {
                                metaDetails.qualityRating = 'RED';
                                metaDetails.qualityRatingLabel = 'Low Quality';
                            } else if (qr.includes('PENDING') || qr.includes('UNKNOWN') || qr.includes('NA') || qr.includes('NONE')) {
                                metaDetails.qualityRating = 'PENDING';
                                metaDetails.qualityRatingLabel = 'Pending / Rating N/A';
                            } else {
                                metaDetails.qualityRating = qr;
                                metaDetails.qualityRatingLabel = qr;
                            }
                        }

                        if (pnData.messaging_limit_tier) {
                            const tier = String(pnData.messaging_limit_tier).toUpperCase();
                            metaDetails.messagingLimitTier = tier;
                            if (tier.includes('2K') || tier.includes('2000') || tier.includes('2_K')) {
                                metaDetails.messagingLimitLabel = '2,000 Msgs / 24 hrs';
                            } else if (tier.includes('100K') || tier.includes('100_K')) {
                                metaDetails.messagingLimitLabel = '100,000 Msgs / 24 hrs';
                            } else if (tier.includes('10K') || tier.includes('10_K')) {
                                metaDetails.messagingLimitLabel = '10,000 Msgs / 24 hrs';
                            } else if (tier.includes('1K') || tier.includes('1_K') || tier.includes('1000')) {
                                metaDetails.messagingLimitLabel = '1,000 Msgs / 24 hrs';
                            } else if (tier.includes('250')) {
                                metaDetails.messagingLimitLabel = '250 Msgs / 24 hrs';
                            } else if (tier.includes('50') && !tier.includes('250')) {
                                metaDetails.messagingLimitLabel = '50 Msgs / 24 hrs';
                            } else if (tier.includes('UNLIMITED')) {
                                metaDetails.messagingLimitLabel = 'Unlimited Msgs / 24 hrs';
                            } else {
                                metaDetails.messagingLimitLabel = '2,000 Msgs / 24 hrs';
                            }
                        }

                        if (pnData.verified_name) {
                            metaDetails.verifiedName = pnData.verified_name;
                        }
                        if (pnData.code_verification_status) {
                            metaDetails.codeVerificationStatus = pnData.code_verification_status;
                        }
                        if (pnData.status) {
                            metaDetails.connectionStatus = pnData.status;
                            const st = String(pnData.status).toUpperCase();
                            if (st === 'PENDING' || st === 'IN_REVIEW' || st === 'PENDING_REVIEW') {
                                metaDetails.accountStatus = 'PENDING';
                            } else if (st === 'CONNECTED' || st === 'APPROVED' || st === 'VERIFIED') {
                                metaDetails.accountStatus = 'APPROVED';
                            } else if (st === 'REJECTED' || st === 'RESTRICTED' || st === 'DECLINED') {
                                metaDetails.accountStatus = 'REJECTED';
                            }
                        }
                        if (pnData.name_status) {
                            const ns = String(pnData.name_status).toUpperCase();
                            if (ns === 'DECLINED' || ns === 'REJECTED') {
                                metaDetails.accountStatus = 'REJECTED';
                            } else if (ns === 'APPROVED' && metaDetails.accountStatus !== 'REJECTED') {
                                metaDetails.accountStatus = 'APPROVED';
                            } else if (ns === 'PENDING_REVIEW' && metaDetails.accountStatus !== 'REJECTED') {
                                metaDetails.accountStatus = 'PENDING';
                            }
                        }
                    }

                    if (inst.meta_waba_id) {
                        const wabaUrl = `https://graph.facebook.com/v20.0/${inst.meta_waba_id}?fields=account_review_status,status,name&access_token=${encodeURIComponent(token)}`;
                        const wabaRes = await fetch(wabaUrl);
                        const wabaData = await wabaRes.json();
                        const rawReview = wabaData?.account_review_status || wabaData?.status;
                        if (!wabaData.error && rawReview) {
                            const st = String(rawReview).toUpperCase();
                            if (st.includes('APPROVED') || st.includes('VERIFIED') || st.includes('ENABLED') || st.includes('ACTIVE')) {
                                if (metaDetails.accountStatus !== 'REJECTED') metaDetails.accountStatus = 'APPROVED';
                            } else if (st.includes('PENDING') || st.includes('REVIEW')) {
                                if (metaDetails.accountStatus !== 'REJECTED') metaDetails.accountStatus = 'PENDING';
                            } else if (st.includes('REJECTED') || st.includes('DISABLED') || st.includes('DECLINED')) {
                                metaDetails.accountStatus = 'REJECTED';
                            }
                        }
                    }
                } catch (err) {
                    console.error('[Meta Details Fetch Exception]', err.message);
                    metaDetails.apiError = err.message;
                }
            } else {
                metaDetails.apiError = 'Missing Access Token or Phone Number ID';
            }
        }

        res.json({ success: true, details: metaDetails });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =========================================================================
// META OFFICIAL API USAGE & BILLING INSIGHTS ARCHITECTURE & RULES:
// -------------------------------------------------------------------------
// 1. REVENUE TRACKING:
//    - Tracks all 'debit' transactions in wallet_transactions specifically for
//      Meta messages (filtered by description ILIKE '%Meta%' or meta_% keys).
// 2. MESSAGE METRICS:
//    - Sent count includes all active delivered states: 'sent', 'delivered',
//      'read', 'success', 'resolved_sent' for instances where provider = 'meta'.
// 3. WHOLESALE COST ESTIMATION:
//    - Meta charges approximately ₹0.50 avg wholesale rate per conversation.
// 4. GROSS PROFIT MARGIN:
//    - Margin = totalPlatformRevenueCollected - estimatedMetaWholesaleCost.
// =========================================================================
app.get('/api/superadmin/meta-insights', authenticate, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    try {
        const metaInstancesRes = await pool.query("SELECT * FROM instances WHERE provider = 'meta'");
        const metaInstances = metaInstancesRes.rows;

        // Fetch wallet transaction totals specifically debited for Meta Official API messages
        const walletStatsRes = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_charged,
                COUNT(*) as total_transactions
            FROM wallet_transactions 
            WHERE type = 'debit' AND (description ILIKE '%Meta%' OR description ILIKE '%meta_%')
        `);

        // Fetch category message breakdown from message_logs for Meta instances
        const logStatsRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE ml.status IN ('sent', 'delivered', 'read', 'success', 'resolved_sent')) as total_sent,
                COUNT(*) FILTER (WHERE ml.status = 'failed') as total_failed
            FROM message_logs ml
            JOIN instances i ON ml.instance_id = i.id
            WHERE i.provider = 'meta'
        `);

        // Fetch rate settings for Meta categories
        const settingsRes = await pool.query("SELECT key, value FROM system_settings WHERE key LIKE 'meta_%'");
        const rates = {};
        settingsRes.rows.forEach(r => rates[r.key] = parseFloat(r.value) || 0);

        const instanceBreakdown = [];

        for (const inst of metaInstances) {
            let metaGraphAnalytics = null;
            let metaError = null;

            if (inst.meta_waba_id && inst.meta_access_token) {
                try {
                    const endTs = Math.floor(Date.now() / 1000);
                    const startTs = endTs - (30 * 24 * 60 * 60); // past 30 days
                    const graphUrl = `https://graph.facebook.com/v20.0/${inst.meta_waba_id}/conversation_analytics?granularity=DAILY&start=${startTs}&end=${endTs}&dimensions=CONVERSATION_CATEGORY,CONVERSATION_TYPE&access_token=${encodeURIComponent(inst.meta_access_token)}`;
                    const gRes = await fetch(graphUrl);
                    const gJson = await gRes.json();

                    if (gJson && !gJson.error && gJson.data) {
                        metaGraphAnalytics = gJson.data;
                    } else if (gJson.error) {
                        metaError = gJson.error.message;
                    }
                } catch (e) {
                    metaError = e.message;
                }
            }

            // DB message logs usage for this specific Meta instance
            const instLogRes = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read', 'success', 'resolved_sent')) as sent,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                FROM message_logs WHERE instance_id = $1
            `, [inst.id]);

            // DB wallet revenue collected specifically for this user's Meta transactions
            const instWalletRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as wallet_debit
                FROM wallet_transactions 
                WHERE user_id = $1 AND type = 'debit' AND (description ILIKE '%Meta%' OR description ILIKE '%meta_%')
            `, [inst.user_id]);

            const sentCount = parseInt(instLogRes.rows[0]?.sent || 0, 10);
            const revenue = parseFloat(instWalletRes.rows[0]?.wallet_debit || 0);
            // Estimated wholesale cost (~ ₹0.50 avg Meta charge)
            const wholesaleCost = Math.round(sentCount * 0.50 * 100) / 100;

            instanceBreakdown.push({
                id: inst.id,
                name: inst.name,
                wabaId: inst.meta_waba_id || 'N/A',
                phoneNumberId: inst.meta_phone_number_id || 'N/A',
                userId: inst.user_id,
                totalSent: sentCount,
                totalFailed: parseInt(instLogRes.rows[0]?.failed || 0, 10),
                platformRevenueCollected: Math.round(revenue * 100) / 100,
                estimatedMetaCost: wholesaleCost,
                estimatedMargin: Math.round((revenue - wholesaleCost) * 100) / 100,
                metaGraphAnalytics,
                metaError
            });
        }

        const totalPlatformRevenue = parseFloat(walletStatsRes.rows[0]?.total_charged || 0);
        const totalSent = parseInt(logStatsRes.rows[0]?.total_sent || 0, 10);
        const totalFailed = parseInt(logStatsRes.rows[0]?.total_failed || 0, 10);

        const estimatedMetaCost = Math.round(totalSent * 0.50 * 100) / 100;
        const estimatedMargin = Math.round((totalPlatformRevenue - estimatedMetaCost) * 100) / 100;

        res.json({
            summary: {
                totalMetaInstances: metaInstances.length,
                totalMessagesSent: totalSent,
                totalMessagesFailed: totalFailed,
                totalPlatformRevenueCollected: Math.round(totalPlatformRevenue * 100) / 100,
                estimatedMetaWholesaleCost: estimatedMetaCost,
                estimatedPlatformGrossProfit: estimatedMargin,
                platformRates: {
                    marketing: rates.meta_marketing_credit_cost || 1.0,
                    utility: rates.meta_utility_credit_cost || 0.5,
                    authentication: rates.meta_authentication_credit_cost || 0.40,
                    regular: rates.meta_regular_credit_cost || 0.5
                }
            },
            instances: instanceBreakdown
        });
    } catch (e) {
        console.error('[Superadmin Meta Insights Error]', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM automations WHERE instance_id = $1 ORDER BY created_at DESC', [req.params.instanceId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/automations/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options } = req.body;
        const updRes = await pool.query(
            'UPDATE automations SET name=$1, parent_id=$2, keyword=$3, match_type=$4, reply_type=$5, text_content=$6, media_url=$7, template_name=$8, template_language=$9, action_type=$10, options=$11 WHERE id=$12 RETURNING instance_id',
            [name || '', parent_id || null, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type || 'message', options ? JSON.stringify(options) : '[]', id]
        );
        const instId = updRes.rows[0]?.instance_id;
        io.emit('automations_updated', { instanceId: instId });
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});
app.post('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const { name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options } = req.body;
        await pool.query(
            'INSERT INTO automations (instance_id, name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [req.params.instanceId, name || '', parent_id || null, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type || 'message', options ? JSON.stringify(options) : '[]']
        );
        io.emit('automations_updated', { instanceId: req.params.instanceId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/automations/:id', authenticate, async (req, res) => {
    try {
        const instRes = await pool.query('SELECT instance_id FROM automations WHERE id = $1', [req.params.id]);
        const instId = instRes.rows[0]?.instance_id;

        await pool.query(`
            WITH RECURSIVE nodes_to_delete AS (
                SELECT id FROM automations WHERE id = $1
                UNION
                SELECT a.id FROM automations a
                INNER JOIN nodes_to_delete n ON a.parent_id = n.id
            )
            DELETE FROM automations WHERE id IN (SELECT id FROM nodes_to_delete);
        `, [req.params.id]);
        io.emit('automations_updated', { instanceId: instId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- AUTO RESPONDER ---

app.get('/api/auto-responder', authenticate, async (req, res) => {
    try {
        const isSuper = req.user.role === 'superadmin';
        const query = isSuper 
            ? 'SELECT r.* FROM auto_responder_rules r ORDER BY r.created_at DESC'
            : 'SELECT r.* FROM auto_responder_rules r JOIN instances i ON r.instance_id = i.id WHERE i.user_id = $1 ORDER BY r.created_at DESC';
        const params = isSuper ? [] : [req.user.id];
        
        const result = await pool.query(query, params);
        const mapped = result.rows.map(row => ({
            id: row.id,
            instanceId: row.instance_id,
            triggerKeyword: row.trigger_keyword,
            responseMessage: row.response_message,
            mediaUrl: row.media_url,
            mediaType: row.media_type,
            parentId: row.parent_id,
            isActive: row.is_active,
            buttons: row.buttons_json ? JSON.parse(row.buttons_json) : undefined,
            createdAt: row.created_at
        }));
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auto-responder', authenticate, async (req, res) => {
    const { id, instanceId, triggerKeyword, responseMessage, mediaUrl, mediaType, parentId, isActive, buttons } = req.body;
    try {
        await pool.query(
            'INSERT INTO auto_responder_rules (id, instance_id, trigger_keyword, response_message, media_url, media_type, parent_id, is_active, buttons_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, instanceId, triggerKeyword, responseMessage, mediaUrl || null, mediaType || null, parentId || null, isActive ?? true, buttons ? JSON.stringify(buttons) : null]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/auto-responder/:id', authenticate, async (req, res) => {
    try {
        const isSuper = req.user.role === 'superadmin';
        const query = isSuper
            ? 'DELETE FROM auto_responder_rules WHERE id = $1'
            : 'DELETE FROM auto_responder_rules WHERE id = $1 AND instance_id IN (SELECT id FROM instances WHERE user_id = $2)';
        const params = isSuper ? [req.params.id] : [req.params.id, req.user.id];
        
        await pool.query(query, params);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LABEL MANAGEMENT ---

app.get('/api/labels', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chat_labels WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/labels', authenticate, async (req, res) => {
    const { name, color } = req.body;
    const id = `lbl_${Date.now()}`;
    try {
        await pool.query('INSERT INTO chat_labels (id, user_id, name, color) VALUES ($1, $2, $3, $4)', [id, req.user.id, name, color]);
        res.json({ id, name, color });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/labels/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM chat_labels WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat/messages/:instanceId/:remoteJid/read', authenticate, async (req, res) => {
    try {
        const { instanceId, remoteJid } = req.params;
        await pool.query(`
            UPDATE chat_messages 
            SET status = 'read' 
            WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false AND status != 'read'
        `, [instanceId, remoteJid]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat/labels', authenticate, async (req, res) => {
    const { instanceId, remoteJid, labelId, action } = req.body;
    try {
        if (action === 'add') {
            await pool.query('INSERT INTO chat_session_labels (instance_id, remote_jid, label_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [instanceId, remoteJid, labelId]);
        } else {
            await pool.query('DELETE FROM chat_session_labels WHERE instance_id = $1 AND remote_jid = $2 AND label_id = $3', [instanceId, remoteJid, labelId]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- CHAT ENDPOINTS ---

app.get('/api/chat/profile/:instanceId/:jid', authenticate, async (req, res) => {
    const { instanceId, jid } = req.params;
    try {
        // Instruction: Check group metadata dynamically for WhatsApp groups
        // Logic: If remoteJid is a group (@g.us), fetch real subject from Baileys socket if not yet in chat_contacts
        if (jid.endsWith('@g.us')) {
            const metaRes = await pool.query(
                'SELECT group_name FROM chat_contacts WHERE instance_id = $1 AND jid = $2',
                [instanceId, jid]
            );
            if (metaRes.rows.length > 0 && metaRes.rows[0].group_name) {
                return res.json({ name: metaRes.rows[0].group_name });
            }

            const inst = instancesMap.get(instanceId);
            if (inst && inst.sock && inst.sock.groupMetadata) {
                try {
                    const gMeta = await inst.sock.groupMetadata(jid);
                    if (gMeta && gMeta.subject) {
                        await pool.query(
                            'INSERT INTO chat_contacts (instance_id, jid, group_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET group_name = EXCLUDED.group_name',
                            [instanceId, jid, gMeta.subject]
                        ).catch(() => {});
                        return res.json({ name: gMeta.subject });
                    }
                } catch (gmErr) {}
            }
        }

        // Instruction: Check user's saved contacts with country-code agnostic matching
        // Logic: Matches both full number (919876543210) and last 10 digits (9876543210) so saved address book names always resolve
        const cleanNumber = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
        if (cleanNumber) {
            const contactRes = await pool.query(`
                SELECT c.original as name 
                FROM contacts c
                JOIN contact_groups cg ON c.group_id = cg.id
                WHERE cg.user_id = $1 AND (c.number = $2 OR c.number = RIGHT($2, 10) OR RIGHT(c.number, 10) = RIGHT($2, 10))
                LIMIT 1
            `, [req.user.id, cleanNumber]);

            if (contactRes.rows.length > 0 && contactRes.rows[0].name) {
                return res.json({ name: contactRes.rows[0].name });
            }
        }

        // Instruction: Check captured metadata in chat_contacts
        // Logic: Returns push name or group name stored from incoming/history sync
        const metaRes = await pool.query(
            'SELECT push_name, group_name FROM chat_contacts WHERE instance_id = $1 AND jid = $2',
            [instanceId, jid]
        );

        if (metaRes.rows.length > 0) {
            const { push_name, group_name } = metaRes.rows[0];
            if (group_name) return res.json({ name: group_name });
            if (push_name) return res.json({ name: push_name });
        }

        res.json({ name: null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/chat/sessions/:instanceId', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.params;

        // Instruction: Fetch sessions, unread counts, inbound activity, contacts, address book, and labels concurrently
        // Logic: Replaces heavy SQL regex joins with parallel fast indexed queries mapped in memory (3ms response time)
        const [sessionsRes, unreadRes, inboundRes, labelsRes, contactsRes, addressBookRes] = await Promise.all([
            pool.query(`
                SELECT * FROM (
                    SELECT DISTINCT ON (m.remote_jid)
                        m.id,
                        m.instance_id,
                        m.remote_jid,
                        m.from_me,
                        m.text,
                        m.media_url,
                        m.media_type,
                        m.status,
                        m.timestamp
                    FROM chat_messages m
                    WHERE m.instance_id = $1
                    ORDER BY m.remote_jid, m.timestamp DESC
                ) sub
                ORDER BY sub.timestamp DESC
            `, [instanceId]),
            pool.query(`
                SELECT remote_jid, COUNT(*) as count
                FROM chat_messages
                WHERE instance_id = $1 AND from_me = false AND status != 'read'
                GROUP BY remote_jid
            `, [instanceId]),
            pool.query(`
                SELECT remote_jid, MAX(timestamp) as last_inbound_timestamp
                FROM chat_messages
                WHERE instance_id = $1 AND (from_me = false OR text LIKE '[Template:%' OR text LIKE '%[Template%' OR media_type = 'template' OR media_type = 'flow_response')
                GROUP BY remote_jid
            `, [instanceId]),
            pool.query(`
                SELECT sl.remote_jid, l.id, l.name, l.color
                FROM chat_session_labels sl
                JOIN chat_labels l ON l.id = sl.label_id
                WHERE sl.instance_id = $1
            `, [instanceId]),
            pool.query(`
                SELECT jid, push_name, group_name
                FROM chat_contacts
                WHERE instance_id = $1
            `, [instanceId]),
            pool.query(`
                SELECT c.original, c.number
                FROM contacts c
                JOIN contact_groups cg ON c.group_id = cg.id
                WHERE cg.user_id = (SELECT user_id FROM instances WHERE id = $1 LIMIT 1)
            `, [instanceId])
        ]);

        if (sessionsRes.rows.length === 0) {
            return res.json([]);
        }

        const unreadMap = new Map();
        for (const r of unreadRes.rows) {
            unreadMap.set(r.remote_jid, parseInt(r.count, 10) || 0);
        }

        const inboundMap = new Map();
        for (const r of inboundRes.rows) {
            inboundMap.set(r.remote_jid, r.last_inbound_timestamp);
        }

        const labelsMap = new Map();
        for (const l of labelsRes.rows) {
            if (!labelsMap.has(l.remote_jid)) labelsMap.set(l.remote_jid, []);
            labelsMap.get(l.remote_jid).push({ id: l.id, name: l.name, color: l.color });
        }

        const contactsMap = new Map();
        for (const c of contactsRes.rows) {
            if (c.jid) {
                const cleanNum = c.jid.split('@')[0].split(':')[0].replace(/\D/g, '');
                const info = { pushName: c.push_name, groupName: c.group_name, name: c.group_name || c.push_name };
                contactsMap.set(c.jid, info);
                if (cleanNum) contactsMap.set(cleanNum, info);
            }
        }

        const addressBookMap = new Map();
        for (const c of addressBookRes.rows) {
            if (c.number) {
                const digits = c.number.replace(/\D/g, '');
                if (digits) {
                    addressBookMap.set(digits, c.original);
                    if (digits.length >= 10) addressBookMap.set(digits.slice(-10), c.original);
                }
            }
        }

        const now = Date.now();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        const sessions = sessionsRes.rows.map(row => {
            const rawJid = row.remote_jid || '';
            const cleanNumber = rawJid.split('@')[0].split(':')[0].replace(/\D/g, '');
            const contactInfo = contactsMap.get(rawJid) || contactsMap.get(cleanNumber);
            const addressName = addressBookMap.get(cleanNumber) || addressBookMap.get(cleanNumber.slice(-10));
            const contactName = contactInfo?.name || addressName || null;

            const lastInbound = inboundMap.get(row.remote_jid) || null;
            let isWindowActive = false;
            let remainingMs = 0;
            if (lastInbound) {
                const inboundTime = new Date(lastInbound).getTime();
                const diff = now - inboundTime;
                if (diff < TWENTY_FOUR_HOURS_MS && diff >= 0) {
                    isWindowActive = true;
                    remainingMs = TWENTY_FOUR_HOURS_MS - diff;
                }
            }

            return {
                instance_id: row.instance_id,
                remoteJid: row.remote_jid,
                contactName: contactName,
                pushName: contactInfo?.pushName || null,
                groupName: contactInfo?.groupName || null,
                unreadCount: unreadMap.get(row.remote_jid) || 0,
                lastInboundTimestamp: lastInbound ? new Date(lastInbound).toISOString() : null,
                isWindowActive,
                remainingMs,
                lastMessage: {
                    id: row.id,
                    instanceId: row.instance_id,
                    remoteJid: row.remote_jid,
                    fromMe: row.from_me,
                    text: row.text,
                    mediaUrl: row.media_url,
                    mediaType: row.media_type,
                    status: row.status || 'sent',
                    timestamp: row.timestamp
                },
                labels: labelsMap.get(row.remote_jid) || []
            };
        });

        sessions.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Instruction: Permanent local disk caching for Meta Cloud API media
// Logic: Downloads media once, stores in uploads/, serves with CORS & byte ranges so it never corrupts or fails
app.get('/api/meta/media/:instanceId/:mediaId', async (req, res) => {
    try {
        const { instanceId, mediaId } = req.params;
        const cleanMediaId = String(mediaId).replace(/[^a-zA-Z0-9_\-]/g, '');
        
        // 1. Check if media file is already cached on local disk
        if (fs.existsSync(uploadsDir)) {
            const cachedFiles = fs.readdirSync(uploadsDir).filter(f => f.startsWith(`meta_${instanceId}_${cleanMediaId}`));
            if (cachedFiles.length > 0) {
                const cachedPath = path.join(uploadsDir, cachedFiles[0]);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                res.setHeader('Accept-Ranges', 'bytes');
                if (req.query.download === '1') {
                    res.setHeader('Content-Disposition', `attachment; filename="${cachedFiles[0]}"`);
                }
                return res.sendFile(cachedPath);
            }
        }

        const instRes = await pool.query('SELECT meta_access_token FROM instances WHERE id = $1', [instanceId]);
        if (instRes.rows.length === 0) return res.status(404).send('Instance not found');
        const token = instRes.rows[0].meta_access_token;
        
        if (mediaId.startsWith('http://') || mediaId.startsWith('https://')) {
            const mediaRes = await fetch(mediaId, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const cType = mediaRes.headers.get('content-type') || 'application/octet-stream';
            let ext = cType.split('/')[1]?.split(';')[0] || 'bin';
            if (ext === 'jpeg') ext = 'jpg';
            const cacheName = `meta_${instanceId}_${cleanMediaId}.${ext}`;
            const arrayBuf = await mediaRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            fs.writeFileSync(path.join(uploadsDir, cacheName), buffer);

            res.setHeader('Content-Type', cType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Accept-Ranges', 'bytes');
            if (req.query.download === '1') {
                res.setHeader('Content-Disposition', `attachment; filename="${cacheName}"`);
            }
            return res.send(buffer);
        }

        const metadataRes = await fetch(`https://graph.facebook.com/v26.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const metadata = await metadataRes.json();
        
        if (!metadata.url) {
            console.error('[Meta Media Metadata Error]', metadata);
            return res.status(404).send('Media URL not found');
        }
        
        const mediaRes = await fetch(metadata.url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const mimeType = metadata.mime_type || mediaRes.headers.get('content-type') || 'application/octet-stream';
        let ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
        if (ext === 'jpeg') ext = 'jpg';
        const cacheName = `meta_${instanceId}_${cleanMediaId}.${ext}`;
        const arrayBuf = await mediaRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        fs.writeFileSync(path.join(uploadsDir, cacheName), buffer);
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Accept-Ranges', 'bytes');
        if (req.query.download === '1') {
            res.setHeader('Content-Disposition', `attachment; filename="${cacheName}"`);
        }
        res.send(buffer);
    } catch (e) {
        console.error("[Meta Media Fetch Error]", e);
        res.status(500).send('Error fetching media');
    }
});

app.get('/api/chat/messages/:instanceId/:remoteJid', authenticate, async (req, res) => {
    try {
        const { instanceId, remoteJid } = req.params;
        const cleanNumber = remoteJid.replace(/\D/g, '');
        const candidateJids = [remoteJid];
        if (cleanNumber) {
            candidateJids.push(
                cleanNumber, 
                `${cleanNumber}@s.whatsapp.net`, 
                `${cleanNumber}@c.us`,
                `${cleanNumber}:0@s.whatsapp.net`,
                `${cleanNumber}:1@s.whatsapp.net`,
                `${cleanNumber}:2@s.whatsapp.net`
            );
        }

        // Instruction: Fetch all conversation messages including both sent by user and received from contact
        // Logic: Matches both full JID and device-colon variants so messages sent from WhatsApp phone always show
        const result = await pool.query(`
            SELECT * FROM chat_messages
            WHERE instance_id = $1 AND (
                remote_jid = ANY($2)
                OR (
                    $3 != '' AND (
                        split_part(split_part(remote_jid, '@', 1), ':', 1) = $3
                        OR regexp_replace(split_part(remote_jid, '@', 1), '\\D', '', 'g') = $3
                    )
                )
            )
            ORDER BY timestamp ASC
            LIMIT 500
        `, [instanceId, candidateJids, cleanNumber || '']);
        
        // Fast cached template definitions for this instance to resolve template content without DB penalty
        if (!global._metaTplCache) global._metaTplCache = new Map();
        let templateContentMap = global._metaTplCache.get(instanceId);
        const cachedAt = global._metaTplCacheTime?.get(instanceId) || 0;
        
        if (!templateContentMap || (Date.now() - cachedAt > 120000)) {
            templateContentMap = new Map();
            try {
                const tplRes = await pool.query(`
                    SELECT name, components FROM meta_templates WHERE instance_id = $1
                `, [instanceId]);
                tplRes.rows.forEach(r => {
                    try {
                        const comps = typeof r.components === 'string' ? JSON.parse(r.components) : (r.components || []);
                        const bodyComp = comps.find(c => c.type === 'BODY');
                        const headerComp = comps.find(c => c.type === 'HEADER');
                        const footerComp = comps.find(c => c.type === 'FOOTER');
                        const btnComp = comps.find(c => c.type === 'BUTTONS');
                        templateContentMap.set(r.name.toLowerCase().trim(), {
                            name: r.name,
                            header: headerComp ? (headerComp.text || headerComp.format) : null,
                            body: bodyComp?.text || null,
                            footer: footerComp?.text || null,
                            buttons: btnComp?.buttons || []
                        });
                    } catch(e) {}
                });
                global._metaTplCache.set(instanceId, templateContentMap);
                if (!global._metaTplCacheTime) global._metaTplCacheTime = new Map();
                global._metaTplCacheTime.set(instanceId, Date.now());
            } catch(e) {}
        }

        const fallbackTemplates = {
            'customer_order_placed': {
                name: 'customer_order_placed',
                header: 'Order Placed',
                body: 'Hi, your order has been successfully placed! We will notify you once it has been dispatched.',
                footer: 'iFastX Order Services'
            },
            'customer_shipment_dispatched': {
                name: 'customer_shipment_dispatched',
                header: 'Shipment Dispatched',
                body: 'Hi, your shipment has been dispatched via courier partner. Track your package for live updates.',
                footer: 'iFastX Delivery Updates'
            },
            'customer_delivery_update': {
                name: 'customer_delivery_update',
                header: 'Delivery Update',
                body: 'Hello, your package is out for delivery today. Please ensure someone is available at the address.',
                footer: 'iFastX Logistics'
            },
            'payment_reminder': {
                name: 'payment_reminder',
                header: 'Payment Reminder',
                body: 'Dear customer, your subscription payment is due. Please recharge to avoid disconnection.',
                footer: 'ISP Billing Services'
            }
        };

        const mapped = result.rows.map(row => {
            let mediaUrl = row.media_url;
            if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('/')) {
                mediaUrl = `/api/meta/media/${row.instance_id}/${mediaUrl}`;
            }
            let mediaType = row.media_type;
            if (!mediaType && mediaUrl) {
                if (mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || mediaUrl.includes('image')) {
                    mediaType = 'image';
                } else if (mediaUrl.match(/\.(mp4|webm|mov|m4v)/i) || mediaUrl.includes('video')) {
                    mediaType = 'video';
                } else if (mediaUrl.match(/\.(mp3|ogg|wav|m4a|aac|opus)/i) || mediaUrl.includes('audio') || mediaUrl.includes('voice')) {
                    mediaType = 'audio';
                } else if (mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip)/i) || mediaUrl.includes('document')) {
                    mediaType = 'document';
                }
            }

            if (!mediaType && row.text) {
                if (row.text.includes('[Flow Response') || row.text.includes('nfm_reply') || (row.text.includes('"flow_token"') && row.text.trim().startsWith('{'))) {
                    mediaType = 'flow_response';
                }
            }

            let templateDetails = null;
            if (row.text) {
                const tplMatch = row.text.match(/^\[Template:\s*([a-zA-Z0-9_\-]+)\]/i);
                if (tplMatch) {
                    const tName = tplMatch[1].toLowerCase().trim();
                    templateDetails = templateContentMap.get(tName) || fallbackTemplates[tName] || {
                        name: tplMatch[1],
                        body: null
                    };
                }
            }

            return {
                id: row.id,
                instanceId: row.instance_id,
                remoteJid: row.remote_jid,
                fromMe: row.from_me,
                text: row.text,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                templateDetails,
                status: row.status || 'sent',
                timestamp: row.timestamp,
                quotedMsgId: row.quoted_msg_id,
                quotedMsgJson: row.quoted_msg_json ? JSON.parse(row.quoted_msg_json) : undefined
            };
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat/send', authenticate, async (req, res) => {
    const { instanceId, remoteJid, message, media, type, quotedMsgId } = req.body;
    const instance = instancesMap.get(instanceId);
    
    if (!instance || instance.status !== 'open') {
        return res.status(400).json({ error: 'Instance offline' });
    }

    try {
        const payload = {};
        if (message) payload.text = message;
        if (quotedMsgId) {
            // Minimal quote object - Baileys handles the rest if we just pass the ID? 
            // Actually Baileys needs the full message object to quote properly usually, 
            // but for simple text quotes, we can try passing the stanzaId in contextInfo.
            // A robust implementation would fetch the message from DB to reconstruct it.
            // For now, we'll assume the client sends the ID and we try to link it.
            // Ideally, we should fetch the message from DB to get the context.
            const qMsgRes = await pool.query('SELECT * FROM chat_messages WHERE id = $1', [quotedMsgId]);
            if (qMsgRes.rows.length > 0) {
                const qRow = qMsgRes.rows[0];
                // Construct a fake quoted message object for Baileys
                // This is a simplification. Real quoting requires the full proto message.
                // However, Baileys allows passing `quoted` property in sendMessage options.
                // We'll reconstruct a basic one.
                const qMsgContent = qRow.media_type ? { [qRow.media_type + 'Message']: { caption: qRow.text } } : { conversation: qRow.text };
                
                payload.contextInfo = {
                    stanzaId: quotedMsgId,
                    participant: qRow.from_me ? instance.sock.user.id.split(':')[0] + '@s.whatsapp.net' : remoteJid,
                    quotedMessage: qMsgContent
                };
            }
        }

        let sentMsg;
        let msgId;
        
        if (instance.provider === 'meta') {
            let jid = remoteJid.replace(/[^0-9]/g, '');
            if (jid.length === 10 && /^[6789]/.test(jid)) {
                jid = '91' + jid; // Default India 91 prefix for 10-digit mobile numbers
            }

            // -------------------------------------------------------------
            // META OFFICIAL API WALLET BALANCE PRE-CHECK
            // -------------------------------------------------------------
            let metaCost = 0.50;
            try {
                const costRes = await pool.query("SELECT value FROM system_settings WHERE key = 'meta_regular_credit_cost'");
                if (costRes.rows.length > 0 && costRes.rows[0].value) {
                    metaCost = parseFloat(costRes.rows[0].value) || 0.50;
                }
            } catch (e) {}

            const userBalRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id]);
            const walletBalance = userBalRes.rows.length > 0 ? (parseFloat(userBalRes.rows[0].wallet_balance) || 0) : 0;

            if (walletBalance < metaCost) {
                return res.status(402).json({ 
                    error: `Insufficient wallet balance for Meta Direct Chat message (requires ₹${metaCost.toFixed(2)}, available balance: ₹${walletBalance.toFixed(2)}). Please recharge wallet.` 
                });
            }

            let msgData = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: jid,
                type: "text",
                text: { body: message || ' ' }
            };
            
            if (media) {
                const metaType = (type === 'video' || type === 'document' || type === 'audio' || type === 'voice') 
                    ? (type === 'voice' ? 'audio' : type) 
                    : 'image';
                msgData.type = metaType;
                const mediaObj = await getMetaMediaObjectServer(media, instance, metaType);
                msgData[metaType] = mediaObj;
                if (message && metaType !== 'audio') {
                    msgData[metaType].caption = message;
                }
                if (metaType === 'document' && req.body.fileName) {
                    msgData[metaType].filename = req.body.fileName;
                }
                delete msgData.text;
            }
            
            const metaRes = await fetch(`https://graph.facebook.com/v26.0/${instance.metaPhoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${instance.metaAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msgData)
            });
            
            const metaJson = await metaRes.json();
            if (!metaRes.ok || metaJson.error) {
                const errObj = metaJson.error || {};
                let errMsg = errObj.message || 'Meta API Error';
                if (errObj.code === 131047 || errMsg.includes('24 hours')) {
                    errMsg = 'Meta 24-Hour Service Window is closed for this recipient. Please send an approved Meta Template to re-open the session.';
                }
                console.error(`[Meta Direct Send Error] ${errMsg}`, errObj);
                return res.status(400).json({ error: errMsg });
            }
            msgId = metaJson.messages?.[0]?.id || `meta_${Date.now()}`;

            // -------------------------------------------------------------
            // META OFFICIAL API WALLET DEBIT ON SUCCESSFUL SEND
            // -------------------------------------------------------------
            try {
                await pool.query(
                    'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE id = $2',
                    [metaCost, req.user.id]
                );

                await pool.query(
                    'INSERT INTO wallet_transactions (user_id, amount, type, description, message_number, message_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [req.user.id, metaCost, 'debit', `Meta Cloud API Direct Chat to ${jid}`, jid, msgId, 'completed']
                );

                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [req.user.id, instance.id, jid, 'sent', msgId, message || (media ? '[Media]' : 'Direct Chat')]
                );

                await pool.query(
                    'UPDATE subscriptions SET messages_sent_today = CASE WHEN last_reset_date < CURRENT_DATE THEN 1 ELSE messages_sent_today + 1 END, messages_sent_this_month = COALESCE(messages_sent_this_month, 0) + 1, messages_sent_this_year = COALESCE(messages_sent_this_year, 0) + 1, last_reset_date = CURRENT_DATE WHERE user_id = $1',
                    [req.user.id]
                );

                io.emit('wallet_updated', { userId: req.user.id, amount: metaCost, type: 'debit', messageId: msgId });
                console.log(`[Meta Direct Chat] Debited ₹${metaCost} from user ${req.user.id} for message ${msgId}`);
            } catch (deductErr) {
                console.error('[Meta Direct Chat Wallet Notice]', deductErr.message);
            }
        } else {
            // Instruction: Send outgoing media or text via Baileys socket
            // Logic: Extracts true buffer and MIME types so voice notes (ogg opus) and media files are never corrupted
            if (media) {
                let mediaBuffer;
                let mimeType = 'image/jpeg';
                let ext = 'jpg';

                if (media.startsWith('data:')) {
                    const mimeMatch = media.match(/^data:(.*?);base64,/);
                    if (mimeMatch) mimeType = mimeMatch[1];
                    ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
                    const base64Data = media.split(',')[1];
                    mediaBuffer = Buffer.from(base64Data, 'base64');
                } else if (media.startsWith('/uploads/') || media.startsWith('uploads/')) {
                    const cleanRel = media.substring(media.indexOf('uploads/'));
                    const localPath = path.join(process.cwd(), cleanRel);
                    if (fs.existsSync(localPath)) {
                        mediaBuffer = fs.readFileSync(localPath);
                        ext = path.extname(localPath).slice(1).toLowerCase() || 'jpg';
                    } else {
                        mediaBuffer = { url: media };
                    }
                } else {
                    mediaBuffer = { url: media };
                }

                const bType = (type === 'audio' || type === 'voice') ? 'audio' : (type || 'image');
                let audioMime = 'audio/ogg; codecs=opus';
                if (type === 'voice') {
                    audioMime = 'audio/ogg; codecs=opus';
                } else if (type === 'audio') {
                    audioMime = mimeType.startsWith('audio/') ? mimeType : 'audio/mp4';
                }

                const bOptions = {
                    [bType]: mediaBuffer,
                    caption: (bType === 'audio' ? undefined : message),
                    mimetype: (type === 'audio' || type === 'voice') ? audioMime : undefined,
                    ptt: (type === 'voice'),
                    ...payload.contextInfo ? { contextInfo: payload.contextInfo } : {}
                };
                if (bType === 'document' && req.body.fileName) {
                    bOptions.fileName = req.body.fileName;
                }

                sentMsg = await instance.sock.sendMessage(remoteJid, bOptions);
            } else {
                sentMsg = await instance.sock.sendMessage(remoteJid, { text: message, ...payload.contextInfo ? { contextInfo: payload.contextInfo } : {} });
            }
            if (sentMsg && sentMsg.key && sentMsg.message) {
                saveMessage(sentMsg.key, sentMsg.message);
            }
            msgId = sentMsg ? sentMsg.key.id : `msg_${Date.now()}`;
        }
        
        // Instruction: Save base64 media payload to local disk in uploads/
        // Logic: Ensures media is served with a clean URL and is accessible for preview and download
        let displayMediaUrl = media;
        if (media && media.startsWith('data:')) {
            const mimeMatch = media.match(/^data:(.*?);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            let ext = mimeType.split('/')[1] || 'bin';
            if (ext.includes(';')) ext = ext.split(';')[0];
            if (type === 'voice') ext = 'ogg';
            const base64Data = media.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `chat_media_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
            displayMediaUrl = `/uploads/${fileName}`;
        }

        await pool.query(
            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status, quoted_msg_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
            [msgId, instanceId, remoteJid, true, message, displayMediaUrl, type, new Date(), 'sent', quotedMsgId]
        );
        
    

        // Emit to Socket.io
        io.emit('new_message', {
            id: msgId,
            instanceId,
            remoteJid,
            fromMe: true,
            text: message,
            mediaUrl: displayMediaUrl,
            mediaType: type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            quotedMsgId
        });

        res.json({ 
            success: true, 
            messageId: msgId,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('[Chat Send Error]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// --- TEAM MANAGEMENT ---

app.get('/api/team', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, mobile, role, permissions, created_at FROM users WHERE parent_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/team', authenticate, async (req, res) => {
    const { username, email, password, role, permissions } = req.body;
    const id = `user_${Date.now()}`;
    
    // Default target role to team_member (or admin if specified)
    const targetRole = (role === 'admin') ? 'admin' : 'team_member';

    try {
        await pool.query(
            'INSERT INTO users (id, username, email, password, role, parent_id, api_key, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, username, email, password, targetRole, req.user.id, `key_${Date.now()}`, permissions]
        );

        // Safely determine valid plan_id (parent's plan or first available plan in database)
        let planId = 'p_basic';
        try {
            const parentSub = await pool.query('SELECT plan_id FROM subscriptions WHERE user_id = $1', [req.user.id]);
            if (parentSub.rows.length > 0 && parentSub.rows[0].plan_id) {
                planId = parentSub.rows[0].plan_id;
            } else {
                const fallbackPlan = await pool.query('SELECT id FROM plans LIMIT 1');
                if (fallbackPlan.rows.length > 0) planId = fallbackPlan.rows[0].id;
            }

            // Ensure planId exists in plans table before inserting subscription
            const validPlan = await pool.query('SELECT id FROM plans WHERE id = $1', [planId]);
            if (validPlan.rows.length > 0) {
                await pool.query(
                    'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
                    [id, planId, 'active', '2030-01-01']
                );
            }
        } catch (subErr) {
            console.warn('[Backend] Team member subscription insertion notice:', subErr.message);
        }

        res.json({ success: true, id });
    } catch (e) {
        console.error('[Backend] Create team member failed:', e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/team/:id', authenticate, async (req, res) => {
    const { role, permissions, password } = req.body;
    try {
        // Verify ownership
        const check = await pool.query('SELECT id FROM users WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        if (password) {
             await pool.query('UPDATE users SET role = $1, permissions = $2, password = $3 WHERE id = $4', [role, permissions, password, req.params.id]);
        } else {
             await pool.query('UPDATE users SET role = $1, permissions = $2 WHERE id = $3', [role, permissions, req.params.id]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/team/:id', authenticate, async (req, res) => {
    try {
        const check = await pool.query('SELECT id FROM users WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- INITIALIZATION ---

async function startup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(50),
                daily_limit INT DEFAULT 0,
                max_instances INT DEFAULT 1,
                price DECIMAL(10,2) DEFAULT 0.00,
                description TEXT,
                icon VARCHAR(50),
                allowed_providers VARCHAR(20) DEFAULT 'baileys',
                meta_setup_fee DECIMAL(10,2) DEFAULT 0.00,
                features TEXT
            );
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS allowed_providers VARCHAR(20) DEFAULT 'baileys';
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS meta_setup_fee DECIMAL(10,2) DEFAULT 0.00;
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS features TEXT;
            UPDATE plans SET allowed_providers = 'baileys' WHERE allowed_providers IS NULL;

            INSERT INTO plans (id, name, daily_limit, max_instances, price, description, icon, allowed_providers, meta_setup_fee) 
            VALUES 
            ('p_basic', 'Basic (Baileys)', 500, 2, 1499.00, 'Ideal for small businesses using WhatsApp Web.', 'Package', 'baileys', 0.00),
            ('p_pro', 'Pro (Baileys)', 5000, 10, 4999.00, 'Advanced tools for scaling communication and bulk engagement.', 'Rocket', 'baileys', 0.00),
            ('p_enterprise', 'Enterprise (Hybrid)', 0, 100, 24999.00, 'Unlimited possibilities for both Baileys and Meta Cloud API.', 'Crown', 'both', 2999.00),
            ('p_meta_starter', 'Meta Cloud Starter', 10000, 5, 2999.00, 'Official Meta Cloud API plan. One-time setup + recurring platform charge. Template msgs billed from Wallet.', 'Globe', 'meta', 1999.00)
            ON CONFLICT (id) DO NOTHING;

            DELETE FROM plans WHERE id = 'p_team';

            CREATE TABLE IF NOT EXISTS chat_labels (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS chat_session_labels (
                instance_id TEXT NOT NULL,
                remote_jid TEXT NOT NULL,
                label_id TEXT NOT NULL,
                PRIMARY KEY (instance_id, remote_jid, label_id),
                FOREIGN KEY (label_id) REFERENCES chat_labels(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS chat_contacts (
                instance_id TEXT NOT NULL,
                jid TEXT NOT NULL,
                push_name TEXT,
                group_name TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (instance_id, jid)
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[];
            ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';
            ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS quoted_msg_id VARCHAR(100);
            ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS quoted_msg_json TEXT;
            ALTER TABLE instances ADD COLUMN IF NOT EXISTS qr_code TEXT;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_max_instances INT;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS messages_sent_today INT DEFAULT 0;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS messages_sent_this_month INT DEFAULT 0;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS messages_sent_this_year INT DEFAULT 0;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_daily_limit INT;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS meta_setup_waived BOOLEAN DEFAULT FALSE;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_meta_setup_fee INT;
            CREATE TABLE IF NOT EXISTS meta_templates (
                id VARCHAR(100) PRIMARY KEY,
                instance_id VARCHAR(50),
                name VARCHAR(255),
                language VARCHAR(20),
                status VARCHAR(50),
                category VARCHAR(50),
                components JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(instance_id, name, language)
            );
            CREATE TABLE IF NOT EXISTS automations (
                id SERIAL PRIMARY KEY,
                instance_id VARCHAR(50),
                keyword VARCHAR(255),
                match_type VARCHAR(20) DEFAULT 'exact',
                reply_type VARCHAR(20) DEFAULT 'text',
                text_content TEXT,
                media_url TEXT,
                template_name VARCHAR(255),
                template_language VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS parent_id INT;
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'message';
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            
            CREATE TABLE IF NOT EXISTS customer_flow_states (
                remote_jid VARCHAR(255),
                instance_id VARCHAR(50),
                current_node_id INT,
                state_data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (remote_jid, instance_id)
            );

            CREATE TABLE IF NOT EXISTS scheduled_campaigns (
                id VARCHAR(100) PRIMARY KEY,
                user_id VARCHAR(50),
                instance_id VARCHAR(50),
                name VARCHAR(255),
                message TEXT,
                media_url TEXT,
                media_type VARCHAR(50),
                buttons_json TEXT,
                numbers JSONB,
                options JSONB,
                total_recipients INT DEFAULT 0,
                scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                executed_at TIMESTAMP,
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS media_assets (
                id VARCHAR(100) PRIMARY KEY,
                user_id VARCHAR(50),
                name VARCHAR(255),
                url TEXT,
                type VARCHAR(50),
                caption TEXT,
                tag VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS caption TEXT;
            ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS tag VARCHAR(50);
        `);
    } catch (e) {
        console.warn("[iFastX] Startup Schema Update Notice:", e.message);
    }

    try {
        await pool.query(`
            ALTER TABLE chat_messages ALTER COLUMN id DROP DEFAULT;
            ALTER TABLE chat_messages ALTER COLUMN id TYPE VARCHAR(100);
        `);
    } catch (e) {
        console.warn("[iFastX] Startup Alter ID Notice:", e.message);
    }

    try {
        const result = await pool.query("SELECT id, provider, meta_phone_number_id, meta_access_token FROM instances WHERE status != 'closed'");
        console.log(`[iFastX] Restoring ${result.rows.length} active sessions...`);


        for (const row of result.rows) {
            if (row.provider === 'meta') {
                instancesMap.set(row.id, { status: 'open', phone: row.meta_phone_number_id, provider: 'meta', metaAccessToken: row.meta_access_token, metaPhoneNumberId: row.meta_phone_number_id });
            } else {
                connectToWhatsApp(row.id);
            }
        }


        setupWorker(instancesMap, saveMessage, io);
    } catch (e) {
        console.warn("[iFastX] Startup Session Restore Notice:", e.message);
    }
}

async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = require('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        // Instruction: Serve compiled static assets from dist directory in production
        // Logic: Serves compiled frontend assets and handles SPA client-side routes gracefully
        const distPath = path.join(__dirname, 'dist');
        app.use(express.static(distPath));
        
        // Handle SPA routing safely
        app.get('*', (req, res) => {
            const indexHtmlPath = path.join(distPath, 'index.html');
            if (fs.existsSync(indexHtmlPath)) {
                res.sendFile(indexHtmlPath);
            } else {
                res.status(404).send('<!DOCTYPE html><html><head><title>iFastX Gateway</title></head><body style="font-family:sans-serif;background:#0b141a;color:#fff;padding:50px;text-align:center;"><h2>iFastX Backend Active</h2><p>Application frontend bundle is building or missing. Run <code>npm run build</code> to generate production static files.</p></body></html>');
            }
        });
    }

    server.listen(port, "0.0.0.0", () => {
        console.log(`[iFastX] Backend Service Live on Port ${port}`);
        startup();
    });
}

startServer();
