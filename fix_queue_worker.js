const fs = require('fs');
let code = fs.readFileSync('/app/applet/queue-worker.js', 'utf8');

const metaLogicStart = `            if (instance.provider === 'meta') {`;
const oldMetaLogic = `                if (!options?.templateName && waButtons && waButtons.length > 0) {
                    const replyButtons = waButtons.filter(b => b.type === 'reply').slice(0, 3);`;

const newMetaLogic = `                if (!options?.templateName && waButtons && waButtons.length > 0) {
                    const replyButtons = waButtons.filter(b => b.type === 'reply').slice(0, 3);
                    const urlButton = waButtons.find(b => b.type === 'url' || b.type === 'link');
                    const callButton = waButtons.find(b => b.type === 'call');
                    
                    if (replyButtons.length > 0) {
                        msgData.type = 'interactive';
                        msgData.interactive = {
                            type: 'button',
                            body: { text: finalMessage || ' ' },
                            action: {
                                buttons: replyButtons.map((btn, i) => ({
                                    type: 'reply',
                                    reply: { id: btn.id || ('btn_' + i), title: btn.displayText.substring(0, 20) }
                                }))
                            }
                        };
                        if (mediaUrl) {
                            msgData.interactive.header = {
                                type: mediaType || "image",
                                [mediaType || "image"]: { link: mediaUrl }
                            };
                        }
                        delete msgData.text;
                        delete msgData[mediaType || "image"];
                    } else if (urlButton || callButton) {
                        msgData.type = 'interactive';
                        const actionParameters = urlButton ? {
                            display_text: urlButton.displayText,
                            url: urlButton.url || urlButton.phoneNumber
                        } : {
                            display_text: callButton.displayText,
                            phone_number: callButton.phoneNumber || callButton.url
                        };
                        const actionName = urlButton ? 'cta_url' : 'cta_call';
                        
                        msgData.interactive = {
                            type: actionName,
                            body: { text: finalMessage || ' ' },
                            action: {
                                name: actionName,
                                parameters: actionParameters
                            }
                        };
                        if (mediaUrl) {
                            msgData.interactive.header = {
                                type: mediaType || "image",
                                [mediaType || "image"]: { link: mediaUrl }
                            };
                        }
                        delete msgData.text;
                        delete msgData[mediaType || "image"];
                    }
                }

                const metaRes = await fetch(\`https://graph.facebook.com/v20.0/\${instance.metaPhoneNumberId}/messages\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${instance.metaAccessToken}\`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msgData)
                });
                
                const metaJson = await metaRes.json();
                if (!metaRes.ok || metaJson.error) {
                    throw new Error(metaJson.error?.message || 'Meta API Error');
                }
                
                const msgId = metaJson.messages?.[0]?.id || \`meta_\${Date.now()}\`;
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'delivered', msgId, finalMessage || options?.templateName]
                );
                
                // Also save to chat_messages so it appears in Chat Interface
                await pool.query(
                    'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                    [msgId, instanceId, jid, true, finalMessage || options?.templateName, mediaUrl, mediaType, new Date(), 'sent']
                );

                // Update Quota
                await pool.query(
                    'UPDATE subscriptions SET messages_sent_today = messages_sent_today + 1 WHERE user_id = $1',
                    [userId]
                );
                
                return { success: true, messageId: msgId };
            }`;

// we need to slice out the block from `if (!options?.templateName && waButtons && waButtons.length > 0) {` 
// down to `await sock.sendPresenceUpdate('paused', jid); } }`
// The easiest way is regex or finding indices. Let's do it manually using indices.

const startIndex = code.indexOf("if (!options?.templateName && waButtons && waButtons.length > 0) {");
const endIndex = code.indexOf("if (waButtons && waButtons.length > 0) {", startIndex);

if (startIndex > -1 && endIndex > -1) {
    // The part before `if (waButtons && waButtons.length > 0) {` has a closing `}` for `if (instance.provider === 'meta') {`
    // We should replace everything from startIndex up to endIndex (but keep the closing brace and following code correct)
    
    code = code.substring(0, startIndex) + newMetaLogic + "\n            " + code.substring(endIndex);
    fs.writeFileSync('/app/applet/queue-worker.js', code);
    console.log("Patched queue-worker.js");
} else {
    console.log("Could not find start or end index.");
}
