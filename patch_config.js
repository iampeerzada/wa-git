const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

code = code.replace(
    "config_id: import.meta.env.VITE_META_CONFIG_ID || '1551670126364630'",
    "config_id: import.meta.env.VITE_META_CONFIG_ID || '1661168568318692'"
);

fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
