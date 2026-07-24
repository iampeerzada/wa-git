const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /const data = await response\.json\(\);/;
const match = regex.exec(server);
if (match) {
    server = server.replace(regex, `const data = await response.json();
        console.log("[Meta Template Create Payload]", JSON.stringify(payload, null, 2));
        console.log("[Meta Template Create Response]", JSON.stringify(data, null, 2));`);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched server.cjs template logging");
} else {
    console.log("Could not find server.cjs template logging insertion point");
}
