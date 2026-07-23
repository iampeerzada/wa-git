const { fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
console.log('Fetching...');
fetchLatestBaileysVersion().then(v => console.log(v)).catch(e => console.error(e));
