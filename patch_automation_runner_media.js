const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const target = `                                    } else if (executionNode.reply_type === 'template') {
                                        msgData.type = 'template';
                                        msgData.template = {
                                            name: executionNode.template_name,
                                            language: { code: executionNode.template_language }
                                        };
                                    }`;

const replace = `                                    } else if (executionNode.reply_type === 'template') {
                                        msgData.type = 'template';
                                        msgData.template = {
                                            name: executionNode.template_name,
                                            language: { code: executionNode.template_language }
                                        };
                                        if (executionNode.media_url) {
                                            let pType = 'image';
                                            if (executionNode.media_url.endsWith('.pdf')) pType = 'document';
                                            else if (executionNode.media_url.endsWith('.mp4')) pType = 'video';
                                            
                                            msgData.template.components = [
                                                {
                                                    type: "header",
                                                    parameters: [
                                                        {
                                                            type: pType,
                                                            [pType]: {
                                                                link: executionNode.media_url
                                                            }
                                                        }
                                                    ]
                                                }
                                            ];
                                        }
                                    }`;

server = server.replace(target, replace);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched server to support media in template automation");
