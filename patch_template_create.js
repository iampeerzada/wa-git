const fs = require('fs');
let code = fs.readFileSync('components/Templates.tsx', 'utf8');
code = code.replace(/header_handle: \[sampleUrl\]/g, "header_url: [sampleUrl]");
fs.writeFileSync('components/Templates.tsx', code);
