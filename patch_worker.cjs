const fs = require('fs');
let code = fs.readFileSync('queue-worker.js', 'utf8');

// Insert the wallet check after the daily limit check
const walletCheck = `
    // Check Wallet Balance Before Sending
    let cost = 1;
    let costType = 'baileys_credit_cost';
    
    // We need the instance to know if it's meta
    const checkInst = instancesMap.get(instanceId);
    if (checkInst && checkInst.provider === 'meta') {
        if (options?.templateName) {
            costType = 'meta_template_credit_cost';
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
                    [userId, instanceId, number, 'failed', 'Insufficient wallet balance', message || options?.templateName]
                );
                return; // Stop processing this message
            }
        }
    } catch (err) {
        console.error('[Worker] Wallet Check Error:', err.message);
    }
`;

code = code.replace("    // Retry Logic:", walletCheck + "\n    // Retry Logic:");
fs.writeFileSync('queue-worker.js', code);
