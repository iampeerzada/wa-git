const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}
const { Worker } = require('bullmq');
const IORedis = require('ioredis');

class Redis extends IORedis {
    constructor(...args) {
        super(...args);
        this.on('error', (err) => {
            if (err.code !== 'ECONNREFUSED') {
                console.error('[Worker Redis] Error:', err.message);
            }
        });
        this.on('ready', () => {
            this.config('SET', 'stop-writes-on-bgsave-error', 'no').catch(err => {
                console.error('[Worker Redis] Failed to set stop-writes-on-bgsave-error:', err.message);
            });
        });
    }
}
const { Pool } = require('pg');
const { 
  prepareWAMessageMedia, 
  generateWAMessageFromContent,
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

require('dotenv').config();

// --- CONFIGURATION ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') {
    console.error('[Worker Database] Pool Error:', err.message);
  }
});

// --- ANTI-BAN UTILS ---
const solveSpintax = (text) => {
  if (!text) return '';
  return text.replace(/{([^{}]+)}/g, (match, options) => {
    const parts = options.split('|');
    return parts[Math.floor(Math.random() * parts.length)];
  });
};

const toJid = (number) => {
  const cleaned = number.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
};

// Randomized sleep to mimic human variance
const humanJitter = async (min = 2000, max = 5000) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(r => setTimeout(r, delay));
};

