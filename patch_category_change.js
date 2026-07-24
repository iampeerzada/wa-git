const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

server = server.replace(/allow_category_change: true,/g, '');
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Removed allow_category_change");
