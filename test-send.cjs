const { default: makeWASocket, useMultiFileAuthState, proto } = require('@whiskeysockets/baileys');

async function test() {
    const { state, saveCreds } = await useMultiFileAuthState(`test_auth`);
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    const content = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    body: { text: "Hello" },
                    nativeFlowMessage: {}
                }
            }
        }
    };
    try {
        await sock.sendMessage("123@s.whatsapp.net", content);
        console.log("Success");
    } catch (e) {
        console.log("Error:", e.message);
    }
    process.exit(0);
}
test();
