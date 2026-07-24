const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetStr = `                            for (const rule of autoRes.rows) {
                                let match = false;
                                const keyword = rule.keyword.toLowerCase();
                                const msgText = text.toLowerCase();
                                if (rule.match_type === 'exact' && msgText === keyword) match = true;
                                else if (rule.match_type === 'contains' && msgText.includes(keyword)) match = true;`;

const newStr = `                            let isFirstMessage = null;
                            for (const rule of autoRes.rows) {
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
                                else if (rule.match_type === 'contains' && msgText.includes(keyword)) match = true;`;

server = server.replace(targetStr, newStr);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched server.cjs for welcome automations");
