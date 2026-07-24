const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const targetDelete = `app.delete('/api/automations/:id', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM automations WHERE id = $1', [req.params.id]);`;

const newDelete = `app.delete('/api/automations/:id', authenticate, async (req, res) => {
    try {
        await pool.query(\`
            WITH RECURSIVE nodes_to_delete AS (
                SELECT id FROM automations WHERE id = $1
                UNION
                SELECT a.id FROM automations a
                INNER JOIN nodes_to_delete n ON a.parent_id = n.id
            )
            DELETE FROM automations WHERE id IN (SELECT id FROM nodes_to_delete);
        \`, [req.params.id]);`;

server = server.replace(targetDelete, newDelete);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched recursive delete for automations");
