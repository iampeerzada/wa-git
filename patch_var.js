const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

server = server.replace(`let isFirstMessage = null;
                            
                            // Tree-based Automation Logic`, `// Tree-based Automation Logic`);

fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched variable declaration");
