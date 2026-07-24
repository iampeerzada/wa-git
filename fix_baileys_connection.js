const fs = require('fs');
let code = fs.readFileSync('/app/applet/server.cjs', 'utf8');

const oldConfig = `        const sock = makeWASocket({
            version,
            logger: pino({ level: 'info' }),
            auth: state,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 5000,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: true,
            getMessage
        });`;

const newConfig = `        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            getMessage
        });`;

// Fallback to replacing standard browser definition as well if the previous patch didn't stick
const oldConfig2 = `        const sock = makeWASocket({
            version,
            logger: pino({ level: 'info' }),
            auth: state,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 5000,
            browser: require('@whiskeysockets/baileys').Browsers.macOS('Desktop'),
            syncFullHistory: true,
            getMessage
        });`;

code = code.replace(oldConfig, newConfig).replace(oldConfig2, newConfig);
fs.writeFileSync('/app/applet/server.cjs', code);
console.log("Patched makeWASocket config");
