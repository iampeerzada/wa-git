const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

// Find the template sync API to insert our new API after it
const syncApiRegex = /app\.get\('\/api\/meta\/templates\/sync\/:instanceId'[\s\S]*?\}\);/m;

const match = syncApiRegex.exec(server);
if (match) {
    const createApi = `
app.post('/api/meta/templates/create/:instanceId', authenticate, async (req, res) => {
    try {
        const { name, category, language, body } = req.body;
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
            components: [
                {
                    type: 'BODY',
                    text: body
                }
            ]
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
    server = server.replace(match[0], match[0] + '\n' + createApi);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs for meta templates create");
} else {
    console.log("Could not find meta templates sync endpoint!");
}
