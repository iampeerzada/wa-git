import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, User, MoreVertical, Phone, Video, Smile, Paperclip, Check, CheckCheck, 
  X, Tag, Plus, Trash2, Filter, LayoutTemplate, ArrowLeft, MessageSquare, Copy, Eye,
  Mic, Square, ExternalLink, Clock, AlertTriangle, FileText, Image, Film, Music, 
  Download, Bell, BellOff, Info, RefreshCw, Volume2, ShieldCheck, HelpCircle, Sparkles,
  CheckCircle2, ClipboardList, ChevronDown, ChevronUp
} from 'lucide-react';
import { WhatsAppInstance, ChatMessage, ChatSession, User as AppUser, ChatLabel } from '../types';
import { io, Socket } from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    // Autoplay policy fallback
  }
};

const showDesktopNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg'
      });
    } catch (e) {}
  }
};

const getCleanPhone = (jid: string) => {
  if (!jid) return '';
  return jid.split('@')[0].replace(/[^0-9]/g, '');
};

const openInWhatsAppWeb = (jid: string, prefillMsg = '') => {
  const cleanPhone = getCleanPhone(jid);
  if (!cleanPhone) return;
  const textParam = prefillMsg ? `?text=${encodeURIComponent(prefillMsg)}` : '';
  const url = `https://wa.me/${cleanPhone}${textParam}`;
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    window.open(url, '_blank');
  }
};

interface ParsedFlowData {
  title: string;
  fields: Array<{ key: string; value: string }>;
  token?: string;
  rawJson?: string;
}

const parseFlowResponseData = (text: string): ParsedFlowData | null => {
  if (!text) return null;
  const trimmed = text.trim();

  // Try parsing directly as JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      let obj = JSON.parse(trimmed);
      if (obj.response_json && typeof obj.response_json === 'string') {
        try {
          const inner = JSON.parse(obj.response_json);
          obj = { ...obj, ...inner };
        } catch (e) {}
      }
      const fields: Array<{ key: string; value: string }> = [];
      const token = obj.flow_token;
      Object.entries(obj).forEach(([k, v]) => {
        if (k !== 'flow_token' && k !== 'response_json') {
          const cleanKey = k.replace(/screen_\d+_/i, '').replace(/_\d+$/, '').replace(/_/g, ' ');
          fields.push({
            key: cleanKey,
            value: typeof v === 'object' ? JSON.stringify(v) : String(v)
          });
        }
      });
      return {
        title: obj.flow_name || obj.body || 'WhatsApp Flow Submission',
        fields,
        token: token ? String(token) : undefined,
        rawJson: JSON.stringify(obj, null, 2)
      };
    } catch (e) {}
  }

  // Check if it's formatted text with bullet points or [Flow Response
  if (trimmed.includes('[Flow Response') || trimmed.includes('📋')) {
    const lines = trimmed.split('\n');
    const fields: Array<{ key: string; value: string }> = [];
    let token = '';
    let title = 'WhatsApp Flow Submission';

    lines.forEach(line => {
      const l = line.trim();
      if (l.startsWith('Flow:') || l.startsWith('Action:')) {
        title = l.replace(/^(Flow|Action):\s*/, '').trim();
      } else if (l.startsWith('•') || l.startsWith('-')) {
        const parts = l.replace(/^[•\-]\s*/, '').split(':');
        if (parts.length >= 2) {
          fields.push({
            key: parts[0].trim(),
            value: parts.slice(1).join(':').trim()
          });
        } else {
          fields.push({ key: 'Response', value: l.replace(/^[•\-]\s*/, '') });
        }
      } else if (l.includes('Token:') || l.includes('token:')) {
        token = l.replace(/.*Token:\s*/i, '').replace(/\)$/, '').trim();
      }
    });

    return {
      title,
      fields,
      token: token || undefined,
      rawJson: trimmed
    };
  }

  return null;
};

