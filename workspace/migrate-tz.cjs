const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@127.0.0.1:5432/ifastx' }); 
// wait I don't need this file, I can just use server.cjs to run the alter table on startup
