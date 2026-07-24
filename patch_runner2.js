const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetStr = `                            // 1. Check current state
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
                            }`;

const newStr = `                            // 1. Check current state
                            const stateRes = await pool.query('SELECT current_node_id FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                            if (stateRes.rows.length > 0 && stateRes.rows[0].current_node_id) {
                                const currentNodeId = stateRes.rows[0].current_node_id;
                                
                                // Look for children of current node that match the keyword
                                const childNode = autoRes.rows.find(r => r.parent_id === currentNodeId && (r.keyword || '').toLowerCase().trim() === msgText);
                                if (childNode) {
                                    matchedNode = childNode;
                                } else {
                                    // Optionally handle "invalid option" here, or let it fallback to global
                                }
                            }`;

if (server.includes("const stateRes = await pool.query('SELECT current_node_id FROM customer_flow_states")) {
    server = server.replace(targetStr, newStr);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs runner for parent_id");
}
