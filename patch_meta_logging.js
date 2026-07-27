const fs = require('fs');
let code = fs.readFileSync('/app/applet/queue-worker.js', 'utf8');

const targetBlock = `                const metaRes = await fetch(\`https://graph.facebook.com/v20.0/\${instance.metaPhoneNumberId}/messages\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${instance.metaAccessToken}\`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msgData)
                });
                
                const metaJson = await metaRes.json();
                if (!metaRes.ok || metaJson.error) {
                    throw new Error(metaJson.error?.message || 'Meta API Error');
                }
                
                const msgId = metaJson.messages?.[0]?.id || \`meta_\${Date.now()}\`;
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'delivered', msgId, finalMessage || options?.templateName]
                );`;

const replacement = `                console.log(\`[Meta API] Sending message to \${number} via \${instance.metaPhoneNumberId}\`);
                console.log(\`[Meta API] Request Payload: \${JSON.stringify(msgData)}\`);
                const metaRes = await fetch(\`https://graph.facebook.com/v20.0/\${instance.metaPhoneNumberId}/messages\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${instance.metaAccessToken}\`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(msgData)
                });
                
                const metaJson = await metaRes.json();
                console.log(\`[Meta API] Response: \${JSON.stringify(metaJson)}\`);
                if (!metaRes.ok || metaJson.error) {
                    console.error(\`[Meta API] Error: \${JSON.stringify(metaJson.error)}\`);
                    throw new Error(metaJson.error?.message || 'Meta API Error');
                }
                
                const msgId = metaJson.messages?.[0]?.id || \`meta_\${Date.now()}\`;
                await pool.query(
                    'INSERT INTO message_logs (user_id, instance_id, recipient, status, message_id, content) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, instanceId, number, 'sent', msgId, finalMessage || options?.templateName]
                );`;

if (code.includes(targetBlock)) {
    code = code.replace(targetBlock, replacement);
    fs.writeFileSync('/app/applet/queue-worker.js', code);
    console.log("Patched queue-worker.js with Meta logging");
} else {
    console.log("Target block not found in queue-worker.js");
}
