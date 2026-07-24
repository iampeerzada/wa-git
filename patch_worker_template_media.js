const fs = require('fs');
let code = fs.readFileSync('/app/applet/queue-worker.js', 'utf8');

const oldLogic = `                // If a template is provided in the job data, use it!
                if (options?.templateName) {
                    msgData.type = "template";
                    msgData.template = {
                        name: options.templateName,
                        language: { code: options.templateLanguage || 'en' }
                    };
                    delete msgData.text;
                } else if (mediaUrl) {
                    msgData.type = mediaType || "image";
                    msgData[msgData.type] = { link: mediaUrl };
                    if (finalMessage) msgData[msgData.type].caption = finalMessage;
                    delete msgData.text;
                }`;

const newLogic = `                // If a template is provided in the job data, use it!
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
                    delete msgData.text;
                } else if (mediaUrl) {
                    msgData.type = mediaType || "image";
                    msgData[msgData.type] = { link: mediaUrl };
                    if (finalMessage) msgData[msgData.type].caption = finalMessage;
                    delete msgData.text;
                }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('/app/applet/queue-worker.js', code);
console.log("Patched queue-worker to support media with templates");
