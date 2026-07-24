const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const oldTextLogic = `                                    if (executionNode.reply_type === 'text') {
                                        msgData.type = 'text';
                                        msgData.text = { body: executionNode.text_content };
                                    }`;

const newTextLogic = `                                    if (executionNode.reply_type === 'text') {
                                        let hasButtons = false;
                                        let opts = [];
                                        try {
                                            if (typeof executionNode.options === 'string') {
                                                opts = JSON.parse(executionNode.options);
                                            } else if (Array.isArray(executionNode.options)) {
                                                opts = executionNode.options;
                                            }
                                        } catch (e) {}

                                        if (opts.length > 0) {
                                            hasButtons = true;
                                            msgData.type = 'interactive';
                                            msgData.interactive = {
                                                type: 'button',
                                                body: { text: executionNode.text_content },
                                                action: {
                                                    buttons: opts.map((b, i) => ({
                                                        type: 'reply',
                                                        reply: { id: \`btn_\${i}\`, title: b.text || b.title || String(b).substring(0,20) }
                                                    }))
                                                }
                                            };
                                            if (executionNode.media_url) {
                                                let hType = 'image';
                                                if (executionNode.media_url.endsWith('.pdf')) hType = 'document';
                                                else if (executionNode.media_url.endsWith('.mp4')) hType = 'video';
                                                msgData.interactive.header = {
                                                    type: hType,
                                                    [hType]: { link: executionNode.media_url }
                                                };
                                            }
                                        }

                                        if (!hasButtons) {
                                            if (executionNode.media_url) {
                                                let pType = 'image';
                                                if (executionNode.media_url.endsWith('.pdf')) pType = 'document';
                                                else if (executionNode.media_url.endsWith('.mp4')) pType = 'video';
                                                msgData.type = pType;
                                                msgData[pType] = { link: executionNode.media_url, caption: executionNode.text_content };
                                            } else {
                                                msgData.type = 'text';
                                                msgData.text = { body: executionNode.text_content };
                                            }
                                        }
                                    }`;

code = code.replace(oldTextLogic, newTextLogic);
fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Patched server interactive");
