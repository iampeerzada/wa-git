const fs = require('fs');

let ui = fs.readFileSync('components/ChatInterface.tsx', 'utf8');

const targetSelect = `  const scrollToBottom = () => {`;
const replaceSelect = `  const handleSelectSession = async (session: ChatSession) => {
    setSelectedSession(session);
    if (session.unreadCount > 0) {
      try {
        await fetch(\`\${apiBase}/api/chat/messages/\${selectedInstanceId}/\${session.remoteJid}/read\`, {
          method: 'POST',
          headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
        });
        setSessions(prev => prev.map(s => s.remoteJid === session.remoteJid ? { ...s, unreadCount: 0 } : s));
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  };

  const scrollToBottom = () => {`;

if (ui.includes(targetSelect)) {
    ui = ui.replace(targetSelect, replaceSelect);
    console.log("Patched handleSelectSession");
}

const targetOnClick = `onClick={() => setSelectedSession(session)}`;
const replaceOnClick = `onClick={() => handleSelectSession(session)}`;
if (ui.includes(targetOnClick)) {
    ui = ui.replace(targetOnClick, replaceOnClick);
    console.log("Patched onClick");
}

fs.writeFileSync('components/ChatInterface.tsx', ui);
