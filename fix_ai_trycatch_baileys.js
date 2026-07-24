const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

// There are TWO occurrences of `const response = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: prompt });`
// We fixed the Meta one. Now we need to fix the Baileys one.

const regex = /const response = await ai\.models\.generateContent\(\{\s*model: 'gemini-1\.5-flash',\s*contents: prompt\s*\}\);/;
const match = regex.exec(server);

if (match) {
    server = server.replace(regex, `let response;
                            try {
                                response = await ai.models.generateContent({
                                    model: 'gemini-1.5-flash',
                                    contents: prompt
                                });
                            } catch (aiError) {
                                console.error('[Baileys AI Generation Error]', aiError.message);
                                response = { text: "System: AI is currently unavailable or API key is invalid" };
                            }`);
    fs.writeFileSync('/app/applet/server.cjs', server);
    console.log("Fixed Baileys AI try-catch");
} else {
    console.log("Could not find Baileys AI generation call");
}
