const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const postTarget = `app.post('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { keyword, match_type, reply_type, text_content, media_url, template_name, template_language } = req.body;
        
        await pool.query(
            'INSERT INTO automations (instance_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [instanceId, keyword, match_type, reply_type, text_content, media_url, template_name, template_language]
        );
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});`;

const postNew = `app.post('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options } = req.body;
        
        await pool.query(
            'INSERT INTO automations (instance_id, name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [instanceId, name || '', parent_id || null, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type || 'message', options ? JSON.stringify(options) : '[]']
        );
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});`;

server = server.replace(postTarget, postNew);

const putTarget = `app.post('/api/automations/:instanceId', authenticate, async (req, res) => {`;
// We will add PUT to update a node
const putNew = `app.put('/api/automations/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options } = req.body;
        await pool.query(
            'UPDATE automations SET name=$1, parent_id=$2, keyword=$3, match_type=$4, reply_type=$5, text_content=$6, media_url=$7, template_name=$8, template_language=$9, action_type=$10, options=$11 WHERE id=$12',
            [name || '', parent_id || null, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type || 'message', options ? JSON.stringify(options) : '[]', id]
        );
        res.sendStatus(200);
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});
app.post('/api/automations/:instanceId', authenticate, async (req, res) => {`;

server = server.replace(putTarget, putNew);

fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched API CRUD");
