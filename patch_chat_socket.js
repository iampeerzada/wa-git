const fs = require('fs');

let ui = fs.readFileSync('components/ChatInterface.tsx', 'utf8');

const targetNewMessage = `      if (msg.instanceId === currentInstanceId) {
        // Update messages if this is the active chat
        if (currentSession && msg.remoteJid === currentSession.remoteJid) {
          setMessages(prev => [...prev, msg]);
        }`;

const replaceNewMessage = `      if (msg.instanceId === currentInstanceId) {
        // Update messages if this is the active chat
        if (currentSession && msg.remoteJid === currentSession.remoteJid) {
          setMessages(prev => [...prev, msg]);
          if (!msg.fromMe) {
            fetch(\`\${apiBase}/api/chat/messages/\${currentInstanceId}/\${currentSession.remoteJid}/read\`, {
              method: 'POST',
              headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
            }).catch(e => console.error('Failed to mark incoming message as read', e));
          }
        }`;

if (ui.includes(targetNewMessage)) {
    ui = ui.replace(targetNewMessage, replaceNewMessage);
    fs.writeFileSync('components/ChatInterface.tsx', ui);
    console.log("Patched chat socket for mark read");
} else {
    console.log("Failed to find target");
}
