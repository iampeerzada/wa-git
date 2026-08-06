const fs = require('fs');
console.log(fs.readFileSync('components/Sidebar.tsx', 'utf8').indexOf('Switch User Role'));
