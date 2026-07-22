const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:iFastX@Admin2024@localhost:5432/ifastx_db' });
async function run() {
  const result = await pool.query('SELECT created_at FROM message_logs LIMIT 1');
  console.log(result.rows[0]);
  process.exit();
}
run();
