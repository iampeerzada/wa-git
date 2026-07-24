const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

// The try { is exactly on line 689. Let's find it.
// At line 689, it says "try {" right above "const response = await ai.models.generateContent({"
server = server.replace(/\s*try \{\s*const response = await ai\.models\.generateContent\(\{/, '\n                            const response = await ai.models.generateContent({');

// Now we need to find the catch block at the bottom and remove it.
// We know it was appended after `.catch(e => console.error('[Meta AI Reply Send Error]', e.message));\n                        }`
// Let's replace that specific catch block.
const catchBlockRegex = /\s*\} catch \(aiError\) \{[\s\S]*?timestamp: new Date\(\)\.toISOString\(\),\s*status: 'failed'\s*\}\);\s*\}/;
server = server.replace(catchBlockRegex, '');

fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Fixed syntax error");
