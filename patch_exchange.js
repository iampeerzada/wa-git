const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const newRoute = `
app.post('/api/meta/exchange-code', authenticate, async (req, res) => {
    try {
        const { code } = req.body;
        const appId = process.env.META_APP_ID || '4126835067540230';
        const appSecret = process.env.META_APP_SECRET; 

        if (!appSecret) {
            return res.status(500).json({ error: 'META_APP_SECRET not configured on the server. Please add it to your server configuration.' });
        }

        const tokenResponse = await fetch(\`https://graph.facebook.com/v20.0/oauth/access_token?client_id=\${appId}&client_secret=\${appSecret}&code=\${code}\`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error.message });
        }

        const accessToken = tokenData.access_token;
        
        // Let's get the WABAs associated with this user
        const debugResponse = await fetch(\`https://graph.facebook.com/v20.0/debug_token?input_token=\${accessToken}&access_token=\${appId}|\${appSecret}\`);
        const debugData = await debugResponse.json();
        
        let wabaId = '';
        let phoneNumberId = '';
        
        // This is a simplified extraction. In a real scenario, the Embedded Signup flow returns shared WABAs via granular_scopes or you query the user's business integrations.
        if (debugData.data?.granular_scopes) {
            const wabaScope = debugData.data.granular_scopes.find(s => s.scope === 'whatsapp_business_management');
            if (wabaScope && wabaScope.target_ids && wabaScope.target_ids.length > 0) {
                wabaId = wabaScope.target_ids[0];
                
                // Fetch Phone Numbers for this WABA
                const pnResponse = await fetch(\`https://graph.facebook.com/v20.0/\${wabaId}/phone_numbers\`, {
                    headers: { 'Authorization': \`Bearer \${accessToken}\` }
                });
                const pnData = await pnResponse.json();
                if (pnData.data && pnData.data.length > 0) {
                    phoneNumberId = pnData.data[0].id;
                }
            }
        }

        res.json({ success: true, accessToken, wabaId, phoneNumberId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
`;

if (!code.includes('/api/meta/exchange-code')) {
    code = code.replace(`app.post('/api/create', authenticate, async (req, res) => {`, newRoute + `\napp.post('/api/create', authenticate, async (req, res) => {`);
    fs.writeFileSync('/app/applet/server.cjs', code);
    console.log("Patched server for exchange code");
}
