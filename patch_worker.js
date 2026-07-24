const fs = require('fs');
let worker = fs.readFileSync('/app/applet/queue-worker.js', 'utf8');

// The worker currently has this block:
//                        delete msgData[mediaType || "image"];
//                    }
//                } catch (readErr) {
//                        // Ignore errors if read receipt fails
//                    }

// We need to inject the fetch to graph.facebook.com!
const oldStr = `                        delete msgData[mediaType || "image"];
                    }
                } catch (readErr) {
                        // Ignore errors if read receipt fails
                    }`;

const newStr = `                        delete msgData[mediaType || "image"];
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
                        [userId, instanceId, number, 'delivered', msgId, finalMessage]
                    );
                    
                    // Also save to chat_messages so it appears in Chat Interface
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, jid, true, finalMessage, mediaUrl, mediaType, new Date(), 'sent']
                    );
                    
                } catch (err) {
                    throw err;
                }`;

worker = worker.replace(oldStr, newStr);

fs.writeFileSync('/app/applet/queue-worker.js', worker);
console.log("Patched queue-worker.js");
