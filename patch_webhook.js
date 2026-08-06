const fs = require('fs');

let srv = fs.readFileSync('server.cjs', 'utf8');

const targetWebhook = `            if (msg.interactive) {
                text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || text;
            } else if (msg.type === 'button') {
                text = msg.button?.text || msg.button?.payload || text;
            } else if (msg.type === 'image') {
                text = msg.image?.caption || '[Image]';
                mediaType = 'image';
                mediaUrl = msg.image?.id; // Storing ID for now, proper fetch requires API call
            } else if (msg.type === 'video') {
                text = msg.video?.caption || '[Video]';
                mediaType = 'video';
                mediaUrl = msg.video?.id;
            } else if (msg.type === 'document') {
                text = msg.document?.caption || msg.document?.filename || '[Document]';
                mediaType = 'document';
                mediaUrl = msg.document?.id;
            } else if (msg.type === 'audio') {
                text = '[Audio]';
                mediaType = 'audio';
                mediaUrl = msg.audio?.id;
            }
            
            const msgId = msg.id;
            const fromMe = false;
            const timestamp = msg.timestamp;
            
            try {
                const instanceRes = await pool.query('SELECT id, ai_enabled, webhook_url, meta_access_token FROM instances WHERE meta_phone_number_id = $1 LIMIT 1', [phoneNumberId]);
                if (instanceRes.rows.length > 0) {
                    const instance = instanceRes.rows[0];
                    const instanceId = instance.id;`;

const replacementWebhook = `            if (msg.interactive) {
                text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || text;
            } else if (msg.type === 'button') {
                text = msg.button?.text || msg.button?.payload || text;
            } else if (msg.type === 'image') {
                text = msg.image?.caption || '[Image]';
                mediaType = 'image';
                mediaUrl = msg.image?.id;
            } else if (msg.type === 'video') {
                text = msg.video?.caption || '[Video]';
                mediaType = 'video';
                mediaUrl = msg.video?.id;
            } else if (msg.type === 'document') {
                text = msg.document?.caption || msg.document?.filename || '[Document]';
                mediaType = 'document';
                mediaUrl = msg.document?.id;
            } else if (msg.type === 'audio') {
                text = '[Audio]';
                mediaType = 'audio';
                mediaUrl = msg.audio?.id;
            }
            
            const msgId = msg.id;
            const fromMe = false;
            const timestamp = msg.timestamp;
            
            try {
                const instanceRes = await pool.query('SELECT id, ai_enabled, webhook_url, meta_access_token FROM instances WHERE meta_phone_number_id = $1 LIMIT 1', [phoneNumberId]);
                if (instanceRes.rows.length > 0) {
                    const instance = instanceRes.rows[0];
                    const instanceId = instance.id;
                    
                    if (mediaUrl) {
                        mediaUrl = \`/api/meta/media/\${instanceId}/\${mediaUrl}\`;
                    }`;

if (srv.includes(targetWebhook)) {
    srv = srv.replace(targetWebhook, replacementWebhook);
    console.log("Patched webhook media URL");
} else {
    console.log("Could not find webhook media URL target");
}

fs.writeFileSync('server.cjs', srv);
