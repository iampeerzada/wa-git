const fs = require('fs');
let code = fs.readFileSync('/app/applet/App.tsx', 'utf8');

code = code.replace(
    `{activeTab === 'meta-templates' && <Templates instances={instances} currentUser={currentUser} apiBase={API_BASE} />}` ,
    `{activeTab === 'meta-templates' && <Templates instances={instances} currentUser={currentUser} apiBase={API_BASE} mediaAssets={mediaAssets} />}` 
);

code = code.replace(
    `{activeTab === 'meta-automations' && <MetaAutomations instances={instances} currentUser={currentUser} apiBase={API_BASE} />}` ,
    `{activeTab === 'meta-automations' && <MetaAutomations instances={instances} currentUser={currentUser} apiBase={API_BASE} mediaAssets={mediaAssets} />}` 
);

fs.writeFileSync('/app/applet/App.tsx', code);
console.log("Patched App.tsx for mediaAssets");
