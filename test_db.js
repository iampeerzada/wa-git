const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const res = await pool.query("SELECT name, components FROM meta_templates LIMIT 2");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}
run();
