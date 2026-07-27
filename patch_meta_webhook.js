const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetStr = `app.post('/api/meta/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {`;

const replacement = `app.post('/api/meta/webhook', async (req, res) => {
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses && body.entry[0].changes[0].value.statuses[0]) {
            const statusObj = body.entry[0].changes[0].value.statuses[0];
            const msgId = statusObj.id;
            const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
            const error = statusObj.errors ? JSON.stringify(statusObj.errors) : null;
            
            console.log(\`[Meta Webhook] Status update for \${msgId}: \${status}\`);
            if (error) console.error(\`[Meta Webhook] Error info for \${msgId}: \${error}\`);

            try {
                // Update message logs (bulk sender)
                await pool.query('UPDATE message_logs SET status = $1 WHERE message_id = $2', [status, msgId]);
                // Update chat messages (chat interface)
                await pool.query('UPDATE chat_messages SET status = $1 WHERE id = $2', [status, msgId]);
                
                io.emit('message_status', { id: msgId, status });
            } catch (e) {
                console.error('[Meta Webhook Status DB Error]', e.message);
            }
        }

        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('/app/applet/server.cjs', code);
    console.log("Patched server.cjs with Meta Webhook Status handling");
} else {
    console.log("Could not find target string in server.cjs");
}
