import React, { useState, useEffect } from 'react';
import { WhatsAppInstance, InstanceStatus, MessageTemplate, ContactGroup, User, UserRole, Plan, MediaAsset, InteractiveButton } from '../types';
import { Send, Users, Clock, ShieldCheck, Play, Pause, RotateCcw, CheckCircle2, XCircle, AlertTriangle, FileText, ChevronDown, ChevronUp, Maximize2, Copy, Check, Lock, Layers, Image as ImageIcon, Eye, Smartphone, MoreVertical, Paperclip, Smile, ExternalLink, Phone, Reply, Zap, Activity, ShieldAlert, History, ChevronLeft, ChevronRight, Filter, Calendar, X } from 'lucide-react';
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
  initialViewMode?: 'sender' | 'history';
}

const BulkSender: React.FC<BulkSenderProps> = ({ instances, apiBase, templates, contactGroups, currentUser, plans, mediaAssets, hiddenModules, initialViewMode }) => {
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
  const [viewMode, setViewMode] = useState<'sender' | 'history'>(initialViewMode || 'sender');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Pagination & Filter state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyMonth, setHistoryMonth] = useState('all');
  const [historyYear, setHistoryYear] = useState('all');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [historyInstanceFilter, setHistoryInstanceFilter] = useState('all');
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [historyStats, setHistoryStats] = useState({ total: 0, delivered: 0, failed: 0, pending: 0 });
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [selectedLogModal, setSelectedLogModal] = useState<any | null>(null);
  const [copiedLogModal, setCopiedLogModal] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  const [agreeProtection, setAgreeProtection] = useState(true);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
      if (viewMode === 'history') {
          fetchHistory();
      }
  }, [viewMode, selectedInstance, historyPage, historyLimit, historyMonth, historyYear, historyStatus, historyInstanceFilter]);

  useEffect(() => {
    if (selectedInstance && instances.find(i => i.id === selectedInstance)?.provider === 'meta') {
        fetchMetaTemplates();
    } else {
        setMetaTemplates([]);
    }
  }, [selectedInstance, instances]);

  const fetchMetaTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.templates) ? data.templates : (Array.isArray(data?.data) ? data.data : []));
        setMetaTemplates(list);
      }
    } catch (e) {}
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
        const params = new URLSearchParams();
        if (historyInstanceFilter && historyInstanceFilter !== 'all') {
            params.append('instanceId', historyInstanceFilter);
        } else if (selectedInstance) {
            params.append('instanceId', selectedInstance);
        }
        params.append('page', String(historyPage));
        params.append('limit', String(historyLimit));
        if (historyMonth !== 'all') params.append('month', historyMonth);
        if (historyYear !== 'all') params.append('year', historyYear);
        if (historyStatus !== 'all') params.append('status', historyStatus);

        const res = await fetch(`${apiBase}/api/message-logs?${params.toString()}`, {
            headers: {
                'X-User-ID': currentUser.id,
                'X-Role': currentUser.role
            }
        });
        const data = await res.json();
        if (res.ok) {
            if (Array.isArray(data)) {
                setHistoryLogs(data);
                setTotalLogs(data.length);
                setTotalPages(1);
                setHistoryStats({
                    total: data.length,
                    delivered: data.filter((l: any) => l.status === 'delivered' || l.status === 'success').length,
                    failed: data.filter((l: any) => l.status === 'failed').length,
                    pending: data.filter((l: any) => l.status !== 'delivered' && l.status !== 'success' && l.status !== 'failed').length
                });
            } else {
                setHistoryLogs(data.logs || []);
                setTotalLogs(data.total || 0);
                setTotalPages(data.totalPages || 1);
                if (data.stats) {
                    setHistoryStats(data.stats);
                }
            }
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
  const selectedInst = instances.find(i => i.id === selectedInstance);
  const isBaileys = !selectedInst || selectedInst.provider !== 'meta';
  const showQuickButtons = (isSuper || !hiddenModules.includes('bulk-quick-buttons')) && !isBaileys;
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
  const currentSelectedInst = instances.find(i => i.id === selectedInstance);
  const isBaileysInstance = !currentSelectedInst || currentSelectedInst.provider !== 'meta';

  const solveSpintax = (text: string) => {
    return text.replace(/{([^{}]+)}/g, (match, options) => {
      const parts = options.split('|');
      return parts[0]; 
    });
  };

  const currentMediaAsset = mediaAssets.find(a => a.url === selectedMedia);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      <div className="flex bg-[#111b21] p-1 rounded-xl border border-gray-800 w-full sm:w-fit mb-4 overflow-x-auto">
        <button
          onClick={() => setViewMode('sender')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            viewMode === 'sender'
              ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            viewMode === 'history'
              ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Campaign History Logs</span>
        </button>
      </div>

      {viewMode === 'sender' ? (
        <>
          {isSuspended && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 sm:p-4 rounded-xl flex items-center gap-3 text-red-500 mb-4">
              <Lock size={18} />
              <div className="text-xs">
                  <p className="font-bold">Execution Blocked</p>
                  <p className="opacity-80">Your subscription has expired. Please visit the Billing tab to renew access.</p>
              </div>
          </div>
      )}

      {isSending && (
          <div className="bg-blue-500/10 border border-blue-500/30 p-3.5 sm:p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 mb-4 animate-pulse">
              <div className="flex items-center gap-3">
                  <Activity className="text-blue-400" size={20} />
                  <div>
                      <p className="text-white font-bold text-xs">Enterprise Anti-Ban Layer Active</p>
                      <p className="text-blue-400/70 text-[9px] uppercase font-bold tracking-wider">Applying randomized jitter & presence simulation</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2.5 py-0.5 rounded-md border border-blue-400/20">THROTTLING ENABLED</span>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-5 shadow-lg">
            <h2 className="text-xs sm:text-sm font-bold text-white mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-[#25D366]" />
                Campaign Configuration
              </div>
              <div className="flex flex-wrap gap-1.5">
                {showQuickButtons && (
                  <button 
                    onClick={addQuickButton}
                    className="text-[10px] font-bold uppercase text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:bg-purple-400/20 transition-all border border-purple-500/20 cursor-pointer"
                  >
                    <Zap size={12} />
                    Button
                  </button>
                )}

                {showMedia && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowMediaLib(!showMediaLib)}
                      className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:bg-blue-400/20 transition-all cursor-pointer"
                    >
                      <ImageIcon size={12} />
                      Attach Media
                      <ChevronDown size={12} className={`transition-transform ${showMediaLib ? 'rotate-180' : ''}`} />
                    </button>
                    {showMediaLib && (
                      <div className="absolute right-0 mt-2 w-64 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2.5 border-b border-gray-700 bg-black/20 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                          My Media Library
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          <button onClick={() => {setSelectedMedia(''); setShowMediaLib(false);}} className="w-full text-left p-2.5 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold cursor-pointer">
                             [ Clear Attachment ]
                          </button>
                          {mediaAssets.filter(a => a.userId === currentUser.id).length === 0 ? (
                            <div className="p-3 text-xs text-gray-500 italic text-center">Library empty.</div>
                          ) : (
                            mediaAssets.filter(a => a.userId === currentUser.id).map(asset => (
                              <button key={asset.id} onClick={() => {setSelectedMedia(asset.url); setShowMediaLib(false);}} className={`w-full text-left p-2.5 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-2.5 cursor-pointer ${selectedMedia === asset.url ? 'bg-blue-500/10' : ''}`}>
                                <div className="w-8 h-8 bg-black/20 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                  {asset.type === 'image' ? <img src={asset.url} className="w-full h-full object-cover" /> : <FileText size={14} className="text-gray-500" />}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-white truncate">{asset.name}</div>
                                  <div className="text-[9px] text-gray-400 uppercase">{asset.type}</div>
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
                      className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:bg-[#25D366]/20 transition-all cursor-pointer"
                    >
                      <FileText size={12} />
                      Use Template
                      <ChevronDown size={12} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                    </button>
                    {showTemplates && (
                      <div className="absolute right-0 mt-2 w-60 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2.5 border-b border-gray-700 bg-black/20 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                          Saved Templates
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {instances.find(i => i.id === selectedInstance)?.provider === 'meta' ? (
    <>
      {(!Array.isArray(metaTemplates) || metaTemplates.length === 0) ? (
         <div className="p-3 text-xs text-gray-500 italic text-center">No approved templates found. Sync in Meta Templates tab.</div>
      ) : (
         (Array.isArray(metaTemplates) ? metaTemplates : []).filter(t => t.status === 'APPROVED').map(tpl => (
            <button key={tpl.id} onClick={() => {
                setMessage('[META TEMPLATE] ' + tpl.name);
                setSelectedMetaTemplate({ name: tpl.name, language: tpl.language, components: tpl.components });
                if (Array.isArray(tpl.components)) {
                    const headerComp = tpl.components.find((c: any) => c.type === 'HEADER');
                    if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
                        const sampleUrl = headerComp.example?.header_url?.[0] || headerComp.example?.header_handle?.[0];
                        if (sampleUrl && typeof sampleUrl === 'string' && sampleUrl.startsWith('http') && !selectedMedia) {
                            setSelectedMedia(sampleUrl);
                        }
                    }
                }
                setShowTemplates(false);
            }} className="w-full text-left p-2.5 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all cursor-pointer">
                <div className="text-xs font-bold text-white mb-0.5 truncate">{tpl.name} ({tpl.language})</div>
                <div className="text-[10px] text-gray-400 line-clamp-2">{tpl.category}</div>
            </button>
         ))
      )}
    </>
  ) : (
    <>
      {templates.length === 0 ? (
                            <div className="p-3 text-xs text-gray-500 italic text-center">No templates.</div>
                          ) : (
                            templates.map(tpl => (
                              <button key={tpl.id} onClick={() => loadTemplate(tpl)} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all cursor-pointer">
                                <div className="text-xs font-bold text-white mb-0.5 truncate flex items-center gap-1.5">
                                  {tpl.name}
                                  {tpl.isTemporary && <span className="text-[8px] px-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded uppercase">Temp</span>}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate">{tpl.content}</div>
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
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Instance</label>
                  <select 
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select instance...</option>
                    {liveInstances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Group</label>
                  <select 
                    value={selectedGroup}
                    onChange={(e) => handleGroupSelect(e.target.value)}
                    className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all cursor-pointer"
                  >
                    <option value="">Paste numbers manually...</option>
                    {contactGroups.map(grp => (
                      <option key={grp.id} value={grp.id}>{grp.name} ({(grp.contacts || []).filter(c => c.exists).length} verified)</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMedia && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-between flex-wrap gap-2 animate-in fade-in slide-in-from-left-2">
                   <div className="flex items-center gap-2">
                     <ImageIcon className="text-blue-400 shrink-0" size={16} />
                     <div className="min-w-0">
                       <p className="text-[9px] text-gray-400 uppercase font-bold">Attachment Active</p>
                       <p className="text-xs text-white font-mono truncate max-w-xs">{selectedMedia}</p>
                     </div>
                   </div>
                   <button onClick={() => setSelectedMedia('')} className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer">
                     <XCircle size={16} />
                   </button>
                </div>
              )}

              {activeButtons.length > 0 && (
                <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl flex flex-col gap-2 animate-in fade-in slide-in-from-left-2">
                  <div className="w-full flex justify-between items-center mb-0.5">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Interactive Buttons Attached</p>
                    <button onClick={() => setActiveButtons([])} className="text-xs text-red-400 font-bold hover:underline cursor-pointer">Clear All</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {activeButtons.map((btn) => (
                      <div key={btn.id} className="bg-[#0b141a] p-2 rounded-lg border border-gray-800 space-y-1.5 relative group">
                        <button onClick={() => setActiveButtons(prev => prev.filter(b => b.id !== btn.id))} className="absolute top-1 right-1 text-gray-500 hover:text-red-400 transition-opacity cursor-pointer"><XCircle size={12} /></button>
                        <select 
                            value={btn.type}
                            onChange={(e) => {
                                const newType = e.target.value as any;
                                setActiveButtons(prev => prev.map(b => b.id === btn.id ? { ...b, type: newType } : b));
                            }}
                            className="w-full bg-[#111b21] border border-gray-700 rounded text-[9px] px-2 py-1 text-white outline-none cursor-pointer"
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
                                value={btn.type === 'url' ? (btn.url || '') : (btn.phoneNumber || '')}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Recipients</label>
                  <textarea 
                    value={numbers}
                    onChange={(e) => setNumbers(e.target.value)}
                    placeholder="919876543210&#10;918877665544"
                    rows={5}
                    className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message Content</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hello! Use {Hi|Hello} for spintax. For templates with variables, use: [META TEMPLATE] name | var1 | var2"
                    rows={5}
                    className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all resize-none flex-1"
                  />
                </div>
              </div>

              <div className="flex flex-row gap-2 pt-1">
                <button 
                  onClick={handleStartBulk}
                  disabled={isSending || liveInstances.length === 0 || isSuspended || (isBaileysInstance && !agreeProtection)}
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-30 text-[#0b141a] py-2 sm:py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-green-500/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSending ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isSending ? 'Drip-feeding...' : 'Launch Campaign'}</span>
                </button>
                <button 
                  onClick={() => { setNumbers(''); setMessage(''); setLogs([]); setSelectedGroup(''); setSelectedMedia(''); setActiveButtons([]); setProgress({ current:0, total:0, success:0, failed:0, queued: 0 })}}
                  className="px-3.5 py-2 bg-[#2a3942] hover:bg-[#32444f] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
                  title="Reset form"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {isBaileysInstance && (
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-400">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={agreeProtection} 
                      onChange={(e) => setAgreeProtection(e.target.checked)} 
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-[#202c33] text-[#25D366] focus:ring-[#25D366]/40 cursor-pointer accent-[#25D366]"
                    />
                    <span>I agree to <strong className="text-gray-200 font-semibold">Account Protection Guidelines</strong></span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowProtectionModal(true)} 
                    className="text-[#25D366] hover:underline text-[11px] flex items-center gap-1 font-semibold ml-auto cursor-pointer"
                  >
                    <ShieldAlert size={13} />
                    View Guidelines
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-4 shadow-md flex flex-col h-full">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye className="text-blue-400" size={14} />
              Live Campaign Preview
            </h3>
            
            <div className="flex-1 bg-[#0b141a] rounded-xl border border-gray-800 p-3 relative overflow-hidden flex flex-col min-h-[350px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://i.pinimg.com/originals/ab/ab/60/abab600fbc0650f166e70e97b4a1e483.png')] bg-repeat" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-2 border-b border-gray-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">
                       <Smartphone size={14} className="text-gray-400" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-white">Recipient</p>
                       <p className="text-[8px] text-[#25D366]">online</p>
                    </div>
                  </div>
                  <MoreVertical size={14} className="text-gray-600" />
                </div>

                <div className="flex-1 flex flex-col justify-start">
                  <div className="max-w-[85%] self-end relative mb-3">
                    <div className="bg-[#d9fdd3] text-[#111b21] rounded-xl rounded-tr-none p-2 shadow-sm relative animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="absolute top-0 right-[-6px] w-0 h-0 border-l-[10px] border-l-[#d9fdd3] border-b-[10px] border-b-transparent" />
                      
                      {selectedMedia && (
                        <div className="mb-2 rounded-lg overflow-hidden bg-black/5">
                           {currentMediaAsset?.type === 'image' ? (
                             <img src={selectedMedia} className="w-full h-auto max-h-36 object-cover" alt="Preview" />
                           ) : (
                             <div className="p-3 flex flex-col items-center gap-1.5 bg-[#cfe9ba]">
                               <FileText size={24} className="text-[#111b21]/40" />
                               <span className="text-[10px] font-bold truncate w-full text-center">
                                 {currentMediaAsset?.name || 'document_attachment.pdf'}
                               </span>
                             </div>
                           )}
                        </div>
                      )}
                      
                      <div className="text-xs whitespace-pre-wrap leading-relaxed pr-5 break-words">
                        {message ? solveSpintax(message) : <span className="text-gray-400 italic">Start typing to preview...</span>}
                      </div>
                      
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[8px] opacity-60">10:45 AM</span>
                        <CheckCircle2 size={10} className="text-blue-500" />
                      </div>

                      {activeButtons.length > 0 && (
                        <div className="mt-2 pt-1 border-t border-[#0b141a]/10 flex flex-col divide-y divide-[#0b141a]/10">
                          {activeButtons.map(btn => (
                            <div key={btn.id} className="py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-blue-600">
                              {btn.type === 'url' ? <ExternalLink size={10} /> : btn.type === 'call' ? <Phone size={10} /> : <Reply size={10} />}
                              {btn.displayText}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <div className="flex-1 bg-[#202c33] rounded-full px-3 py-1.5 flex items-center gap-2">
                    <Smile size={13} className="text-gray-500" />
                    <span className="text-[10px] text-gray-500">Message</span>
                    <Paperclip size={13} className="text-gray-500 ml-auto" />
                  </div>
                  <div className="w-7 h-7 bg-[#00a884] rounded-full flex items-center justify-center">
                    <Send size={13} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-xl">
               <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                 <ShieldCheck size={10} /> Anti-Ban Compliance Active
               </p>
               <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                 Messages are batch-processed with randomized intervals to respect Meta fair-use policies.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-4 shadow-md">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="text-[#25D366]" size={14} />
              Plan Constraints
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#202c33] rounded-xl border border-gray-800 space-y-2">
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

          <div className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-4 shadow-md">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between flex-wrap gap-2">
              <span>Campaign Staggering</span>
              {progress.total > 0 && <span className="text-[10px] font-mono text-gray-400">{progress.current}/{progress.total} Pushed</span>}
            </h3>
            <div className="space-y-3">
              <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-[#25D366] transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100 || 0}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#202c33] p-2.5 rounded-xl text-center border border-transparent hover:border-blue-500/20 transition-all">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Staggered</p>
                  <p className="text-base sm:text-lg font-bold text-blue-400">{progress.success}</p>
                </div>
                <div className="bg-[#202c33] p-2.5 rounded-xl text-center border border-transparent hover:border-yellow-500/20 transition-all">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Drip-Feed</p>
                  <p className="text-base sm:text-lg font-bold text-yellow-500">{progress.queued}</p>
                </div>
                <div className="bg-[#202c33] p-2.5 rounded-xl text-center border border-transparent hover:border-red-500/20 transition-all">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Rejected</p>
                  <p className="text-base sm:text-lg font-bold text-red-500">{progress.failed}</p>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="h-40 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111b21', borderColor: '#374151', borderRadius: '8px', fontSize: '11px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={30} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[11px] text-gray-400 ml-1">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {isSending && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Activity size={13} className="text-blue-400 animate-pulse" />
                  <span className="text-[9px] text-blue-400 font-bold uppercase">Compliance Layer is feeding the queue...</span>
                </div>
              )}
            </div>
          </div>
      </div>

      <div className="bg-[#111b21] rounded-xl border border-gray-800/80 overflow-hidden shadow-md">
        <div className="px-3.5 py-2.5 border-b border-gray-800 flex justify-between items-center bg-[#202c33]/30">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Compliance Logs</h3>
          <span className="text-[10px] font-mono text-gray-400 uppercase">{progress.current} / {progress.total}</span>
        </div>
        <div className="h-48 overflow-y-auto p-3.5 font-mono text-[11px] space-y-1.5 bg-black/20">
          {logs.length === 0 && <p className="text-gray-600 italic text-center py-8">Waiting for launch...</p>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${
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
        <div className="bg-[#111b21] rounded-xl border border-gray-800/80 overflow-hidden shadow-lg">
          <div className="px-3.5 sm:px-5 py-3 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3 bg-[#202c33]/30">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <History className="text-[#25D366]" size={15} /> Campaign History Logs
              </h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                Total Logs: {totalLogs} | Page {historyPage} of {totalPages}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <div className="flex items-center gap-1 bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1">
                <Smartphone size={12} className="text-[#25D366]" />
                <span className="text-gray-400 font-medium">Instance:</span>
                <select
                  value={historyInstanceFilter}
                  onChange={(e) => { setHistoryInstanceFilter(e.target.value); setHistoryPage(1); }}
                  className="bg-transparent text-white outline-none font-bold cursor-pointer text-[11px]"
                >
                  <option value="all" className="bg-[#202c33] text-white">All Instances</option>
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id} className="bg-[#202c33] text-white">
                      {inst.name || inst.phoneNumber || inst.id} ({inst.provider === 'meta' ? 'Meta' : 'Baileys'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1">
                <Calendar size={12} className="text-gray-400" />
                <span className="text-gray-400 font-medium">Month:</span>
                <select
                  value={historyMonth}
                  onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }}
                  className="bg-transparent text-white outline-none font-bold cursor-pointer text-[11px]"
                >
                  <option value="all" className="bg-[#202c33] text-white">All Months</option>
                  <option value="1" className="bg-[#202c33] text-white">January</option>
                  <option value="2" className="bg-[#202c33] text-white">February</option>
                  <option value="3" className="bg-[#202c33] text-white">March</option>
                  <option value="4" className="bg-[#202c33] text-white">April</option>
                  <option value="5" className="bg-[#202c33] text-white">May</option>
                  <option value="6" className="bg-[#202c33] text-white">June</option>
                  <option value="7" className="bg-[#202c33] text-white">July</option>
                  <option value="8" className="bg-[#202c33] text-white">August</option>
                  <option value="9" className="bg-[#202c33] text-white">September</option>
                  <option value="10" className="bg-[#202c33] text-white">October</option>
                  <option value="11" className="bg-[#202c33] text-white">November</option>
                  <option value="12" className="bg-[#202c33] text-white">December</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1">
                <Filter size={12} className="text-gray-400" />
                <span className="text-gray-400 font-medium">Year:</span>
                <select
                  value={historyYear}
                  onChange={(e) => { setHistoryYear(e.target.value); setHistoryPage(1); }}
                  className="bg-transparent text-white outline-none font-bold cursor-pointer text-[11px]"
                >
                  <option value="all" className="bg-[#202c33] text-white">All Years</option>
                  <option value="2024" className="bg-[#202c33] text-white">2024</option>
                  <option value="2025" className="bg-[#202c33] text-white">2025</option>
                  <option value="2026" className="bg-[#202c33] text-white">2026</option>
                  <option value="2027" className="bg-[#202c33] text-white">2027</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1">
                <Filter size={12} className="text-gray-400" />
                <span className="text-gray-400 font-medium">Status:</span>
                <select
                  value={historyStatus}
                  onChange={(e) => { setHistoryStatus(e.target.value); setHistoryPage(1); }}
                  className="bg-transparent text-white outline-none font-bold cursor-pointer text-[11px]"
                >
                  <option value="all" className="bg-[#202c33] text-white">All Statuses</option>
                  <option value="delivered" className="bg-[#202c33] text-emerald-400">Delivered / Sent</option>
                  <option value="failed" className="bg-[#202c33] text-red-400">Failed</option>
                  <option value="pending" className="bg-[#202c33] text-yellow-400">Pending / Queued</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1">
                <span className="text-gray-400 font-medium">Per Page:</span>
                <select
                  value={historyLimit}
                  onChange={(e) => { setHistoryLimit(Number(e.target.value)); setHistoryPage(1); }}
                  className="bg-transparent text-white outline-none font-bold cursor-pointer text-[11px]"
                >
                  <option value="25" className="bg-[#202c33] text-white">25</option>
                  <option value="50" className="bg-[#202c33] text-white">50</option>
                  <option value="100" className="bg-[#202c33] text-white">100</option>
                  <option value="250" className="bg-[#202c33] text-white">250</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              <button
                onClick={() => { setHistoryStatus('all'); setHistoryPage(1); }}
                className={`p-2.5 sm:p-3 rounded-xl border-l-4 border-gray-500 shadow-sm text-left transition-all hover:scale-[1.01] cursor-pointer ${historyStatus === 'all' ? 'bg-[#2a3942] ring-1 ring-gray-400' : 'bg-[#202c33]'}`}
              >
                <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center justify-between">
                  Total Messages
                  {historyStatus === 'all' && <span className="text-[8px] bg-gray-500/20 text-gray-300 px-1 py-0.2 rounded">All</span>}
                </p>
                <p className="text-base sm:text-lg font-bold text-gray-200 mt-0.5">{historyStats.total}</p>
              </button>

              <button
                onClick={() => { setHistoryStatus('delivered'); setHistoryPage(1); }}
                className={`p-2.5 sm:p-3 rounded-xl border-l-4 border-[#25D366] shadow-sm text-left transition-all hover:scale-[1.01] cursor-pointer ${historyStatus === 'delivered' ? 'bg-[#2a3942] ring-1 ring-[#25D366]' : 'bg-[#202c33]'}`}
              >
                <p className="text-[9px] text-[#25D366] font-bold uppercase flex items-center justify-between">
                  Delivered / Sent
                  {historyStatus === 'delivered' && <span className="text-[8px] bg-[#25D366]/20 text-[#25D366] px-1 py-0.2 rounded">Filtered</span>}
                </p>
                <p className="text-base sm:text-lg font-bold text-[#25D366] mt-0.5">{historyStats.delivered}</p>
              </button>

              <button
                onClick={() => { setHistoryStatus('failed'); setHistoryPage(1); }}
                className={`p-2.5 sm:p-3 rounded-xl border-l-4 border-red-500 shadow-sm text-left transition-all hover:scale-[1.01] cursor-pointer ${historyStatus === 'failed' ? 'bg-[#2a3942] ring-1 ring-red-500' : 'bg-[#202c33]'}`}
              >
                <p className="text-[9px] text-red-400 font-bold uppercase flex items-center justify-between">
                  Failed
                  {historyStatus === 'failed' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 py-0.2 rounded">Filtered</span>}
                </p>
                <p className="text-base sm:text-lg font-bold text-red-500 mt-0.5">{historyStats.failed}</p>
              </button>

              <button
                onClick={() => { setHistoryStatus('pending'); setHistoryPage(1); }}
                className={`p-2.5 sm:p-3 rounded-xl border-l-4 border-yellow-500 shadow-sm text-left transition-all hover:scale-[1.01] cursor-pointer ${historyStatus === 'pending' ? 'bg-[#2a3942] ring-1 ring-yellow-500' : 'bg-[#202c33]'}`}
              >
                <p className="text-[9px] text-yellow-400 font-bold uppercase flex items-center justify-between">
                  Queued / Pending
                  {historyStatus === 'pending' && <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.2 rounded">Filtered</span>}
                </p>
                <p className="text-base sm:text-lg font-bold text-yellow-500 mt-0.5">{historyStats.pending}</p>
              </button>
            </div>

            {isLoadingHistory ? (
              <p className="text-gray-500 text-center py-8 text-xs font-medium">Loading logs...</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-xs">No campaign history found for the selected filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-800/80">
                  <table className="w-full text-left text-xs text-gray-400">
                  <thead className="bg-[#202c33] text-gray-300 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="px-3 py-2.5">Date / Time</th>
                      <th className="px-3 py-2.5">Instance</th>
                      <th className="px-3 py-2.5">Recipient</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Message / Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50 bg-black/10">
                    {historyLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#202c33]/40 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-300 font-medium">
                          {(() => {
                            const dateStr = String(log.created_at).trim();
                            const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                            const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                            return new Date(utcDateStr).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                              hour12: true
                            });
                          })()}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-blue-400">{log.instance_id}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-200">{log.recipient}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            log.status === 'delivered' || log.status === 'success' ? 'bg-[#25D366]/20 text-[#25D366]' :
                            log.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-normal break-words max-w-[200px] sm:max-w-xs md:max-w-md">
                          {log.error && (
                            <div className="text-red-400 font-medium whitespace-normal break-words mb-1" title={log.error}>
                              {(() => {
                                try {
                                  const parsed = JSON.parse(log.error);
                                  if (Array.isArray(parsed) && parsed[0] && parsed[0].error_data && parsed[0].error_data.details) {
                                    return parsed[0].error_data.details;
                                  } else if (Array.isArray(parsed) && parsed[0] && parsed[0].message) {
                                    return parsed[0].message;
                                  } else if (parsed.message) {
                                    return parsed.message;
                                  }
                                  return String(log.error);
                                } catch (e) {
                                  return String(log.error);
                                }
                              })()}
                            </div>
                          )}
                          {!log.error && (
                            <div className="text-gray-500 text-[10px]">Msg ID: {log.message_id || 'N/A'}</div>
                          )}

                          {log.content && (
                            <div className="mt-1">
                              <div className={`text-gray-300 font-mono text-xs transition-all ${
                                expandedRowIds[log.id] 
                                  ? 'whitespace-pre-wrap break-words max-h-60 overflow-y-auto bg-black/40 p-2 rounded-lg border border-gray-800' 
                                  : 'truncate max-w-[220px] sm:max-w-xs'
                              }`} title={!expandedRowIds[log.id] ? log.content : undefined}>
                                {log.content}
                              </div>

                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  onClick={() => setExpandedRowIds(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                  className="text-[10px] font-bold text-[#25D366] hover:text-emerald-300 flex items-center gap-0.5 bg-[#202c33] hover:bg-gray-700 px-2 py-0.5 rounded border border-gray-700 transition-colors"
                                >
                                  {expandedRowIds[log.id] ? (
                                    <>
                                      <ChevronUp size={12} /> Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={12} /> Expand
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => setSelectedLogModal(log)}
                                  className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 bg-[#202c33] hover:bg-gray-700 px-2 py-0.5 rounded border border-gray-700 transition-colors"
                                  title="View complete log details"
                                >
                                  <Maximize2 size={11} /> Full View
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="mt-6 flex flex-wrap justify-between items-center gap-4 bg-[#202c33]/40 p-4 rounded-xl border border-gray-800 text-xs">
                <span className="text-gray-400">
                  Showing <strong className="text-white">{Math.min((historyPage - 1) * historyLimit + 1, totalLogs)}</strong> to{' '}
                  <strong className="text-white">{Math.min(historyPage * historyLimit, totalLogs)}</strong> of{' '}
                  <strong className="text-white">{totalLogs}</strong> logs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 bg-[#202c33] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-all font-bold"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span className="px-3 py-1.5 bg-[#111b21] rounded-lg border border-gray-800 font-mono text-gray-300 font-bold">
                    Page {historyPage} / {totalPages}
                  </span>

                  <button
                    disabled={historyPage >= totalPages}
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 bg-[#202c33] hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-all font-bold"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selected Log Full Details Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#202c33]/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Log Message Details
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    ID: {selectedLogModal.id} | Recipient: <span className="text-white">{selectedLogModal.recipient}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogModal(null)}
                className="p-1.5 text-gray-400 hover:text-white bg-[#202c33] rounded-lg border border-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#202c33]/40 p-3.5 rounded-xl border border-gray-800 font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Instance</span>
                  <span className="text-blue-400 font-bold">{selectedLogModal.instance_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Status</span>
                  <span className={`font-bold ${
                    selectedLogModal.status === 'delivered' || selectedLogModal.status === 'success' ? 'text-[#25D366]' :
                    selectedLogModal.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {selectedLogModal.status?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Msg ID</span>
                  <span className="text-gray-300 font-bold truncate block">{selectedLogModal.message_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Date / Time</span>
                  <span className="text-gray-300 text-[10px]">
                    {new Date(selectedLogModal.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              {selectedLogModal.content && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Message Content
                    </label>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLogModal.content);
                        setCopiedLogModal(true);
                        setTimeout(() => setCopiedLogModal(false), 2000);
                      }}
                      className="text-[10px] font-bold text-[#25D366] hover:underline flex items-center gap-1"
                    >
                      {copiedLogModal ? <Check size={12} /> : <Copy size={12} />}
                      {copiedLogModal ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <div className="p-4 bg-black/50 border border-gray-800 rounded-xl font-mono text-gray-200 text-xs whitespace-pre-wrap break-words max-h-72 overflow-y-auto leading-relaxed">
                    {selectedLogModal.content}
                  </div>
                </div>
              )}

              {/* Error Details if present */}
              {selectedLogModal.error && (
                <div>
                  <label className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1.5">
                    Error Diagnostic Payload
                  </label>
                  <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl font-mono text-red-300 text-xs whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                    {selectedLogModal.error}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#202c33]/30 flex justify-end">
              <button
                onClick={() => setSelectedLogModal(null)}
                className="bg-[#202c33] hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-xs font-bold border border-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Protection Guidelines Popup Modal */}
      {showProtectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#111b21] border border-amber-500/30 w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 animate-in zoom-in-95 duration-200 relative max-h-[88vh] flex flex-col my-auto">
            <button 
              onClick={() => setShowProtectionModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 pr-8 shrink-0">
              <div className="p-2 sm:p-2.5 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20 shrink-0">
                <ShieldAlert size={20} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Account Protection Guidelines</h3>
                <p className="text-[11px] sm:text-xs text-amber-500 font-medium mt-0.5">Baileys / WhatsApp Web Session Best Practices</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-gray-300 leading-relaxed bg-[#0b141a] p-3 sm:p-4 rounded-xl border border-gray-800 pr-2">
              <p>
                Meta actively monitors WhatsApp for spam behavior when sending messages to new contacts. Our <strong className="text-[#25D366]">Enterprise Anti-Ban Layer</strong> applies randomized jitter and throttling, but you should follow these rules to protect your assigned numbers:
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="p-2.5 sm:p-3 bg-[#111b21] rounded-xl border border-gray-800/80">
                  <span className="font-bold text-white block mb-0.5">1. Warm Up New Accounts</span>
                  <span className="text-gray-400">Send messages starting with small daily batches (50–100/day) before gradually scaling up to 1,000+.</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-[#111b21] rounded-xl border border-gray-800/80">
                  <span className="font-bold text-white block mb-0.5">2. Encourage 2-Way Replies</span>
                  <span className="text-gray-400">Add an unsubscribe option or ask an engaging question to encourage recipients to reply (Meta weighs 2-way chats as safe).</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-[#111b21] rounded-xl border border-gray-800/80">
                  <span className="font-bold text-white block mb-0.5">3. Limit External Links</span>
                  <span className="text-gray-400">Avoid including external URLs in cold first-time outreach messages.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1 shrink-0">
              <button
                onClick={() => {
                  setAgreeProtection(true);
                  setShowProtectionModal(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#128c7e] text-black font-bold text-xs rounded-xl transition-all shadow-md shadow-green-500/10 cursor-pointer"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSender;