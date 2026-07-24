const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetRegex = /const response = await ai\.models\.generateContent\(\{[\s\S]*?\}\)\;[\s\S]*?\}\)\.catch\(e => console\.error\('\[Meta AI Reply Send Error\]', e\.message\)\);\s*\}/;

const match = targetRegex.exec(server);
if (match) {
    const originalBlock = match[0];
    const newBlock = `try {
                            ${originalBlock}
                        } catch (aiError) {
                            console.error('[Meta AI Generation Error]', aiError.message);
                            // Optionally send a fallback message or just let it pass
                            await pool.query(
                                'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
                                [\`meta_ai_err_\${Date.now()}\`, instanceId, from, true, "[System: AI is currently unavailable or API key is invalid]", new Date(), 'failed']
                            );
                            io.emit('new_message', {
                                id: \`meta_ai_err_\${Date.now()}\`,
                                instanceId,
                                remoteJid: from,
                                fromMe: true,
                                text: "[System: AI is currently unavailable or API key is invalid]",
                                timestamp: new Date().toISOString(),
                                status: 'failed'
                            });
                        }`;
    server = server.replace(targetRegex, newBlock);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs with AI try-catch");
} else {
    console.log("Could not find AI block in server.cjs");
}
