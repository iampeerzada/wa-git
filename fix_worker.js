const fs = require('fs');
let worker = fs.readFileSync('/app/applet/queue-worker.js', 'utf8');

// The original file had a broken structure. We need to fix the try-catch block for the meta message logic.
// We inserted:
//                    }
//                    
//                    const metaRes = await fetch...
//                    ...
//                } catch (err) {
//                    throw err;
//                }
// Let's replace the `} catch (err) { throw err; }` with nothing, because it's breaking the syntax.
// We are already inside a big try { block starting at 164!

worker = worker.replace(`                    // Also save to chat_messages so it appears in Chat Interface
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, jid, true, finalMessage, mediaUrl, mediaType, new Date(), 'sent']
                    );
                    
                } catch (err) {
                    throw err;
                }`, `                    // Also save to chat_messages so it appears in Chat Interface
                    await pool.query(
                        'INSERT INTO chat_messages (id, instance_id, remote_jid, from_me, text, media_url, media_type, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING',
                        [msgId, instanceId, jid, true, finalMessage, mediaUrl, mediaType, new Date(), 'sent']
                    );`);

fs.writeFileSync('/app/applet/queue-worker.js', worker);
console.log("Fixed queue-worker.js");
