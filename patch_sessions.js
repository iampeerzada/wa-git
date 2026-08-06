const fs = require('fs');
let srv = fs.readFileSync('server.cjs', 'utf8');

const targetSessions = `        const sessions = [];
        for (const row of result.rows) {
            const lastMsg = await pool.query(\`
                SELECT * FROM chat_messages 
                WHERE instance_id = $1 AND remote_jid = $2 
                ORDER BY timestamp DESC LIMIT 1
            \`, [instanceId, row.remote_jid]);
            
            const labels = await pool.query(\`
                SELECT l.id, l.name, l.color 
                FROM chat_labels l
                JOIN chat_session_labels sl ON l.id = sl.label_id
                WHERE sl.instance_id = $1 AND sl.remote_jid = $2
            \`, [instanceId, row.remote_jid]);

            sessions.push({`;

const replacementSessions = `        const sessions = [];
        for (const row of result.rows) {
            const lastMsg = await pool.query(\`
                SELECT * FROM chat_messages 
                WHERE instance_id = $1 AND remote_jid = $2 
                ORDER BY timestamp DESC LIMIT 1
            \`, [instanceId, row.remote_jid]);
            
            const unreadRes = await pool.query(\`
                SELECT COUNT(*) FROM chat_messages 
                WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false AND status != 'read'
            \`, [instanceId, row.remote_jid]);
            const unreadCount = parseInt(unreadRes.rows[0].count, 10);
            
            const labels = await pool.query(\`
                SELECT l.id, l.name, l.color 
                FROM chat_labels l
                JOIN chat_session_labels sl ON l.id = sl.label_id
                WHERE sl.instance_id = $1 AND sl.remote_jid = $2
            \`, [instanceId, row.remote_jid]);

            sessions.push({
                unreadCount,`;

if (srv.includes(targetSessions)) {
    srv = srv.replace(targetSessions, replacementSessions);
    console.log("Patched sessions unread count");
} else {
    console.log("Could not find sessions target");
}

const targetMarkRead = `app.post('/api/chat/labels', authenticate, async (req, res) => {`;
const replacementMarkRead = `app.post('/api/chat/messages/:instanceId/:remoteJid/read', authenticate, async (req, res) => {
    try {
        const { instanceId, remoteJid } = req.params;
        await pool.query(\`
            UPDATE chat_messages 
            SET status = 'read' 
            WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false AND status != 'read'
        \`, [instanceId, remoteJid]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat/labels', authenticate, async (req, res) => {`;

if (srv.includes(targetMarkRead)) {
    srv = srv.replace(targetMarkRead, replacementMarkRead);
    console.log("Patched mark as read endpoint");
} else {
    console.log("Could not find mark as read target");
}

fs.writeFileSync('server.cjs', srv);
