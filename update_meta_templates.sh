#!/bin/bash
cat << 'JS_EOF' > patch_template_media.js
const fs = require('fs');

try {
    let srv = fs.readFileSync('/var/www/wa-api/server.cjs', 'utf8');
    
    const targetCreate = `        const payload = {
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            language: language || 'en',
            category: category || 'MARKETING',
            
            components: components
        };`;
        
    const replacementCreate = `        // Intercept components to handle media uploads for examples
        for (let comp of components) {
            if (comp.type === 'HEADER' && comp.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format)) {
                if (comp.example && (comp.example.header_handle || comp.example.header_url)) {
                    const urlArr = comp.example.header_handle || comp.example.header_url;
                    if (urlArr && urlArr.length > 0) {
                        const sampleUrl = urlArr[0];
                        if (sampleUrl && sampleUrl.startsWith('http')) {
                            try {
                                console.log("[Meta Template] Downloading example media from:", sampleUrl);
                                const debugRes = await fetch(\`https://graph.facebook.com/v20.0/debug_token?input_token=\${inst.meta_access_token}&access_token=\${inst.meta_access_token}\`);
                                const debugData = await debugRes.json();
                                const appId = debugData.data?.app_id;
                                
                                if (appId) {
                                    const mediaRes = await fetch(sampleUrl);
                                    const mediaBuffer = await mediaRes.arrayBuffer();
                                    const fileLength = mediaBuffer.byteLength;
                                    const mimeType = mediaRes.headers.get('content-type') || 'image/jpeg';
                                    
                                    console.log("[Meta Template] Starting upload session for App ID:", appId);
                                    const sessionRes = await fetch(\`https://graph.facebook.com/v20.0/\${appId}/uploads?file_length=\${fileLength}&file_type=\${mimeType}\`, {
                                        method: 'POST',
                                        headers: { 'Authorization': \`Bearer \${inst.meta_access_token}\` }
                                    });
                                    const sessionData = await sessionRes.json();
                                    const sessionId = sessionData.id;
                                    
                                    if (sessionId) {
                                        console.log("[Meta Template] Uploading data to session:", sessionId);
                                        const uploadRes = await fetch(\`https://graph.facebook.com/v20.0/\${sessionId}\`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                                                'file_offset': '0'
                                            },
                                            body: Buffer.from(mediaBuffer)
                                        });
                                        const uploadData = await uploadRes.json();
                                        if (uploadData.h) {
                                            console.log("[Meta Template] Got upload handle:", uploadData.h);
                                            comp.example.header_handle = [uploadData.h];
                                            delete comp.example.header_url;
                                        }
                                    } else {
                                        console.error("[Meta Template] Failed to get session ID:", sessionData);
                                    }
                                } else {
                                    console.error("[Meta Template] Failed to get App ID from token:", debugData);
                                }
                            } catch (e) {
                                console.error("[Meta Template] Error uploading media example:", e.message);
                            }
                        }
                    }
                }
            }
        }

        const payload = {
            name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            language: language || 'en',
            category: category || 'MARKETING',
            
            components: components
        };`;

    if (srv.includes(targetCreate)) {
        srv = srv.replace(targetCreate, replacementCreate);
        fs.writeFileSync('/var/www/wa-api/server.cjs', srv);
        console.log("Patched server.cjs POST /create");
    }

    const targetEdit = `        const url = \`https://graph.facebook.com/v20.0/\${req.params.templateId}\`;
        const fetchRes = await fetch(url, { 
            method: 'POST',
            headers: { 
                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ components })
        });`;
        
    const replacementEdit = `        for (let comp of components) {
            if (comp.type === 'HEADER' && comp.format && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(comp.format)) {
                if (comp.example && (comp.example.header_handle || comp.example.header_url)) {
                    const urlArr = comp.example.header_handle || comp.example.header_url;
                    if (urlArr && urlArr.length > 0) {
                        const sampleUrl = urlArr[0];
                        if (sampleUrl && sampleUrl.startsWith('http')) {
                            try {
                                console.log("[Meta Template] Downloading example media from:", sampleUrl);
                                const debugRes = await fetch(\`https://graph.facebook.com/v20.0/debug_token?input_token=\${inst.meta_access_token}&access_token=\${inst.meta_access_token}\`);
                                const debugData = await debugRes.json();
                                const appId = debugData.data?.app_id;
                                
                                if (appId) {
                                    const mediaRes = await fetch(sampleUrl);
                                    const mediaBuffer = await mediaRes.arrayBuffer();
                                    const fileLength = mediaBuffer.byteLength;
                                    const mimeType = mediaRes.headers.get('content-type') || 'image/jpeg';
                                    
                                    const sessionRes = await fetch(\`https://graph.facebook.com/v20.0/\${appId}/uploads?file_length=\${fileLength}&file_type=\${mimeType}\`, {
                                        method: 'POST',
                                        headers: { 'Authorization': \`Bearer \${inst.meta_access_token}\` }
                                    });
                                    const sessionData = await sessionRes.json();
                                    const sessionId = sessionData.id;
                                    
                                    if (sessionId) {
                                        const uploadRes = await fetch(\`https://graph.facebook.com/v20.0/\${sessionId}\`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                                                'file_offset': '0'
                                            },
                                            body: Buffer.from(mediaBuffer)
                                        });
                                        const uploadData = await uploadRes.json();
                                        if (uploadData.h) {
                                            comp.example.header_handle = [uploadData.h];
                                            delete comp.example.header_url;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("[Meta Template] Error uploading media example:", e.message);
                            }
                        }
                    }
                }
            }
        }

        const url = \`https://graph.facebook.com/v20.0/\${req.params.templateId}\`;
        const fetchRes = await fetch(url, { 
            method: 'POST',
            headers: { 
                'Authorization': \`Bearer \${inst.meta_access_token}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ components })
        });`;

    if (srv.includes(targetEdit)) {
        srv = srv.replace(targetEdit, replacementEdit);
        fs.writeFileSync('/var/www/wa-api/server.cjs', srv);
        console.log("Patched server.cjs POST /edit");
    }

} catch (e) {
    console.error(e.message);
}
JS_EOF

node patch_template_media.js
pm2 restart all
