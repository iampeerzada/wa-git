import React, { useState, useEffect } from 'react';
import { WhatsAppInstance, InstanceStatus, MessageTemplate, ContactGroup, User, UserRole, Plan, MediaAsset, InteractiveButton } from '../types';
import { Send, Users, Clock, ShieldCheck, Play, Pause, RotateCcw, CheckCircle2, XCircle, AlertTriangle, FileText, ChevronDown, Lock, Layers, Image as ImageIcon, Eye, Smartphone, MoreVertical, Paperclip, Smile, ExternalLink, Phone, Reply, Zap, Activity, ShieldAlert, History } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface BulkSenderProps {
  instances: WhatsAppInstance[];
  apiBase: string;
  templates: MessageTemplate[];
  contactGroups: ContactGroup[];
  currentUser: User;
  plans: Plan[];
  mediaAssets: MediaAsset[];
  hiddenModules: string[];
}

const BulkSender: React.FC<BulkSenderProps> = ({ instances, apiBase, templates, contactGroups, currentUser, plans, mediaAssets, hiddenModules }) => {
  const [selectedInstance, setSelectedInstance] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMedia, setSelectedMedia] = useState('');
  const [activeButtons, setActiveButtons] = useState<InteractiveButton[]>([]);
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [delayMin, setDelayMin] = useState(5);
  const [delayMax, setDelayMax] = useState(15);
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMediaLib, setShowMediaLib] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, queued: 0 });
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [selectedMetaTemplate, setSelectedMetaTemplate] = useState<{name: string, language: string} | null>(null);
  const [logs, setLogs] = useState<{ msg: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);
  const [viewMode, setViewMode] = useState<'sender' | 'history'>('sender');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
      if (viewMode === 'history') {
          fetchHistory();
      }
  }, [viewMode, selectedInstance]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
        const query = selectedInstance ? `?instanceId=${selectedInstance}` : '';
        const res = await fetch(`${apiBase}/api/message-logs${query}`, {
            headers: {
                'X-User-ID': currentUser.id,
                'X-Role': currentUser.role
            }
        });
        const data = await res.json();
        if (res.ok) {
            setHistoryLogs(Array.isArray(data) ? data : []);
        } else {
            console.error("Failed to load history:", data.error);
            setHistoryLogs([]);
        }
    } catch (err) {
        console.error("Failed to load history", err);
        setHistoryLogs([]);
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const chartData = [
    { name: 'Delivered', value: progress.success, color: '#25D366' },
    { name: 'Queued', value: progress.queued, color: '#EAB308' },
    { name: 'Failed', value: progress.failed, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const currentPlan = plans.find(p => p.id === currentUser.subscription.planId);
  const isSuspended = currentUser.subscription.status !== 'active';

  const isSuper = currentUser.role === UserRole.SUPERADMIN;
  const showQuickButtons = isSuper || !hiddenModules.includes('bulk-quick-buttons');
  const showMedia = isSuper || !hiddenModules.includes('bulk-media');
  const showTplBtn = isSuper || !hiddenModules.includes('bulk-templates');

  const addLog = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 50));
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    if (!groupId) {
      setNumbers('');
      return;
    }
    const group = contactGroups.find(g => g.id === groupId);
    if (group) {
      const contacts = group.contacts || [];
      const verifiedNumbers = contacts.filter(c => c.exists).map(c => c.number);
      setNumbers(verifiedNumbers.join('\n'));
      addLog(`Loaded ${verifiedNumbers.length} verified numbers from "${group.name}"`, 'info');
    }
  };

  const addQuickButton = () => {
    const btn: InteractiveButton = {
      id: `qbtn_${Date.now()}`,
      type: 'reply',
      displayText: 'Quick Action'
    };
    setActiveButtons(prev => [...prev, btn]);
  };

  const handleStartBulk = async () => {
    if (!selectedInstance || !numbers || !message) {
      alert("Please fill all required fields");
      return;
    }

    if (isSuspended) {
        alert("Subscription Required: Your account is suspended. Please renew your plan.");
        return;
    }

    const numberList = numbers.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 5);
    if (numberList.length === 0) {
      alert("No valid numbers found");
      return;
    }

    if (currentPlan && currentPlan.dailyLimit !== 0) {
        if (currentUser.subscription.messagesSentToday + numberList.length > currentPlan.dailyLimit) {
            alert(`Daily Quota Exceeded: You have ${currentPlan.dailyLimit - currentUser.subscription.messagesSentToday} messages left today. Your list contains ${numberList.length}.`);
            return;
        }
    }

    setIsSending(true);
    setProgress({ current: 0, total: numberList.length, success: 0, failed: 0, queued: 0 });
    setLogs([]);
    addLog(`Campaign Initialization: Compliance mode engaged.`, 'warning');
    addLog(`Detecting Meta fair-use policies... Applying safety staggered delays.`, 'info');

    try {
        const payload: any = {
            instanceId: selectedInstance,
            numbers: numberList,
            message,
            buttons: activeButtons.length > 0 ? activeButtons : undefined,
            options: {
                delayMin,
                delayMax,
                simulateTyping: true,
                complianceMode: true // Signal for backend anti-ban
            }
        };

        if (selectedMetaTemplate) {
            payload.options.templateName = selectedMetaTemplate.name;
            payload.options.templateLanguage = selectedMetaTemplate.language;
        }

        if (selectedMedia) {
            payload.mediaUrl = selectedMedia;
            const asset = mediaAssets.find(a => a.url === selectedMedia);
            payload.mediaType = asset?.type || 'image';
        }

        addLog(`Pushing ${numberList.length} numbers to Throttled Compliance Queue...`, 'info');

        const res = await fetch(`${apiBase}/api/send-bulk`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-User-ID': currentUser.id,
                'Authorization': `Bearer ${currentUser.accessToken}` 
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (res.status === 200 || data.success) {
            setProgress(p => ({ ...p, current: numberList.length, queued: numberList.length }));
            addLog(`Campaign Batching Completed. Backend is now drip-feeding ${numberList.length} messages.`, 'success');
        } else if (res.status === 429) {
            addLog(`Safety Limit hit: ${data.error}`, 'error');
        } else {
            throw new Error(data.error || 'Server error');
        }
    } catch (err: any) {
        addLog(`Processing Error: ${err.message}`, 'error');
    }

    setIsSending(false);
  };

  const loadTemplate = (tpl: MessageTemplate) => {
    setMessage(tpl.content);
    if (tpl.mediaUrl) setSelectedMedia(tpl.mediaUrl);
    if (tpl.buttons) setActiveButtons(tpl.buttons);
    else setActiveButtons([]);
    setShowTemplates(false);
    addLog(`Loaded ${tpl.isTemporary ? 'Temporary' : 'Saved'} Template: ${tpl.name}`, 'info');
  };

  const liveInstances = instances.filter(i => i.status === InstanceStatus.OPEN);

  const solveSpintax = (text: string) => {
    return text.replace(/{([^{}]+)}/g, (match, options) => {
      const parts = options.split('|');
      return parts[0]; 
    });
  };

  const currentMediaAsset = mediaAssets.find(a => a.url === selectedMedia);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex bg-[#111b21] p-1 rounded-xl border border-gray-800 w-fit mb-6">
        <button
          onClick={() => setViewMode('sender')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            viewMode === 'sender'
              ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Send size={18} />
          New Campaign
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            viewMode === 'history'
              ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History size={18} />
          Campaign History Logs
        </button>
      </div>

      {viewMode === 'sender' ? (
        <>
          {isSuspended && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 text-red-500 mb-6">
              <Lock size={20} />
              <div className="text-sm">
                  <p className="font-bold">Execution Blocked</p>
                  <p className="opacity-80">Your subscription has expired. Please visit the Billing tab to renew access.</p>
              </div>
          </div>
      )}

      {isSending && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex items-center justify-between mb-6 animate-pulse">
              <div className="flex items-center gap-4">
                  <Activity className="text-blue-400" size={24} />
                  <div>
                      <p className="text-white font-bold text-sm">Enterprise Anti-Ban Layer Active</p>
                      <p className="text-blue-400/70 text-[10px] uppercase font-black tracking-widest">Applying randomized jitter & presence simulation</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">THROTTLING ENABLED</span>
              </div>
          </div>
      )}

      {/* ANTI-BAN BEST PRACTICES */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-3">
              <ShieldAlert className="text-amber-500" size={20} />
              <h3 className="text-amber-500 font-bold text-sm uppercase tracking-wider">Account Protection Guidelines</h3>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Meta actively monitors WhatsApp for spam behaviour when sending messages to new contacts. Our <strong>Enterprise Anti-Ban Layer</strong> helps by applying randomized jitter, however you should follow these rules to protect your assigned numbers:
          </p>
          <ul className="text-xs text-gray-400 list-disc list-inside space-y-1 ml-1">
              <li><strong>Warm Up New Accounts:</strong> Send messages starting with small batches (50-100/day) before scaling to 1000+.</li>
              <li><strong>Ask for Opt-In / Reply:</strong> Add an un-subscribe option or ask a question to encourage the user to reply (Meta weighs 2-way chats as safe).</li>
              <li><strong>Limit Links in First Messages:</strong> Don't send URLs to absolute strangers on the first message.</li>
          </ul>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Send className="text-[#25D366]" />
                Campaign Configuration
              </div>
              <div className="flex gap-2">
                {showQuickButtons && (
                  <button 
                    onClick={addQuickButton}
                    className="text-[10px] font-black uppercase text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-purple-400/20 transition-all border border-purple-500/20"
                  >
                    <Zap size={14} />
                    Temporary Button
                  </button>
                )}

                {showMedia && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowMediaLib(!showMediaLib)}
                      className="text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-blue-400/20 transition-all"
                    >
                      <ImageIcon size={14} />
                      Attach Media
                      <ChevronDown size={14} className={`transition-transform ${showMediaLib ? 'rotate-180' : ''}`} />
                    </button>
                    {showMediaLib && (
                      <div className="absolute right-0 mt-2 w-72 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3 border-b border-gray-700 bg-black/20 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                          My Media Library
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <button onClick={() => {setSelectedMedia(''); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold">
                             [ Clear Attachment ]
                          </button>
                          {mediaAssets.filter(a => a.userId === currentUser.id).length === 0 ? (
                            <div className="p-4 text-xs text-gray-500 italic text-center">Library empty.</div>
                          ) : (
                            mediaAssets.filter(a => a.userId === currentUser.id).map(asset => (
                              <button key={asset.id} onClick={() => {setSelectedMedia(asset.url); setShowMediaLib(false);}} className={`w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-3 ${selectedMedia === asset.url ? 'bg-blue-500/10' : ''}`}>
                                <div className="w-10 h-10 bg-black/20 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                  {asset.type === 'image' ? <img src={asset.url} className="w-full h-full object-cover" /> : <FileText size={16} className="text-gray-600" />}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-white truncate">{asset.name}</div>
                                  <div className="text-[9px] text-gray-500 uppercase">{asset.type}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showTplBtn && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#25D366]/20 transition-all"
                    >
                      <FileText size={14} />
                      Use Template
                      <ChevronDown size={14} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                    </button>
                    {showTemplates && (
                      <div className="absolute right-0 mt-2 w-64 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3 border-b border-gray-700 bg-black/20 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                          Saved Templates
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {instances.find(i => i.id === selectedInstance)?.provider === 'meta' ? (
    <>
      {metaTemplates.length === 0 ? (
         <div className="p-4 text-xs text-gray-500 italic text-center">No approved templates found. Sync in Meta Templates tab.</div>
      ) : (
         metaTemplates.filter(t => t.status === 'APPROVED').map(tpl => (
            <button key={tpl.id} onClick={() => {
                setMessage('[META TEMPLATE] ' + tpl.name);
                setSelectedMetaTemplate({ name: tpl.name, language: tpl.language });
                setShowTemplates(false);
            }} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all">
                <div className="text-xs font-bold text-white mb-1 truncate">{tpl.name} ({tpl.language})</div>
                <div className="text-[10px] text-gray-400 line-clamp-2">{tpl.category}</div>
            </button>
         ))
      )}
    </>
  ) : (
    <>
      {templates.length === 0 ? (
                            <div className="p-4 text-xs text-gray-500 italic text-center">No templates.</div>
                          ) : (
                            templates.map(tpl => (
                              <button key={tpl.id} onClick={() => loadTemplate(tpl)} className="w-full text-left p-4 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all">
                                <div className="text-sm font-bold text-white mb-1 truncate flex items-center gap-2">
                                  {tpl.name}
                                  {tpl.isTemporary && <span className="text-[8px] px-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded uppercase">Temp</span>}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">{tpl.content}</div>
                              </button>
                            ))
                          )}
    </>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Target Instance</label>
                  <select 
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
                  >
                    <option value="">Select instance...</option>
                    {liveInstances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Contact Group</label>
                  <select 
                    value={selectedGroup}
                    onChange={(e) => handleGroupSelect(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
                  >
                    <option value="">Paste numbers manually...</option>
                    {contactGroups.map(grp => (
                      <option key={grp.id} value={grp.id}>{grp.name} ({(grp.contacts || []).filter(c => c.exists).length} verified)</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMedia && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-left-2">
                   <div className="flex items-center gap-3">
                     <ImageIcon className="text-blue-400" size={20} />
                     <div>
                       <p className="text-[10px] text-gray-500 uppercase font-black">Attachment Active</p>
                       <p className="text-xs text-white font-mono truncate max-w-xs">{selectedMedia}</p>
                     </div>
                   </div>
                   <button onClick={() => setSelectedMedia('')} className="text-gray-500 hover:text-red-500 transition-colors">
                     <XCircle size={18} />
                   </button>
                </div>
              )}

              {activeButtons.length > 0 && (
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
                  <div className="w-full flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black">Interactive Buttons Attached (Temporary)</p>
                    <button onClick={() => setActiveButtons([])} className="text-xs text-red-500 font-bold hover:underline">Clear All</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {activeButtons.map((btn, idx) => (
                      <div key={btn.id} className="bg-[#0b141a] p-2 rounded-lg border border-gray-800 space-y-2 relative group">
                        <button onClick={() => setActiveButtons(prev => prev.filter(b => b.id !== btn.id))} className="absolute top-1 right-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={12} /></button>
                        <select 
                            value={btn.type}
                            onChange={(e) => {
                                const newType = e.target.value as any;
                                setActiveButtons(prev => prev.map(b => b.id === btn.id ? { ...b, type: newType } : b));
                            }}
                            className="w-full bg-[#111b21] border border-gray-700 rounded text-[9px] px-2 py-1 text-white outline-none"
                        >
                            <option value="reply">Reply</option>
                            <option value="url">URL</option>
                            <option value="call">Call</option>
                        </select>
                        <input 
                            value={btn.displayText}
                            onChange={(e) => setActiveButtons(prev => prev.map(b => b.id === btn.id ? { ...b, displayText: e.target.value } : b))}
                            className="w-full bg-[#111b21] border border-gray-700 rounded text-[9px] px-2 py-1 text-white outline-none"
                            placeholder="Display Text"
                        />
                        {(btn.type === 'url' || btn.type === 'call') && (
                            <input 
                                value={btn.url || btn.phoneNumber || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setActiveButtons(prev => prev.map(b => b.id === btn.id ? (btn.type === 'url' ? { ...b, url: val } : { ...b, phoneNumber: val }) : b));
                                }}
                                className="w-full bg-[#111b21] border border-gray-700 rounded text-[8px] px-2 py-1 text-gray-400 outline-none"
                                placeholder={btn.type === 'url' ? "https://..." : "+91..."}
                            />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Recipients</label>
                  <textarea 
                    value={numbers}
                    onChange={(e) => setNumbers(e.target.value)}
                    placeholder="919876543210&#10;918877665544"
                    rows={8}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 ring-[#25D366]/50 outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Message Content</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hello! Use {Hi|Hello} for spintax support."
                    rows={8}
                    className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all resize-none flex-1"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleStartBulk}
                  disabled={isSending || liveInstances.length === 0 || isSuspended}
                  className="flex-1 bg-[#25D366] hover:bg-[#128c7e] disabled:opacity-30 text-[#0b141a] py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/10"
                >
                  {isSending ? <Pause size={20} /> : <Play size={20} />}
                  {isSending ? 'Drip-feeding...' : 'Launch Campaign'}
                </button>
                <button 
                  onClick={() => { setNumbers(''); setMessage(''); setLogs([]); setSelectedGroup(''); setSelectedMedia(''); setActiveButtons([]); setProgress({ current:0, total:0, success:0, failed:0, queued: 0 })}}
                  className="px-6 bg-[#2a3942] hover:bg-[#32444f] text-white rounded-xl font-bold transition-all"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-6 shadow-xl flex flex-col h-full">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye className="text-blue-400" size={16} />
              Live Campaign Preview
            </h3>
            
            <div className="flex-1 bg-[#0b141a] rounded-2xl border border-gray-800 p-4 relative overflow-hidden flex flex-col min-h-[450px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://i.pinimg.com/originals/ab/ab/60/abab600fbc0650f166e70e97b4a1e483.png')] bg-repeat" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                       <Smartphone size={16} className="text-gray-400" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-white">Recipient</p>
                       <p className="text-[8px] text-[#25D366]">online</p>
                    </div>
                  </div>
                  <MoreVertical size={14} className="text-gray-600" />
                </div>

                <div className="flex-1 flex flex-col justify-start">
                  <div className="max-w-[85%] self-end relative mb-4">
                    <div className="bg-[#d9fdd3] text-[#111b21] rounded-xl rounded-tr-none p-2 shadow-md relative animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="absolute top-0 right-[-6px] w-0 h-0 border-l-[10px] border-l-[#d9fdd3] border-b-[10px] border-b-transparent" />
                      
                      {selectedMedia && (
                        <div className="mb-2 rounded-lg overflow-hidden bg-black/5">
                           {currentMediaAsset?.type === 'image' ? (
                             <img src={selectedMedia} className="w-full h-auto max-h-40 object-cover" alt="Preview" />
                           ) : (
                             <div className="p-4 flex flex-col items-center gap-2 bg-[#cfe9ba]">
                               <FileText size={32} className="text-[#111b21]/40" />
                               <span className="text-[10px] font-bold truncate w-full text-center">
                                 {currentMediaAsset?.name || 'document_attachment.pdf'}
                               </span>
                             </div>
                           )}
                        </div>
                      )}
                      
                      <div className="text-xs whitespace-pre-wrap leading-relaxed pr-6 break-words">
                        {message ? solveSpintax(message) : <span className="text-gray-400 italic">Start typing to preview...</span>}
                      </div>
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[8px] opacity-60">10:45 AM</span>
                        <CheckCircle2 size={10} className="text-blue-500" />
                      </div>

                      {activeButtons.length > 0 && (
                        <div className="mt-2 pt-1 border-t border-[#0b141a]/10 flex flex-col divide-y divide-[#0b141a]/10">
                          {activeButtons.map(btn => (
                            <div key={btn.id} className="py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600">
                              {btn.type === 'url' ? <ExternalLink size={10} /> : btn.type === 'call' ? <Phone size={10} /> : <Reply size={10} />}
                              {btn.displayText}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <div className="flex-1 bg-[#202c33] rounded-full px-4 py-2 flex items-center gap-2">
                    <Smile size={14} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500">Message</span>
                    <Paperclip size={14} className="text-gray-500 ml-auto" />
                  </div>
                  <div className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center">
                    <Send size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                 <ShieldCheck size={10} /> Anti-Ban Compliance Active
               </p>
               <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                 Messages are batch-processed with randomized intervals to respect Meta fair-use policies.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck className="text-[#25D366]" size={16} />
              Plan Constraints
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-[#202c33] rounded-xl border border-gray-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-bold">Daily Used</span>
                  <span className="text-[#25D366] text-xs font-mono">{currentUser.subscription.messagesSentToday} / {currentPlan?.dailyLimit || '∞'}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(currentUser.subscription.messagesSentToday / (currentPlan?.dailyLimit || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-6 shadow-xl">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span>Campaign Staggering</span>
              {progress.total > 0 && <span className="text-[10px] font-mono text-gray-500">{progress.current}/{progress.total} Pushed</span>}
            </h3>
            <div className="space-y-4">
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-[#25D366] transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100 || 0}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#202c33] p-3 rounded-xl text-center border border-transparent hover:border-blue-500/20 transition-all">
                  <p className="text-[10px] text-gray-500 font-black uppercase">Staggered</p>
                  <p className="text-xl font-bold text-blue-400">{progress.success}</p>
                </div>
                <div className="bg-[#202c33] p-3 rounded-xl text-center border border-transparent hover:border-yellow-500/20 transition-all">
                  <p className="text-[10px] text-gray-500 font-black uppercase">Drip-Feed</p>
                  <p className="text-xl font-bold text-yellow-500">{progress.queued}</p>
                </div>
                <div className="bg-[#202c33] p-3 rounded-xl text-center border border-transparent hover:border-red-500/20 transition-all">
                  <p className="text-[10px] text-gray-500 font-black uppercase">Rejected</p>
                  <p className="text-xl font-bold text-red-500">{progress.failed}</p>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="h-48 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111b21', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-gray-400 ml-1">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {isSending && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Activity size={14} className="text-blue-400 animate-pulse" />
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Compliance Layer is feeding the queue...</span>
                </div>
              )}
            </div>
          </div>
      </div>

      <div className="bg-[#111b21] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#202c33]/30">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Compliance Logs</h3>
          <span className="text-[10px] font-mono text-gray-500 uppercase">{progress.current} / {progress.total}</span>
        </div>
        <div className="h-64 overflow-y-auto p-6 font-mono text-xs space-y-2 bg-black/20">
          {logs.length === 0 && <p className="text-gray-700 italic text-center py-12">Waiting for launch...</p>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-3 ${
              log.type === 'success' ? 'text-[#25D366]' : 
              log.type === 'error' ? 'text-red-400' : 
              log.type === 'warning' ? 'text-yellow-400' : 
              'text-gray-400'
            }`}>
              <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
              <span>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
        </>
      ) : (
        <div className="bg-[#111b21] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#202c33]/30">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Campaign History Logs</h3>
            <span className="text-[10px] font-mono text-gray-500 uppercase">
              {historyLogs.length} Records
            </span>
          </div>
          <div className="p-6">
            {isLoadingHistory ? (
              <p className="text-gray-500 text-center py-12">Loading history...</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No campaign history found for this instance.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#202c33] p-4 rounded-xl border-l-4 border-gray-600">
                        <p className="text-[10px] text-gray-500 font-black uppercase">Total Stack Logs</p>
                        <p className="text-2xl font-bold text-gray-300">{historyLogs.length}</p>
                    </div>
                    <div className="bg-[#202c33] p-4 rounded-xl border-l-4 border-[#25D366]">
                        <p className="text-[10px] text-gray-500 font-black uppercase">Total Delivered</p>
                        <p className="text-2xl font-bold text-[#25D366]">{historyLogs.filter((l: any) => l.status === 'delivered' || l.status === 'success').length}</p>
                    </div>
                    <div className="bg-[#202c33] p-4 rounded-xl border-l-4 border-red-500">
                        <p className="text-[10px] text-gray-500 font-black uppercase">Total Failed</p>
                        <p className="text-2xl font-bold text-red-500">{historyLogs.filter((l: any) => l.status === 'failed').length}</p>
                    </div>
                    <div className="bg-[#202c33] p-4 rounded-xl border-l-4 border-yellow-500">
                        <p className="text-[10px] text-gray-500 font-black uppercase">Total Queued/Pending</p>
                        <p className="text-2xl font-bold text-yellow-500">{historyLogs.filter((l: any) => l.status !== 'delivered' && l.status !== 'success' && l.status !== 'failed').length}</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-[#202c33] text-gray-300 text-xs uppercase font-black">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Date / Time</th>
                      <th className="px-4 py-3">Instance</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 rounded-tr-lg">Message/Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {historyLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#202c33]/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const dateStr = String(log.created_at).trim();
                            // Handle cases where the timestamp comes back without timezone info
                            const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                            const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                            return new Date(utcDateStr).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                              hour12: true
                            });
                          })()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{log.instance_id}</td>
                        <td className="px-4 py-3 font-mono text-xs">{log.recipient}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            log.status === 'delivered' || log.status === 'success' ? 'bg-[#25D366]/20 text-[#25D366]' :
                            log.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs w-full max-w-sm truncate">
                          {log.error ? (
                            <div className="text-red-400 font-medium">{log.error}</div>
                          ) : (
                            <div className="text-gray-500 text-[10px]">Msg ID: {log.message_id || 'N/A'}</div>
                          )}
                          {log.content && (
                            <div className="mt-1 text-gray-300 font-mono truncate" title={log.content}>
                              {log.content}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSender;