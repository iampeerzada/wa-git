const fs = require('fs');
let server = fs.readFileSync('/app/applet/server.cjs', 'utf8');

server = server.replace(
    /media = displayMediaUrl; \/\/ Update media for socket emit/,
    `` // just remove it, we will use displayMediaUrl in socket emit
);

// find the socket emit block
const emitStr = `        // Emit to Socket.io
        io.emit('new_message', {
            id: msgId,
            instanceId,
            remoteJid,
            fromMe: true,
            text: message,
            mediaUrl: media,
            mediaType: type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            quotedMsgId
        });`;

const newEmitStr = `        // Emit to Socket.io
        io.emit('new_message', {
            id: msgId,
            instanceId,
            remoteJid,
            fromMe: true,
            text: message,
            mediaUrl: displayMediaUrl,
            mediaType: type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            quotedMsgId
        });`;

server = server.replace(emitStr, newEmitStr);
fs.writeFileSync('/app/applet/server.cjs', server);
console.log("Fixed chat crash.");
