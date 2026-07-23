import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, MoreVertical, Phone, Video, Smile, Paperclip, Check, CheckCheck, X, Tag, Plus, Trash2, Filter, LayoutTemplate, ArrowLeft } from 'lucide-react';
import { WhatsAppInstance, ChatMessage, ChatSession, User as AppUser, ChatLabel } from '../types';
import { io, Socket } from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ChatInterfaceProps {
  instances: WhatsAppInstance[];
  currentUser: AppUser;
  apiBase: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ instances, currentUser, apiBase }) => {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(instances[0]?.id || '');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
  const [presenceStatus, setPresenceStatus] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]); // Using any for simplicity, or import MessageTemplate
  
  // Label State
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'direct' | 'groups' | 'unread'>('all');
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#25D366');
  const [showChatLabelModal, setShowChatLabelModal] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Labels
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await fetch(`${apiBase}/api/labels`, {
          headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
        });
        if (res.ok) setLabels(await res.json());
      } catch (e) { console.error('Failed to fetch labels', e); }
    };
    fetchLabels();
  }, [currentUser, apiBase]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey },
        body: JSON.stringify({ name: newLabelName, color: newLabelColor })
      });
      if (res.ok) {
        const newLabel = await res.json();
        setLabels(prev => [newLabel, ...prev]);
        setNewLabelName('');
      }
    } catch (e) { console.error('Failed to create label', e); }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!confirm('Are you sure? This will remove the label from all chats.')) return;
    try {
      await fetch(`${apiBase}/api/labels/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      setLabels(prev => prev.filter(l => l.id !== id));
    } catch (e) { console.error('Failed to delete label', e); }
  };

  const toggleChatLabel = async (labelId: string) => {
    if (!selectedSession) return;
    const isApplied = selectedSession.labels?.some(l => l.id === labelId);
    const action = isApplied ? 'remove' : 'add';

    try {
      await fetch(`${apiBase}/api/chat/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey },
        body: JSON.stringify({ instanceId: selectedInstanceId, remoteJid: selectedSession.remoteJid, labelId, action })
      });

      // Optimistic Update
      const updatedLabels = isApplied 
        ? selectedSession.labels?.filter(l => l.id !== labelId) || []
        : [...(selectedSession.labels || []), labels.find(l => l.id === labelId)!];
      
      const updatedSession = { ...selectedSession, labels: updatedLabels };
      setSelectedSession(updatedSession);
      setSessions(prev => prev.map(s => s.remoteJid === selectedSession.remoteJid ? updatedSession : s));
    } catch (e) { console.error('Failed to toggle label', e); }
  };

  // Socket.io setup
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
  }, [selectedInstanceId, selectedSession, apiBase]);

  // Fetch Templates
  useEffect(() => {
      const saved = localStorage.getItem(`wa_tpls_${currentUser.id}`);
      if (saved) setTemplates(JSON.parse(saved));
  }, [currentUser.id]);

  // Fetch sessions
  useEffect(() => {
    if (!selectedInstanceId) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/chat/sessions/${selectedInstanceId}`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
          
          // Fetch profile info for each session
          data.forEach((session: ChatSession) => {
             fetchProfileInfo(session.remoteJid);
          });
        }
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      }
    };

    fetchSessions();
  }, [selectedInstanceId, currentUser, apiBase]);

  const [profileCache, setProfileCache] = useState<Record<string, { name?: string, imgUrl?: string }>>({});

  const fetchProfileInfo = async (jid: string) => {
      if (profileCache[jid]) return;
      
      try {
          const res = await fetch(`${apiBase}/api/chat/profile/${selectedInstanceId}/${jid}`, {
             headers: {
                'X-User-ID': currentUser.id,
                'X-API-Key': currentUser.apiKey
             }
          });
          if (res.ok) {
              const data = await res.json();
              setProfileCache(prev => ({ ...prev, [jid]: data }));
          }
      } catch (e) {
          // Ignore errors
      }
  };

  // Fetch messages for selected session
  useEffect(() => {
    if (!selectedInstanceId || !selectedSession) {
      setMessages([]);
      return;
    }
    
    fetchProfileInfo(selectedSession.remoteJid);

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/chat/messages/${selectedInstanceId}/${selectedSession.remoteJid}`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [selectedInstanceId, selectedSession, currentUser, apiBase]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedSession || !selectedInstanceId) return;

    const text = newMessage;
    const file = selectedFile;
    const fileUrl = previewUrl;
    const quoteId = replyingTo?.id;
    
    setNewMessage('');
    clearFile();
    setReplyingTo(null); // Clear reply state
    setShowEmojiPicker(false);

    try {
      // Use the direct chat endpoint for immediate sending (bypassing the bulk queue)
      const payload: any = {
        instanceId: selectedInstanceId,
        remoteJid: selectedSession.remoteJid, // Send full JID
        message: text,
        quotedMsgId: quoteId
      };

      if (file && fileUrl) {
        payload.media = fileUrl; // Base64 string
        payload.type = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 
                       file.type.startsWith('audio/') ? 'audio' : 'document';
      }

      const res = await fetch(`${apiBase}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error('Failed to send message');
      }
      // Note: The message will appear in the UI via the socket 'new_message' event
      // because Baileys emits messages.upsert for messages sent from the socket too.
    } catch (err) {
      console.error('Send error', err);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = !s.remoteJid.includes('status@broadcast') && // Hide status updates
    (s.remoteJid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.lastMessage?.text.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLabel = selectedLabelFilter ? s.labels?.some(l => l.id === selectedLabelFilter) : true;

    let matchesType = true;
    if (chatFilter === 'direct') matchesType = s.remoteJid.endsWith('@s.whatsapp.net');
    else if (chatFilter === 'groups') matchesType = s.remoteJid.endsWith('@g.us');
    else if (chatFilter === 'unread') matchesType = s.unreadCount > 0;

    return matchesSearch && matchesLabel && matchesType;
  });

  const formatTime = (timestamp: string) => {
    const dateStr = String(timestamp).trim();
    const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
    const date = new Date(utcDateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDisplayJid = (jid: string) => {
    if (!jid) return 'Unknown';
    
    // Handle Groups
    if (jid.includes('@g.us')) {
        return `Group: ${jid.split('@')[0]}`;
    }
    
    // Handle Broadcasts
    if (jid.includes('@broadcast')) {
        return 'Broadcast List';
    }
    
    // Handle Users (Standard JID or LID)
    const id = jid.split('@')[0].split(':')[0];
    
    // If it's a number, format it with +
    if (/^\d+$/.test(id)) {
        return `+${id}`;
    }
    
    return id;
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    msgs.forEach(msg => {
      const dateStr = String(msg.timestamp).trim();
      const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
      const date = new Date(utcDateStr).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex h-full bg-[#0b141a] overflow-hidden border-t border-gray-800">
      {/* Sidebar */}
      <div className={`w-full md:w-[380px] border-r border-gray-800 flex-col bg-[#111b21] ${selectedSession ? "hidden md:flex" : "flex"}`}>
        {/* Instance Selector */}
        <div className="p-4 border-b border-gray-800 space-y-3">
          <select
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-3 py-2 min-h-[40px] text-sm outline-none focus:ring-1 ring-[#25D366] "
          >
            <option value="">Select Instance</option>
            {instances.filter(i => i.status === 'open').map(i => (
              <option key={i.id} value={i.id}>{i.name} ({i.phoneNumber})</option>
            ))}
          </select>

          {/* Label Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Filter size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <select
                value={selectedLabelFilter}
                onChange={(e) => setSelectedLabelFilter(e.target.value)}
                className="w-full bg-[#202c33] text-gray-300 pl-9 pr-2 py-2 min-h-[36px] rounded-lg text-xs outline-none border border-gray-700 "
              >
                <option value="">All Chats</option>
                {labels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setShowLabelManager(!showLabelManager)}
              className="p-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700"
              title="Manage Labels"
            >
              <Tag size={14} />
            </button>
          </div>

          {/* Label Manager Popover */}
          {showLabelManager && (
            <div className="bg-[#202c33] p-3 rounded-lg border border-gray-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex gap-2">
                <input 
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="New Label Name"
                  className="flex-1 bg-[#111b21] border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                />
                <input 
                  type="color" 
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="w-8 h-full bg-transparent cursor-pointer rounded overflow-hidden"
                />
                <button onClick={handleCreateLabel} className="bg-[#25D366] text-[#0b141a] p-1.5 rounded hover:bg-[#128c7e]">
                  <Plus size={14} />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {labels.map(l => (
                  <div key={l.id} className="flex items-center justify-between text-xs text-gray-300 bg-[#111b21] p-1.5 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </div>
                    <button onClick={() => handleDeleteLabel(l.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#202c33] text-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none placeholder-gray-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-3 pb-3 overflow-x-auto no-scrollbar">
          {['all', 'unread', 'direct', 'groups'].map(filter => (
            <button
              key={filter}
              onClick={() => setChatFilter(filter as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                chatFilter === filter
                  ? 'bg-[#25D366] text-[#0b141a]'
                  : 'bg-[#202c33] text-gray-400 hover:bg-[#2a3942] hover:text-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No conversations found
            </div>
          ) : (
            filteredSessions.map((session) => (
              <button
                key={session.remoteJid}
                onClick={() => setSelectedSession(session)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-[#202c33] transition-colors border-b border-gray-800/50 ${
                  selectedSession?.remoteJid === session.remoteJid ? 'bg-[#2a3942]' : ''
                }`}
              >
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 flex-shrink-0 overflow-hidden">
                  {profileCache[session.remoteJid]?.imgUrl ? (
                      <img src={profileCache[session.remoteJid].imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                      <User size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline gap-2 min-w-0">
                    <h3 className="text-sm font-medium text-gray-100 truncate">
                      {profileCache[session.remoteJid]?.name || formatDisplayJid(session.remoteJid)}
                    </h3>
                    {session.lastMessage && (
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatTime(session.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {session.lastMessage?.text || 'No messages'}
                  </p>
                  
                  {/* Labels Display */}
                  {session.labels && session.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {session.labels.map(l => (
                        <span key={l.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-[#0b141a] font-bold" style={{ backgroundColor: l.color }}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {session.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center text-[10px] font-bold text-[#0b141a]">
                    {session.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 min-w-0 flex-col bg-[#0b141a] relative ${!selectedSession ? "hidden md:flex" : "flex"}`}>

        {selectedSession ? (
          <>
            {/* Header */}
            <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedSession(null)} className="md:hidden p-1 -ml-2 text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 overflow-hidden">
                  {profileCache[selectedSession.remoteJid]?.imgUrl ? (
                      <img src={profileCache[selectedSession.remoteJid].imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                      <User size={20} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100 flex items-center gap-2">
                    {profileCache[selectedSession.remoteJid]?.name || formatDisplayJid(selectedSession.remoteJid)}
                    {selectedSession.labels && selectedSession.labels.length > 0 && (
                        <div className="flex -space-x-1">
                            {selectedSession.labels.map(l => (
                                <div key={l.id} className="w-2 h-2 rounded-full ring-1 ring-[#202c33]" style={{ backgroundColor: l.color }} title={l.name} />
                            ))}
                        </div>
                    )}
                  </h3>
                  <span className="text-[10px] text-[#25D366]">
                    {typingStatus[selectedSession.remoteJid] ? 'typing...' : 
                     presenceStatus[selectedSession.remoteJid] === 'online' ? 'online' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-gray-400">
                <div className="relative">
                    <Tag 
                        size={20} 
                        className={`cursor-pointer hover:text-[#25D366] transition-colors ${showChatLabelModal ? 'text-[#25D366]' : ''}`} 
                        onClick={() => setShowChatLabelModal(!showChatLabelModal)}
                    />
                    {showChatLabelModal && (
                        <div className="absolute top-8 right-0 w-48 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 px-1">Assign Labels</p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {labels.length === 0 && <p className="text-xs text-gray-500 italic px-1">No labels created.</p>}
                                {labels.map(l => {
                                    const isSelected = selectedSession.labels?.some(sl => sl.id === l.id);
                                    return (
                                        <button 
                                            key={l.id}
                                            onClick={() => toggleChatLabel(l.id)}
                                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-[#111b21] transition-colors ${isSelected ? 'text-white' : 'text-gray-400'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                                                {l.name}
                                            </div>
                                            {isSelected && <Check size={12} className="text-[#25D366]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <Video size={20} className="cursor-not-allowed opacity-50" />
                <Phone size={18} className="cursor-not-allowed opacity-50" />
                <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                <Search size={20} className="cursor-pointer hover:text-gray-200" />
                <MoreVertical size={20} className="cursor-pointer hover:text-gray-200" />
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70fcded21.png')] bg-repeat opacity-90"
              style={{ backgroundSize: '400px' }}
            >
              <div className="flex flex-col space-y-2">
                {Object.keys(groupedMessages).map(date => (
                  <React.Fragment key={date}>
                    <div className="flex justify-center my-4 sticky top-2 z-10">
                      <span className="bg-[#111b21] text-gray-400 text-[10px] px-3 py-1 rounded-lg shadow-sm font-medium uppercase tracking-wide border border-gray-800">
                        {getRelativeDate(date)}
                      </span>
                    </div>
                    {groupedMessages[date].map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} group/msg relative`}
                      >
                        {!msg.fromMe && (
                           <button 
                             onClick={() => setReplyingTo(msg)}
                             className="absolute -right-8 top-2 text-gray-500 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity p-1"
                             title="Reply"
                           >
                             <div className="transform scale-x-[-1]">
                               <Send size={14} />
                             </div>
                           </button>
                        )}
                        {msg.fromMe && (
                           <button 
                             onClick={() => setReplyingTo(msg)}
                             className="absolute -left-8 top-2 text-gray-500 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity p-1"
                             title="Reply"
                           >
                             <div className="transform scale-x-[-1]">
                               <Send size={14} />
                             </div>
                           </button>
                        )}

                        <div
                          className={`max-w-[70%] rounded-lg px-2 py-1.5 text-sm shadow-sm relative ${
                            msg.fromMe 
                              ? 'bg-[#005c4b] text-gray-100 rounded-tr-none' 
                              : 'bg-[#202c33] text-gray-100 rounded-tl-none'
                          }`}
                        >
                          {/* Quoted Message Display */}
                          {msg.quotedMsg && (
                            <div className={`mb-1 rounded-lg p-2 text-xs border-l-4 ${msg.fromMe ? 'bg-[#025144] border-[#0b846d]' : 'bg-[#1d282f] border-[#25D366]'} opacity-80 cursor-pointer`}>
                                <div className="font-bold text-[10px] mb-0.5 text-[#25D366]">
                                    {msg.fromMe ? 'You' : 'Them'}
                                </div>
                                <p className="line-clamp-2 text-gray-300">
                                    {msg.quotedMsg.mediaType && msg.quotedMsg.mediaType !== 'text' ? 
                                        <span className="flex items-center gap-1 italic"><Paperclip size={10} /> {msg.quotedMsg.mediaType}</span> : 
                                        msg.quotedMsg.text}
                                </p>
                            </div>
                          )}

                          {msg.mediaUrl && (
                              <div className="mb-1">
                                  {msg.mediaType === 'image' ? (
                                      <img src={msg.mediaUrl} alt="Media" className="rounded-lg max-w-full max-h-[300px] object-cover" />
                                  ) : (msg.mediaType === 'video' || msg.mediaType === 'gif') ? (
                                      <video 
                                          src={msg.mediaUrl} 
                                          controls={msg.mediaType !== 'gif'} 
                                          autoPlay={msg.mediaType === 'gif'} 
                                          loop={msg.mediaType === 'gif'} 
                                          muted={msg.mediaType === 'gif'} 
                                          playsInline 
                                          className="rounded-lg max-w-full max-h-[300px]" 
                                      />
                                  ) : (
                                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/20 p-3 rounded-lg text-blue-400 hover:underline border border-white/5">
                                          <Paperclip size={16} />
                                          <span>View Document</span>
                                      </a>
                                  )}
                              </div>
                          )}
                          <p className="pr-16 whitespace-pre-wrap leading-relaxed px-1 break-words">{msg.text}</p>
                          <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                            <span className="text-[9px] text-gray-400 font-medium">
                              {formatTime(msg.timestamp)}
                            </span>
                            {msg.fromMe && (
                              <div className="flex">
                                {msg.status === 'read' ? (
                                    <CheckCheck size={14} className="text-[#53bdeb]" />
                                ) : msg.status === 'delivered' ? (
                                    <CheckCheck size={14} className="text-gray-400" />
                                ) : (
                                    <Check size={14} className="text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply Banner */}
            {replyingTo && (
                <div className="px-4 py-2 bg-[#1d282f] border-l-4 border-[#25D366] flex justify-between items-center animate-in slide-in-from-bottom-2">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[#25D366] text-xs font-bold">Replying to {replyingTo.fromMe ? 'yourself' : 'them'}</span>
                        <span className="text-gray-400 text-xs truncate">
                            {replyingTo.mediaType && replyingTo.mediaType !== 'text' ? 
                                <span className="flex items-center gap-1 italic"><Paperclip size={10} /> {replyingTo.mediaType}</span> : 
                                replyingTo.text}
                        </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="bg-[#202c33] p-3 flex items-center gap-3 relative">
              {/* Templates Modal */}
              {showTemplates && (
                  <div className="absolute bottom-16 left-12 z-50 bg-[#2a3942] rounded-lg shadow-xl border border-gray-700 w-64 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-700 font-medium text-gray-300 text-xs uppercase tracking-wider">Quick Templates</div>
                      {templates.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No templates found</div>
                      ) : (
                          templates.map((t: any) => (
                              <button 
                                  key={t.id} 
                                  type="button"
                                  onClick={() => {
                                      setNewMessage(t.content);
                                      setShowTemplates(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-[#111b21] text-gray-300 text-sm truncate border-b border-gray-700/50 last:border-0"
                              >
                                  {t.name}
                              </button>
                          ))
                      )}
                  </div>
              )}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50">
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                </div>
              )}
              
              {selectedFile && (
                <div className="absolute bottom-16 left-16 z-50 bg-[#2a3942] p-2 rounded-lg border border-gray-700 shadow-lg">
                  <div className="relative">
                    {selectedFile.type.startsWith('image/') && previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="max-w-[200px] max-h-[200px] rounded object-cover" />
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-gray-200 bg-gray-800 rounded">
                        <Paperclip size={20} />
                        <span className="text-sm truncate max-w-[150px]">{selectedFile.name}</span>
                      </div>
                    )}
                    <button 
                      onClick={clearFile}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              <Smile 
                className={`cursor-pointer hover:text-gray-200 ${showEmojiPicker ? 'text-[#25D366]' : 'text-gray-400'}`} 
                size={24} 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
              />
              
              <Paperclip 
                className={`cursor-pointer hover:text-gray-200 ${selectedFile ? 'text-[#25D366]' : 'text-gray-400'}`}
                size={24} 
                onClick={() => fileInputRef.current?.click()}
              />
              
              <LayoutTemplate 
                className={`cursor-pointer hover:text-gray-200 ${showTemplates ? 'text-[#25D366]' : 'text-gray-400'}`}
                size={24}
                onClick={() => setShowTemplates(!showTemplates)}
                title="Quick Templates"
              />
              
              <form onSubmit={handleSendMessage} className="flex-1">
                <input
                  type="text"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full bg-[#2a3942] text-gray-200 px-4 py-2 rounded-lg text-sm outline-none placeholder-gray-500 focus:ring-1 focus:ring-[#25D366]"
                />
              </form>
              
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && !selectedFile}
                className={`p-2 rounded-full transition-colors ${
                  newMessage.trim() || selectedFile ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={48} className="text-gray-600" />
            </div>
            <h2 className="text-xl font-light text-gray-300 mb-2">iFastX Web</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Select a conversation from the sidebar to start chatting. 
              Messages are synced in real-time with your WhatsApp instances.
            </p>
            <div className="mt-12 flex items-center gap-2 text-gray-600 text-xs">
              <CheckCheck size={14} />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

import { MessageSquare } from 'lucide-react';
