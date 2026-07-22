const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const msg = generateWAMessageFromContent("123@s.whatsapp.net", { viewOnceMessage: { message: { text: "Hello" } } }, {});
console.log(JSON.stringify(msg, null, 2));
