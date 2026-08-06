const fs = require('fs');
let code = fs.readFileSync('components/ProvisionInstanceModal.tsx', 'utf8');

code = code.replace(
    /appId:\s*import\.meta\.env\.VITE_META_APP_ID\s*\|\|\s*'[^']+'/,
    "appId: '4126835067540230'"
);

code = code.replace(
    /config_id:\s*import\.meta\.env\.VITE_META_CONFIG_ID\s*\|\|\s*'[^']+'/,
    "config_id: '1661168568318692'"
);

fs.writeFileSync('components/ProvisionInstanceModal.tsx', code);
