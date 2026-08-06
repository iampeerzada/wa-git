const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
    /version\s*:\s*'v20\.0'/g,
    "version    : 'v26.0'"
);

fs.writeFileSync('index.html', code);
