#!/bin/bash
cat << 'JS_EOF' > patch_meta.js
const fs = require('fs');

// Patch queue-worker.js
try {
    let qw = fs.readFileSync('/var/www/wa-api/queue-worker.js', 'utf8');
    const qwTarget = `                const msgId = metaJson.messages?.[0]?.id || \`meta_\${Date.now()}\`;
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'delivered', msgId, finalMessage || options?.templateName]
                );`;
    
    const qwReplacement = `                console.log(\`[Meta API] Sending message to \${number}\`);
                console.log(\`[Meta API] Request: \${JSON.stringify(msgData)}\`);
                console.log(\`[Meta API] Response: \${JSON.stringify(metaJson)}\`);
                
                const msgId = metaJson.messages?.[0]?.id || \`meta_\${Date.now()}\`;
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'sent', msgId, finalMessage || options?.templateName]
                );`;

    if (qw.includes(qwTarget)) {
        qw = qw.replace(qwTarget, qwTarget.replace(/'delivered'/g, "'sent'") + "\nconsole.log('[Meta API] Request: ', JSON.stringify(msgData));\nconsole.log('[Meta API] Response: ', JSON.stringify(metaJson));");
        fs.writeFileSync('/var/www/wa-api/queue-worker.js', qw);
        console.log("Patched queue-worker.js");
    }
} catch (e) { console.error("Error patching queue-worker.js", e.message); }

// Patch server.cjs
try {
    let srv = fs.readFileSync('/var/www/wa-api/server.cjs', 'utf8');
    const srvTarget = `app.post('/api/meta/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {`;

    const srvReplacement = `app.post('/api/meta/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses && body.entry[0].changes[0].value.statuses[0]) {
            const statusObj = body.entry[0].changes[0].value.statuses[0];
            const msgId = statusObj.id;
            const status = statusObj.status; 
            const error = statusObj.errors ? JSON.stringify(statusObj.errors) : null;
            
            console.log(\`[Meta Webhook] Status update for \${msgId}: \${status}\`);
            if (error) console.error(\`[Meta Webhook] Error info for \${msgId}: \${error}\`);

            try {
                await pool.query('UPDATE message_logs SET status = $1 WHERE message_id = $2', [status, msgId]);
                await pool.query('UPDATE chat_messages SET status = $1 WHERE id = $2', [status, msgId]);
                io.emit('message_status', { id: msgId, status });
            } catch (e) {}
        }

        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {`;

    if (srv.includes(srvTarget)) {
        srv = srv.replace(srvTarget, srvReplacement);
        fs.writeFileSync('/var/www/wa-api/server.cjs', srv);
        console.log("Patched server.cjs");
    }
} catch (e) { console.error("Error patching server.cjs", e.message); }
JS_EOF
node patch_meta.js
pm2 restart all
