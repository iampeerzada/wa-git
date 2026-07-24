const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /if \(response\.text\) \{\s*fetch\(`https:\/\/graph\.facebook\.com\/v20\.0\/\${phoneNumberId}\/messages`, \{[\s\S]*?\}\)\.catch\(e => console\.error\('\[Meta AI Reply Send Error\]', e\.message\)\);\s*\}/;

const match = regex.exec(server);
if (match) {
    console.log("Found Meta AI logic, patching...");
    server = server.replace(regex, `if (response.text) {
                            const aiText = response.text;
                            // Clean the 'to' number (remove non-digits, optional +)
                            const toNum = from.replace(/[^0-9]/g, '');
                            fetch(\`https://graph.facebook.com/v20.0/\${phoneNumberId}/messages\`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': \`Bearer \${instance.meta_access_token}\`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    messaging_product: "whatsapp",
                                    recipient_type: "individual",
                                    to: toNum,
                                    type: "text",
                                    text: { body: aiText }
                                })
                            }).then(res => res.json()).then(async metaJson => {
                                if (metaJson.messages && metaJson.messages[0]) {
                                    const msgId = metaJson.messages[0].id;
                                    await pool.query(
                                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                                        [msgId, instanceId, from, true, aiText, new Date(), 'sent']
                                    );
                                    io.emit('new_message', {
                                        id: msgId,
                                        instanceId,
                                        remoteJid: from,
                                        fromMe: true,
                                        text: aiText,
                                        timestamp: new Date().toISOString(),
                                        status: 'sent'
                                    });
                                }
                            }).catch(e => console.error('[Meta AI Reply Send Error]', e.message));
                        }`);
    fs.writeFileSync('/app/applet/server.cjs', server);
} else {
    console.log("Could not find Meta AI logic");
}
