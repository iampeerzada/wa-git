const { Pool } = require('pg');
require('dotenv').config({ path: '/app/applet/.env' });
const pool = new Pool();
async function run() {
  const result = await pool.query('SELECT created_at FROM message_logs LIMIT 1');
  console.log(JSON.stringify(result.rows[0]));
  process.exit();
}
run();
