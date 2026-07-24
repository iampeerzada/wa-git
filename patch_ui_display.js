const fs = require('fs');
let ui = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

const targetDisplay = `<span className="font-semibold text-lg">"{a.keyword}"</span>`;
const newDisplay = `<span className="font-semibold text-lg">{a.match_type === 'welcome' ? "Welcome Message" : \`"\${a.keyword}"\`}</span>`;

ui = ui.replace(targetDisplay, newDisplay);

fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', ui);
console.log("Patched UI Display");
