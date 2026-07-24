const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const regex = /if \(msg\.interactive\) \{[\s\S]*?\} else if \(msg\.type === 'image'\) \{/;
const match = regex.exec(server);
if (match) {
    server = server.replace(regex, `if (msg.interactive) {
                text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || text;
            } else if (msg.type === 'button') {
                text = msg.button?.text || msg.button?.payload || text;
            } else if (msg.type === 'image') {`);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Patched meta button reply");
} else {
    console.log("Could not find meta button reply block");
}
