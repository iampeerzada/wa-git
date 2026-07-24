const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const newRoutes = `
app.delete('/api/meta/templates/:instanceId/:templateName', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        
        const url = \`https://graph.facebook.com/v20.0/\${inst.meta_waba_id}/message_templates?name=\${req.params.templateName}\`;
        const fetchRes = await fetch(url, { 
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${inst.meta_access_token}\` } 
        });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        await pool.query('DELETE FROM meta_templates WHERE instance_id = $1 AND name = $2', [req.params.instanceId, req.params.templateName]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/meta/templates/edit/:instanceId/:templateId', authenticate, async (req, res) => {
    try {
        const { components } = req.body;
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        
        const url = \`https://graph.facebook.com/v20.0/\${req.params.templateId}\`;
        const fetchRes = await fetch(url, { 
            method: 'POST',
            headers: { 
                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ components })
        });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        await pool.query('UPDATE meta_templates SET components = $1, status = $2 WHERE id = $3', [JSON.stringify(components), 'PENDING', req.params.templateId]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;

if (!server.includes('app.delete(\'/api/meta/templates/:instanceId/:templateName\'')) {
    server = server.replace("app.get('/api/meta/templates/:instanceId', authenticate, async (req, res) => {", newRoutes + "\napp.get('/api/meta/templates/:instanceId', authenticate, async (req, res) => {");
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server with meta template routes");
} else {
    console.log("Already patched");
}
