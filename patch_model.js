const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

server = server.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');

fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched model to gemini-1.5-flash");
