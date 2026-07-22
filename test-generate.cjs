const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

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

const msg = generateWAMessageFromContent("123@s.whatsapp.net", content, {});
console.log(JSON.stringify(msg, null, 2));
