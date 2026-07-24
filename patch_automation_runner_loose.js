const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

server = server.replace(
    \`const childNode = autoRes.rows.find(r => r.parent_id === currentNodeId && (r.keyword || '').toLowerCase().trim() === msgText);\`,
    \`const childNode = autoRes.rows.find(r => r.parent_id == currentNodeId && (r.keyword || '').toLowerCase().trim() === msgText);\`
);

server = server.replace(
    \`const parentNode = autoRes.rows.find(r => r.id === matchedNode.parent_id);\`,
    \`const parentNode = autoRes.rows.find(r => r.id == matchedNode.parent_id);\`
);

server = server.replace(
    \`const grandParent = autoRes.rows.find(r => r.id === parentNode.parent_id);\`,
    \`const grandParent = autoRes.rows.find(r => r.id == parentNode.parent_id);\`
);

fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Patched loose equality for parent_id");
