const { default: makeWASocket, useMultiFileAuthState, proto } = require('@whiskeysockets/baileys');

async function test() {
    const { state, saveCreds } = await useMultiFileAuthState('test_auth');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    
    const interactiveMessage = {
      body: proto.Message.InteractiveMessage.Body.create({ text: "Hello" }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [],
        messageVersion: 1
      })
    };
    
    const content = {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMessage)
        }
      }
    };
    
    // We mock relayMessage to see if it reaches there
    sock.relayMessage = async (jid, message, opts) => {
        console.log("relayMessage called with message:", JSON.stringify(message, null, 2));
    };
    
    await sock.sendMessage("123@s.whatsapp.net", content);
    console.log("Success");
    process.exit(0);
}
test();
