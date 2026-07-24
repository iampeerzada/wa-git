const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

code = code.replace(
    /browser: require\('@whiskeysockets\/baileys'\)\.Browsers\.macOS\('Desktop'\),/g,
    `browser: ['Ubuntu', 'Chrome', '20.0.04'],`
);

fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Patched browser config in server.cjs");
