const fs = require('fs');

let srv = fs.readFileSync('server.cjs', 'utf8');

const targetProxy = `app.get('/api/chat/messages/:instanceId/:remoteJid'`;

const proxyCode = `app.get('/api/meta/media/:instanceId/:mediaId', async (req, res) => {
    try {
        const { instanceId, mediaId } = req.params;
        const instRes = await pool.query('SELECT meta_access_token FROM instances WHERE id = $1', [instanceId]);
        if (instRes.rows.length === 0) return res.status(404).send('Instance not found');
        const token = instRes.rows[0].meta_access_token;
        
        const metadataRes = await fetch(\`https://graph.facebook.com/v20.0/\${mediaId}\`, {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        const metadata = await metadataRes.json();
        
        if (!metadata.url) return res.status(404).send('Media URL not found');
        
        const mediaRes = await fetch(metadata.url, {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        res.setHeader('Content-Type', metadata.mime_type || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        const buffer = await mediaRes.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        console.error("[Meta Media Fetch Error]", e);
        res.status(500).send('Error fetching media');
    }
});

app.get('/api/chat/messages/:instanceId/:remoteJid'`;

if (srv.includes(targetProxy)) {
    srv = srv.replace(targetProxy, proxyCode);
    console.log("Patched proxy endpoint");
} else {
    console.log("Could not find proxy target");
}

fs.writeFileSync('server.cjs', srv);
