require('dotenv').config({ path: '/app/applet/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function patch() {
    try {
        await pool.query(`
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
            );
        `);
        console.log("DB patched");
    } catch(e) {
        console.log("DB Error", e);
    }
    process.exit(0);
}
patch();
