const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const target = `app.post('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const { keyword, match_type, reply_type, text_content, media_url, template_name, template_language } = req.body;
        await pool.query(
            'INSERT INTO automations (instance_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [req.params.instanceId, keyword, match_type, reply_type, text_content, media_url, template_name, template_language]
        );`;

const replace = `app.post('/api/automations/:instanceId', authenticate, async (req, res) => {
    try {
        const { name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options } = req.body;
        await pool.query(
            'INSERT INTO automations (instance_id, name, parent_id, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type, options) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [req.params.instanceId, name || '', parent_id || null, keyword, match_type, reply_type, text_content, media_url, template_name, template_language, action_type || 'message', options ? JSON.stringify(options) : '[]']
        );`;

server = server.replace(target, replace);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched automations create endpoint");
