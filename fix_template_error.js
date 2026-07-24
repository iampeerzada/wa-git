const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /if \(\!response\.ok \|\| data\.error\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ error: data\.error\?\.message \|\| 'Meta API error' \}\);[\s\S]*?\}/;
const match = regex.exec(server);
if (match) {
    server = server.replace(regex, `if (!response.ok || data.error) {
            let errMsg = data.error?.error_user_msg || data.error?.message || 'Meta API error';
            if (data.error?.error_data) {
                errMsg += " Details: " + JSON.stringify(data.error.error_data);
            }
            return res.status(400).json({ error: errMsg });
        }`);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs error message");
} else {
    console.log("Could not find server.cjs error handler");
}

let ui = fs.readFileSync('/app/applet/components/Templates.tsx', 'utf8');
ui = ui.replace(/header_text: \[headerVars\.map\(v => examples\.header\[v\]\)\]/, 'header_text: headerVars.map(v => examples.header[v])');
ui = ui.replace(/name\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9_\]\/g, '_'\)/g, 'name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_")');
fs.writeFileSync('/app/applet/components/Templates.tsx', ui);
console.log("Patched Templates.tsx header example and name validation");
