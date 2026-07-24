const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const newRoute = `
// ----------------------------------------------------------------------------
// Meta Embedded Signup - Token Exchange Endpoint
// ----------------------------------------------------------------------------
app.post('/api/meta/exchange-code', authenticate, async (req, res) => {
    try {
        const { code } = req.body;
        // You MUST define your META_APP_ID and META_APP_SECRET in .env
        const appId = process.env.META_APP_ID || '4126835067540230';
        const appSecret = process.env.META_APP_SECRET; 

        if (!appSecret) {
            return res.status(500).json({ error: 'META_APP_SECRET not configured on the server.' });
        }

        // 1. Exchange code for access token
        const tokenResponse = await fetch(\`https://graph.facebook.com/v20.0/oauth/access_token?client_id=\${appId}&client_secret=\${appSecret}&code=\${code}\`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error.message });
        }

        const accessToken = tokenData.access_token;

        // 2. Fetch the WABA ID and Phone Number ID using the token
        // A common way is to query the shared WABAs for this user token
        const debugResponse = await fetch(\`https://graph.facebook.com/v20.0/debug_token?input_token=\${accessToken}&access_token=\${appId}|\${appSecret}\`);
        const debugData = await debugResponse.json();
        
        const wabaResponse = await fetch(\`https://graph.facebook.com/v20.0/\${debugData.data.granular_scopes[0].target_ids[0]}/client_whatsapp_business_accounts\`, {
            headers: { 'Authorization': \`Bearer \${accessToken}\` }
        });
        const wabaData = await wabaResponse.json();
        // Extract IDs from wabaData...
        // This requires parsing the specific structure returned by Embedded Signup.

        res.json({ success: true, accessToken, rawData: wabaData });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
`;

if (!code.includes('/api/meta/exchange-code')) {
    code = code.replace(`app.post('/api/instances', authenticate, async (req, res) => {`, newRoute + `\napp.post('/api/instances', authenticate, async (req, res) => {`);
    fs.writeFileSync('/app/applet/server.cjs', code);
    console.log("Patched server for exchange code");
}
