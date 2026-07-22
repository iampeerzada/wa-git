require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT
});

async function run() {
  try {
    await pool.query("ALTER TABLE instances ADD COLUMN provider VARCHAR(20) DEFAULT 'baileys'");
    await pool.query('ALTER TABLE instances ADD COLUMN meta_access_token TEXT');
    await pool.query('ALTER TABLE instances ADD COLUMN meta_phone_number_id VARCHAR(50)');
    await pool.query('ALTER TABLE instances ADD COLUMN meta_waba_id VARCHAR(50)');
    console.log("Meta columns added to instances table");
  } catch(e) {
    if (e.message.includes('already exists')) {
        console.log("Columns already exist");
    } else {
        console.error(e);
    }
  }
  process.exit();
}
run();
