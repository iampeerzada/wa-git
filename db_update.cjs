const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
});

async function run() {
    try {
        await pool.query(`ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10,4) DEFAULT 0.00;`);
    } catch(e) { console.log(e.message) }
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(50),
                amount DECIMAL(10,4),
                type VARCHAR(20),
                description TEXT,
                message_number VARCHAR(50),
                message_id TEXT,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
    } catch(e) { console.log(e.message) }
    console.log("DB update done");
    process.exit(0);
}
run();
