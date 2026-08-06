const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

code = code.replace(
    "response_type: 'code,token',",
    "response_type: 'code',"
);

fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
