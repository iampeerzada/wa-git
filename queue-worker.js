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
const getMetaMediaObject = async (linkUrl, instance, mType = 'image') => {
    const DEFAULT_IMAGE = 'https://dummyimage.com/600x400/25d366/ffffff.png';
    const DEFAULT_DOC = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const DEFAULT_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

    const getFallback = (t) => {
        const clean = (t || 'image').toLowerCase();
        if (clean === 'document' || clean === 'pdf') return DEFAULT_DOC;
        if (clean === 'video') return DEFAULT_VIDEO;
        return DEFAULT_IMAGE;
    };

    if (!linkUrl || linkUrl.includes('ifastx.in/sample.jpg')) {
        linkUrl = getFallback(mType);
    }

    if (typeof linkUrl === 'object' && linkUrl !== null) {
        if (linkUrl.id) return { id: linkUrl.id };
        if (linkUrl.link) linkUrl = linkUrl.link;
    }

    if (typeof linkUrl !== 'string') {
        linkUrl = getFallback(mType);
    }

    try {
        let buffer = null;
        let mimeType = 'image/jpeg';

        if (linkUrl.startsWith('data:')) {
            const mimeMatch = linkUrl.match(/^data:(.*?);base64,/);
            if (mimeMatch) mimeType = mimeMatch[1];
            const base64Data = linkUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else if (linkUrl.startsWith('http')) {
            const headers = {};
            const token = instance.metaAccessToken || instance.meta_access_token || instance.metaToken;
            if (linkUrl.includes('fbsbx.com') || linkUrl.includes('fbcdn.net') || linkUrl.includes('facebook.com') || linkUrl.includes('graph.facebook.com')) {
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            console.log(`[Meta Media] Fetching source media: ${linkUrl.substring(0, 90)}...`);
            const fetchRes = await fetch(linkUrl, { headers });
            if (!fetchRes.ok) {
                console.error(`[Meta Media] Fetch failed with HTTP status ${fetchRes.status}`);
                throw new Error(`Media download status ${fetchRes.status}`);
            }
            mimeType = fetchRes.headers.get('content-type') || mimeType;

            // If source link returned HTML (e.g. 404/redirect page), fallback to safe media URL
            if (mimeType.includes('html')) {
                console.warn(`[Meta Media] URL returned HTML instead of media file. Using fallback.`);
                linkUrl = getFallback(mType);
                return { link: linkUrl };
            }

            const arrayBuf = await fetchRes.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
        }

        const phoneId = instance.metaPhoneNumberId || instance.meta_phone_number_id || instance.phone;
        const token = instance.metaAccessToken || instance.meta_access_token || instance.metaToken;

        if (buffer && phoneId && token) {
            const cleanType = (mType || 'image').toLowerCase();
            if (cleanType === 'image' && !mimeType.startsWith('image/')) mimeType = 'image/jpeg';
            if (cleanType === 'video' && !mimeType.startsWith('video/')) mimeType = 'video/mp4';
            if (cleanType === 'document' && !mimeType.includes('pdf')) mimeType = 'application/pdf';

            let ext = mimeType.split('/')[1] || 'jpg';
            if (ext.includes(';')) ext = ext.split(';')[0];

            const form = new FormData();
            form.append('messaging_product', 'whatsapp');
            form.append('type', mimeType);
            const blob = new Blob([buffer], { type: mimeType });
            form.append('file', blob, `upload_${Date.now()}.${ext}`);

            console.log(`[Meta Media] Pre-uploading media (${buffer.length} bytes) to WhatsApp API for phoneId ${phoneId}...`);
            const uploadRes = await fetch(`https://graph.facebook.com/v26.0/${phoneId}/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: form
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok && uploadData.id) {
                console.log(`[Meta Media] Upload success! Generated Meta Media ID: ${uploadData.id}`);
                return { id: uploadData.id };
            } else {
                console.error(`[Meta Media] WhatsApp Media API upload error:`, uploadData);
            }
        }
    } catch (err) {
        console.error(`[Meta Media] Error during media pre-upload:`, err.message);
    }

    return { link: linkUrl };
};

const sanitizeMetaComponents = async (rawComponents, instance) => {
    if (!Array.isArray(rawComponents)) return [];
    const clean = [];

    for (let comp of rawComponents) {
        if (!comp || !comp.type) continue;
        const rawType = String(comp.type).toLowerCase();

        // 1. FOOTER MUST BE REMOVED! Footers in Meta templates are static and cause #131009
        if (rawType === 'footer') continue;

        if (rawType === 'header') {
            const headerParams = [];
            if (Array.isArray(comp.parameters)) {
                for (let param of comp.parameters) {
                    if (!param || !param.type) continue;
                    const pType = String(param.type).toLowerCase();
                    if (['image', 'video', 'document'].includes(pType)) {
                        let mediaObj = param[pType];
                        let urlOrId = mediaObj?.link || mediaObj?.id || mediaObj;
                        if (typeof urlOrId === 'string' || typeof urlOrId === 'object') {
                            mediaObj = await getMetaMediaObject(urlOrId, instance, pType);
                        }
                        headerParams.push({ type: pType, [pType]: mediaObj });
                    } else if (pType === 'text') {
                        headerParams.push({ type: 'text', text: String(param.text || '') });
                    }
                }
            }
            if (headerParams.length > 0) {
                clean.push({ type: 'header', parameters: headerParams });
            }
        } else if (rawType === 'body') {
            const bodyParams = [];
            if (Array.isArray(comp.parameters)) {
                for (let param of comp.parameters) {
                    let textVal = param?.text !== undefined ? param.text : (typeof param === 'string' ? param : '');
                    bodyParams.push({ type: 'text', text: String(textVal) });
                }
            }
            if (bodyParams.length > 0) {
                clean.push({ type: 'body', parameters: bodyParams });
            }
        } else if (rawType === 'button') {
            const subType = String(comp.sub_type || comp.subType || 'quick_reply').toLowerCase();
            const index = String(comp.index !== undefined ? comp.index : '0');
            const btnParams = [];
            if (Array.isArray(comp.parameters)) {
                for (let param of comp.parameters) {
                    if (subType === 'url') {
                        btnParams.push({ type: 'text', text: String(param.text || param || '') });
                    } else if (subType === 'quick_reply') {
                        btnParams.push({ type: 'payload', payload: String(param.payload || param || 'CLICKED') });
                    } else if (subType === 'copy_code') {
                        btnParams.push({ type: 'coupon_code', coupon_code: String(param.coupon_code || param || '') });
                    }
                }
            }
            if (btnParams.length > 0) {
                clean.push({
                    type: 'button',
                    sub_type: subType,
                    index: index,
                    parameters: btnParams
                });
            }
        }
    }
    return clean;
};

const solveSpintax = (text) => {
  if (!text) return '';
  return text.replace(/{([^{}]+)}/g, (match, options) => {
    const parts = options.split('|');
    return parts[Math.floor(Math.random() * parts.length)];
  });
};

const toJid = (number) => {
  if (!number) return '';
  let str = String(number).trim();
  if (str.includes('@s.whatsapp.net') || str.includes('@g.us')) {
    return str;
  }
  let cleaned = str.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }
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

const setupWorker = (instancesMap, saveMessage, io) => {
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

    let requiresWallet = false;
    let limitData = null;

    // Check Daily Limit Before Sending
    try {
        const limitRes = await pool.query(`
            SELECT 
                CASE 
                    WHEN s.last_reset_date < CURRENT_DATE THEN 0 
                    ELSE s.messages_sent_today 
                END as messages_sent_today,
                s.custom_daily_limit, p.daily_limit 
            FROM subscriptions s 
            LEFT JOIN plans p ON s.plan_id = p.id 
            WHERE s.user_id = $1
        `, [userId]);
        
        if (limitRes.rows.length > 0) {
            limitData = limitRes.rows[0];
            const maxDaily = limitData.custom_daily_limit !== null ? limitData.custom_daily_limit : (limitData.daily_limit || 0);
            
            if (maxDaily !== 0 && limitData.messages_sent_today >= maxDaily) {
                requiresWallet = true;
            }
        }
    } catch (err) {
        console.error('[Worker] Limit Check Error:', err.message);
    }

    let cost = 1;
    let costType = 'baileys_credit_cost';
    let balance = 0;
    
    // We need the instance to know if it's meta
    let checkInst = instancesMap.get(instanceId);
    if (!checkInst) {
        try {
            const dbInst = await pool.query('SELECT * FROM instances WHERE id = $1 OR instance_key = $1', [instanceId]);
            if (dbInst.rows.length > 0) {
                const row = dbInst.rows[0];
                instanceId = row.id;
                if (row.provider === 'meta') {
                    checkInst = { status: 'open', phone: row.meta_phone_number_id, provider: 'meta', metaAccessToken: row.meta_access_token, metaPhoneNumberId: row.meta_phone_number_id };
                } else {
                    checkInst = { status: row.status, provider: 'baileys' };
                }
                instancesMap.set(row.id, checkInst);
            }
        } catch (e) {
            console.error('[Worker] DB Instance Lookup Error:', e.message);
        }
    }

    if (checkInst && checkInst.provider === 'meta') {
        requiresWallet = true; // Meta always deducts from wallet
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
            balance = parseFloat(walletRes.rows[0].wallet_balance) || 0;
        }

        if (requiresWallet && balance < cost) {
            await pool.query(
                'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, instanceId, number, 'failed', `Insufficient wallet balance (requires ₹${cost}, available balance: ₹${balance})`, message || options?.templateName]
            );
            return; // Stop processing this message
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
                
                // Check if message uses [META TEMPLATE] name | var1 | var2 syntax
                let activeTplName = options?.templateName;
                let activeTplLang = options?.templateLanguage || "en";
                let activeTplVars = Array.isArray(options?.templateVariables) ? [...options.templateVariables] : (options?.templateVariables ? [options.templateVariables] : []);

                if (finalMessage && finalMessage.trim().startsWith('[META TEMPLATE]')) {
                    const rawTplStr = finalMessage.trim().replace('[META TEMPLATE]', '').trim();
                    const parts = rawTplStr.split('|').map(s => s.trim());
                    if (parts.length > 0 && parts[0]) {
                        activeTplName = parts[0];
                        if (parts.length > 1) {
                            activeTplVars = parts.slice(1);
                        }
                    }
                }

                if (activeTplName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: activeTplName,
                        language: { code: activeTplLang }
                    };

                    if (options.components && Array.isArray(options.components) && options.components.length > 0) {
                        msgData.template.components = await sanitizeMetaComponents(options.components, instance);
                    } else {
                        // Look up stored template structure to build exact matching parameters
                        let dbTplComps = [];
                        try {
                            const dbTplRes = await pool.query('SELECT components FROM meta_templates WHERE name = $1 AND (instance_id = $2 OR instance_id IS NOT NULL) ORDER BY (instance_id = $2) DESC LIMIT 1', [activeTplName, instance.id]);
                            if (dbTplRes.rows.length > 0 && dbTplRes.rows[0].components) {
                                dbTplComps = typeof dbTplRes.rows[0].components === 'string' 
                                    ? JSON.parse(dbTplRes.rows[0].components) 
                                    : dbTplRes.rows[0].components;
                            }
                        } catch (err) {
                            console.error('[Worker] Error looking up template components:', err.message);
                        }

                        const comps = [];

                        // 1. Header Component
                        const dbHeader = Array.isArray(dbTplComps) ? dbTplComps.find(c => String(c.type).toUpperCase() === 'HEADER') : null;
                        if (dbHeader) {
                            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(dbHeader.format).toUpperCase())) {
                                const mType = String(dbHeader.format).toLowerCase();
                                const linkUrl = mediaUrl || options.mediaUrl || dbHeader.example?.header_url?.[0] || dbHeader.example?.header_handle?.[0] || 'https://dummyimage.com/600x400/25d366/ffffff.png';
                                const mediaObj = await getMetaMediaObject(linkUrl, instance, mType);
                                comps.push({
                                    type: "header",
                                    parameters: [{ type: mType, [mType]: mediaObj }]
                                });
                            } else if (String(dbHeader.format).toUpperCase() === 'TEXT' && dbHeader.text && /\{\{\d+\}\}/.test(dbHeader.text)) {
                                const headerVars = options.headerVariables || activeTplVars || dbHeader.example?.header_text?.[0] || ['Header'];
                                const hVarsArr = Array.isArray(headerVars) ? headerVars : [headerVars];
                                comps.push({
                                    type: "header",
                                    parameters: hVarsArr.map(v => ({ type: "text", text: String(v) }))
                                });
                            }
                        } else if (mediaUrl) {
                            const mType = (mediaType || 'image').toLowerCase();
                            const mediaObj = await getMetaMediaObject(mediaUrl, instance, mType);
                            comps.push({
                                type: "header",
                                parameters: [{ type: mType, [mType]: mediaObj }]
                            });
                        }

                        // 2. Body Component
                        const dbBody = Array.isArray(dbTplComps) ? dbTplComps.find(c => String(c.type).toUpperCase() === 'BODY') : null;
                        const bodyMatches = dbBody && dbBody.text ? (dbBody.text.match(/\{\{\d+\}\}/g) || []) : [];
                        const expectedBodyVarsCount = bodyMatches.length;

                        let givenBodyVars = Array.isArray(activeTplVars) ? [...activeTplVars] : [];
                        if (expectedBodyVarsCount > 0) {
                            const exampleVars = dbBody?.example?.body_text?.[0] || [];
                            for (let i = givenBodyVars.length; i < expectedBodyVarsCount; i++) {
                                givenBodyVars.push(exampleVars[i] || `Value ${i + 1}`);
                            }
                            comps.push({
                                type: "body",
                                parameters: givenBodyVars.slice(0, expectedBodyVarsCount).map(v => {
                                    if (typeof v === 'object' && v !== null && v.type) return v;
                                    return { type: "text", text: String(v) };
                                })
                            });
                        }

                        // 3. Footer Component: NEVER ADD FOOTER! Footers in Meta templates are static and cause #131009

                        // 4. Buttons Component
                        const dbButtons = Array.isArray(dbTplComps) ? dbTplComps.find(c => String(c.type).toUpperCase() === 'BUTTONS') : null;
                        if (dbButtons && Array.isArray(dbButtons.buttons)) {
                            dbButtons.buttons.forEach((btn, btnIdx) => {
                                const btnType = String(btn.type).toUpperCase();
                                if (btnType === 'URL' && btn.url && /\{\{\d+\}\}/.test(btn.url)) {
                                    const btnVar = options.buttonVariables?.[btnIdx] || options.buttonUrlVariable || activeTplVars[expectedBodyVarsCount + btnIdx] || btn.example?.[0] || '12345';
                                    comps.push({
                                        type: "button",
                                        sub_type: "url",
                                        index: String(btnIdx),
                                        parameters: [{ type: "text", text: String(btnVar) }]
                                    });
                                } else if (btnType === 'QUICK_REPLY' && (options.buttonPayloads?.[btnIdx] || options.quickReplyPayloads?.[btnIdx])) {
                                    const payloadVal = options.buttonPayloads?.[btnIdx] || options.quickReplyPayloads?.[btnIdx];
                                    comps.push({
                                        type: "button",
                                        sub_type: "quick_reply",
                                        index: String(btnIdx),
                                        parameters: [{ type: "payload", payload: String(payloadVal) }]
                                    });
                                } else if (btnType === 'COPY_CODE') {
                                    const codeVal = options.couponCode || btn.example?.[0] || 'CODE123';
                                    comps.push({
                                        type: "button",
                                        sub_type: "copy_code",
                                        index: String(btnIdx),
                                        parameters: [{ type: "coupon_code", coupon_code: String(codeVal) }]
                                    });
                                }
                            });
                        }

                        if (comps.length > 0) {
                            msgData.template.components = comps;
                        }
                    }

                    // Process any template components that contain a raw media link
                    if (msgData.template?.components && Array.isArray(msgData.template.components)) {
                        for (let comp of msgData.template.components) {
                            if (comp && comp.type === 'header' && Array.isArray(comp.parameters)) {
                                for (let param of comp.parameters) {
                                    const pType = param.type;
                                    if (['image', 'video', 'document'].includes(pType) && param[pType] && param[pType].link) {
                                        param[pType] = await getMetaMediaObject(param[pType].link, instance, pType);
                                    }
                                }
                            }
                        }
                    }

                    delete msgData.text;
                } else if (mediaUrl) {
                    const mType = (mediaType || 'image').toLowerCase();
                    msgData.type = mType;
                    const mediaObj = await getMetaMediaObject(mediaUrl, instance, mType);
                    msgData[mType] = mediaObj;
                    if (finalMessage) msgData[mType].caption = finalMessage;
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
                        const mType = (mediaType || 'image').toLowerCase();
                        const mediaObj = await getMetaMediaObject(mediaUrl, instance, mType);
                        msgData.interactive.header = {
                            type: mType,
                            [mType]: mediaObj
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
                if (!sock || !sock.user) {
                    throw new Error('WhatsApp instance is offline or disconnected');
                }

                let targetJid = toJid(number);

                // Smart onWhatsApp validation with country code candidates
                let rawCleaned = String(number || '').replace(/\D/g, '');
                if (rawCleaned.startsWith('00')) rawCleaned = rawCleaned.substring(2);
                else if (rawCleaned.startsWith('0') && rawCleaned.length > 10) rawCleaned = rawCleaned.substring(1);

                if (rawCleaned) {
                    let candidates = [];
                    if (rawCleaned.length === 10 && /^[6-9]/.test(rawCleaned)) {
                        candidates.push(`91${rawCleaned}`);
                        candidates.push(rawCleaned);
                    } else {
                        candidates.push(rawCleaned);
                        if (!rawCleaned.startsWith('91') && rawCleaned.length === 10) {
                            candidates.push(`91${rawCleaned}`);
                        }
                    }

                    try {
                        let waCheck = null;
                        for (const cand of candidates) {
                            const res = await sock.onWhatsApp(cand).catch(() => null);
                            if (res && Array.isArray(res) && res.length > 0 && res[0].exists && res[0].jid) {
                                waCheck = res[0];
                                break;
                            }
                        }
                        if (waCheck && waCheck.exists && waCheck.jid) {
                            targetJid = waCheck.jid;
                        } else if (rawCleaned.length === 10 && /^[6-9]/.test(rawCleaned)) {
                            targetJid = `91${rawCleaned}@s.whatsapp.net`;
                        }
                    } catch (waErr) {
                        console.error('[Worker onWhatsApp] Validation notice:', waErr.message);
                    }
                }

                // Presence typing simulation to initialize connection
                try {
                    await sock.sendPresenceUpdate('composing', targetJid).catch(() => {});
                    await new Promise(r => setTimeout(r, 300));
                    await sock.sendPresenceUpdate('paused', targetJid).catch(() => {});
                } catch (pErr) {}

                if (options?.complianceMode) {
                    await humanJitter(3000, 7000);
                } else {
                    await humanJitter(600, 1500);
                }

                let bodyText = finalMessage || '';
                if (waButtons && waButtons.length > 0) {
                    const buttonTextLines = waButtons.map((btn) => {
                        const type = String(btn.type || '').toLowerCase();
                        if (type === 'url' || type === 'link') return `🔗 ${btn.displayText}: ${btn.url || ''}`;
                        if (type === 'call') return `📞 ${btn.displayText}: ${btn.phoneNumber || ''}`;
                        return `▫️ ${btn.displayText}`;
                    }).join('\n');
                    bodyText = bodyText ? `${bodyText}\n\n${buttonTextLines}` : buttonTextLines;
                }
                
                if (mediaUrl) {
                    const sendPayload = {};
                    const type = (mediaType === 'video' || mediaType === 'document' || mediaType === 'audio') ? mediaType : 'image';
                    sendPayload[type] = { url: mediaUrl };
                    if (bodyText && type !== 'audio') sendPayload.caption = bodyText;
                    
                    const res = await sock.sendMessage(targetJid, sendPayload);
                    if (res && res.key && res.message && typeof saveMessage === 'function') {
                        saveMessage(res.key, res.message);
                    }
                    msgId = res ? res.key.id : `msg_${Date.now()}`;
                } else {
                    const res = await sock.sendMessage(targetJid, { text: bodyText || ' ' });
                    if (res && res.key && res.message && typeof saveMessage === 'function') {
                        saveMessage(res.key, res.message);
                    }
                    msgId = res ? res.key.id : `msg_${Date.now()}`;
                }
            }

            // Log Success
            await pool.query(
                'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, instanceId, number, 'sent', msgId, finalMessage || options?.templateName]
            );

            // Also save into chat_messages for Direct Chat
            try {
                const cleanRemoteJid = (instance.provider === 'meta')
                    ? number.replace(/\D/g, '')
                    : (number.includes('@') ? number : `${number.replace(/\D/g, '')}@s.whatsapp.net`);

                const tName = options?.templateName || (finalMessage && finalMessage.startsWith('[Template:') ? finalMessage.replace(/^\[Template:\s*|\].*$/gi, '').trim() : null);
                let templateDetails = null;

                if (tName) {
                    try {
                        const tplRes = await pool.query('SELECT components FROM meta_templates WHERE name = $1 AND instance_id = $2', [tName, instanceId]);
                        if (tplRes.rows.length > 0) {
                            const comps = typeof tplRes.rows[0].components === 'string' ? JSON.parse(tplRes.rows[0].components) : tplRes.rows[0].components;
                            const bodyComp = comps?.find(c => c.type === 'BODY');
                            const headerComp = comps?.find(c => c.type === 'HEADER');
                            const footerComp = comps?.find(c => c.type === 'FOOTER');
                            const btnComp = comps?.find(c => c.type === 'BUTTONS');
                            templateDetails = {
                                name: tName,
                                header: headerComp ? (headerComp.text || headerComp.format) : null,
                                body: bodyComp?.text || null,
                                footer: footerComp?.text || null,
                                buttons: btnComp?.buttons || []
                            };
                        }
                    } catch (e) {}
                }

                const displayContent = finalMessage || (options?.templateName ? `[Template: ${options.templateName}]` : (mediaUrl ? '[Media]' : 'Sent message'));

                await pool.query(
                    `INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) 
                     VALUES ($1, $2, $3, true, $4, $5, $6, NOW(), 'sent') 
                     ON CONFLICT (id) DO UPDATE SET status = 'sent', text = EXCLUDED.text`,
                    [msgId, instanceId, cleanRemoteJid, displayContent, mediaUrl || null, mediaType || null]
                );

                if (io) {
                    io.emit('new_message', {
                        id: msgId,
                        instanceId,
                        remoteJid: cleanRemoteJid,
                        fromMe: true,
                        text: displayContent,
                        templateDetails,
                        mediaUrl: mediaUrl || null,
                        mediaType: mediaType || null,
                        timestamp: new Date().toISOString(),
                        status: 'sent'
                    });
                }
            } catch (chatLogErr) {
                console.error('[Worker Chat Log Notice]', chatLogErr.message);
            }

            
            // Update Quota and Wallet
            await pool.query(
                'UPDATE subscriptions SET messages_sent_today = CASE WHEN last_reset_date < CURRENT_DATE THEN 1 ELSE messages_sent_today + 1 END, messages_sent_this_month = COALESCE(messages_sent_this_month, 0) + 1, messages_sent_this_year = COALESCE(messages_sent_this_year, 0) + 1, last_reset_date = CURRENT_DATE WHERE user_id = $1',
                [userId]
            );
            
            if (requiresWallet) {
                await pool.query(
                    'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE id = $2',
                    [cost, userId]
                );
                
                await pool.query(
                    'INSERT INTO wallet_transactions (user_id, amount, type, description, message_number, message_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, cost, 'debit', `Overage Message to ${number} (${costType})`, number, msgId, 'sent']
                );
            }
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
