const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
async function run() {
  const { state } = await useMultiFileAuthState('test_auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  console.log(sock.patchMessageBeforeSending ? sock.patchMessageBeforeSending.toString() : "No patchMessageBeforeSending");
  process.exit(0);
}
run();
