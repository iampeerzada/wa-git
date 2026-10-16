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

const metaMediaCache = new Map();

function normalizePhoneNumber(input) {
  if (!input) return '';
  let digits = String(input).trim().replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // 1. Bangladesh numbers (CC: 880)
  if (digits.startsWith('880') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 11 && /^01[3-9]/.test(digits)) {
    return '880' + digits.substring(1);
  }
  if (digits.length === 10 && /^1[3-9]/.test(digits)) {
    return '880' + digits;
  }

  // 2. India numbers (CC: 91)
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return '91' + digits;
  }
  if (digits.length === 11 && /^0[6-9]/.test(digits)) {
    return '91' + digits.substring(1);
  }

  // 3. UAE numbers (CC: 971)
  if (digits.startsWith('971') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 10 && /^05/.test(digits)) {
    return '971' + digits.substring(1);
  }

  // 4. Saudi Arabia numbers (CC: 966)
  if (digits.startsWith('966') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 10 && /^05/.test(digits)) {
    return '966' + digits.substring(1);
  }

  // 5. Pakistan numbers (CC: 92)
  if (digits.startsWith('92') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 11 && /^03/.test(digits)) {
    return '92' + digits.substring(1);
  }

  // 6. US / Canada (CC: 1)
  if (digits.startsWith('1') && digits.length === 11) {
    return digits;
  }

  // 7. UK (CC: 44)
  if (digits.startsWith('44') && digits.length >= 11) {
    return digits;
  }

  // 8. Other international numbers (length >= 11)
  if (digits.length >= 11) {
    if (digits.startsWith('0')) {
      return digits.substring(1);
    }
    return digits;
  }

  return digits;
}

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

    const phoneId = instance?.metaPhoneNumberId || instance?.meta_phone_number_id || instance?.phone || 'default';
    const cacheKey = `${phoneId}_${linkUrl}`;
    if (metaMediaCache.has(cacheKey)) {
        return { id: metaMediaCache.get(cacheKey) };
    }

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
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            };
            const token = instance.metaAccessToken || instance.meta_access_token || instance.metaToken;
            if (linkUrl.includes('fbsbx.com') || linkUrl.includes('fbcdn.net') || linkUrl.includes('facebook.com') || linkUrl.includes('graph.facebook.com')) {
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            console.log(`[Meta Media] Fetching source media: ${linkUrl.substring(0, 90)}...`);
            const fetchRes = await fetch(linkUrl, { headers });
            if (fetchRes.ok) {
                mimeType = fetchRes.headers.get('content-type') || mimeType;
                if (!mimeType.includes('html')) {
                    const arrayBuf = await fetchRes.arrayBuffer();
                    buffer = Buffer.from(arrayBuf);
                }
            }
        }

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
                console.log(`[Meta Media] Pre-upload success! Generated Meta Media ID: ${uploadData.id}`);
                metaMediaCache.set(cacheKey, uploadData.id);
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

