const fs = require('fs');

let srv = fs.readFileSync('server.cjs', 'utf8');

const targetMessages = `        const result = await pool.query(\`
            SELECT * FROM chat_messages
            WHERE instance_id = $1 AND remote_jid = $2
            ORDER BY timestamp ASC
        \`, [instanceId, remoteJid]);
        
        const messages = result.rows.map(row => ({`;

const replaceMessages = `        const result = await pool.query(\`
            SELECT * FROM chat_messages
            WHERE instance_id = $1 AND remote_jid = $2
            ORDER BY timestamp ASC
        \`, [instanceId, remoteJid]);
        
        const messages = result.rows.map(row => {
            let mediaUrl = row.media_url;
            if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('/')) {
                mediaUrl = \`/api/meta/media/\${instanceId}/\${mediaUrl}\`;
            }
            return {
                id: row.id,
                instanceId: row.instance_id,
                remoteJid: row.remote_jid,
                fromMe: row.from_me,
                text: row.text,
                mediaUrl: mediaUrl,
                mediaType: row.media_type,
                timestamp: row.timestamp,
                status: row.status,
                quotedMsgId: row.quoted_msg_id,
                quotedMsgJson: row.quoted_msg_json ? JSON.parse(row.quoted_msg_json) : null
            };
        });
        /*`;

const replaceEnd = `        res.json(messages);`;

// Wait, the map might be fully defined in one go. Let me check the exact map in server.cjs
