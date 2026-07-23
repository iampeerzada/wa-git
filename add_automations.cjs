require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        instance_id VARCHAR(50),
        keyword VARCHAR(255),
        match_type VARCHAR(20) DEFAULT 'exact',
        reply_type VARCHAR(20) DEFAULT 'text',
        text_content TEXT,
        media_url TEXT,
        template_name VARCHAR(255),
        template_language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
    );
  `);
  console.log("Created table");
  process.exit(0);
}
run();
