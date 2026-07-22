const { proto } = require('@whiskeysockets/baileys');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
      interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage)
    }
  }
};

const msg = generateWAMessageFromContent("123@s.whatsapp.net", content, { userJid: "123@s.whatsapp.net" });
console.log(JSON.stringify(msg.message, null, 2));