const DEFAULT_META_TEMPLATES: Record<string, {
  name: string;
  header?: string;
  body: string;
  footer?: string;
  category?: string;
  buttons?: Array<{ type?: string; text: string; url?: string; phone_number?: string }>;
}> = {
  customer_order_placed: {
    name: 'customer_order_placed',
    header: 'Order Placed',
    body: 'Hi, your order has been successfully placed! We will notify you once it has been dispatched.',
    footer: 'iFastX Order Services',
    category: 'UTILITY'
  },
  customer_shipment_dispatched: {
    name: 'customer_shipment_dispatched',
    header: 'Shipment Dispatched',
    body: 'Hi, your shipment has been dispatched via courier partner. Track your package for live delivery updates.',
    footer: 'iFastX Delivery Updates',
    category: 'UTILITY'
  },
  customer_delivery_update: {
    name: 'customer_delivery_update',
    header: 'Delivery Update',
    body: 'Hello, your package is out for delivery today. Please ensure someone is available at the delivery address.',
    footer: 'iFastX Logistics',
    category: 'UTILITY'
  },
  payment_reminder: {
    name: 'payment_reminder',
    header: 'Payment Reminder',
    body: 'Dear customer, your subscription payment is due. Please recharge to avoid disconnection.',
    footer: 'ISP Billing Services',
    category: 'UTILITY'
  },
  invoice_alert: {
    name: 'invoice_alert',
    header: 'Invoice Generated',
    body: 'Hello, your invoice has been generated for your account. Please review your billing statement.',
    footer: 'Billing Department',
    category: 'UTILITY'
  },
  recharge_successful: {
    name: 'recharge_successful',
    header: 'Recharge Successful',
    body: 'Dear customer, your account has been successfully recharged with your chosen plan.',
    footer: 'Enjoy our services!',
    category: 'UTILITY'
  },
  ticket_created: {
    name: 'ticket_created',
    header: 'Support Ticket Registered',
    body: 'Dear customer, your support ticket has been registered. Our technician will resolve it shortly.',
    footer: 'Helpdesk Support',
    category: 'UTILITY'
  },
  account_expiry_notice: {
    name: 'account_expiry_notice',
    header: 'Service Expiry Alert',
    body: 'Hi, your internet plan expires today. Renew now to stay connected.',
    footer: 'Customer Care',
    category: 'UTILITY'
  }
};

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
  const [metaTemplatesMap, setMetaTemplatesMap] = useState<Record<string, any>>({});
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<{
    name: string;
    header?: string;
    body: string;
    footer?: string;
    category?: string;
    buttons?: any[];
  } | null>(null);
  const [copiedTemplateText, setCopiedTemplateText] = useState(false);
  
  // Label State
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'window_active' | 'window_expired' | 'direct' | 'groups'>('all');
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#25D366');
  const [showChatLabelModal, setShowChatLabelModal] = useState(false);

  // New WhatsApp Web & 24-Hour Features
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showWindowInfoModal, setShowWindowInfoModal] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [expandedFlowRawMap, setExpandedFlowRawMap] = useState<Record<string, boolean>>({});
  const [copiedFlowId, setCopiedFlowId] = useState<string | null>(null);
  
  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Attachment inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const selectedInstanceIdRef = useRef(selectedInstanceId);
  const selectedSessionRef = useRef(selectedSession);
  const soundEnabledRef = useRef(soundEnabled);
  const currentActiveJidRef = useRef<string | null>(null);
  
  useEffect(() => { selectedInstanceIdRef.current = selectedInstanceId; }, [selectedInstanceId]);
  useEffect(() => { selectedSessionRef.current = selectedSession; }, [selectedSession]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Periodic ticker to keep 24h countdowns accurate in real time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Request browser notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSession = async (session: ChatSession) => {
    if (selectedSession?.remoteJid === session.remoteJid) return;
    currentActiveJidRef.current = session.remoteJid;
    setMessages([]); // Instantly clear previous contact's chat to prevent ghost cache!
    setSelectedSession(session);
    if (session.unreadCount > 0) {
      try {
        await fetch(`${apiBase}/api/chat/messages/${selectedInstanceId}/${session.remoteJid}/read`, {
          method: 'POST',
          headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
        });
        setSessions(prev => prev.map(s => s.remoteJid === session.remoteJid ? { ...s, unreadCount: 0 } : s));
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  };

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
      const currentInstanceId = selectedInstanceIdRef.current;
      const currentSession = selectedSessionRef.current;
      
      if (msg.instanceId === currentInstanceId) {
        const matchesCurrent = currentSession && (
          msg.remoteJid === currentSession.remoteJid ||
          msg.remoteJid.replace(/\D/g, '') === currentSession.remoteJid.replace(/\D/g, '')
        );

        // Sound alert & notification for incoming messages from customer
        if (!msg.fromMe) {
          if (soundEnabledRef.current) {
            playChimeSound();
          }
          showDesktopNotification(
            formatDisplayJid(msg.remoteJid),
            msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '[Media message]')
          );
        }

        // Update messages if this is the active chat
        if (matchesCurrent) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (!msg.fromMe) {
            fetch(`${apiBase}/api/chat/messages/${currentInstanceId}/${currentSession.remoteJid}/read`, {
              method: 'POST',
              headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
            }).catch(e => console.error('Failed to mark incoming message as read', e));
          }
        }
        
        // Update sessions list & 24h customer window
        setSessions(prev => {
          const existing = prev.find(s => s.remoteJid === msg.remoteJid || s.remoteJid.replace(/\D/g, '') === msg.remoteJid.replace(/\D/g, ''));
          const inboundTs = (!msg.fromMe) ? msg.timestamp : (existing?.lastInboundTimestamp || null);
          const isWinActive = !msg.fromMe ? true : (existing?.isWindowActive ?? false);

          if (existing) {
            const updated = {
              ...existing,
              lastMessage: msg,
              unreadCount: matchesCurrent ? 0 : (existing.unreadCount || 0) + (!msg.fromMe ? 1 : 0),
              lastInboundTimestamp: inboundTs,
              isWindowActive: isWinActive
            };
            if (matchesCurrent && selectedSessionRef.current) {
              setSelectedSession(updated);
            }
            return [
              updated,
              ...prev.filter(s => s.remoteJid !== existing.remoteJid)
            ];
          } else {
            return [{
              remoteJid: msg.remoteJid,
              lastMessage: msg,
              unreadCount: matchesCurrent ? 0 : 1,
              lastInboundTimestamp: !msg.fromMe ? msg.timestamp : null,
              isWindowActive: !msg.fromMe
            }, ...prev];
          }
        });
      }
    });

    socket.on('message_status', (data: { id?: string, msgId?: string, status: 'sent' | 'delivered' | 'read' | 'failed', remoteJid?: string }) => {
        const targetId = data.msgId || data.id;
        if (targetId) {
          setMessages(prev => prev.map(m => m.id === targetId ? { ...m, status: data.status } : m));
          setSessions(prev => prev.map(s => {
            if (s.lastMessage && s.lastMessage.id === targetId) {
              return { ...s, lastMessage: { ...s.lastMessage, status: data.status } };
            }
            return s;
          }));
        }
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
  }, [apiBase]);

  // Fetch Templates
  useEffect(() => {
      const saved = localStorage.getItem(`wa_tpls_${currentUser.id}`);
      if (saved) setTemplates(JSON.parse(saved));
  }, [currentUser.id]);

  // Fetch Meta Cloud Templates for the current instance/user to resolve sent template messages
  useEffect(() => {
    if (!selectedInstanceId) return;
    const fetchMetaTemplates = async () => {
      try {
        const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstanceId}`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.templates || data?.data || []);
          const map: Record<string, any> = {};
          list.forEach((t: any) => {
            if (t.name) {
              const lower = t.name.toLowerCase().trim();
              let bodyText = t.body || '';
              let headerText = '';
              let footerText = '';
              let buttons: any[] = [];

              if (Array.isArray(t.components)) {
                t.components.forEach((c: any) => {
                  if (c.type === 'BODY' && c.text) bodyText = c.text;
                  if (c.type === 'HEADER' && c.text) headerText = c.text;
                  if (c.type === 'FOOTER' && c.text) footerText = c.text;
                  if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) buttons = c.buttons;
                });
              }
              map[lower] = {
                name: t.name,
                language: t.language || 'en',
                header: headerText,
                body: bodyText,
                footer: footerText,
                buttons,
                category: t.category
              };
            }
          });
          setMetaTemplatesMap(map);
        }
      } catch (err) {
        // Silently continue
      }
    };
    fetchMetaTemplates();
  }, [selectedInstanceId, apiBase, currentUser.id, currentUser.apiKey]);

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
          
          // Pre-populate profile cache from contact/push names in session data without N+1 HTTP spam
          const initialProfiles: Record<string, { name?: string, imgUrl?: string }> = {};
          data.forEach((session: any) => {
            if (session.contactName || session.pushName) {
              initialProfiles[session.remoteJid] = { name: session.contactName || session.pushName };
            }
          });
          if (Object.keys(initialProfiles).length > 0) {
            setProfileCache(prev => ({ ...initialProfiles, ...prev }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      }
    };

    fetchSessions();
  }, [selectedInstanceId, currentUser.id, currentUser.apiKey, apiBase]);

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
              if (data?.name || data?.imgUrl) {
                setProfileCache(prev => ({ ...prev, [jid]: data }));
              }
          }
      } catch (e) {
          // Ignore errors
      }
  };

  // Fetch messages for selected session with abort controller & cache-bleed protection
  useEffect(() => {
    if (!selectedInstanceId || !selectedSession?.remoteJid) {
      setMessages([]);
      return;
    }
    
    const targetJid = selectedSession.remoteJid;
    currentActiveJidRef.current = targetJid;
    setMessages([]); // Instantly flush previous user's chat messages

    fetchProfileInfo(targetJid);

    const abortController = new AbortController();

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/chat/messages/${selectedInstanceId}/${targetJid}`, {
          signal: abortController.signal,
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          // Ensure we don't display stale response if user switched to another contact
          if (currentActiveJidRef.current === targetJid) {
            setMessages(data);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch messages', err);
        }
      } finally {
        if (currentActiveJidRef.current === targetJid) {
          setIsLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      abortController.abort();
    };
  }, [selectedInstanceId, selectedSession?.remoteJid, currentUser.id, currentUser.apiKey, apiBase]);

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
        payload.fileName = file.name;
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
    } catch (err) {
      console.error('Send error', err);
    }
  };

  const sendVoiceNote = async (base64Audio: string) => {
    if (!selectedSession || !selectedInstanceId) return;
    try {
      const payload: any = {
        instanceId: selectedInstanceId,
        remoteJid: selectedSession.remoteJid,
        message: '',
        media: base64Audio,
        type: 'voice',
        fileName: `voice_note_${Date.now()}.ogg`
      };
      await fetch(`${apiBase}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Failed to send voice note', e);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            sendVoiceNote(base64Audio);
          };
          reader.readAsDataURL(audioBlob);
        }
        setIsRecordingVoice(false);
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes. Please allow microphone access in your browser settings.');
    }
  };

  const cancelVoiceRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecordingDuration(0);
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecordingDuration(0);
  };

  const getWindowCountdown = (lastInbound?: string | null) => {
    if (!lastInbound) return { isActive: false, label: 'No Inbound', remainingFormatted: '', isExpiringSoon: false };
    const inboundMs = new Date(lastInbound).getTime();
    const diff = currentTimeTick - inboundMs;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    if (diff >= TWENTY_FOUR_HOURS || diff < 0) {
      const hoursAgo = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
      return { 
        isActive: false, 
        label: 'Window Expired', 
        remainingFormatted: 'Expired',
        isExpiringSoon: false,
        hoursAgo
      };
    }

    const remMs = TWENTY_FOUR_HOURS - diff;
    const hours = Math.floor(remMs / (60 * 60 * 1000));
    const mins = Math.floor((remMs % (60 * 60 * 1000)) / (60 * 1000));
    const isExpiringSoon = hours < 2;

    return {
      isActive: true,
      label: `${hours}h ${mins}m left`,
      remainingFormatted: `${hours}h ${mins}m`,
      isExpiringSoon,
      hours,
      mins
    };
  };

  const unreadCount = sessions.filter(s => s.unreadCount > 0).length;
  const activeWindowCount = sessions.filter(s => getWindowCountdown(s.lastInboundTimestamp).isActive).length;
  const expiredWindowCount = sessions.filter(s => s.lastInboundTimestamp && !getWindowCountdown(s.lastInboundTimestamp).isActive).length;

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = !s.remoteJid.includes('status@broadcast') && // Hide status updates
    (s.remoteJid.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (s.contactName && s.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     s.lastMessage?.text?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLabel = selectedLabelFilter ? s.labels?.some(l => l.id === selectedLabelFilter) : true;

    let matchesType = true;
    if (chatFilter === 'direct') matchesType = s.remoteJid.endsWith('@s.whatsapp.net');
    else if (chatFilter === 'groups') matchesType = s.remoteJid.endsWith('@g.us');
    else if (chatFilter === 'unread') matchesType = s.unreadCount > 0;
    else if (chatFilter === 'window_active') {
      matchesType = getWindowCountdown(s.lastInboundTimestamp).isActive;
    }
    else if (chatFilter === 'window_expired') {
      matchesType = Boolean(s.lastInboundTimestamp && !getWindowCountdown(s.lastInboundTimestamp).isActive);
    }

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

        {/* Search & Notification Controls */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search chats or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#202c33] text-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm outline-none placeholder-gray-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChimeSound();
            }}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-[#202c33] border-emerald-500/40 text-emerald-400 hover:bg-[#2a3942]' 
                : 'bg-[#202c33] border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
            title={soundEnabled ? 'Incoming alert chime is ON (Click to mute)' : 'Incoming alert chime is MUTED (Click to enable)'}
          >
            {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-3 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setChatFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              chatFilter === 'all'
                ? 'bg-[#25D366] text-[#0b141a]'
                : 'bg-[#202c33] text-gray-400 hover:bg-[#2a3942] hover:text-gray-200'
            }`}
          >
            All ({sessions.length})
          </button>
          <button
            onClick={() => setChatFilter('unread')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              chatFilter === 'unread'
                ? 'bg-[#25D366] text-[#0b141a]'
                : 'bg-[#202c33] text-gray-400 hover:bg-[#2a3942] hover:text-gray-200'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${chatFilter === 'unread' ? 'bg-[#0b141a] text-[#25D366]' : 'bg-[#25D366] text-[#0b141a]'}`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setChatFilter('window_active')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              chatFilter === 'window_active'
                ? 'bg-emerald-500 text-[#0b141a]'
                : 'bg-[#202c33] text-emerald-400 hover:bg-[#2a3942]'
            }`}
            title="Customer replied in last 24h - Free messaging open"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            24h Active ({activeWindowCount})
          </button>
          <button
            onClick={() => setChatFilter('window_expired')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              chatFilter === 'window_expired'
                ? 'bg-amber-500 text-[#0b141a]'
                : 'bg-[#202c33] text-gray-400 hover:bg-[#2a3942]'
            }`}
            title="24h Window expired - Requires Meta Template to re-open"
          >
            ⏳ Expired ({expiredWindowCount})
          </button>
          <button
            onClick={() => setChatFilter('direct')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              chatFilter === 'direct'
                ? 'bg-[#25D366] text-[#0b141a]'
                : 'bg-[#202c33] text-gray-400 hover:bg-[#2a3942] hover:text-gray-200'
            }`}
          >
            Direct
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No conversations found in this view
            </div>
          ) : (
            filteredSessions.map((session) => {
              const win = getWindowCountdown(session.lastInboundTimestamp);
              return (
                <div
                  key={session.remoteJid}
                  onClick={() => handleSelectSession(session)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-[#202c33] cursor-pointer transition-colors border-b border-gray-800/50 group/item ${
                    selectedSession?.remoteJid === session.remoteJid ? 'bg-[#2a3942]' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 shrink-0 overflow-hidden relative">
                    {profileCache[session.remoteJid]?.imgUrl ? (
                      <img src={profileCache[session.remoteJid].imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} />
                    )}
                    {win.isActive && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#111b21]" title="24h Service Window Active" />
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
                    <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                      {session.lastMessage?.fromMe && (
                        session.lastMessage.status === 'read' ? (
                          <CheckCheck size={13} className="text-[#53bdeb] shrink-0" />
                        ) : session.lastMessage.status === 'delivered' ? (
                          <CheckCheck size={13} className="text-gray-300 shrink-0" />
                        ) : (
                          <Check size={13} className="text-gray-300 shrink-0" />
                        )
                      )}
                      <span className="truncate">
                        {(() => {
                          const lMsg = session.lastMessage;
                          if (!lMsg) return 'No messages';
                          if (lMsg.mediaType === 'flow_response' || (lMsg.text && (lMsg.text.includes('[Flow Response') || lMsg.text.includes('"flow_token"') || (lMsg.text.startsWith('{') && lMsg.text.includes('flow'))))) {
                            return '📋 Flow Response Received';
                          }
                          return lMsg.text || (lMsg.mediaUrl ? `[${lMsg.mediaType || 'Media'}]` : 'No messages');
                        })()}
                      </span>
                    </p>
                    
                    {/* 24h Customer Service Window Badge */}
                    <div className="flex items-center justify-between gap-1 mt-1.5">
                      {session.lastInboundTimestamp ? (
                        win.isActive ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${win.isExpiringSoon ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            24h: {win.remainingFormatted} left
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                            ⏳ 24h Expired
                          </span>
                        )
                      ) : (
                        <span className="text-[9px] text-gray-600">Outgoing only</span>
                      )}

                      {/* Quick wa.me button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInWhatsAppWeb(session.remoteJid);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 text-gray-400 hover:text-[#25D366] hover:bg-black/40 rounded transition-all flex items-center gap-0.5 text-[10px]"
                        title="Chat via WhatsApp App / Web (wa.me) directly from another phone number"
                      >
                        <ExternalLink size={12} />
                        <span>wa.me</span>
                      </button>
                    </div>

                    {/* Labels Display */}
                    {session.labels && session.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {session.labels.map(l => (
                          <span key={l.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-[#0b141a] font-bold" style={{ backgroundColor: l.color }}>
                            {l.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {session.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center text-[10px] font-bold text-[#0b141a] shrink-0">
                      {session.unreadCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 min-w-0 flex-col bg-[#0b141a] relative ${!selectedSession ? "hidden md:flex" : "flex"}`}>

        {selectedSession ? (
          <>
            {/* Header */}
            <div className="h-16 bg-[#202c33] flex items-center justify-between px-3 md:px-4 border-b border-gray-800 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedSession(null)} className="md:hidden p-1 -ml-1 text-gray-400 hover:text-white"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 overflow-hidden shrink-0 relative">
                  {profileCache[selectedSession.remoteJid]?.imgUrl ? (
                      <img src={profileCache[selectedSession.remoteJid].imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                      <User size={20} />
                  )}
                  {getWindowCountdown(selectedSession.lastInboundTimestamp).isActive && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#202c33]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2 truncate">
                    <span className="truncate">{profileCache[selectedSession.remoteJid]?.name || formatDisplayJid(selectedSession.remoteJid)}</span>
                    {selectedSession.labels && selectedSession.labels.length > 0 && (
                        <div className="flex -space-x-1 shrink-0">
                            {selectedSession.labels.map(l => (
                                <div key={l.id} className="w-2 h-2 rounded-full ring-1 ring-[#202c33]" style={{ backgroundColor: l.color }} title={l.name} />
                            ))}
                        </div>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="font-mono text-gray-500">{formatDisplayJid(selectedSession.remoteJid)}</span>
                    {typingStatus[selectedSession.remoteJid] ? (
                      <span className="text-emerald-400 font-medium">typing...</span>
                    ) : presenceStatus[selectedSession.remoteJid] === 'online' ? (
                      <span className="text-emerald-400">online</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 24-Hour Customer Window Pill */}
              <div className="hidden lg:flex items-center">
                {(() => {
                  const win = getWindowCountdown(selectedSession.lastInboundTimestamp);
                  return (
                    <button
                      type="button"
                      onClick={() => setShowWindowInfoModal(true)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs border ${
                        win.isActive
                          ? (win.isExpiringSoon 
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25' 
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25')
                          : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:bg-gray-700/60'
                      }`}
                      title="Click to learn how Meta's 24-hour customer window works"
                    >
                      <Clock size={13} className={win.isActive ? (win.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400') : 'text-gray-400'} />
                      <span>{win.isActive ? `24h Window: ${win.remainingFormatted} left` : '24h Window: Expired'}</span>
                      <Info size={11} className="opacity-70" />
                    </button>
                  );
                })()}
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1.5 md:gap-2 text-gray-400 shrink-0">
                {/* 1-Click WhatsApp App / Web (wa.me) Deep Link */}
                <button
                  type="button"
                  onClick={() => openInWhatsAppWeb(selectedSession.remoteJid)}
                  className="flex items-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs"
                  title="Directly text this contact from your personal or sales WhatsApp app / web on another number"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline font-semibold">Chat on WhatsApp</span>
                </button>

                {/* Send Template Shortcut */}
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="hidden sm:flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  title="Send official Meta Template (re-opens the 24h window)"
                >
                  <LayoutTemplate size={13} />
                  <span>Template</span>
                </button>

                {/* Copy Number */}
                <button
                  type="button"
                  onClick={() => {
                    const phone = getCleanPhone(selectedSession.remoteJid);
                    if (phone) navigator.clipboard.writeText(phone);
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Copy contact phone number"
                >
                  <Copy size={16} />
                </button>

                {/* Info Guide */}
                <button
                  type="button"
                  onClick={() => setShowWindowInfoModal(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Meta 24-Hour Window & Messaging Rules Guide"
                >
                  <HelpCircle size={16} />
                </button>

                {/* Label Manager */}
                <div className="relative">
                    <button 
                        onClick={() => setShowChatLabelModal(!showChatLabelModal)}
                        className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${showChatLabelModal ? 'text-[#25D366]' : 'text-gray-400 hover:text-white'}`}
                        title="Assign Labels"
                    >
                      <Tag size={16} />
                    </button>
                    {showChatLabelModal && (
                        <div className="absolute top-10 right-0 w-48 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
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
                                  {(msg.mediaType === 'image' || (!msg.mediaType && (msg.mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || msg.mediaUrl.includes('image') || msg.mediaUrl.includes('/media/')))) ? (
                                      <div className="relative group/media my-0.5">
                                        <img 
                                          src={msg.mediaUrl} 
                                          alt="Media" 
                                          className="rounded-lg max-w-full max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                                          onClick={() => setLightboxMedia({ url: msg.mediaUrl!, type: 'image' })}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(msg.mediaUrl, '_blank');
                                          }}
                                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/media:opacity-100 transition-opacity shadow"
                                          title="Open Fullscreen"
                                        >
                                          <Download size={13} />
                                        </button>
                                      </div>
                                  ) : (msg.mediaType === 'video' || msg.mediaType === 'gif') ? (
                                      <div className="my-0.5 rounded-lg overflow-hidden bg-black/30">
                                        <video 
                                            src={msg.mediaUrl} 
                                            controls={msg.mediaType !== 'gif'} 
                                            autoPlay={msg.mediaType === 'gif'} 
                                            loop={msg.mediaType === 'gif'} 
                                            muted={msg.mediaType === 'gif'} 
                                            playsInline 
                                            className="rounded-lg max-w-full max-h-[320px]" 
                                        />
                                      </div>
                                  ) : (msg.mediaType === 'audio' || msg.mediaType === 'voice') ? (
                                      <div className="flex items-center gap-2.5 bg-black/30 p-2.5 rounded-xl border border-white/10 min-w-[240px] max-w-[320px] my-1">
                                        <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                                          <Mic size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide block mb-1">
                                            {msg.mediaType === 'voice' ? 'Voice Message' : 'Audio Note'}
                                          </span>
                                          <audio src={msg.mediaUrl} controls className="w-full h-8" />
                                        </div>
                                      </div>
                                  ) : (
                                      <div className="flex items-center justify-between gap-3 bg-black/30 p-3 rounded-xl border border-white/10 min-w-[240px] max-w-[320px] my-1 hover:bg-black/40 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                                            <FileText size={18} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-white truncate max-w-[160px]" title={msg.fileName || msg.text || 'Document'}>
                                              {msg.fileName || (msg.text && msg.text !== '[Document]' ? msg.text : 'Attachment Document')}
                                            </p>
                                            <span className="text-[10px] text-gray-400 uppercase font-mono">Document File</span>
                                          </div>
                                        </div>
                                        <a 
                                          href={msg.mediaUrl} 
                                          download 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-colors shrink-0"
                                          title="Download document"
                                        >
                                          <Download size={15} />
                                        </a>
                                      </div>
                                  )}
                              </div>
                          )}

                          {(msg.text || msg.mediaType === 'flow_response') && !(msg.mediaUrl && (msg.text === '[Image]' || msg.text === '[Video]' || msg.text === '[Document]' || msg.text === '[Audio]' || msg.text === '[Sticker]')) && (
                            (() => {
                              const isFlowMsg = msg.mediaType === 'flow_response' || 
                                (msg.text && (
                                  msg.text.includes('[Flow Response') || 
                                  msg.text.includes('nfm_reply') || 
                                  msg.text.includes('"flow_token"') ||
                                  (msg.text.trim().startsWith('{') && msg.text.includes('flow'))
                                ));

                              if (isFlowMsg) {
                                const flowData = parseFlowResponseData(msg.text || '{}');
                                const isRawExpanded = !!expandedFlowRawMap[msg.id];

                                return (
                                  <div className="min-w-[260px] max-w-[360px] pt-1 pb-4 pr-1 text-left">
                                    {/* Header Badge */}
                                    <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-emerald-500/20">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                          <ClipboardList size={13} />
                                        </div>
                                        <div>
                                          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                            <span>{flowData?.title || 'WhatsApp Flow Response'}</span>
                                            <CheckCircle2 size={11} className="text-emerald-400" />
                                          </div>
                                          <div className="text-[9px] text-gray-400 font-medium">Customer Submitted Form / Survey</div>
                                        </div>
                                      </div>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider border border-emerald-500/30">
                                        Flow
                                      </span>
                                    </div>

                                    {/* Fields List */}
                                    {flowData && flowData.fields.length > 0 ? (
                                      <div className="space-y-1.5 my-2">
                                        {flowData.fields.map((f, fIdx) => (
                                          <div key={fIdx} className="bg-black/35 hover:bg-black/50 transition-colors p-2 rounded-lg border border-white/10">
                                            <div className="text-[10px] font-semibold text-emerald-300/90 uppercase tracking-wide">
                                              {f.key}
                                            </div>
                                            <div className="text-xs text-white font-medium mt-0.5 break-words whitespace-pre-wrap">
                                              {f.value}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/10 text-xs text-gray-200 whitespace-pre-wrap break-words my-2">
                                        {msg.text || '[Flow Submission Received]'}
                                      </div>
                                    )}

                                    {/* Flow Token (if present) */}
                                    {flowData?.token && (
                                      <div className="flex items-center justify-between text-[10px] text-gray-400 bg-black/25 px-2 py-1 rounded border border-white/5 my-1.5 font-mono">
                                        <span className="truncate">Token: {flowData.token}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(flowData.token || '');
                                            setCopiedFlowId(msg.id);
                                            setTimeout(() => setCopiedFlowId(null), 2000);
                                          }}
                                          className="text-gray-400 hover:text-emerald-300 ml-1 shrink-0"
                                          title="Copy token"
                                        >
                                          <Copy size={11} />
                                        </button>
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textToCopy = flowData && flowData.fields.length > 0
                                            ? flowData.fields.map(f => `${f.key}: ${f.value}`).join('\n')
                                            : (msg.text || '');
                                          navigator.clipboard.writeText(textToCopy);
                                          setCopiedFlowId(msg.id);
                                          setTimeout(() => setCopiedFlowId(null), 2000);
                                        }}
                                        className="flex-1 py-1 px-2 rounded-md bg-white/10 hover:bg-white/15 text-[11px] text-gray-200 font-medium flex items-center justify-center gap-1 transition-colors border border-white/10"
                                      >
                                        <Copy size={11} />
                                        <span>{copiedFlowId === msg.id ? 'Copied!' : 'Copy Answers'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openInWhatsAppWeb(msg.remoteJid, `Hi, thank you for submitting: ${flowData?.title || 'Form'}`)}
                                        className="py-1 px-2 rounded-md bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[11px] text-emerald-300 font-medium flex items-center justify-center gap-1 transition-colors border border-[#25D366]/40"
                                        title="Chat directly in WhatsApp App or Web"
                                      >
                                        <ExternalLink size={11} />
                                        <span>WhatsApp</span>
                                      </button>

                                      {flowData?.rawJson && (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedFlowRawMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                          title={isRawExpanded ? 'Hide Raw JSON' : 'View Raw JSON'}
                                        >
                                          {isRawExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                      )}
                                    </div>

                                    {/* Expandable Raw JSON */}
                                    {isRawExpanded && flowData?.rawJson && (
                                      <pre className="mt-2 p-2 rounded bg-black/60 text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-36 border border-emerald-500/20">
                                        {flowData.rawJson}
                                      </pre>
                                    )}
                                  </div>
                                );
                              }

                              const templateMatch = msg.text ? msg.text.match(/^\[Template:\s*([a-zA-Z0-9_\-]+)\]/i) : null;
                              const templateName = templateMatch ? templateMatch[1] : msg.templateDetails?.name;

                              if (templateName) {
                                const lowerName = templateName.toLowerCase().trim();
                                const details = msg.templateDetails || metaTemplatesMap[lowerName] || DEFAULT_META_TEMPLATES[lowerName] || {
                                  name: templateName,
                                  body: `[Template: ${templateName}]`
                                };

                                return (
                                  <div className="min-w-[240px] max-w-[340px] pt-0.5 pb-4 pr-1 text-left">
                                    {/* Meta Official Badge Header */}
                                    <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-white/15">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                                          <LayoutTemplate size={10} />
                                        </div>
                                        <span className="text-[10px] font-bold tracking-wide text-emerald-300 uppercase">
                                          Official Meta Template
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPreviewTemplate({
                                            name: templateName,
                                            header: details.header,
                                            body: details.body || `[Template: ${templateName}]`,
                                            footer: details.footer,
                                            buttons: details.buttons,
                                            category: details.category
                                          });
                                        }}
                                        className="text-[9px] text-gray-200 hover:text-white bg-black/40 hover:bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors border border-white/10"
                                        title="View template details"
                                      >
                                        <Eye size={10} />
                                        <span>View</span>
                                      </button>
                                    </div>

                                    {/* Template Name Tag */}
                                    <div className="text-[10px] font-mono text-emerald-200/90 mb-1 font-semibold">
                                      #{templateName}
                                    </div>

                                    {/* Header (if any) */}
                                    {details.header && (
                                      <div className="text-xs font-bold text-white mb-1 tracking-tight">
                                        {details.header}
                                      </div>
                                    )}

                                    {/* Body (The actual message sent to customer) */}
                                    <div className="text-xs leading-relaxed text-gray-100 whitespace-pre-wrap break-words bg-black/25 p-2 rounded-lg border border-white/10 shadow-inner">
                                      {details.body || `[Template: ${templateName}]`}
                                    </div>

                                    {/* Footer (if any) */}
                                    {details.footer && (
                                      <div className="text-[10px] text-gray-300/80 mt-1.5 italic">
                                        {details.footer}
                                      </div>
                                    )}

                                    {/* Action / Quick Reply Buttons */}
                                    {details.buttons && details.buttons.length > 0 && (
                                      <div className="mt-2 pt-1.5 border-t border-white/10 space-y-1">
                                        {details.buttons.map((btn: any, bIdx: number) => (
                                          <div 
                                            key={bIdx} 
                                            className="w-full text-center py-1 px-2 rounded bg-white/10 text-[11px] font-medium text-emerald-200 border border-white/5 cursor-default"
                                          >
                                            {btn.text || btn.url || `Option ${bIdx + 1}`}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <p className="pr-16 whitespace-pre-wrap leading-relaxed px-1 break-words">{msg.text}</p>
                              );
                            })()
                          )}

                          <div className="absolute bottom-1 right-1.5 flex items-center gap-1">
                            <span className="text-[9px] text-gray-300 font-medium">
                              {formatTime(msg.timestamp)}
                            </span>
                            {msg.fromMe && (
                              <div className="flex items-center">
                                {msg.status === 'read' ? (
                                    <CheckCheck size={14} className="text-[#53bdeb]" title="Read" />
                                ) : msg.status === 'delivered' ? (
                                    <CheckCheck size={14} className="text-gray-300" title="Delivered" />
                                ) : msg.status === 'sent' ? (
                                    <Check size={14} className="text-gray-300" title="Sent" />
                                ) : msg.status === 'failed' ? (
                                    <span className="text-red-400 text-[10px] font-bold px-0.5" title="Failed to send">!</span>
                                ) : (
                                    <Check size={14} className="text-gray-400/60" title="Sending..." />
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

            {/* 24-Hour Service Window Expired Reminder Banner */}
            {selectedSession.lastInboundTimestamp && !getWindowCountdown(selectedSession.lastInboundTimestamp).isActive && (
              <div className="px-4 py-2 bg-amber-950/75 border-t border-amber-600/30 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span>
                    <strong>24-Hour Free Service Window Expired:</strong> Non-template text messages may fail. Send an approved template or chat via WhatsApp Web directly.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 font-medium transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <LayoutTemplate size={12} />
                    <span>Send Approved Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openInWhatsAppWeb(selectedSession.remoteJid)}
                    className="px-2.5 py-1 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 rounded-lg text-emerald-300 font-medium transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <ExternalLink size={12} />
                    <span>Chat on WhatsApp App</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Container */}
            <div className="bg-[#202c33] p-3 flex items-center gap-2 md:gap-3 relative">
              {/* Templates Modal */}
              {showTemplates && (
                  <div className="absolute bottom-16 left-12 z-50 bg-[#2a3942] rounded-xl shadow-2xl border border-gray-700 w-72 max-h-72 overflow-y-auto">
                      <div className="p-3 border-b border-gray-700/80 flex items-center justify-between font-semibold text-gray-200 text-xs uppercase tracking-wider bg-[#1d272d]">
                        <span>Official Meta Templates</span>
                        <span className="text-[10px] text-emerald-400 font-mono">24h Safe</span>
                      </div>
                      {(!Array.isArray(templates) || templates.length === 0) ? (
                          <div className="p-4 text-center text-gray-400 text-xs">
                            No custom templates found. Use default templates or sync from Meta.
                          </div>
                      ) : (
                          (Array.isArray(templates) ? templates : []).map((t: any) => (
                              <button 
                                  key={t.id} 
                                  type="button"
                                  onClick={() => {
                                      setNewMessage(t.content);
                                      setShowTemplates(false);
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-[#111b21] text-gray-200 text-xs border-b border-gray-700/50 last:border-0 transition-colors"
                              >
                                  <div className="font-medium text-white">{t.name}</div>
                                  <div className="text-gray-400 text-[11px] truncate mt-0.5">{t.content}</div>
                              </button>
                          ))
                      )}
                  </div>
              )}

              {/* Attachment Picker Menu Popover */}
              {showAttachmentMenu && (
                <div className="absolute bottom-16 left-12 z-50 bg-[#202c33] border border-gray-700 rounded-2xl shadow-2xl p-2 w-60 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Send Media</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-[#111b21] hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Image size={16} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Photos & Videos</div>
                      <div className="text-[10px] text-gray-400">PNG, JPG, MP4, WebM</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-[#111b21] hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Document</div>
                      <div className="text-[10px] text-gray-400">PDF, Word, Excel, CSV</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      audioInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-[#111b21] hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Music size={16} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Audio File</div>
                      <div className="text-[10px] text-gray-400">MP3, WAV, OGG</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      startVoiceRecording();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-[#111b21] hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Mic size={16} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Voice Note</div>
                      <div className="text-[10px] text-gray-400">Record from microphone</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50">
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                </div>
              )}
              
              {/* File Preview */}
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

              {/* Hidden file inputs */}
              <input 
                type="file" 
                ref={imageInputRef} 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <input 
                type="file" 
                ref={docInputRef} 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <input 
                type="file" 
                ref={audioInputRef} 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />

              {isRecordingVoice ? (
                /* Live Voice Recording Bar */
                <div className="flex-1 flex items-center justify-between bg-[#111b21] px-4 py-2.5 rounded-xl border border-red-500/50">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-semibold text-red-400">
                      Recording Voice Note: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelVoiceRecording}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                      title="Cancel Recording"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] p-1.5 rounded-full transition-colors"
                      title="Send Voice Note"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Message Input Bar */
                <>
                  <Smile 
                    className={`cursor-pointer hover:text-gray-200 transition-colors ${showEmojiPicker ? 'text-[#25D366]' : 'text-gray-400'}`} 
                    size={22} 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Emojis"
                  />
                  
                  <Paperclip 
                    className={`cursor-pointer hover:text-gray-200 transition-colors ${showAttachmentMenu || selectedFile ? 'text-[#25D366]' : 'text-gray-400'}`}
                    size={22} 
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    title="Attach Media (Image, Video, Document, Voice)"
                  />
                  
                  <LayoutTemplate 
                    className={`cursor-pointer hover:text-gray-200 transition-colors ${showTemplates ? 'text-[#25D366]' : 'text-gray-400'}`}
                    size={22}
                    onClick={() => setShowTemplates(!showTemplates)}
                    title="Official Meta Quick Templates"
                  />
                  
                  <form onSubmit={handleSendMessage} className="flex-1">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="w-full bg-[#2a3942] text-gray-200 px-4 py-2 rounded-lg text-sm outline-none placeholder-gray-500 focus:ring-1 focus:ring-[#25D366]"
                    />
                  </form>
                  
                  {(!newMessage.trim() && !selectedFile) ? (
                    <button 
                      type="button"
                      onClick={startVoiceRecording}
                      className="p-2 rounded-full text-gray-400 hover:text-[#25D366] hover:bg-gray-700/50 transition-colors"
                      title="Record Voice Message"
                    >
                      <Mic size={20} />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleSendMessage}
                      className="p-2 rounded-full bg-[#25D366] text-[#0b141a] hover:bg-[#128c7e] transition-colors"
                      title="Send Message"
                    >
                      <Send size={20} />
                    </button>
                  )}
                </>
              )}
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

      {/* Template Detail Inspector Modal */}
      {selectedPreviewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#202c33] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700/80 flex items-center justify-between bg-[#111b21]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Official Meta Template Message</h3>
                  <p className="text-[11px] text-gray-400 font-mono">#{selectedPreviewTemplate.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPreviewTemplate(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Category / Status Badges */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  {selectedPreviewTemplate.category || 'UTILITY'}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  Meta Verified Template
                </span>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Sent Message Content
                </label>
                <div className="bg-[#111b21] rounded-xl p-4 border border-gray-700/60 shadow-inner relative group">
                  {selectedPreviewTemplate.header && (
                    <div className="text-sm font-bold text-white mb-2 pb-1 border-b border-gray-700/50">
                      {selectedPreviewTemplate.header}
                    </div>
                  )}
                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {selectedPreviewTemplate.body}
                  </p>
                  {selectedPreviewTemplate.footer && (
                    <div className="text-[11px] text-gray-400 mt-2.5 pt-1.5 border-t border-gray-800 italic">
                      {selectedPreviewTemplate.footer}
                    </div>
                  )}

                  {selectedPreviewTemplate.buttons && selectedPreviewTemplate.buttons.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-800 space-y-1.5">
                      {selectedPreviewTemplate.buttons.map((btn: any, idx: number) => (
                        <div key={idx} className="w-full text-center py-1.5 px-3 rounded-lg bg-emerald-900/30 border border-emerald-500/20 text-xs font-medium text-emerald-300">
                          {btn.text || btn.url || `Option ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedPreviewTemplate.body);
                      setCopiedTemplateText(true);
                      setTimeout(() => setCopiedTemplateText(false), 2000);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-[#202c33] hover:bg-gray-700 text-gray-300 hover:text-white rounded-md text-xs flex items-center gap-1 shadow transition-colors border border-gray-700"
                    title="Copy message content"
                  >
                    {copiedTemplateText ? <Check size={13} className="text-[#25D366]" /> : <Copy size={13} />}
                    <span className="text-[10px]">{copiedTemplateText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700/80 bg-[#111b21] flex justify-end">
              <button
                onClick={() => setSelectedPreviewTemplate(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Media Modal */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex items-center gap-3">
              <a
                href={lightboxMedia.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-1.5 text-xs px-3"
              >
                <Download size={14} />
                <span>Download</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {lightboxMedia.type === 'image' ? (
              <img 
                src={lightboxMedia.url} 
                alt="Full preview" 
                className="max-w-full max-h-[82vh] rounded-xl object-contain shadow-2xl" 
              />
            ) : (
              <video 
                src={lightboxMedia.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-[82vh] rounded-xl shadow-2xl" 
              />
            )}
          </div>
        </div>
      )}

      {/* Meta 24-Hour Customer Window & Messaging Guide Modal */}
      {showWindowInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#202c33] border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700/80 flex items-center justify-between bg-[#111b21]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Meta 24-Hour Customer Service Window</h3>
                  <p className="text-[11px] text-gray-400">Official WhatsApp Cloud API Rules & Best Practices</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWindowInfoModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-gray-300 leading-relaxed">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <ShieldCheck size={16} />
                  <span>How the 24-Hour Window Works</span>
                </div>
                <p className="text-gray-300">
                  Whenever an end customer texts your WhatsApp number, Meta immediately opens a <strong>24-hour Customer Service Window</strong>. Every new message from the customer resets the timer to 24 hours.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-400" />
                  Inside the 24-Hour Window (Active)
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-300">
                  <li><strong>Free messaging:</strong> You can send regular non-template messages at no extra conversation fee within your monthly 1,000 free service tier.</li>
                  <li><strong>Full rich media:</strong> Send voice notes, PDF documents, videos, photos, and quick reply buttons freely.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  When the 24-Hour Window Expires
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-300">
                  <li>Meta Cloud API <strong>blocks free-form text messages</strong> to prevent customer spam.</li>
                  <li>To restart the conversation, you must send an <strong>Approved Meta Template</strong> (e.g. Utility or Marketing reminder). Once the customer replies, a new 24-hour free window opens immediately!</li>
                </ul>
              </div>

              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <ExternalLink size={16} />
                  <span>Connect Using Another WhatsApp Number</span>
                </div>
                <p className="text-gray-300">
                  If you or your team want to text the customer directly from standard WhatsApp Web or mobile app on another phone number (e.g. personal, sales, or support phone), simply click the <strong>&quot;Chat on WhatsApp (wa.me)&quot;</strong> button in the chat header or sidebar!
                </p>
                <p className="text-[11px] text-blue-200">
                  This opens standard WhatsApp Web or desktop app instantly without having to search or manually type the customer&apos;s number.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700/80 bg-[#111b21] flex justify-end">
              <button
                onClick={() => setShowWindowInfoModal(false)}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] font-semibold rounded-xl text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
