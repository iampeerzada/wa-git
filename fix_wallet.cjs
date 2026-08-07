const fs = require('fs');

let code = fs.readFileSync('components/HeaderWallet.tsx', 'utf8');
code = code.replace(/\\`Bearer/g, '`Bearer');
code = code.replace(/\\`/g, '`');
fs.writeFileSync('components/HeaderWallet.tsx', code);
