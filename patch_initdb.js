const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetStr = `CREATE TABLE IF NOT EXISTS automations (
                id SERIAL PRIMARY KEY,
                instance_id VARCHAR(50),
                keyword VARCHAR(255),
                match_type VARCHAR(20) DEFAULT 'exact',
                reply_type VARCHAR(20) DEFAULT 'text',
                text_content TEXT,
                media_url TEXT,
                template_name VARCHAR(255),
                template_language VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`;

const newStr = `CREATE TABLE IF NOT EXISTS automations (
                id SERIAL PRIMARY KEY,
                instance_id VARCHAR(50),
                keyword VARCHAR(255),
                match_type VARCHAR(20) DEFAULT 'exact',
                reply_type VARCHAR(20) DEFAULT 'text',
                text_content TEXT,
                media_url TEXT,
                template_name VARCHAR(255),
                template_language VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS parent_id INT;
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'message';
            ALTER TABLE automations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            
            CREATE TABLE IF NOT EXISTS customer_flow_states (
                remote_jid VARCHAR(255),
                instance_id VARCHAR(50),
                current_node_id INT,
                state_data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (remote_jid, instance_id)
            );`;

server = server.replace(targetStr, newStr);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched initializeDB");
