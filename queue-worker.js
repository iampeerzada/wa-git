const { Worker } = require('bullmq');
const { Pool } = require('pg');
const Redis = require('ioredis');
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
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  }
});
connection.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.error('[Worker Redis] Error:', err.message);
});

const setupWorker = (instancesMap) => {
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
      instanceIds,
      templates
    } = job.data;

    // --- MULTI-INSTANCE & MULTI-TEMPLATE ROTATION ---
    if (instanceIds && Array.isArray(instanceIds) && instanceIds.length > 0) {
        const rotationKey = `rotation_cursor:${userId}`;
        const rotationCount = await connection.incr(rotationKey);
        const instIdx = Math.floor((rotationCount - 1) / 5) % instanceIds.length;
        instanceId = instanceIds[instIdx];
    }

    if (templates && Array.isArray(templates) && templates.length > 0) {
        const rotationKey = `rotation_cursor:${userId}`;
        const rotationCount = await connection.get(rotationKey) || 1;
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

    // Check Wallet Balance Before Sending
    let cost = 1;
    let costType = 'baileys_credit_cost';
    
    // We need the instance to know if it's meta
    const checkInst = instancesMap.get(instanceId);
    if (checkInst && checkInst.provider === 'meta') {
        if (options?.templateName) {
            costType = 'meta_utility_credit_cost'; // Default
            try {
                const tplRes = await pool.query('SELECT category FROM meta_templates WHERE name = $1 AND instance_id = $2', [options.templateName, instanceId]);
                if (tplRes.rows.length > 0) {
                    const cat = (tplRes.rows[0].category || '').toUpperCase();
                    if (cat === 'MARKETING') costType = 'meta_marketing_credit_cost';
                    else if (cat === 'AUTHENTICATION') costType = 'meta_authentication_credit_cost';
                    else if (cat === 'UTILITY') costType = 'meta_utility_credit_cost';
                }
            } catch(e) {
                console.error('[Worker] Template Category Lookup Error:', e.message);
            }
        } else {
            costType = 'meta_regular_credit_cost';
        }
    }

    try {
        const settingsRes = await pool.query('SELECT key, value FROM system_settings WHERE key = $1', [costType]);
        if (settingsRes.rows.length > 0 && settingsRes.rows[0].value) {
            cost = parseFloat(settingsRes.rows[0].value) || 1;
        }

        const walletRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        if (walletRes.rows.length > 0) {
            const balance = parseFloat(walletRes.rows[0].wallet_balance) || 0;
            if (balance < cost) {
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'failed', `Insufficient wallet balance (needs ${cost}, has ${balance})`, message || options?.templateName]
                );
                return; // Stop processing this message
            }
        }
    } catch (err) {
        console.error('[Worker] Wallet Check Error:', err.message);
    }

    // Retry Logic: 1. Try -> 2. Retry Same -> 3. Retry Different Instance
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
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

            const finalMessage = solveSpintax(message);

            let msgId = `msg_${Date.now()}`;

            if (instance.provider === 'meta') {
                const jid = number.replace(/[^0-9]/g, '');
                
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
                
                if (options?.templateName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: options.templateName,
                        language: { code: options.templateLanguage || "en" }
                    };
                    if (options.templateVariables && options.templateVariables.length > 0) {
                        msgData.template.components = [
                            {
                                type: "body",
                                parameters: options.templateVariables.map(v => ({ type: "text", text: String(v) }))
                            }
                        ];
                        if (mediaUrl) {
                            msgData.template.components.push({
                                type: "header",
                                parameters: [{ type: mediaType || "image", [mediaType || "image"]: { link: mediaUrl } }]
                            });
                        }
                    } else if (mediaUrl) {
                        msgData.template.components = [{
                            type: "header",
                            parameters: [{ type: mediaType || "image", [mediaType || "image"]: { link: mediaUrl } }]
                        }];
                    }
                    delete msgData.text;
                } else if (mediaUrl) {
                    msgData.type = mediaType || "image";
                    msgData[mediaType || "image"] = { link: mediaUrl };
                    if (finalMessage) msgData[mediaType || "image"].caption = finalMessage;
                    delete msgData.text;
                } else if (waButtons && waButtons.length > 0) {
                    msgData.type = "interactive";
                    msgData.interactive = {
                        type: "button",
                        body: { text: finalMessage || ' ' },
                        action: {
                            buttons: waButtons.map((btn, idx) => ({
                                type: "reply",
                                reply: { id: btn.id || `btn_${idx}`, title: btn.displayText.substring(0, 20) }
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
                }

                console.log(`[Meta API] Sending message to ${number} via ${instance.metaPhoneNumberId}`);
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
                    throw new Error(metaJson.error?.message || 'Meta API Error');
                }
                
                msgId = metaJson.messages?.[0]?.id || `meta_${Date.now()}`;
                
            } else {
                // Baileys
                const sock = instance.sock;
                const jid = toJid(number);
                
                const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
                
                if (waButtons && waButtons.length > 0) {
                    const buttons = waButtons.map((btn, idx) => {
                      const type = String(btn.type).toLowerCase();
                      if (type === 'url' || type === 'link') {
                        return {
                          name: 'cta_url',
                          buttonParamsJson: JSON.stringify({ display_text: btn.displayText, url: btn.url, merchant_url: btn.url })
                        };
                      } else if (type === 'call') {
                        return {
                          name: 'cta_call',
                          buttonParamsJson: JSON.stringify({ display_text: btn.displayText, id: btn.phoneNumber || "123", phone_number: btn.phoneNumber || "123" })
                        };
                      } else {
                        return {
                          name: 'quick_reply',
                          buttonParamsJson: JSON.stringify({ display_text: btn.displayText, id: String(btn.id || `btn_${idx}`) })
                        };
                      }
                    });

                    let headerOptions = { hasMediaAttachment: false };
                    
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
                    
                    if (mediaUrl) {
                      interactiveMessage.header = proto.Message.InteractiveMessage.Header.create(headerOptions);
                    }

                    const content = {
                      viewOnceMessage: {
                        message: {
                          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                          interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
                        }
                      }
                    };

                    const msg = generateWAMessageFromContent(jid, content, { userJid: sock.user.id, upload: sock.waUploadToServer });
                    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
                    msgId = msg.key.id;
                } else if (mediaUrl) {
                    const sendPayload = {};
                    const type = (mediaType === 'video' || mediaType === 'document' || mediaType === 'audio') ? mediaType : 'image';
                    sendPayload[type] = { url: mediaUrl };
                    if (finalMessage && type !== 'audio') sendPayload.caption = finalMessage;
                    
                    const res = await sock.sendMessage(jid, sendPayload);
                    msgId = res.key.id;
                } else {
                    const res = await sock.sendMessage(jid, { text: finalMessage });
                    msgId = res.key.id;
                }
            }

            // Log Success
            await pool.query(
                'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, instanceId, number, 'sent', msgId, finalMessage || options?.templateName]
            );

            // Update Quota and Wallet
            await pool.query(
                'UPDATE subscriptions SET messages_sent_today = messages_sent_today + 1 WHERE user_id = $1',
                [userId]
            );
            
            await pool.query(
                'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
                [cost, userId]
            );
            
            await pool.query(
                'INSERT INTO wallet_transactions (user_id, amount, type, description, message_number, message_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, cost, 'debit', `Message to ${number} (${costType})`, number, msgId, 'sent']
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
            
            if (attempt < maxAttempts) {
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
    concurrency: 5,
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
