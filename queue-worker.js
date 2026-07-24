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
                
                // If a template is provided in the job data, use it!
                if (options?.templateName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: options.templateName,
                        language: { code: options.templateLanguage || 'en' }
                    };
                    if (mediaUrl) {
                        let pType = 'image';
                        if (mediaUrl.endsWith('.pdf')) pType = 'document';
                        else if (mediaUrl.endsWith('.mp4')) pType = 'video';
                        else if (mediaType) pType = mediaType;
                        
                        msgData.template.components = [
                            {
                                type: "header",
                                parameters: [
                                    {
                                        type: pType,
                                        [pType]: { link: mediaUrl }
                                    }
                                ]
                            }
                        ];
                    }
                    delete msgData.text;
                } else if (mediaUrl) {
                    msgData.type = mediaType || "image";
                    msgData[msgData.type] = { link: mediaUrl };
                    if (finalMessage) msgData[msgData.type].caption = finalMessage;
                    delete msgData.text;
                }
                
                if (!options?.templateName && waButtons && waButtons.length > 0) {
                    const replyButtons = waButtons.filter(b => b.type === 'reply').slice(0, 3);
                    const urlButton = waButtons.find(b => b.type === 'url' || b.type === 'link');
                    const callButton = waButtons.find(b => b.type === 'call');
                    
                    if (replyButtons.length > 0) {
                        msgData.type = 'interactive';
                        msgData.interactive = {
                            type: 'button',
                            body: { text: finalMessage || ' ' },
                            action: {
                                buttons: replyButtons.map((btn, i) => ({
                                    type: 'reply',
                                    reply: { id: btn.id || ('btn_' + i), title: btn.displayText.substring(0, 20) }
                                }))
                            }
                        };
                        if (mediaUrl) {
                            msgData.interactive.header = {
                                type: mediaType || "image",
                                [mediaType || "image"]: { link: mediaUrl }
                            };
                        }
                        delete msgData.text;
                        delete msgData[mediaType || "image"];
                    } else if (urlButton || callButton) {
                        msgData.type = 'interactive';
                        const actionParameters = urlButton ? {
                            display_text: urlButton.displayText,
                            url: urlButton.url || urlButton.phoneNumber
                        } : {
                            display_text: callButton.displayText,
                            phone_number: callButton.phoneNumber || callButton.url
                        };
                        const actionName = urlButton ? 'cta_url' : 'cta_call';
                        
                        msgData.interactive = {
                            type: actionName,
                            body: { text: finalMessage || ' ' },
                            action: {
                                name: actionName,
                                parameters: actionParameters
                            }
                        };
                        if (mediaUrl) {
                            msgData.interactive.header = {
                                type: mediaType || "image",
                                [mediaType || "image"]: { link: mediaUrl }
                            };
                        }
                        delete msgData.text;
                        delete msgData[mediaType || "image"];
                    }
                    
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
                    
                    const msgId = metaJson.messages?.[0]?.id || `meta_${Date.now()}`;
                    await pool.query(
                        'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                        [userId, instanceId, number, 'delivered', msgId, finalMessage]
                    );
                    
                    // Also save to chat_messages so it appears in Chat Interface
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, jid, true, finalMessage, mediaUrl, mediaType, new Date(), 'sent']
                    );

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
                        id: btn.phoneNumber || btn.url || "1234567890",
                        phone_number: btn.phoneNumber || btn.url || "1234567890"
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