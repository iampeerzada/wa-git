const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

// The messed up block looks like:
/*
app.get('/api/meta/templates/sync/:instanceId', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });

app.post('/api/meta/templates/create/:instanceId', authenticate, async (req, res) => {
...
});

        
        const inst = instanceRes.rows[0];
*/

// Let's replace the whole section from 1921 to 2004 with a fresh one.

const fixStartStr = `app.get('/api/meta/templates/sync/:instanceId', authenticate, async (req, res) => {`;
const fixEndStr = `console.error("META TEMPLATE SYNC ERROR:", e);\n        res.status(500).json({ error: e.message });\n    }\n});`;

const startIndex = server.indexOf(fixStartStr);
const endIndex = server.indexOf(fixEndStr) + fixEndStr.length;

if (startIndex !== -1 && endIndex !== -1) {
    const fixedBlock = `app.get('/api/meta/templates/sync/:instanceId', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'superadmin' ? 
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1' :
            'SELECT meta_waba_id, meta_access_token FROM instances WHERE id = $1 AND user_id = $2';
        const params = req.user.role === 'superadmin' ? [req.params.instanceId] : [req.params.instanceId, req.user.id];
        
        const instanceRes = await pool.query(query, params);
        if (instanceRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        
        const inst = instanceRes.rows[0];
        if (!inst.meta_waba_id || !inst.meta_access_token) return res.status(400).json({ error: 'Not a properly configured Meta instance' });

        const url = \`https://graph.facebook.com/v20.0/\${inst.meta_waba_id}/message_templates\`;
        console.log(\`[META SYNC] Fetching templates for WABA ID \${inst.meta_waba_id}...\`);
        const fetchRes = await fetch(url, { headers: { 'Authorization': \`Bearer \${inst.meta_access_token}\` } });
        const json = await fetchRes.json();
        
        if (!fetchRes.ok || json.error) {
            console.error("[META SYNC ERROR] API returned error:", JSON.stringify(json));
            throw new Error(json.error?.message || 'Meta API Error');
        }
        
        console.log(\`[META SYNC] Successfully fetched \${json.data ? json.data.length : 0} templates\`);
        
        const templates = json.data || [];
        for (const t of templates) {
            await pool.query(
                'INSERT INTO meta_templates (id, instance_id, name, language, status, category, components) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (instance_id, name, language) DO UPDATE SET status = EXCLUDED.status, components = EXCLUDED.components',
                [t.id, req.params.instanceId, t.name, t.language, t.status, t.category, JSON.stringify(t.components)]
            );
        }
        
        res.json({ success: true, count: templates.length });
    } catch (e) {
        console.error("META TEMPLATE SYNC ERROR:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/meta/templates/create/:instanceId', authenticate, async (req, res) => {
    try {
        const { name, category, language, components } = req.body;
        const instRes = await pool.query('SELECT * FROM instances WHERE id = $1 AND user_id = $2', [req.params.instanceId, req.user.id]);
        if (instRes.rows.length === 0) return res.status(404).json({ error: 'Instance not found' });
        const inst = instRes.rows[0];
        
        if (inst.provider !== 'meta' || !inst.meta_waba_id) {
            return res.status(400).json({ error: 'Not a valid Meta instance with WABA ID' });
        }
        
        const payload = {
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            language: language || 'en',
            category: category || 'MARKETING',
            allow_category_change: true,
            components: components
        };

        const response = await fetch(\`https://graph.facebook.com/v20.0/\${inst.meta_waba_id}/message_templates\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok || data.error) {
            return res.status(400).json({ error: data.error?.message || 'Meta API error' });
        }
        
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;

    server = server.substring(0, startIndex) + fixedBlock + server.substring(endIndex);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Fixed server.cjs");
} else {
    console.log("Could not find the block to fix");
}
