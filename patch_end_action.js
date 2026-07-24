const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const updateStateTarget = `                                // Update State
                                await pool.query(
                                    'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                    [from, instanceId, matchedNode.id]
                                );`;

const updateStateNew = `                                // Update State
                                if (matchedNode.action_type === 'end') {
                                    await pool.query('DELETE FROM customer_flow_states WHERE remote_jid = $1 AND instance_id = $2', [from, instanceId]);
                                } else {
                                    await pool.query(
                                        'INSERT INTO customer_flow_states (remote_jid, instance_id, current_node_id) VALUES ($1, $2, $3) ON CONFLICT (remote_jid, instance_id) DO UPDATE SET current_node_id = EXCLUDED.current_node_id, updated_at = CURRENT_TIMESTAMP',
                                        [from, instanceId, matchedNode.id]
                                    );
                                }`;

server = server.replace(updateStateTarget, updateStateNew);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched End Action state cleanup");
