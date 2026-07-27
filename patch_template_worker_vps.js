const fs = require('fs');

try {
    let qw = fs.readFileSync('/var/www/wa-api/queue-worker.js', 'utf8');
    
    const targetBlock = `                // If a template is provided in the job data, use it!
                if (options?.templateName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: options.templateName,
                        language: { code: options.templateLanguage || 'en' }
                    };
                    if (mediaUrl) {
                        let pType = 'image';
                        if (mediaUrl.endsWith('.pdf')) pType = 'document';
                        else if (mediaUrl.endsWith('.mp4')) pType = 'video';
                        else if (mediaType) pType = mediaType;
                           
                        msgData.template.components = [
                            {
                                type: "header",
                                parameters: [
                                    {
                                        type: pType,
                                        [pType]: { link: mediaUrl }
                                    }
                                ]
                            }
                        ];
                    }
                    delete msgData.text;`;

    const replacement = `                // If a template is provided in the job data, use it!
                if (options?.templateName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: options.templateName,
                        language: { code: options.templateLanguage || 'en' }
                    };
                    
                    let componentsPayload = [];
                    
                    try {
                        const tplRes = await pool.query('SELECT components FROM meta_templates WHERE instance_id = $1 AND name = $2', [instanceId, options.templateName]);
                        if (tplRes.rows.length > 0) {
                            const dbComponents = tplRes.rows[0].components || [];
                            let userVars = [];
                            if (finalMessage && finalMessage.includes('|')) {
                                userVars = finalMessage.split('|').map(s => s.trim()).slice(1);
                            }
                            
                            let varIndex = 0;
                            
                            for (const c of dbComponents) {
                                if (c.type === 'HEADER' && (c.format === 'IMAGE' || c.format === 'VIDEO' || c.format === 'DOCUMENT')) {
                                    if (mediaUrl) {
                                        let pType = 'image';
                                        if (c.format === 'VIDEO' || mediaUrl.endsWith('.mp4')) pType = 'video';
                                        else if (c.format === 'DOCUMENT' || mediaUrl.endsWith('.pdf')) pType = 'document';
                                        
                                        componentsPayload.push({
                                            type: "header",
                                            parameters: [
                                                { type: pType, [pType]: { link: mediaUrl } }
                                            ]
                                        });
                                    }
                                } else if (c.type === 'BODY') {
                                    const matches = c.text ? c.text.match(/\\{\\{\\d+\\}\\}/g) : null;
                                    let count = 0;
                                    if (matches) {
                                        const uniqueParams = new Set(matches);
                                        count = uniqueParams.size;
                                    }
                                    
                                    if (count > 0) {
                                        const parameters = [];
                                        for (let i = 0; i < count; i++) {
                                            parameters.push({ type: "text", text: userVars[varIndex] || "-" });
                                            varIndex++;
                                        }
                                        componentsPayload.push({ type: "body", parameters });
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error("[Meta Template Build Error]", e.message);
                    }
                    
                    if (componentsPayload.length > 0) {
                        msgData.template.components = componentsPayload;
                    } else if (mediaUrl) {
                        let pType = 'image';
                        if (mediaUrl.endsWith('.pdf')) pType = 'document';
                        else if (mediaUrl.endsWith('.mp4')) pType = 'video';
                        else if (mediaType) pType = mediaType;
                           
                        msgData.template.components = [
                            {
                                type: "header",
                                parameters: [
                                    { type: pType, [pType]: { link: mediaUrl } }
                                ]
                            }
                        ];
                    }
                    delete msgData.text;`;

    if (qw.includes(targetBlock)) {
        qw = qw.replace(targetBlock, replacement);
        fs.writeFileSync('/var/www/wa-api/queue-worker.js', qw);
        console.log("Patched queue-worker.js successfully.");
    } else {
        console.log("Could not find target block in queue-worker.js. Already patched?");
    }
} catch (e) { console.error("Error", e.message); }