// --- WORKER INITIALIZATION ---
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const setupWorker = (instancesMap) => {
  /**
   * Enterprise Anti-Ban Worker
   * Implements BullMQ Rate Limiting + Randomized Human Jitter
   */
  const worker = new Worker('whatsapp-outbound', async (job) => {
    let { 
      instanceId, 
      number, 
      message, 
      userId, 
      mediaUrl, 
      mediaType, 
      waButtons, 
      options,
      instanceIds, // Array of instance IDs for rotation
      templates    // Array of message templates for rotation
    } = job.data;

    // --- MULTI-INSTANCE & MULTI-TEMPLATE ROTATION ---
    if (instanceIds && Array.isArray(instanceIds) && instanceIds.length > 0) {
        // Get global rotation counter for this user/campaign
        const rotationKey = `rotation_cursor:${userId}`;
        const rotationCount = await connection.incr(rotationKey);
        
        // Rotate Instance: Switch every 5 messages
        // (1-5 -> Inst 1, 6-10 -> Inst 2, etc.)
        const instIdx = Math.floor((rotationCount - 1) / 5) % instanceIds.length;
        instanceId = instanceIds[instIdx];
    }

    if (templates && Array.isArray(templates) && templates.length > 0) {
        // Rotate Template: Cycle through templates sequentially or randomly
        // We'll use sequential based on the same rotation counter
        const rotationKey = `rotation_cursor:${userId}`; // Re-use or fetch if not fetched
        const rotationCount = await connection.get(rotationKey) || 1; // Simple fetch
        
        const tplIdx = (rotationCount - 1) % templates.length;
        message = templates[tplIdx];
    }

    let lastError = null;
    let sent = false;

    // Check Daily Limit Before Sending
    try {
        const limitRes = await pool.query(`
            SELECT s.messages_sent_today, s.custom_daily_limit, p.daily_limit 
            FROM subscriptions s 
            LEFT JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1
        `, [userId]);
        
        if (limitRes.rows.length > 0) {
            const limitData = limitRes.rows[0];
            const maxDaily = limitData.custom_daily_limit !== null ? limitData.custom_daily_limit : (limitData.daily_limit || 0);
            
            if (maxDaily !== 0 && limitData.messages_sent_today >= maxDaily) {
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'failed', 'Daily message limit reached', message]
                );
                return; // Stop processing this message
            }
        }
    } catch (err) {
        console.error('[Worker] Limit Check Error:', err.message);
    }

    // Retry Logic: 1. Try -> 2. Retry Same -> 3. Retry Different Instance
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // If retrying with a different instance (Attempt 3), pick a new one
            if (attempt === 3 && instanceIds && instanceIds.length > 1) {
                 const otherInstances = instanceIds.filter(id => id !== instanceId);
                 if (otherInstances.length > 0) {
                     instanceId = otherInstances[Math.floor(Math.random() * otherInstances.length)];
                     console.log(`[Worker Retry] Switching to instance ${instanceId} for recovery.`);
                 }
            }

            const instance = instancesMap.get(instanceId);
            if (!instance || instance.status !== 'open') {
              throw new Error(`Instance ${instanceId} is offline.`);
            }

            const sock = instance.sock;
            const jid = toJid(number);
            const finalMessage = solveSpintax(message);

            if (instance.provider === 'meta') {
                const jid = number.replace(/[^0-9]/g, '');
                
                // Simulate human delay if needed, though Meta API is less strict about bans for fast sending
                if (options?.complianceMode) {
                    await humanJitter(5000, 15000);
                }
                
                let msgData = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: jid,
                    type: "text",
                    text: { body: finalMessage || ' ' }
                };
                
                if (mediaUrl) {
                    msgData.type = mediaType || "image";
                    msgData[msgData.type] = { link: mediaUrl };
                    if (finalMessage) msgData[msgData.type].caption = finalMessage;
                    delete msgData.text;
                }
                
                // Note: Meta API Buttons are not easily mapped to this ad-hoc button structure unless it's a template. 
                // For simplicity, we just send text/media if it's Meta API in this generic worker path. 
                // Or you could implement the full Interactive Message spec for Meta if required.
                
                const metaRes = await fetch(`https://graph.facebook.com/v20.0/${instance.metaPhoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${instance.metaAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msgData)
                });
                
                const metaJson = await metaRes.json();
                
                if (!metaRes.ok || metaJson.error) {
                    throw new Error(metaJson.error?.message || 'Meta API Error');
                }
                
                await pool.query(
                  'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                  [userId, instanceId, number, 'delivered', metaJson.messages?.[0]?.id || 'meta_msg', finalMessage]
                );
                
                sent = true;
                break;
            }

            const footerText = options?.footer || '';
            const headerTitle = options?.header || '';

            // --- DND / Working Hours Logic ---
            if (options?.complianceMode) {
                const currentHour = new Date().getHours();
                if (currentHour >= 0 && currentHour < 7) {
                    console.log(`[Worker] Night Mode Active (Hour: ${currentHour}). Sleeping for 20-30 mins.`);
                    await humanJitter(1200000, 1800000); // 20-30 mins
                }

                // 0. REAL HUMAN SIMULATION: Random Batch Control (3-5 messages)
                const batchCountKey = `safety_batch_count:${instanceId}`;
                const batchLimitKey = `safety_batch_limit:${instanceId}`;
                
                // Fetch or Set Dynamic Limit
                let limit = await connection.get(batchLimitKey);
                if (!limit) {
                    limit = Math.floor(Math.random() * 3) + 3; // Random 3, 4, or 5
                    await connection.set(batchLimitKey, limit, 'EX', 600);
                }
                
                const currentCount = await connection.incr(batchCountKey);
                await connection.expire(batchCountKey, 600); // Keep alive

                if (currentCount >= parseInt(limit)) {
                   // STOP FUNCTION: Variable Long Break (2 min -> 3 min -> 2 min pattern)
                   // Logic: We use a separate counter to track how many *breaks* this instance has taken
                   const breakCounterKey = `safety_break_count:${instanceId}`;
                   const breakCount = await connection.incr(breakCounterKey);
                   await connection.expire(breakCounterKey, 3600);

                   const isEvenBreak = breakCount % 2 === 0;
                   const minDelay = isEvenBreak ? 180000 : 120000; // 3 mins or 2 mins
                   const maxDelay = isEvenBreak ? 185000 : 125000; 
                   
                   console.log(`[Worker] Instance ${instanceId} reached batch limit ${limit}. Pausing for ~${minDelay/1000}s.`);
                   await humanJitter(minDelay, maxDelay);

                   // Reset Batch
                   await connection.set(batchCountKey, 0, 'EX', 600);
                   // Set NEW random limit for next batch
                   const newLimit = Math.floor(Math.random() * 3) + 3;
                   await connection.set(batchLimitKey, newLimit, 'EX', 600);
                }

                // 1. COMPLIANCE LAYER: Randomized Jitter (Delay Function) before any action
                // User Request: "delay of 5-15sec of every messages"
                await humanJitter(5000, 15000);

                // 2. HUMAN SIMULATION: Realistic Presence Flow
                if (options?.simulateTyping !== false) {
                    try {
                        // A. Read Receipts (Simulate opening chat)
                        const lastMsg = await pool.query(
                            'SELECT id FROM chat_messages WHERE remote_jid = $1 AND from_me = false ORDER BY timestamp DESC LIMIT 1',
                            [jid]
                        );
                        
                        if (lastMsg.rows.length > 0) {
                            const key = {
                                remoteJid: jid,
                                id: lastMsg.rows[0].id,
                                fromMe: false
                            };
                            await sock.readMessages([key]);
                        }
                    } catch (readErr) {
                        // Ignore errors if read receipt fails
                    }

                    // B. Online Status
                    await sock.sendPresenceUpdate('available', jid);
                    await humanJitter(1000, 2000);

                    // C. Typing Status
                    await sock.sendPresenceUpdate('composing', jid);
                    // Wait while "typing" to look realistic (2-5s)
                    await humanJitter(2000, 5000);

                    // D. Paused Status (Stop typing before send)
                    await sock.sendPresenceUpdate('paused', jid);
                }
            }

            if (waButtons && waButtons.length > 0) {
                // ... (Existing Button Logic) ...
                const buttons = waButtons.map(btn => {
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
                if (headerTitle) {
                  headerOptions.title = headerTitle;
                }

                if (mediaUrl) {
                  const type = (mediaType === 'video' || mediaType === 'document') ? mediaType : 'image';
                  const mediaPayload = { [type]: { url: mediaUrl } };
                  const preparedMedia = await prepareWAMessageMedia(mediaPayload, { upload: sock.waUploadToServer });
                  
                  headerOptions.hasMediaAttachment = true;
                  if (type === 'image') headerOptions.imageMessage = preparedMedia.imageMessage;
                  else if (type === 'video') headerOptions.videoMessage = preparedMedia.videoMessage;
                  else if (type === 'document') headerOptions.documentMessage = preparedMedia.documentMessage;
                }

                const interactiveMessage = {
                  body: proto.Message.InteractiveMessage.Body.create({ text: finalMessage || ' ' }),
                  nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: buttons,
                    messageVersion: 1
                  })
                };

                if (headerTitle || mediaUrl) {
                  interactiveMessage.header = proto.Message.InteractiveMessage.Header.create(headerOptions);
                }

                if (footerText) {
                  interactiveMessage.footer = proto.Message.InteractiveMessage.Footer.create({ text: footerText });
                }

                const content = {
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

                const msg = generateWAMessageFromContent(jid, content, { 
                  userJid: sock.user.id,
                  upload: sock.waUploadToServer
                });

                await sock.relayMessage(jid, msg.message, { messageId: msg.key.id }); saveMessage(msg.key, msg.message);

                await pool.query(
                  'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                  [userId, instanceId, number, 'delivered', msg.key.id, finalMessage]
                );
            } else {
                // Standard Text/Media Message fallback
                let payload = {};
                if (mediaUrl) {
                  const type = mediaType || 'image';
                  payload = { [type]: { url: mediaUrl }, caption: finalMessage };
                } else {
                  payload = { text: finalMessage };
                }
                
                const sentMsg = await sock.sendMessage(jid, payload);
                await pool.query(
                  'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                  [userId, instanceId, number, 'delivered', sentMsg.key.id, finalMessage]
                );
            }

            // Update Quota
            await pool.query(
                'UPDATE subscriptions SET messages_sent_today = messages_sent_today + 1 WHERE user_id = $1',
                [userId]
            );

            // 3. POST-SEND COOL DOWN
            if (options?.complianceMode) {
                await humanJitter(1000, 2000);
            }

            sent = true;
            break; // Exit retry loop on success

        } catch (err) {
            lastError = err;
            console.error(`[Worker Attempt ${attempt}] Error: ${err.message}`);
            
            // If it's the last attempt, don't wait, just let it fail
            if (attempt < maxAttempts) {
                // Wait before retry
                if (options?.complianceMode) {
                    await humanJitter(2000, 4000);
                }
            }
        }
    }

    if (!sent) {
        // Log final failure
        await pool.query(
            'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, instanceId, number, 'failed', lastError?.message || 'Unknown error', message]
        );
        throw lastError;
    }

    return { status: 'sent' };
  }, { 
    connection, 
    // CRITICAL: Concurrency is limited to ensure messages are drip-fed
    concurrency: 5, 
    // CRITICAL: BullMQ Rate Limiter (Safety Valve)
    // Limits the queue to 1 message per instance roughly every 4 seconds globally
    limiter: {
      max: 1,
      duration: 4000
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  });

  worker.on('error', err => {
    if (err.code !== 'ECONNREFUSED') {
      console.error('[Worker] Error:', err.message);
    }
  });

  return worker;
};

module.exports = { setupWorker };