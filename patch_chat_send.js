const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /await pool\.query\(\s*'INSERT INTO chat_messages \([^)]*\) VALUES \([^)]*\) ON CONFLICT \(id\) DO NOTHING',\s*\[msgId, instanceId, remoteJid, true, message, media, type, new Date\(\), 'sent', quotedMsgId\]\s*\);/g;

const match = regex.exec(server);
if (match) {
    console.log("Found query, patching...");
    server = server.replace(regex, `
        let displayMediaUrl = media;
        if (media && media.startsWith('data:')) {
            // Save base64 to local file so we don't blow up DB and can load it in UI
            const mimeMatch = media.match(/^data:(.*?);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            let ext = mimeType.split('/')[1] || 'bin';
            if (ext.includes(';')) ext = ext.split(';')[0];
            const base64Data = media.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = \`chat_media_\${Date.now()}.\${ext}\`;
            const fs = require('fs');
            const path = require('path');
            fs.writeFileSync(path.join(__dirname, 'uploads', fileName), buffer);
            displayMediaUrl = \`/uploads/\${fileName}\`;
        }

        await pool.query(
            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status, quoted_msg_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
            [msgId, instanceId, remoteJid, true, message, displayMediaUrl, type, new Date(), 'sent', quotedMsgId]
        );
        media = displayMediaUrl; // Update media for socket emit
    `);
} else {
    console.log("Could not find the chat_messages INSERT query");
}

fs.writeFileSync('/app/applet/server.cjs', server);
