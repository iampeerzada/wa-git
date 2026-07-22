const { default: makeWASocket, proto } = require('@whiskeysockets/baileys');

async function test() {
    const interactiveMessage = {
      body: proto.Message.InteractiveMessage.Body.create({ text: "Hello" }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: []
      })
    };
    const content = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
            }
        }
    };
    
    // We just want to see if sendMessage would throw Error Invalid media type
    try {
        const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
        const msg = await generateWAMessageFromContent("123@s.whatsapp.net", content, {});
        console.log("Success", !!msg);
    } catch(e) {
        console.error(e);
    }
}
test();
