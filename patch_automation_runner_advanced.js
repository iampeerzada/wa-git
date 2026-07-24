const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const oldLogic = `                            if (matchedNode) {
                                console.log(\`[Meta Automation] Executing Node \${matchedNode.id} for \${from}\`);
                                
                                // Update State
                                if (matchedNode.action_type === 'end') {
                                    await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                } else {
                                    await pool.query(
                                        'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                        [from, instanceId, matchedNode.id]
                                    );
                                }
                                
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
                                });`;

const newLogic = `                            if (matchedNode) {
                                console.log(\`[Meta Automation] Matched Node \${matchedNode.id} for \${from}\`);
                                
                                let executionNode = matchedNode;
                                
                                if (matchedNode.action_type === 'go_back') {
                                    // Find parent
                                    const parentNode = autoRes.rows.find(r => r.id === matchedNode.parent_id);
                                    if (parentNode) {
                                        // Go to grandparent
                                        const grandParent = autoRes.rows.find(r => r.id === parentNode.parent_id);
                                        if (grandParent) {
                                            executionNode = grandParent;
                                        } else {
                                            // No grandparent, means root
                                            await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                            executionNode = null; 
                                        }
                                    }
                                } else if (matchedNode.action_type === 'go_main') {
                                    await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                    executionNode = null;
                                }
                                
                                // If they went back to main menu, try to find a welcome or exact root to resend
                                if (!executionNode && (matchedNode.action_type === 'go_back' || matchedNode.action_type === 'go_main')) {
                                     const rootMenu = autoRes.rows.find(r => !r.parent_id && r.match_type === 'welcome') || autoRes.rows.find(r => !r.parent_id);
                                     if (rootMenu) executionNode = rootMenu;
                                }
                                
                                if (!executionNode && matchedNode.action_type !== 'go_back' && matchedNode.action_type !== 'go_main') {
                                    executionNode = matchedNode;
                                }

                                if (executionNode) {
                                    // Update State
                                    if (executionNode.action_type === 'end') {
                                        await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                    } else {
                                        await pool.query(
                                            'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                            [from, instanceId, executionNode.id]
                                        );
                                    }
                                    
                                    // Send Message
                                    let msgData = {
                                        messaging_product: "whatsapp",
                                        recipient_type: "individual",
                                        to: from.replace(/[^0-9]/g, '')
                                    };
                                    
                                    if (executionNode.reply_type === 'text') {
                                        msgData.type = 'text';
                                        msgData.text = { body: executionNode.text_content };
                                    } else if (executionNode.reply_type === 'template') {
                                        msgData.type = 'template';
                                        msgData.template = {
                                            name: executionNode.template_name,
                                            language: { code: executionNode.template_language }
                                        };
                                    }
                                    
                                    let resp = await fetch(\`https://graph.facebook.com/v20.0/\${phoneNumberId}/messages\`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': \`Bearer \${instance.meta_access_token}\`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(msgData)
                                    });`;

if (server.includes('// Update State')) {
    server = server.replace(oldLogic, newLogic);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs for advanced routing logic");
} else {
    console.log("Not found");
}
