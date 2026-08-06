const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

code = code.replace("appId: '4126835067540230'", "appId: import.meta.env.VITE_META_APP_ID || '4126835067540230'");
code = code.replace("config_id: '1551670126364630'", "config_id: import.meta.env.VITE_META_CONFIG_ID || '1551670126364630'");

fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
