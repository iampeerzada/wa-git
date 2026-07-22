require('dotenv').config();
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
    proto
} = require('@whiskeysockets/baileys');

const messageCache = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of messageCache.entries()) {
        if (now - data.timestamp > 3600000) {
            messageCache.delete(id);
        }
    }
}, 600000);
const saveMessage = (key, message) => {
    if (key && key.id) {
        messageCache.set(key.id, { message, timestamp: Date.now() });
    }
};
const getMessage = async (key) => {
    if (key && key.id) {
        const data = messageCache.get(key.id);
        if (data && data.message) return data.message;
    }
    return { conversation: '' };
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

// --- MIDDLEWARE ---

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-API-Key', 'X-Role']
}));

// Disable caching for all API responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Increased limit to 150MB to support larger video uploads via base64
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

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

        // Verify message_logs has content column
        try {
            await client.query('ALTER TABLE instances ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;');
            console.log('[Database] Added ai_enabled column to instances');
        } catch (alterErr) {
            if (alterErr.code === '42701') {
                // column exists
            }
        }
        

        try {
            await client.query("ALTER TABLE instances ADD COLUMN provider VARCHAR(20) DEFAULT 'baileys'");
            await client.query("ALTER TABLE instances ADD COLUMN meta_access_token TEXT");
            await client.query("ALTER TABLE instances ADD COLUMN meta_phone_number_id VARCHAR(50)");
            await client.query("ALTER TABLE instances ADD COLUMN meta_waba_id VARCHAR(50)");
            console.log('[Database] Added Meta columns to instances');
        } catch (e) {
            // Probably already exists
        }

        try {
            await client.query('ALTER TABLE message_logs ADD COLUMN content TEXT;');
            console.log('[Database] Added content column to message_logs');
        } catch (alterErr) {
            if (alterErr.code === '42701') {
                console.log('[Database] message_logs content column already exists.');
            } else {
                console.error('[Database] Failed to alter message_logs:', alterErr);
            }
        }

        // Create system_settings table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[Database] system_settings table verified.');
    } catch (dbErr) {
        console.error('[Database] Permission test FAILED:', dbErr.message);
        console.error('[Database] ACTION REQUIRED: Run the GRANT commands in database.sql');
    } finally {
        release();
    }
});

// Redis & Queue
let outboundQueue;
try {
    const redisConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
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
});

// --- AUTHENTICATION MIDDLEWARE ---

const authenticate = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-role'];
    const apiKey = req.headers['x-api-key'];

    // Special Case: Allow POST /api/users for signups or initial setup
    if (req.path === '/api/users' && req.method === 'POST') {
        req.user = { id: userId || 'anonymous', role: role || 'admin' };
        return next();
    }

    if (!userId && !apiKey) {
        return res.status(401).json({ error: 'Identification header X-User-ID or X-API-Key missing' });
    }

    try {
        let userResult;
        if (userId) {
            userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        } else if (apiKey) {
            userResult = await pool.query('SELECT * FROM users WHERE api_key = $1', [apiKey]);
        }

        if (userResult && userResult.rows.length > 0) {
            const dbUser = userResult.rows[0];
            const subResult = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [dbUser.id]);
            let subscription = subResult.rows[0] || null;
            
            if (subscription && subscription.status === 'active' && subscription.expiry_date && new Date(subscription.expiry_date) < new Date()) {
                subscription.status = 'expired';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['expired', subscription.user_id]).catch(() => {});
                sendSystemNotification(dbUser.id, `⚠️ *Account Expired*\n\nYour subscription has expired. Please renew your plan to continue sending messages.`);
            } else if (subscription && subscription.status === 'expired' && (subscription.expiry_date === null || new Date(subscription.expiry_date) > new Date())) {
                subscription.status = 'active';
                pool.query('UPDATE subscriptions SET status = $1 WHERE user_id = $2', ['active', subscription.user_id]).catch(() => {});
            }

            req.user = { 
                ...dbUser, 
                subscription: subscription 
            };
        } else if (userId === 'u_super_9595') {
            // Seed bypass for initial superadmin
            req.user = { id: 'u_super_9595', role: 'superadmin' };
        } else {
            return res.status(403).json({ error: 'User context not found in database.' });
        }
    } catch (e) {
        console.error(`[Auth] User lookup failed:`, e.message);
        return res.status(500).json({ error: 'Internal Auth Failure' });
    }
    
    next();
};

