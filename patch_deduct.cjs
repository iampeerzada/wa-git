const fs = require('fs');
let code = fs.readFileSync('queue-worker.js', 'utf8');

const deductLogic = `
                // Update Quota and Wallet
                await pool.query(
                    'UPDATE subscriptions SET messages_sent_today = messages_sent_today + 1 WHERE user_id = $1',
                    [userId]
                );
                
                await pool.query(
                    'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
                    [cost, userId]
                );
                
                await pool.query(
                    'INSERT INTO wallet_transactions (user_id, amount, type, description, message_number, message_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, cost, 'debit', \`Message to \${number} (\${costType})\`, number, msgId, 'sent']
                );
`;

code = code.replace(/await pool\.query\([\s\S]*?'UPDATE subscriptions SET messages_sent_today = messages_sent_today \+ 1 WHERE user_id = \$1',[\s\S]*?\[userId\][\s\S]*?\);/g, deductLogic);
fs.writeFileSync('queue-worker.js', code);
