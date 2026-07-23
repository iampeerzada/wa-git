const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
async function start() {
    const { state } = await useMultiFileAuthState('./session-test-full');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
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
            getMessage: async () => { return { conversation: '' } }
    });
    sock.ev.on('connection.update', (update) => {
        if (update.qr) console.log('QR emitted:', update.qr.substring(0, 20) + '...');
        if (update.connection === 'close') process.exit(0);
    });
}
start();