const sanitizeMetaComponents = async (rawComponents, instance, options = {}) => {
    if (!Array.isArray(rawComponents)) return [];
    const clean = [];

    for (let comp of rawComponents) {
        if (!comp || !comp.type) continue;
        const rawType = String(comp.type).toLowerCase();

        // 1. FOOTER MUST BE REMOVED! Footers in Meta templates are static and cause #131009
        if (rawType === 'footer') continue;

        if (rawType === 'header') {
            const headerParams = [];
            if (Array.isArray(comp.parameters) && comp.parameters.length > 0) {
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
            } else {
                // If comp is raw template structure (e.g. { type: "HEADER", format: "IMAGE" })
                const fmt = String(comp.format || '').toLowerCase();
                if (['image', 'video', 'document'].includes(fmt)) {
                    const linkUrl = options.mediaUrl || options.media_url || comp.example?.header_url?.[0] || comp.example?.header_handle?.[0] || 'https://dummyimage.com/600x400/25d366/ffffff.png';
                    const mediaObj = await getMetaMediaObject(linkUrl, instance, fmt);
                    headerParams.push({ type: fmt, [fmt]: mediaObj });
                } else if (fmt === 'text' && comp.text && /\{\{\d+\}\}/.test(comp.text)) {
                    const headerVars = options.headerVariables || options.templateVariables || comp.example?.header_text?.[0] || ['Header'];
                    const hVarsArr = Array.isArray(headerVars) ? headerVars : [headerVars];
                    hVarsArr.forEach(v => headerParams.push({ type: 'text', text: String(v) }));
                }
            }
            if (headerParams.length > 0) {
                clean.push({ type: 'header', parameters: headerParams });
            }
        } else if (rawType === 'body') {
            const bodyParams = [];
            if (Array.isArray(comp.parameters) && comp.parameters.length > 0) {
                for (let param of comp.parameters) {
                    let textVal = param?.text !== undefined ? param.text : (typeof param === 'string' ? param : '');
                    if (textVal !== '') {
                        bodyParams.push({ type: 'text', text: String(textVal) });
                    }
                }
            } else if (comp.text) {
                // Raw template structure for body (e.g. { type: "BODY", text: "Hello {{1}}" })
                const bodyMatches = comp.text.match(/\{\{\d+\}\}/g) || [];
                if (bodyMatches.length > 0) {
                    const givenBodyVars = Array.isArray(options.templateVariables) ? options.templateVariables : (Array.isArray(options.variables) ? options.variables : []);
                    const exampleVars = comp.example?.body_text?.[0] || [];
                    for (let i = 0; i < bodyMatches.length; i++) {
                        const val = givenBodyVars[i] !== undefined ? givenBodyVars[i] : (exampleVars[i] || `Value ${i + 1}`);
                        bodyParams.push({ type: 'text', text: String(val) });
                    }
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
                        btnParams.push({ type: 'text', text: String(param?.text || param || '') });
                    } else if (subType === 'quick_reply') {
                        btnParams.push({ type: 'payload', payload: String(param?.payload || param || 'CLICKED') });
                    } else if (subType === 'copy_code') {
                        btnParams.push({ type: 'coupon_code', coupon_code: String(param?.coupon_code || param || '') });
                    } else if (subType === 'flow') {
                        const flowToken = param?.action?.flow_token || options.flowToken || options.flow_token || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                        const actionObj = { flow_token: String(flowToken) };
                        const actData = param?.action?.flow_action_data || options.flowActionData || options.flow_action_data;
                        if (actData && typeof actData === 'object' && Object.keys(actData).length > 0) {
                            actionObj.flow_action_data = actData;
                        }
                        btnParams.push({ type: 'action', action: actionObj });
                    }
                }
            }
            if (subType === 'flow' && btnParams.length === 0) {
                const flowToken = options.flowToken || options.flow_token || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const actionObj = { flow_token: String(flowToken) };
                const actData = options.flowActionData || options.flow_action_data;
                if (actData && typeof actData === 'object' && Object.keys(actData).length > 0) {
                    actionObj.flow_action_data = actData;
                }
                btnParams.push({ type: 'action', action: actionObj });
            }
            if (btnParams.length > 0) {
                clean.push({
                    type: 'button',
                    sub_type: subType,
                    index: index,
                    parameters: btnParams
                });
            }
        } else if (rawType === 'buttons' && Array.isArray(comp.buttons)) {
            comp.buttons.forEach((btn, btnIdx) => {
                const bType = String(btn.type || '').toUpperCase();
                if (bType === 'FLOW' || bType === 'COMPLETE_FLOW' || bType === 'NAVIGATE' || btn.flow_id) {
                    const flowToken = options.flowToken || options.flow_token || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    const actionObj = { flow_token: String(flowToken) };
                    const actData = options.flowActionData || options.flow_action_data;
                    if (actData && typeof actData === 'object' && Object.keys(actData).length > 0) {
                        actionObj.flow_action_data = actData;
                    }
                    clean.push({
                        type: 'button',
                        sub_type: 'flow',
                        index: String(btnIdx),
                        parameters: [{ type: 'action', action: actionObj }]
                    });
                } else if (bType === 'URL' && btn.url && /\{\{\d+\}\}/.test(btn.url)) {
                    const btnVal = options.buttonVariables?.[btnIdx] || options.buttonUrlVariable || '12345';
                    clean.push({
                        type: 'button',
                        sub_type: 'url',
                        index: String(btnIdx),
                        parameters: [{ type: 'text', text: String(btnVal) }]
                    });
                } else if (bType === 'COPY_CODE') {
                    const codeVal = options.couponCode || btn.example?.[0] || 'CODE123';
                    clean.push({
                        type: 'button',
                        sub_type: 'copy_code',
                        index: String(btnIdx),
                        parameters: [{ type: 'coupon_code', coupon_code: String(codeVal) }]
                    });
                }
            });
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
      templates,
      campaignId
    } = job.data;

    // --- CAMPAIGN CANCELLATION CHECK ---
    const activeCampaignId = campaignId || options?.campaignId;
    if (activeCampaignId) {
        const isCancelled = await connection.get(`campaign_cancelled:${activeCampaignId}`);
        if (isCancelled) {
            console.log(`[Worker] Job skipped because campaign ${activeCampaignId} was cancelled by user.`);
            return;
        }
    }
    const userStoppedTs = await connection.get(`user_queue_stopped:${userId}`);
    if (userStoppedTs && job.timestamp && job.timestamp <= parseInt(userStoppedTs, 10)) {
        console.log(`[Worker] Job skipped because user ${userId} stopped their active queue.`);
        return;
    }

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

    // =========================================================================
    // META OFFICIAL API WALLET DEDUCTION ARCHITECTURE & RULES:
    // -------------------------------------------------------------------------
    // 1. BAILEYS INSTANCES:
    //    - Uses subscription plan daily limits (free quota).
    //    - If messages_sent_today >= daily_limit, it enters 'overage' mode
    //      and charges wallet via 'baileys_credit_cost' (requiresWallet = true).
    //
    // 2. META CLOUD API INSTANCES:
    //    - CRITICAL: NEVER bypasses wallet billing! Meta Official Cloud API messages
    //      incur real wholesale API costs from Meta (WhatsApp Cloud API).
    //    - ALWAYS requiresWallet = true regardless of subscription daily_limit!
    //    - Rates are determined based on Meta conversation category:
    //        * MARKETING: 'meta_marketing_credit_cost' (default: 1.00 INR)
    //        * UTILITY: 'meta_utility_credit_cost' (default: 0.50 INR)
    //        * AUTHENTICATION: 'meta_authentication_credit_cost' (default: 0.40 INR)
    //        * REGULAR / SERVICE / DIRECT SEND: 'meta_regular_credit_cost' (default: 0.50 INR)
    //    - Wallet balance MUST be verified BEFORE calling Meta Graph API.
    //    - Wallet balance is ATOMICALLY DEBITED immediately after successful send,
    //      and logged in 'wallet_transactions' with status 'completed'.
    //    - Emits 'wallet_updated' event via socket to refresh UI balances in real-time.
    // =========================================================================

    // 1. Determine if this job targets a Meta Cloud API instance
    let isMeta = Boolean(options?.isMeta);
    let instObj = (typeof instancesMap !== 'undefined' && instancesMap) ? instancesMap.get(instanceId) : null;
    if (!instObj || !instObj.provider) {
        try {
            const instDbRes = await pool.query(
                'SELECT provider, meta_access_token, meta_phone_number_id, meta_waba_id, name, user_id FROM instances WHERE id = $1',
                [instanceId]
            );
            if (instDbRes.rows.length > 0) {
                const dbInst = instDbRes.rows[0];
                if (dbInst.provider === 'meta') {
                    instObj = {
                        status: 'open',
                        phone: dbInst.meta_phone_number_id,
                        provider: 'meta',
                        metaAccessToken: dbInst.meta_access_token,
                        metaPhoneNumberId: dbInst.meta_phone_number_id,
                        metaWabaId: dbInst.meta_waba_id,
                        name: dbInst.name,
                        userId: dbInst.user_id
                    };
                    if (instancesMap) instancesMap.set(instanceId, instObj);
                }
            }
        } catch (dbInstErr) {
            console.error('[Worker] Error loading instance details:', dbInstErr.message);
        }
    }
    if (instObj?.provider === 'meta') {
        isMeta = true;
    }

    // 2. Identify Meta Template Name (from options or spintax/syntax)
    let activeTplName = options?.templateName || options?.template_name || null;
    const finalMsgPreview = solveSpintax(message || '');
    if (finalMsgPreview && finalMsgPreview.trim().startsWith('[META TEMPLATE]')) {
        const rawTplStr = finalMsgPreview.trim().replace('[META TEMPLATE]', '').trim();
        const parts = rawTplStr.split('|').map(s => s.trim());
        if (parts.length > 0 && parts[0]) {
            activeTplName = parts[0];
        }
    } else if (finalMsgPreview && finalMsgPreview.trim().startsWith('[Template:')) {
        activeTplName = finalMsgPreview.replace(/^\[Template:\s*|\].*$/gi, '').trim();
    }

    // 3. Determine Category & Cost Type
    let metaCategory = 'REGULAR';
    let costType = isMeta ? 'meta_regular_credit_cost' : 'baileys_credit_cost';

    if (isMeta) {
        // Direct Send explicit category parameter support (e.g. 'utility' or 'authentication')
        if (options?.category) {
            metaCategory = String(options.category).toUpperCase();
        }

        // If template is specified, look up official category from meta_templates table
        if (activeTplName) {
            try {
                const tplRes = await pool.query(
                    'SELECT category FROM meta_templates WHERE name = $1 AND (instance_id = $2 OR instance_id IS NULL) LIMIT 1',
                    [activeTplName, instanceId]
                );
                if (tplRes.rows.length > 0 && tplRes.rows[0].category) {
                    metaCategory = tplRes.rows[0].category.toUpperCase();
                } else {
                    metaCategory = 'UTILITY'; // Standard default category for approved Meta templates
                }
            } catch (tplErr) {
                console.error('[Worker] Template Category Lookup Error:', tplErr.message);
                metaCategory = 'UTILITY';
            }
        }

        // Map Category to pricing key in system_settings
        if (metaCategory === 'MARKETING') costType = 'meta_marketing_credit_cost';
        else if (metaCategory === 'AUTHENTICATION') costType = 'meta_authentication_credit_cost';
        else if (metaCategory === 'UTILITY') costType = 'meta_utility_credit_cost';
        else costType = 'meta_regular_credit_cost';
    }

    // 4. Determine requiresWallet (Meta ALWAYS requires wallet deduction; Baileys checks daily limits)
    let requiresWallet = false;
    let limitData = null;

    if (isMeta) {
        // MANDATORY: Meta Cloud API messages ALWAYS require wallet deduction per message
        requiresWallet = true;
    } else {
        // Baileys WhatsApp Web instances check daily plan limits
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
                if (maxDaily > 0 && limitData.messages_sent_today >= maxDaily) {
                    requiresWallet = true;
                }
            }
        } catch (err) {
            console.error('[Worker] Limit Check Error:', err.message);
        }
    }

    // 5. Fetch accurate cost from system_settings with safe default fallbacks
    let cost = 1.0;
    const defaultMetaCost = (metaCategory === 'MARKETING') ? 1.00 : (metaCategory === 'AUTHENTICATION' ? 0.40 : 0.50);
    try {
        const settingsRes = await pool.query('SELECT value FROM system_settings WHERE key = $1', [costType]);
        if (settingsRes.rows.length > 0 && settingsRes.rows[0].value) {
            cost = parseFloat(settingsRes.rows[0].value) || (isMeta ? defaultMetaCost : 1.0);
        } else {
            cost = isMeta ? defaultMetaCost : 1.0;
        }
    } catch (e) {
        cost = isMeta ? defaultMetaCost : 1.0;
    }

    // 6. Check wallet balance before sending
    let balance = 0;
    try {
        const walletRes = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        if (walletRes.rows.length > 0) {
            balance = parseFloat(walletRes.rows[0].wallet_balance) || 0;
        }

        if (requiresWallet && balance < cost) {
            const failReason = isMeta
                ? `Insufficient wallet balance for Meta Official API ${metaCategory} message (requires ₹${cost.toFixed(2)}, available balance: ₹${balance.toFixed(2)}). Please recharge wallet.`
                : `Insufficient wallet balance for overage message (requires ₹${cost.toFixed(2)}, available balance: ₹${balance.toFixed(2)}). Please recharge wallet.`;
            
            console.warn(`[Worker Wallet Check] Aborting message: ${failReason}`);
            await pool.query(
                'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content, campaign_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, instanceId, number, 'failed', failReason, message || options?.templateName || activeTplName, activeCampaignId || null]
            );
            return; // Abort job immediately without sending to Meta
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

            let instance = instancesMap.get(instanceId);
            if (!instance && pool) {
                try {
                    const instDbRes = await pool.query('SELECT provider, meta_access_token, meta_phone_number_id, meta_waba_id, name, user_id FROM instances WHERE id = $1', [instanceId]);
                    if (instDbRes.rows.length > 0) {
                        const row = instDbRes.rows[0];
                        if (row.provider === 'meta') {
                            instance = {
                                status: 'open',
                                phone: row.meta_phone_number_id,
                                provider: 'meta',
                                metaAccessToken: row.meta_access_token,
                                metaPhoneNumberId: row.meta_phone_number_id,
                                metaWabaId: row.meta_waba_id,
                                name: row.name,
                                userId: row.user_id
                            };
                            instancesMap.set(instanceId, instance);
                        }
                    }
                } catch(e) {}
            }
            if (!instance || instance.status !== 'open') {
              throw new Error(`Instance ${instanceId} is offline.`);
            }

            const finalMessage = solveSpintax(message);

            let msgId = `msg_${Date.now()}`;

            if (instance.provider === 'meta') {
                const jid = number.replace(/[^0-9]/g, '');
                
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
                    // Look up stored template structure to build exact matching parameters and exact approved language
                    let dbTplComps = [];
                    let exactDbLang = activeTplLang;
                    try {
                        const dbTplRes = await pool.query('SELECT language, components FROM meta_templates WHERE LOWER(name) = LOWER($1) AND (instance_id = $2 OR instance_id IS NOT NULL) ORDER BY (instance_id = $2) DESC LIMIT 1', [activeTplName, instance.id]);
                        if (dbTplRes.rows.length > 0) {
                            if (dbTplRes.rows[0].language) {
                                exactDbLang = dbTplRes.rows[0].language;
                            }
                            if (dbTplRes.rows[0].components) {
                                dbTplComps = typeof dbTplRes.rows[0].components === 'string' 
                                    ? JSON.parse(dbTplRes.rows[0].components) 
                                    : dbTplRes.rows[0].components;
                            }
                        } else {
                            // Fetch live template definition directly from Meta Graph API if not yet synced in local DB!
                            const wabaId = instance.metaWabaId || instance.meta_waba_id;
                            const token = instance.metaAccessToken || instance.meta_access_token;
                            if (wabaId && token) {
                                console.log(`[Worker] Template '${activeTplName}' not found in local DB. Fetching live definition from Meta WABA ${wabaId}...`);
                                const metaTplRes = await fetch(`https://graph.facebook.com/v26.0/${wabaId}/message_templates?name=${encodeURIComponent(activeTplName)}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const metaTplData = await metaTplRes.json();
                                if (metaTplData.data && metaTplData.data.length > 0) {
                                    const liveTpl = metaTplData.data[0];
                                    exactDbLang = liveTpl.language || exactDbLang;
                                    dbTplComps = liveTpl.components || [];
                                    await pool.query(
                                        `INSERT INTO meta_templates (id, instance_id, name, language, status, category, components)
                                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                                         ON CONFLICT (id) DO UPDATE SET components = $7, status = $5, language = $4`,
                                        [`tpl_${instance.id}_${liveTpl.name}`, instance.id, liveTpl.name, liveTpl.language, liveTpl.status, liveTpl.category, JSON.stringify(dbTplComps)]
                                    ).catch(() => {});
                                }
                            }
                        }
                    } catch (err) {
                        console.error('[Worker] Error looking up template components:', err.message);
                    }

                    msgData.template = {
                        name: activeTplName,
                        language: { code: exactDbLang || activeTplLang || 'en' }
                    };

                    let sanitizedComps = [];
                    if (options.components && Array.isArray(options.components) && options.components.length > 0) {
                        sanitizedComps = await sanitizeMetaComponents(options.components, instance, options);
                    }

                    const comps = [];

                    // 1. Header Component
                    const dbHeader = Array.isArray(dbTplComps) ? dbTplComps.find(c => String(c.type).toUpperCase() === 'HEADER') : null;
                    const existingHeader = sanitizedComps.find(c => String(c.type).toLowerCase() === 'header');

                    if (existingHeader && existingHeader.parameters && existingHeader.parameters.length > 0) {
                        comps.push(existingHeader);
                    } else if (dbHeader) {
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
                    } else if (mediaUrl && (!dbTplComps || dbTplComps.length === 0)) {
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

                        // 4. Buttons Component (including FLOW, URL, QUICK_REPLY, COPY_CODE)
                        const dbButtons = Array.isArray(dbTplComps) ? dbTplComps.find(c => String(c.type).toUpperCase() === 'BUTTONS') : null;
                        if (dbButtons && Array.isArray(dbButtons.buttons)) {
                            dbButtons.buttons.forEach((btn, btnIdx) => {
                                const btnType = String(btn.type).toUpperCase();
                                if (btnType === 'FLOW' || btnType === 'COMPLETE_FLOW' || btnType === 'NAVIGATE' || btn.flow_id) {
                                    const flowToken = options.flowToken || options.flow_token || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                                    const actionObj = { flow_token: String(flowToken) };
                                    const actData = options.flowActionData || options.flow_action_data;
                                    if (actData && typeof actData === 'object' && Object.keys(actData).length > 0) {
                                        actionObj.flow_action_data = actData;
                                    }
                                    comps.push({
                                        type: "button",
                                        sub_type: "flow",
                                        index: String(btnIdx),
                                        parameters: [{ type: "action", action: actionObj }]
                                    });
                                } else if (btnType === 'URL' && btn.url && /\{\{\d+\}\}/.test(btn.url)) {
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
                } else if (options?.location || options?.type === 'location') {
                    msgData.type = "location";
                    const loc = options.location || {};
                    msgData.location = {
                        latitude: parseFloat(loc.latitude || options.latitude || 0),
                        longitude: parseFloat(loc.longitude || options.longitude || 0),
                        name: loc.name || options.locationName || undefined,
                        address: loc.address || options.locationAddress || undefined
                    };
                    delete msgData.text;
                } else if (options?.contacts || options?.type === 'contacts') {
                    msgData.type = "contacts";
                    msgData.contacts = Array.isArray(options.contacts) ? options.contacts : [options.contacts];
                    delete msgData.text;
                } else if (options?.reaction || options?.type === 'reaction') {
                    msgData.type = "reaction";
                    const react = options.reaction || {};
                    msgData.reaction = {
                        message_id: react.message_id || options.messageId || options.reactionMessageId,
                        emoji: react.emoji || options.emoji || '👍'
                    };
                    delete msgData.text;
                } else if (options?.interactiveList || options?.type === 'interactive_list' || (options?.interactive && options.interactive.type === 'list')) {
                    msgData.type = "interactive";
                    msgData.interactive = options.interactive || {
                        type: "list",
                        header: options.interactiveList?.header ? { type: "text", text: options.interactiveList.header } : undefined,
                        body: { text: finalMessage || options.interactiveList?.body || 'Please choose an option:' },
                        footer: options.interactiveList?.footer ? { text: options.interactiveList.footer } : undefined,
                        action: {
                            button: options.interactiveList?.buttonText || 'Select Option',
                            sections: options.interactiveList?.sections || []
                        }
                    };
                    delete msgData.text;
                } else if (options?.interactiveCtaUrl || options?.type === 'cta_url' || (options?.interactive && options.interactive.type === 'cta_url')) {
                    msgData.type = "interactive";
                    msgData.interactive = options.interactive || {
                        type: "cta_url",
                        body: { text: finalMessage || 'Check this out:' },
                        action: {
                            name: "cta_url",
                            parameters: {
                                display_text: options.interactiveCtaUrl?.displayText || 'Visit Link',
                                url: options.interactiveCtaUrl?.url || 'https://ifastx.in'
                            }
                        }
                    };
                    delete msgData.text;
                } else if (options?.interactiveLocationRequest || options?.type === 'location_request_message') {
                    msgData.type = "interactive";
                    msgData.interactive = {
                        type: "location_request_message",
                        body: { text: finalMessage || 'Please share your live location:' },
                        action: {
                            name: "send_location"
                        }
                    };
                    delete msgData.text;
                } else if (mediaUrl) {
                    let mType = (mediaType || options?.mediaType || 'image').toLowerCase();
                    if (mType === 'audio' || mType === 'voice' || mType === 'ptt') {
                        mType = 'audio';
                    } else if (mType === 'sticker') {
                        mType = 'sticker';
                    } else if (mType !== 'video' && mType !== 'document') {
                        mType = 'image';
                    }
                    msgData.type = mType;
                    const mediaObj = await getMetaMediaObject(mediaUrl, instance, mType);
                    msgData[mType] = mediaObj;
                    if (finalMessage && mType !== 'audio' && mType !== 'sticker') {
                        msgData[mType].caption = finalMessage;
                    }
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
                    const errorDetails = metaJson.error?.error_user_msg || metaJson.error?.error_user_title || metaJson.error?.message || 'Meta API Error';
                    const errorCode = metaJson.error?.code ? `(#${metaJson.error.code}) ` : '';
                    const fullError = `${errorCode}${errorDetails}`;
                    console.error(`[Meta API Error] ${fullError}`, JSON.stringify(metaJson.error));
                    throw new Error(fullError);
                }
                
                msgId = metaJson.messages?.[0]?.id || `meta_${Date.now()}`;
                
            } else {
                // Baileys
                const sock = instance.sock;
                if (!sock || !sock.user) {
                    throw new Error('WhatsApp instance is offline or disconnected');
                }

                let normalizedNum = normalizePhoneNumber(number);
                let targetJid = toJid(normalizedNum);

                if (normalizedNum) {
                    let candidates = [normalizedNum];
                    if (normalizedNum.startsWith('91') && normalizedNum.length === 12) {
                        candidates.push(normalizedNum.substring(2));
                    } else if (normalizedNum.startsWith('880') && normalizedNum.length === 13) {
                        candidates.push('0' + normalizedNum.substring(3));
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
                        } else {
                            targetJid = `${normalizedNum}@s.whatsapp.net`;
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
                'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content, campaign_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, instanceId, number, 'sent', msgId, finalMessage || options?.templateName, activeCampaignId || null]
            );

            // Clean up previous failed status for this recipient so restarted campaign numbers are resolved
            try {
                const cleanDigits = String(number).replace(/\D/g, '');
                await pool.query(
                    `UPDATE message_logs 
                     SET status = 'resolved_sent' 
                     WHERE user_id = $1 AND (recipient = $2 OR REPLACE(recipient, '+', '') LIKE '%' || $3) AND status = 'failed'`,
                    [userId, number, cleanDigits]
                );
            } catch (resolveErr) {
                console.warn('[Worker] Resolve failed logs notice:', resolveErr.message);
            }

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
                // 1. Deduct wallet balance from users table
                await pool.query(
                    'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - $1 WHERE id = $2',
                    [cost, userId]
                );
                
                // 2. Format clear descriptive message for transaction ledger
                const txDescription = isMeta
                    ? `Meta Cloud API ${metaCategory} Message to ${number}${activeTplName ? ` [Template: ${activeTplName}]` : ''}`
                    : `Overage Message to ${number} (${costType})`;

                // 3. Insert into wallet_transactions ledger with status 'completed'
                await pool.query(
                    'INSERT INTO wallet_transactions (user_id, amount, type, description, message_number, message_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, cost, 'debit', txDescription, number, msgId, 'completed']
                );

                console.log(`[Worker Wallet] Debited ₹${cost} from user ${userId} for ${txDescription}. Message ID: ${msgId}`);

                // 4. Real-time emit to connected UI components (HeaderWallet, WalletManager)
                if (io) {
                    io.emit('wallet_updated', { userId, amount: cost, type: 'debit', messageId: msgId });
                    io.emit('wallet_update', { userId, balance: Math.max(0, balance - cost), amount: cost });
                }
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
            'INSERT INTO message_logs (user_id, instance_id, recipient, status, error, content, campaign_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, instanceId, number, 'failed', lastError?.message || 'Unknown error', message, activeCampaignId || null]
        );
        throw lastError;
    }

    return { status: 'sent' };
  }, { 
    connection,
    concurrency: 25,
    limiter: {
      max: 50,
      duration: 1000
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
