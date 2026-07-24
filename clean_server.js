const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

code = code.replace(
    /    fs\.appendFileSync\('baileys\.log'.*\n/g,
    ''
);

fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Cleaned up server.cjs");
