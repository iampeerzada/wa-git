const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetTable = `CREATE TABLE IF NOT EXISTS automations (`;
const checkAction = `action_type VARCHAR(50) DEFAULT 'message'`;

if(!server.includes(checkAction)) {
    // wait I should just alter table in db.js or via pool.query in server.cjs
    console.log("Need to alter table");
} else {
    console.log("Already has action_type");
}
