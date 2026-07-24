const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetStr = `                            for (const rule of autoRes.rows) {
                                let match = false;
                                const keyword = rule.keyword ? rule.keyword.toLowerCase() : '';
                                const msgText = text.toLowerCase();
                                
                                if (rule.match_type === 'welcome') {
                                    if (isFirstMessage === null) {
                                        const msgCountRes = await pool.query('SELECT COUNT(*) as count FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false', [instanceId, from]);
                                        isFirstMessage = parseInt(msgCountRes.rows[0].count) <= 1;
                                    }
                                    if (isFirstMessage) match = true;
                                } else if (rule.match_type === 'exact' && msgText === keyword) match = true;
                                else if (rule.match_type === 'contains' && msgText.includes(keyword)) match = true;
                                
                                if (match) {
                                    console.log(\`[Meta Automation] Match found for \${from}\`);
                                    let msgData = {
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        to: from.replace(/[^0-9]/g, '')
                                    };
                                    
                                    if (rule.reply_type === 'text') {
                                        msgData.type = 'text';
                                        msgData.text = { body: rule.text_content };
                                    } else if (rule.reply_type === 'template') {
                                        msgData.type = 'template';
                                        msgData.template = {
                                            name: rule.template_name,
                                            language: { code: rule.template_language }
                                        };
                                    }
                                    
                                    let resp = await fetch(\`https://graph.facebook.com/v20.0/\${phoneNumberId}/messages\`, {
        method: 'POST',
        headers: {
            'Authorization': \`Bearer \${instance.meta_access_token}\`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(msgData)
    });
    let data = await resp.json();
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
    
    break; // Only trigger first matching rule
                                }
                            }`;

const newStr = `
                            // Tree-based Automation Logic
                            let matchedNode = null;
                            const msgText = text.toLowerCase().trim();
                            
                            // 1. Check current state
                            const stateRes = await pool.query('SELECT current_node_id FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                            if (stateRes.rows.length > 0 && stateRes.rows[0].current_node_id) {
                                const currentNodeId = stateRes.rows[0].current_node_id;
                                const currentRule = autoRes.rows.find(r => r.id === currentNodeId);
                                if (currentRule && currentRule.options) {
                                    let opts = [];
                                    try { opts = typeof currentRule.options === 'string' ? JSON.parse(currentRule.options) : currentRule.options; } catch(e){}
                                    const optMatch = opts.find(o => o.trigger && o.trigger.toLowerCase() === msgText);
                                    if (optMatch && optMatch.target_id) {
                                        matchedNode = autoRes.rows.find(r => r.id === parseInt(optMatch.target_id));
                                    }
                                }
                            }
                            
                            // 2. If no option matched, check global roots (parent_id IS NULL)
                            if (!matchedNode) {
                                let isFirstMessage = null;
                                for (const rule of autoRes.rows) {
                                    if (rule.parent_id) continue; // Skip non-root nodes for global triggers
                                    let match = false;
                                    const keyword = rule.keyword ? rule.keyword.toLowerCase().trim() : '';
                                    if (rule.match_type === 'welcome') {
                                        if (isFirstMessage === null) {
                                            const msgCountRes = await pool.query('SELECT COUNT(*) as count FROM chat_messages WHERE instance_id = $1 AND remote_jid = $2 AND from_me = false', [instanceId, from]);
                                            isFirstMessage = parseInt(msgCountRes.rows[0].count) <= 1;
                                        }
                                        if (isFirstMessage) match = true;
                                    } else if (rule.match_type === 'exact' && msgText === keyword) match = true;
                                    else if (rule.match_type === 'contains' && msgText.includes(keyword)) match = true;
                                    
                                    if (match) {
                                        matchedNode = rule;
                                        break;
                                    }
                                }
                            }
                            
                            if (matchedNode) {
                                console.log(\`[Meta Automation] Executing Node \${matchedNode.id} for \${from}\`);
                                
                                // Update State
                                await pool.query(
                                    'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                    [from, instanceId, matchedNode.id]
                                );
                                
                                // Send Message
                                let msgData = {
                                    messaging_product: "whatsapp",
                                    recipient_type: "individual",
                                    to: from.replace(/[^0-9]/g, '')
                                };
                                
                                if (matchedNode.reply_type === 'text') {
                                    msgData.type = 'text';
                                    msgData.text = { body: matchedNode.text_content };
                                } else if (matchedNode.reply_type === 'template') {
                                    msgData.type = 'template';
                                    msgData.template = {
                                        name: matchedNode.template_name,
                                        language: { code: matchedNode.template_language }
                                    };
                                }
                                
                                let resp = await fetch(\`https://graph.facebook.com/v20.0/\${phoneNumberId}/messages\`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': \`Bearer \${instance.meta_access_token}\`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(msgData)
                                });
                                let data = await resp.json();
                                console.log("[Meta Automation Send Result]", data);
                                
                                if (data.messages && data.messages[0]) {
                                    const msgId = data.messages[0].id;
                                    const savedText = matchedNode.reply_type === 'template' ? '[Template: ' + matchedNode.template_name + ']' : matchedNode.text_content;
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
                            }`;

// Notice: we replace the exact target. Let's make sure it matches perfectly.
// Actually, I can use replace safely if it's unique.
let success = false;
if (server.includes("for (const rule of autoRes.rows) {")) {
    server = server.replace(targetStr, newStr);
    success = true;
}

if (success) {
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs automation execution");
} else {
    console.log("Could not find the target string.");
}
