const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

code = code.replace(
    `console.log(\`[Instance \${instanceId}] Connection update:\`, { connection, qr: qr ? 'yes' : 'no', error: lastDisconnect?.error?.message });`,
    `console.log(\`[Instance \${instanceId}] Connection update:\`, { connection, qr: qr ? 'yes' : 'no', error: lastDisconnect?.error?.message });
    fs.appendFileSync('baileys.log', \`[Instance \${instanceId}] update: \${JSON.stringify({ connection, qr: qr ? 'yes' : 'no', error: lastDisconnect?.error?.message })}\\n\`);`
);

fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Patched server for baileys logging");
