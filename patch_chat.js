const fs = require('fs');

let ui = fs.readFileSync('components/ChatInterface.tsx', 'utf8');

// Add refs inside ChatInterface:
const refTarget = `  const socketRef = useRef<Socket | null>(null);`;
const refReplacement = `  const socketRef = useRef<Socket | null>(null);
  const selectedInstanceIdRef = useRef(selectedInstanceId);
  const selectedSessionRef = useRef(selectedSession);
  
  useEffect(() => { selectedInstanceIdRef.current = selectedInstanceId; }, [selectedInstanceId]);
  useEffect(() => { selectedSessionRef.current = selectedSession; }, [selectedSession]);`;
if (ui.includes(refTarget)) {
    ui = ui.replace(refTarget, refReplacement);
    console.log("Patched refs");
}

// Modify socket setup
const socketTarget = `  // Socket.io setup
  useEffect(() => {
    const socket = io(apiBase);
    socketRef.current = socket;

    socket.on('new_message', (msg: ChatMessage) => {
      if (msg.instanceId === selectedInstanceId) {
        // Update messages if this is the active chat
        if (selectedSession && msg.remoteJid === selectedSession.remoteJid) {
          setMessages(prev => [...prev, msg]);
        }
        
        // Update sessions list
        setSessions(prev => {
          const existing = prev.find(s => s.remoteJid === msg.remoteJid);
          if (existing) {
            return [
              { ...existing, lastMessage: msg, unreadCount: selectedSession?.remoteJid === msg.remoteJid ? 0 : existing.unreadCount + 1 },
              ...prev.filter(s => s.remoteJid !== msg.remoteJid)
            ];
          } else {
            return [{ remoteJid: msg.remoteJid, lastMessage: msg, unreadCount: 1 }, ...prev];
          }
        });
      }
    });

    socket.on('message_status', (data: { msgId: string, status: 'sent' | 'delivered' | 'read', remoteJid: string }) => {
        setMessages(prev => prev.map(m => m.id === data.msgId ? { ...m, status: data.status } : m));
    });

    socket.on('presence_update', (data: { instanceId: string, remoteJid: string, userJid: string, status: string }) => {
        if (data.instanceId === selectedInstanceId) {
            if (data.status === 'composing' || data.status === 'recording') {
                setTypingStatus(prev => ({ ...prev, [data.remoteJid]: true }));
                setTimeout(() => {
                    setTypingStatus(prev => ({ ...prev, [data.remoteJid]: false }));
                }, 5000); // Auto-clear after 5s if no update
            } else {
                setTypingStatus(prev => ({ ...prev, [data.remoteJid]: false }));
            }
            
            if (data.status === 'available') {
                setPresenceStatus(prev => ({ ...prev, [data.remoteJid]: 'online' }));
            } else {
                setPresenceStatus(prev => ({ ...prev, [data.remoteJid]: 'offline' }));
            }
        }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedInstanceId, selectedSession, apiBase]);`;

const socketReplacement = `  // Socket.io setup
  useEffect(() => {
    const socket = io(apiBase);
    socketRef.current = socket;

    socket.on('new_message', (msg: ChatMessage) => {
      const currentInstanceId = selectedInstanceIdRef.current;
      const currentSession = selectedSessionRef.current;
      
      if (msg.instanceId === currentInstanceId) {
        // Update messages if this is the active chat
        if (currentSession && msg.remoteJid === currentSession.remoteJid) {
          setMessages(prev => [...prev, msg]);
        }
        
        // Update sessions list
        setSessions(prev => {
          const existing = prev.find(s => s.remoteJid === msg.remoteJid);
          if (existing) {
            return [
              { ...existing, lastMessage: msg, unreadCount: (currentSession?.remoteJid === msg.remoteJid) ? 0 : (existing.unreadCount || 0) + 1 },
              ...prev.filter(s => s.remoteJid !== msg.remoteJid)
            ];
          } else {
            return [{ remoteJid: msg.remoteJid, lastMessage: msg, unreadCount: 1 }, ...prev];
          }
        });
      }
    });

    socket.on('message_status', (data: { msgId: string, status: 'sent' | 'delivered' | 'read', remoteJid: string }) => {
        setMessages(prev => prev.map(m => m.id === data.msgId ? { ...m, status: data.status } : m));
    });

    socket.on('presence_update', (data: { instanceId: string, remoteJid: string, userJid: string, status: string }) => {
        const currentInstanceId = selectedInstanceIdRef.current;
        if (data.instanceId === currentInstanceId) {
            if (data.status === 'composing' || data.status === 'recording') {
                setTypingStatus(prev => ({ ...prev, [data.remoteJid]: true }));
                setTimeout(() => {
                    setTypingStatus(prev => ({ ...prev, [data.remoteJid]: false }));
                }, 5000); // Auto-clear after 5s if no update
            } else {
                setTypingStatus(prev => ({ ...prev, [data.remoteJid]: false }));
            }
            
            if (data.status === 'available') {
                setPresenceStatus(prev => ({ ...prev, [data.remoteJid]: 'online' }));
            } else {
                setPresenceStatus(prev => ({ ...prev, [data.remoteJid]: 'offline' }));
            }
        }
    });

    return () => {
      socket.disconnect();
    };
  }, [apiBase]);`;
  
if (ui.includes(socketTarget)) {
    ui = ui.replace(socketTarget, socketReplacement);
    console.log("Patched socket logic");
} else {
    console.log("Failed to find socket target");
}

fs.writeFileSync('components/ChatInterface.tsx', ui);
