require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT
});
async function run() {
  try {
    await pool.query('ALTER TABLE instances ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE');
    console.log("Column ai_enabled added");
  } catch(e) {
    if (e.message.includes('already exists')) {
        console.log("Column already exists");
    } else {
        console.error(e);
    }
  }
  process.exit();
}
run();