// --- WHATSAPP ENGINE ---
const offlineAlerts = new Map();

async function connectToWhatsApp(instanceId) {
    try {
        const sessionDir = path.join(__dirname, 'sessions', instanceId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 5000,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: true,
            getMessage
        });

        instancesMap.set(instanceId, { sock, status: 'connecting', qr: null, phone: null });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                instancesMap.set(instanceId, { ...instancesMap.get(instanceId), qr, status: 'qr_required' });
                await pool.query('UPDATE instances SET status = $1, qr_code = $2 WHERE id = $3', ['qr_required', qr, instanceId]).catch(e => console.error('QR Update Error:', e.message));
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                // Only require re-scanning QR (by deleting session) if explicitly logged out (401).
                // Do not delete session on badSession (500) or other errors, as they often reconnect successfully.
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                const instanceData = instancesMap.get(instanceId);
                const phone = instanceData?.phone || instanceId;

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
                const phone = sock.user.id.split(':')[0];
                instancesMap.set(instanceId, { sock, status: 'open', qr: null, phone });
                await pool.query('UPDATE instances SET status = $1, phone_number = $2, qr_code = NULL WHERE id = $3', ['open', phone, instanceId]).catch(e => console.error('Open State Update Error:', e.message));
                console.log(`[Instance ${instanceId}] Connected as ${phone}`);
            }
        });

        sock.ev.on('creds.update', saveCreds);

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
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
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
                } else if (pushName) {
                    await pool.query(
                        'INSERT INTO chat_contacts (instance_id, jid, push_name) VALUES ($1, $2, $3) ON CONFLICT (instance_id, jid) DO UPDATE SET push_name = $3',
                        [instanceId, from, pushName]
                    );
                }
            } catch (metaErr) {
                // Silent fail for metadata fetch to not block message processing
            }
            
            // Extract Text Content
            let text = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         msg.message.videoMessage?.caption || 
                         msg.message.documentMessage?.caption || 
                         msg.message.buttonsResponseMessage?.selectedDisplayText || 
                         msg.message.listResponseMessage?.title || '';

            if (msg.message.interactiveResponseMessage?.nativeFlowResponseMessage) {
                try {
                    const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                    text = params.id || text;
                } catch (e) {}
            }
            
            // Extract Media Content
            let mediaUrl = null;
            let mediaType = null;

            try {
                if (msg.message.imageMessage) {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    mediaUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                    mediaType = 'image';
                } else if (msg.message.videoMessage) {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    const isGif = msg.message.videoMessage.gifPlayback;
                    mediaUrl = `data:video/mp4;base64,${buffer.toString('base64')}`;
                    mediaType = isGif ? 'gif' : 'video'; // Frontend handles 'video', but we can distinguish if needed
                } else if (msg.message.documentMessage) {
                    // For documents, we might not want to download huge files automatically, but for now let's do it for consistency
                    // Or maybe just store metadata? Let's skip heavy download for docs unless requested
                    mediaType = 'document';
                    mediaUrl = null; // Placeholder or handle download on demand
                } else if (msg.message.stickerMessage) {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    mediaUrl = `data:image/webp;base64,${buffer.toString('base64')}`;
                    mediaType = 'image'; // Treat sticker as image for simple display
                }
            } catch (mediaErr) {
                console.error('[Media Download Error]', mediaErr.message);
            }

            // Extract Quoted Message
            let quotedMsgId = null;
            let quotedMsgJson = null;
            try {
                const contextInfo = msg.message.extendedTextMessage?.contextInfo || 
                                    msg.message.imageMessage?.contextInfo || 
                                    msg.message.videoMessage?.contextInfo;
                if (contextInfo && contextInfo.stanzaId) {
                    quotedMsgId = contextInfo.stanzaId;
                    // Store minimal quoted content
                    const qMsg = contextInfo.quotedMessage;
                    if (qMsg) {
                        const qText = qMsg.conversation || qMsg.extendedTextMessage?.text || '';
                        const qType = qMsg.imageMessage ? 'image' : qMsg.videoMessage ? 'video' : 'text';
                        quotedMsgJson = JSON.stringify({ text: qText, mediaType: qType });
                    }
                }
            } catch (e) {}

            // Store message in DB
            try {
                const msgId = msg.key.id;
                await pool.query(
                    'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status, quoted_msg_id, quoted_msg_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING',
                    [msgId, instanceId, from, fromMe, text, mediaUrl, mediaType, new Date(msg.messageTimestamp * 1000), 'delivered', quotedMsgId, quotedMsgJson]
                );

                // Emit to Socket.io
                io.emit('new_message', {
                    id: msgId,
                    instanceId,
                    remoteJid: from,
                    fromMe,
                    text,
                    mediaUrl,
                    mediaType,
                    timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
                    status: 'delivered',
                    quotedMsgId,
                    quotedMsg: quotedMsgJson ? JSON.parse(quotedMsgJson) : null
                });

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

                // AI Auto-Responder Logic
                if (!fromMe && text) {
                    try {
                        const instanceCheck = await pool.query('SELECT ai_enabled FROM instances WHERE id = $1', [instanceId]);
                        if (instanceCheck.rows[0] && instanceCheck.rows[0].ai_enabled && process.env.GEMINI_API_KEY) {
                            console.log('[AI] Generating reply for', from);
                            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                            
                            // Get chat history for context
                            const historyRes = await pool.query(
                                'SELECT from_me, text FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 ORDER BY timestamp DESC LIMIT 10',
                                [instanceId, from]
                            );
                            
                            const chatHistory = historyRes.rows.reverse().map(row => 
                                (row.from_me ? "Assistant: " : "User: ") + (row.text || '')
                            ).join('\n');
                            
                            const prompt = `You are a helpful WhatsApp assistant. Reply to the user's latest message based on this recent conversation history:\n\n${chatHistory}\n\nReply nicely, concisely and accurately. Do not include prefix like "Assistant:".`;

                            const response = await ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: prompt
                            });
                            
                            if (response.text) {
                                await sock.sendMessage(from, { text: response.text });
                                // the message will be picked up by messages.upsert since it's fromMe=true? Actually no, sock.sendMessage doesn't trigger upsert sometimes, but let's assume it does, or we can just let it be.
                            }
                        }
                    } catch (aiErr) {
                        console.error('[AI Auto-Responder Error]', aiErr.message);
                    }
                }
            } catch (dbErr) {
                console.error('[Chat Storage Error]', dbErr.message);
            }

            if (fromMe) return;
            if (!text) return;

            try {
                // Fetch active rules for this instance
                const ruleResult = await pool.query(
                    'SELECT * FROM auto_responder_rules WHERE instance_id = $1 AND is_active = TRUE AND LOWER(trigger_keyword) = LOWER($2)',
                    [instanceId, text.trim()]
                );

                if (ruleResult.rows.length > 0) {
                    const rule = ruleResult.rows[0];
                    console.log(`[AutoResponder] Match found for "${text}" on instance ${instanceId}`);
                    
                    // Simple Response Logic
                    let payload = {};
                    if (rule.media_url) {
                        const type = rule.media_type || 'image';
                        payload = { [type]: { url: rule.media_url }, caption: rule.response_message };
                    } else {
                        payload = { text: rule.response_message };
                    }

                    // Handle Buttons if stored in JSON
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

                                let headerOptions = {
                                  hasMediaAttachment: false
                                };

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

                    if (useInteractive) {
                        const msgGen = generateWAMessageFromContent(from, interactiveMessageContent, { 
                          userJid: sock.user.id,
                          upload: sock.waUploadToServer
                        });
                        await sock.relayMessage(from, msgGen.message, { messageId: msgGen.key.id });
                    } else {
                        await sock.sendMessage(from, payload);
                    }
                    
                    // Log the auto-response event
                    const responseText = rule.response_message || 'Media Auto-Response';
                    await pool.query(
                        'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ((SELECT user_id FROM instances WHERE id = $1), $1, $2, $3, $4, $5)',
                        [instanceId, from, 'auto_responded', 'auto_' + Date.now(), responseText]
                    );
                }
            } catch (err) {
                console.error('[AutoResponder Error]', err.message);
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
            return res.json({ 
                ...user, 
                subscription: sub.rows[0] || null 
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
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
            const msg = body.entry[0].changes[0].value.messages[0];
            const from = msg.from; 
            const pushName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || '';
            
            let text = msg.text ? msg.text.body : '';
            if (msg.interactive) {
                text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || text;
            }
            
            const msgId = msg.id;
            const fromMe = false;
            const timestamp = msg.timestamp;
            
            try {
                const instanceRes = await pool.query('SELECT id, ai_enabled, webhook_url, meta_access_token FROM instances WHERE meta_phone_number_id = $1 LIMIT 1', [phoneNumberId]);
                if (instanceRes.rows.length > 0) {
                    const instance = instanceRes.rows[0];
                    const instanceId = instance.id;
                    
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, from, fromMe, text, new Date(timestamp * 1000), 'delivered']
                    );
                    
                    io.emit('new_message', {
                        id: msgId,
                        instanceId,
                        remoteJid: from,
                        fromMe,
                        text,
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
                    
                    if (instance.ai_enabled && process.env.GEMINI_API_KEY && text) {
                        console.log('[Meta AI] Generating reply for', from);
                        const { GoogleGenAI } = require("@google/genai");
                        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        
                        const historyRes = await pool.query(
                            'SELECT from_me, text FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 ORDER BY timestamp DESC LIMIT 10',
                            [instanceId, from]
                        );
                        
                        const chatHistory = historyRes.rows.reverse().map(row => 
                            (row.from_me ? "Assistant: " : "User: ") + (row.text || '')
                        ).join('\n');
                        
                        const prompt = `You are a helpful WhatsApp assistant. Reply to the user's latest message based on this recent conversation history:\n\n${chatHistory}\n\nReply nicely, concisely and accurately. Do not include prefix like "Assistant:".`;

                        const response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt
                        });
                        
                        if (response.text) {
                            fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${instance.meta_access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    messaging_product: "whatsapp",
                                    recipient_type: "individual",
                                    to: from,
                                    type: "text",
                                    text: { body: response.text }
                                })
                            }).catch(e => console.error('[Meta AI Reply Send Error]', e.message));
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
        const { instanceId, limit = 100 } = req.query;
        let query = 'SELECT * FROM message_logs WHERE user_id = $1';
        let params = [req.user.id];

        if (instanceId) {
            query += ' AND instance_id = $2';
            params.push(instanceId);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER MANAGEMENT ---

app.get('/api/users', authenticate, async (req, res) => {
    try {
        let query = `
            SELECT u.*, 
            s.plan_id as sub_plan_id, s.status as sub_status, s.expiry_date as sub_expiry,
            s.messages_sent_today, s.messages_sent_this_month, s.messages_sent_this_year,
            s.custom_max_instances, s.custom_daily_limit
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
                    messagesSentToday: u.messages_sent_today,
                    messagesSentThisMonth: u.messages_sent_this_month,
                    messagesSentThisYear: u.messages_sent_this_year,
                    customMaxInstances: u.custom_max_instances,
                    customDailyLimit: u.custom_daily_limit
                }
            };
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticate, async (req, res) => {
    const { id, username, email, mobile, password, role, parentId, apiKey, subscription } = req.body;
    
    console.log(`[Backend] Attempting to create user: ${username} with ID ${id}`);

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
            'INSERT INTO users (id, username, email, mobile, password, role, parent_id, api_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, username, email, mobile, password, role, parentId, apiKey]
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
            email,
            mobile,
            role,
            parentId,
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
    const { username, email, mobile, password, role, planId, expiryDate, customMaxInstances, customDailyLimit } = req.body;
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

        if (subUpdates.length > 0) {
            const existingSub = await client.query('SELECT user_id FROM subscriptions WHERE user_id = $1', [id]);
            if (existingSub.rows.length > 0) {
                await client.query(`UPDATE subscriptions SET ${subUpdates.join(', ')} WHERE user_id = $1`, subValues);
            } else if (planId) {
                await client.query(
                    'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date, custom_max_instances, custom_daily_limit) VALUES ($1, $2, $3, $4, $5, $6)',
                    [id, planId, 'active', expiryDate || null, customMaxInstances === '' ? null : customMaxInstances, customDailyLimit === '' ? null : customDailyLimit]
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
        res.json(result.rows);
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
    
    try {
        await pool.query(
            'INSERT INTO plans (id, name, daily_limit, max_instances, price, description, icon) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, name, price, daily_limit, max_instances, description, icon]
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
    
    try {
        await pool.query(
            'UPDATE plans SET name = $1, price = $2, daily_limit = $3, max_instances = $4, description = $5, icon = $6 WHERE id = $7',
            [name, price, daily_limit, max_instances, description, icon, req.params.id]
        );
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

// --- INSTANCE MANAGEMENT ---

app.get('/api/instances', authenticate, async (req, res) => {
    try {
        const isSuper = req.user.role === 'superadmin';
        const query = isSuper ? 'SELECT * FROM instances' : 'SELECT * FROM instances WHERE user_id = $1';
        const params = isSuper ? [] : [req.user.id];

        const result = await pool.query(query, params);
        
        const merged = result.rows.map(inst => {
            const live = instancesMap.get(inst.id);
            return {
                ...inst,
                status: live ? live.status : inst.status,
                qrCode: live ? live.qr : inst.qr_code,
                phoneNumber: live ? (live.phone || inst.phone_number) : inst.phone_number,
                isVisible: inst.is_visible !== false, // Handle DB field
                webhookUrl: inst.webhook_url,
                aiEnabled: inst.ai_enabled
            };
        });
        res.json(merged);
    } catch (err) {
        console.error('[API GET Instances] Database Error:', err.message);
        res.status(500).json({ error: 'Database access failure', details: err.message });
    }
});

app.post('/api/create', authenticate, async (req, res) => {
    const { name, provider, metaAccessToken, metaPhoneNumberId, metaWabaId } = req.body;
    const id = `inst_${Date.now()}`;
    const instProvider = provider === 'meta' ? 'meta' : 'baileys';
    try {
        if (req.user.role !== 'superadmin') {
            const userRes = await pool.query(`
                SELECT u.id, s.plan_id, s.custom_max_instances, p.max_instances 
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
                'INSERT INTO instances (id, user_id, name, status, provider, meta_access_token, meta_phone_number_id, meta_waba_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, req.user.id, name, 'open', 'meta', metaAccessToken, metaPhoneNumberId, metaWabaId]
            );
            instancesMap.set(id, { status: 'open', phone: metaPhoneNumberId, provider: 'meta', metaAccessToken, metaPhoneNumberId });
            res.status(201).json({ id, name, status: 'open', provider: 'meta' });
        } else {
            await pool.query('INSERT INTO instances (id, user_id, name, status, provider) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, name, 'connecting', 'baileys']);
            connectToWhatsApp(id);
            res.status(201).json({ id, name, status: 'connecting', provider: 'baileys' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/instance/:id/rename', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE instances SET name = $1 WHERE id = $2', [req.body.name, req.params.id]);
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
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.patch('/api/instance/:id/ai', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            const check = await pool.query('SELECT user_id FROM instances WHERE id = $1', [req.params.id]);
            if (check.rows.length === 0 || check.rows[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        await pool.query('UPDATE instances SET ai_enabled = $1 WHERE id = $2', [req.body.aiEnabled, req.params.id]);
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
    res.json({ success: true });
});

app.delete('/api/instance/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const instance = instancesMap.get(id);
    if (instance?.sock) await instance.sock.logout().catch(() => {});
    instancesMap.delete(id);
    await pool.query('DELETE FROM instances WHERE id = $1', [id]);
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

app.post('/api/send', authenticate, async (req, res) => {
    const { instanceId, number, message, mediaUrl, mediaType, buttons, options } = req.body;
    if (!outboundQueue) return res.status(503).json({ error: 'Messaging queue offline' });
    
    // Check subscription status
    if (req.user.role !== 'superadmin') {
        const sub = req.user.subscription;
        if (!sub || sub.status !== 'active' || (sub.expiry_date && new Date(sub.expiry_date) < new Date())) {
            return res.status(403).json({ error: 'Subscription expired or inactive. Please renew your plan to send messages.' });
        }

        // Check daily message limit
        try {
            const limitRes = await pool.query(`
                SELECT s.messages_sent_today, s.custom_daily_limit, p.daily_limit 
                FROM subscriptions s 
                LEFT JOIN plans p ON s.plan_id = p.id 
                WHERE s.user_id = $1
            `, [req.user.id]);
            
            if (limitRes.rows.length > 0) {
                const limitData = limitRes.rows[0];
                const maxDaily = limitData.custom_daily_limit !== null ? limitData.custom_daily_limit : (limitData.daily_limit || 0);
                
                if (maxDaily !== 0 && limitData.messages_sent_today >= maxDaily) {
                    return res.status(429).json({ error: `Daily message limit reached. Your plan allows a maximum of ${maxDaily} messages per day.` });
                }
            }
        } catch (err) {
            console.error('[API Send] Limit Check Error:', err.message);
        }
    }

    // Debug Logging
    console.log(`[API Send] Processing request for ${number} with ${buttons?.length || 0} buttons.`);
    
    try {
        await outboundQueue.add('send-message', {
            userId: req.user.id,
            instanceId,
            number,
            message,
            mediaUrl,
            mediaType,
            waButtons: buttons,
            options: options || {}
        });
        res.json({ success: true, message: 'Message queued' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
                SELECT s.messages_sent_today, s.custom_daily_limit, p.daily_limit 
                FROM subscriptions s 
                LEFT JOIN plans p ON s.plan_id = p.id 
                WHERE s.user_id = $1
            `, [req.user.id]);
            
            if (limitRes.rows.length > 0) {
                const limitData = limitRes.rows[0];
                const maxDaily = limitData.custom_daily_limit !== null ? limitData.custom_daily_limit : (limitData.daily_limit || 0);
                
                if (maxDaily !== 0 && (limitData.messages_sent_today + numbers.length) > maxDaily) {
                    return res.status(429).json({ error: `Daily message limit reached. Your plan allows a maximum of ${maxDaily} messages per day. You are trying to send ${numbers.length} messages, but you only have ${maxDaily - limitData.messages_sent_today} left.` });
                }
            }
        } catch (err) {
            console.error('[API Send Bulk] Limit Check Error:', err.message);
        }
    }

    console.log(`[API Send Bulk] Processing bulk request for ${numbers.length} numbers.`);
    
    try {
        let currentDelay = 0;
        const jobs = numbers.map((number, index) => {
            // Calculate a staggered delay for each message based on the options
            const delayMin = options?.delayMin || 3;
            const delayMax = options?.delayMax || 7;
            const randomDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
            
            // Accumulate delay to ensure strictly increasing staggered sending
            if (index > 0) {
                currentDelay += randomDelay;
            }

            return {
                name: 'send-message',
                data: {
                    userId: req.user.id,
                    instanceId,
                    number,
                    message,
                    mediaUrl,
                    mediaType,
                    waButtons: buttons,
                    options: { ...options, delay: randomDelay }
                },
                opts: {
                    delay: currentDelay // BullMQ delay option
                }
            };
        });

        // Chunk jobs into batches of 500 to prevent Redis limits / BullMQ errors for large campaigns
        const chunkSize = 500;
        for (let i = 0; i < jobs.length; i += chunkSize) {
            const chunk = jobs.slice(i, i + chunkSize);
            await outboundQueue.addBulk(chunk);
        }
        res.json({ success: true, message: `${numbers.length} messages queued for bulk sending` });
    } catch (err) {
        console.error('[API Send Bulk] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- MEDIA MANAGEMENT ---

app.post('/api/upload', authenticate, async (req, res) => {
    const { fileName, fileType, base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'No file data provided' });
    
    // In a real environment, you would save this to S3 or a local storage folder.
    // For this demonstration, we return a Data URI which is compatible with the frontend logic.
    const url = `data:${fileType};base64,${base64}`;
    res.json({ url });
});

app.post('/api/media', authenticate, async (req, res) => {
    const { id, name, url, type } = req.body;
    try {
        await pool.query('INSERT INTO media_assets (id, user_id, name, url, type) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, name, url, type]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/media', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM media_assets WHERE user_id = $1', [req.user.id]);
        // Map database fields to camelCase for the frontend
        const mapped = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            url: row.url,
            type: row.type,
            createdAt: row.created_at
        }));
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/media/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM media_assets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
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
        const groups = groupResult.rows.map(g => ({
            id: g.id,
            name: g.name,
            userId: g.user_id,
            createdAt: g.created_at ? new Date(g.created_at).toISOString() : null, // Convert to ISO string to fix Invalid Date
            contacts: []
        }));

        for (let i = 0; i < groups.length; i++) {
            const contactResult = await pool.query('SELECT * FROM contacts WHERE group_id = $1', [groups[i].id]);
            groups[i].contacts = (contactResult.rows || []).map(c => ({
                id: c.id,
                number: c.number,
                original: c.original,
                isVerified: true,
                exists: c.status_exists
            }));
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
        res.json({ success: true });
    } catch (e) {
        console.error('[DELETE /api/contacts/groups] Error:', e.message);
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
        // 1. Check User's Saved Contacts (Highest Priority)
        // Note: contacts table uses clean number, so we need to extract it from JID
        const cleanNumber = jid.split('@')[0].split(':')[0];
        
        // Find the contact group for this user first
        const contactRes = await pool.query(`
            SELECT c.original as name 
            FROM contacts c
            JOIN contact_groups cg ON c.group_id = cg.id
            WHERE cg.user_id = $1 AND c.number = $2
            LIMIT 1
        `, [req.user.id, cleanNumber]);

        if (contactRes.rows.length > 0) {
            return res.json({ name: contactRes.rows[0].name });
        }

        // 2. Check Captured Metadata (PushName or Group Name)
        const metaRes = await pool.query(
            'SELECT push_name, group_name FROM chat_contacts WHERE instance_id = $1 AND jid = $2',
            [instanceId, jid]
        );

        if (metaRes.rows.length > 0) {
            const { push_name, group_name } = metaRes.rows[0];
            if (group_name) return res.json({ name: group_name });
            if (push_name) return res.json({ name: push_name });
        }

        // 3. Fallback (handled by frontend usually, but we can return null)
        res.json({ name: null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/chat/sessions/:instanceId', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const result = await pool.query(`
            SELECT remote_jid, MAX(timestamp) as last_time
            FROM chat_messages
            WHERE instance_id = $1
            GROUP BY remote_jid
            ORDER BY last_time DESC
        `, [instanceId]);
        
        const sessions = [];
        for (const row of result.rows) {
            const lastMsg = await pool.query(`
                SELECT * FROM chat_messages 
                WHERE instance_id = $1 AND remote_jid = $2 
                ORDER BY timestamp DESC LIMIT 1
            `, [instanceId, row.remote_jid]);
            
            const labels = await pool.query(`
                SELECT l.id, l.name, l.color 
                FROM chat_labels l
                JOIN chat_session_labels sl ON l.id = sl.label_id
                WHERE sl.instance_id = $1 AND sl.remote_jid = $2
            `, [instanceId, row.remote_jid]);

            sessions.push({
                remoteJid: row.remote_jid,
                lastMessage: lastMsg.rows[0] ? {
                    id: lastMsg.rows[0].id,
                    instanceId: lastMsg.rows[0].instance_id,
                    remoteJid: lastMsg.rows[0].remote_jid,
                    fromMe: lastMsg.rows[0].from_me,
                    text: lastMsg.rows[0].text,
                    timestamp: lastMsg.rows[0].timestamp
                } : null,
                unreadCount: 0, // Simplified
                labels: labels.rows
            });
        }
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/chat/messages/:instanceId/:remoteJid', authenticate, async (req, res) => {
    try {
        const { instanceId, remoteJid } = req.params;
        const result = await pool.query(`
            SELECT * FROM chat_messages
            WHERE instance_id = $1 AND remote_jid = $2
            ORDER BY timestamp ASC
            LIMIT 100
        `, [instanceId, remoteJid]);
        
        const mapped = result.rows.map(row => ({
            id: row.id,
            instanceId: row.instance_id,
            remoteJid: row.remote_jid,
            fromMe: row.from_me,
            text: row.text,
            timestamp: row.timestamp
        }));
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
        if (media) {
            let mediaBuffer;
            if (media.startsWith('data:')) {
                mediaBuffer = Buffer.from(media.split(',')[1], 'base64');
            } else {
                mediaBuffer = { url: media };
            }

            sentMsg = await instance.sock.sendMessage(remoteJid, { 
                [type || 'image']: mediaBuffer,
                caption: message,
                ...payload.contextInfo ? { contextInfo: payload.contextInfo } : {}
            });
        } else {
            sentMsg = await instance.sock.sendMessage(remoteJid, { text: message, ...payload.contextInfo ? { contextInfo: payload.contextInfo } : {} });
        }
        
        // Store in DB
        const msgId = sentMsg.key.id;
        await pool.query(
            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status, quoted_msg_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
            [msgId, instanceId, remoteJid, true, message, media, type, new Date(), 'sent', quotedMsgId]
        );

        // Emit to Socket.io
        io.emit('new_message', {
            id: msgId,
            instanceId,
            remoteJid,
            fromMe: true,
            text: message,
            mediaUrl: media,
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
    
    // Only allow creating team members
    if (role !== 'team_member' && role !== 'admin') {
         return res.status(400).json({ error: 'Invalid role for team member' });
    }

    try {
        await pool.query(
            'INSERT INTO users (id, username, email, password, role, parent_id, api_key, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, username, email, password, role, req.user.id, `key_${Date.now()}`, permissions]
        );
        // Also create a default subscription for them (linked to parent plan logic usually, but for now simple)
        await pool.query(
            'INSERT INTO subscriptions (user_id, plan_id, status, expiry_date) VALUES ($1, $2, $3, $4)',
            [id, 'p_team', 'active', '2030-01-01']
        );

        res.json({ success: true, id });
    } catch (e) {
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
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_max_instances INT;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_daily_limit INT;
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


        setupWorker(instancesMap);
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
        // Serve static files from dist/ in production
        app.use(express.static(path.join(__dirname, 'dist')));
        
        // Handle SPA routing
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    server.listen(port, "0.0.0.0", () => {
        console.log(`[iFastX] Backend Service Live on Port ${port}`);
        startup();
    });
}

startServer();
