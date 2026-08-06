const fs = require('fs');

let srv = fs.readFileSync('server.cjs', 'utf8');

const targetMapped = `        const mapped = result.rows.map(row => ({
            id: row.id,
            instanceId: row.instance_id,
            remoteJid: row.remote_jid,
            fromMe: row.from_me,
            text: row.text,
            timestamp: row.timestamp
        }));`;
        
const replaceMapped = `        const mapped = result.rows.map(row => {
            let mediaUrl = row.media_url;
            if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('/')) {
                mediaUrl = \`/api/meta/media/\${row.instance_id}/\${mediaUrl}\`;
            }
            return {
                id: row.id,
                instanceId: row.instance_id,
                remoteJid: row.remote_jid,
                fromMe: row.from_me,
                text: row.text,
                mediaUrl: mediaUrl,
                mediaType: row.media_type,
                status: row.status,
                timestamp: row.timestamp,
                quotedMsgId: row.quoted_msg_id,
                quotedMsgJson: row.quoted_msg_json ? JSON.parse(row.quoted_msg_json) : undefined
            };
        });`;
        
if (srv.includes(targetMapped)) {
    srv = srv.replace(targetMapped, replaceMapped);
    console.log("Patched messages mapping");
    fs.writeFileSync('server.cjs', srv);
} else {
    console.log("Failed to find target");
}
