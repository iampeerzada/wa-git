const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@127.0.0.1:5432/ifastx'
});

async function run() {
  try {
    await pool.query('ALTER TABLE message_logs ADD COLUMN content TEXT;');
    console.log('Added content column to message_logs');
  } catch (err) {
    if (err.code === '42701') {
       console.log('Column content already exists in message_logs');
    } else {
       console.error('Error:', err);
    }
  }
  process.exit(0);
}
run();
