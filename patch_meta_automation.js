const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /let data = await resp\.json\(\);\s*console\.log\("\[Meta Automation Send Result\]", data\);.*?\n\s*break; \/\/ Only trigger first matching rule/;
const match = regex.exec(server);
if (match) {
    server = server.replace(regex, `let data = await resp.json();
    console.log("[Meta Automation Send Result]", data);
    
    // Save to chat_messages so it appears in Chat Interface
    if (data.messages && data.messages[0]) {
        const msgId = data.messages[0].id;
        const savedText = rule.reply_type === 'template' ? '[Template: ' + rule.template_name + ']' : rule.text_content;
        await pool.query(
            'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
            [msgId, instanceId, from, true, savedText, new Date(), 'sent']
        );
        io.emit('new_message', {
            id: msgId,
            instanceId,
            remoteJid: from,
            fromMe: true,
            text: savedText,
            timestamp: new Date().toISOString(),
            status: 'sent'
        });
    }
    
    break; // Only trigger first matching rule`);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched meta automation");
} else {
    console.log("Could not find meta automation code");
}
