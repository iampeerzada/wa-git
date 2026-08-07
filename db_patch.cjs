const fs = require('fs');
let code = fs.readFileSync('server.cjs', 'utf8');

const injection = `
        try {
            await client.query('ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10,4) DEFAULT 0.00;');
            console.log('[Database] Added wallet_balance column to users');
        } catch (e) { }

        await client.query(\`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                amount DECIMAL(10,4),
                type VARCHAR(20),
                description TEXT,
                message_number VARCHAR(50),
                message_id TEXT,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        \`);
        
        try {
            await client.query("INSERT INTO system_settings (key, value) VALUES ('baileys_credit_cost', '1'), ('meta_template_credit_cost', '2'), ('meta_regular_credit_cost', '1') ON CONFLICT DO NOTHING;");
        } catch(e) {}
`;

code = code.replace("console.log('[Database] system_settings table verified.');", "console.log('[Database] system_settings table verified.');" + injection);
fs.writeFileSync('server.cjs', code);
