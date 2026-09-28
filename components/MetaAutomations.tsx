import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, ChevronRight, Edit, ArrowLeft, Home, MessageSquare, Webhook, X, Save, AlertCircle, ChevronDown, Image as ImageIcon } from 'lucide-react';
import io from 'socket.io-client';

export default function MetaAutomations({ instances, currentUser, apiBase, mediaAssets = [] }) {
  const [automations, setAutomations] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(instances.find(i => i.provider === "meta")?.id || "");

  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const metaInst = instances.find(i => i.provider === "meta");
      if (metaInst) setSelectedInstance(metaInst.id);
    }
  }, [instances]);

  const [templates, setTemplates] = useState([]);
  const [showMediaLib, setShowMediaLib] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingParentId, setEditingParentId] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    keyword: '',
    match_type: 'exact',
    reply_type: 'text',
    text_content: '',
    template_name: '',
    media_url: '',
    template_language: 'en',
    action_type: 'message'
  });

  useEffect(() => {
    if (selectedInstance) {
      fetchAutomations();
      fetchTemplates();
    }
  }, [selectedInstance]);

  // Real-time socket listener for automations updates
  useEffect(() => {
    const socket = io(apiBase);
    socket.on('automations_updated', (data) => {
      if (!data?.instanceId || data.instanceId === selectedInstance) {
        fetchAutomations();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [apiBase, selectedInstance]);

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${apiBase}/api/automations/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) setAutomations(data);
    } catch (e) {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.templates) ? data.templates : (Array.isArray(data?.data) ? data.data : []));
        setTemplates(list);
      }
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = formData.id 
        ? `${apiBase}/api/automations/${formData.id}` 
        : `${apiBase}/api/automations/${selectedInstance}`;
      const method = formData.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, parent_id: editingParentId })
      });
      if (res.ok) {
        fetchAutomations();
        setIsEditing(false);
        setFormData({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '', options: [] });
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure? This will delete the node and all its children if handled by DB.")) return;
    try {
      const res = await fetch(`${apiBase}/api/automations/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) fetchAutomations();
    } catch (e) {}
  };

  const openAddNode = (parentId) => {
    setEditingParentId(parentId);
    setFormData({ id: null, name: '', keyword: '', match_type: parentId ? 'exact' : 'welcome', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '', options: [] });
    setIsEditing(true);
  };

  const openEditNode = (node) => {
    setEditingParentId(node.parent_id);
    setFormData({
      id: node.id,
      name: node.name || '',
      keyword: node.keyword || '',
      match_type: node.match_type || 'exact',
      reply_type: node.reply_type || 'text',
      text_content: node.text_content || '',
      template_name: node.template_name || '',
      template_language: node.template_language || 'en',
      media_url: node.media_url || '',
      action_type: node.action_type || 'message'
    });
    setIsEditing(true);
  };

  const ActionIcon = ({ type }) => {
    switch (type) {
      case 'message': return <MessageSquare size={14} className="text-blue-400" />;
      case 'go_back': return <ArrowLeft size={14} className="text-orange-400" />;
      case 'go_main': return <Home size={14} className="text-emerald-400" />;
      case 'end': return <X size={14} className="text-red-400" />;
      default: return <Webhook size={14} className="text-purple-400" />;
    }
  };

  const AutomationNode = ({ node, level = 0, path = [] }) => {
    const currentPath = [...path, node.name || 'Unnamed Option'];
    const children = automations.filter(a => a.parent_id === node.id);
    const [expanded, setExpanded] = useState(true);

    return (
      <div className="mb-2">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl border border-gray-700/50 bg-[#1b262c]/80 hover:bg-[#202c33] transition-colors shadow-sm ${level > 0 ? 'ml-3 sm:ml-6' : ''}`}>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {children.length > 0 ? (
              <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-white bg-gray-800/50 p-1 rounded cursor-pointer shrink-0 mt-0.5">
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-5 shrink-0"></div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-500 font-mono mb-0.5 flex items-center gap-1 flex-wrap">
                {path.length > 0 ? (
                    <>Path: {path.map((p, i) => <React.Fragment key={i}><span className="text-gray-400">{p}</span> ➔ </React.Fragment>)}<span className="text-blue-400 font-semibold">{node.name || 'Unnamed Option'}</span></>
                ) : (
                    <span className="text-blue-400 font-semibold">Root Node: {node.name || 'Unnamed Option'}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-bold text-white text-xs sm:text-sm">{node.name || 'Unnamed Option'}</span>
                
                {!node.parent_id && (
                  <span className="text-[9px] sm:text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase font-bold tracking-wider">
                    {node.match_type === 'welcome' ? 'Start: Welcome Msg' : `Start: "${node.keyword}"`}
                  </span>
                )}
                {node.parent_id && (
                  <span className="text-[9px] sm:text-[10px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono flex items-center gap-1">
                    If User Types <span className="font-bold text-blue-200 px-1 bg-blue-900/30 rounded">"{node.keyword}"</span>
                  </span>
                )}
                
                <span className="text-[9px] sm:text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-gray-700">
                  <ActionIcon type={node.action_type} />
                  {node.action_type === 'message' ? 'Send Menu/Msg' :
                   node.action_type === 'go_back' ? 'Go Back' :
                   node.action_type === 'go_main' ? 'Main Menu' :
                   node.action_type === 'end' ? 'End Chat' : node.action_type}
                </span>
              </div>
              
              {node.action_type === 'message' && (
                <div className="text-xs text-gray-400 bg-[#111b21] p-2 rounded-lg border border-gray-800/50 line-clamp-2 font-mono">
                  {node.reply_type === 'template' ? `Template: ${node.template_name}` : node.text_content}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 border-t sm:border-t-0 border-gray-800/50 pt-1 sm:pt-0 shrink-0">
            {node.action_type === 'message' && (
              <button onClick={() => openAddNode(node.id)} className="p-1 px-2 text-blue-400 hover:bg-blue-400/10 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer" title="Add Child Option">
                <Plus size={13} /> <span>Option</span>
              </button>
            )}
            <div className="w-px h-4 bg-gray-700/60 mx-0.5"></div>
            <button onClick={() => openEditNode(node)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg cursor-pointer" title="Edit">
              <Edit size={14} />
            </button>
            <button onClick={() => handleDelete(node.id)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg cursor-pointer" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {expanded && children.length > 0 && (
          <div className={`mt-1.5 border-l-2 border-gray-700/50 ml-3 sm:ml-6 pl-2 sm:pl-3 relative space-y-1.5`}>
            {children.map(child => (
              <AutomationNode key={child.id} node={child} level={level + 1} path={currentPath} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = automations.filter(a => !a.parent_id);

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 text-white">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <span>Visual Flow Builder</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">Create intelligent, nested conversational menus without limits.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <select 
              value={selectedInstance} 
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="flex-1 sm:flex-initial bg-[#2a3942] border border-gray-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 min-w-0 cursor-pointer"
            >
              {instances.filter(i => i.provider === 'meta').map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <button 
              onClick={() => openAddNode(null)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all whitespace-nowrap shadow-md shadow-blue-500/10 cursor-pointer shrink-0"
            >
              <Plus size={15} /> <span>New Flow</span>
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl w-full max-w-lg my-auto max-h-[92vh] flex flex-col shadow-2xl">
            <div className="p-3.5 sm:p-4 border-b border-gray-800 flex justify-between items-center shrink-0 text-white">
              <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                <Bot size={16} className="text-blue-400" />
                <span>{formData.id ? 'Edit Node' : (editingParentId ? 'Add Menu Option' : 'Create Main Flow')}</span>
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Option Name (For Admin)</label>
                <input required placeholder="e.g. Billing Menu" type="text" className="w-full bg-[#202c33] border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-3 py-1.5 sm:py-2 rounded-xl text-xs text-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              {editingParentId ? (
                 <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-1">Match Type:</label>
                        <select className="w-full bg-[#111b21] border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-xs text-white outline-none cursor-pointer" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
                          <option value="exact">Exact Keyword Match</option>
                          <option value="contains">Contains Keyword</option>
                          <option value="all">* Any Message (Fallback)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-1">Keyword(s):</label>
                        <input required={formData.match_type !== 'all'} placeholder={formData.match_type === 'all' ? '* (Any response)' : 'e.g. 1, Yes, Pay Bill'} type="text" className="w-full bg-[#111b21] border border-blue-500/30 focus:border-blue-500 outline-none px-3 py-1.5 rounded-xl text-xs text-white font-mono" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-300/70 flex items-center gap-1 pt-0.5">
                      <AlertCircle size={12} className="shrink-0"/>
                      {formData.match_type === 'exact' && 'Triggers when user message exactly matches one of the keywords.'}
                      {formData.match_type === 'contains' && 'Triggers when user message contains any of the specified words.'}
                      {formData.match_type === 'all' && 'Triggers for any user message in this menu if no exact/contains match found.'}
                    </p>
                 </div>
              ) : (
                <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-1">Start Flow When:</label>
                    <select className="w-full bg-[#111b21] border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs text-white outline-none cursor-pointer" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
                      <option value="exact">Exact Keyword Match</option>
                      <option value="contains">Contains Keyword</option>
                      <option value="welcome">First Time User (Welcome)</option>
                      <option value="all">* Any Message (Catch-all Fallback)</option>
                    </select>
                  </div>
                  {formData.match_type !== 'welcome' && (
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-1">Keyword(s)</label>
                      <input required={formData.match_type !== 'all'} type="text" placeholder={formData.match_type === 'all' ? '* (Wildcard catch-all)' : 'e.g. hi, hello, support, price'} className="w-full bg-[#111b21] border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-xs text-white outline-none font-mono" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
                      <p className="text-[10px] text-emerald-300/70 mt-1">Separate multiple greeting variants with commas (or use * for all).</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action to Perform</label>
                <select className="w-full bg-[#202c33] border border-gray-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none cursor-pointer" value={formData.action_type} onChange={e => setFormData({...formData, action_type: e.target.value})}>
                  <option value="message">Send a Menu / Message</option>
                  <option value="go_back">Go to Previous Menu</option>
                  <option value="go_main">Go to Main Menu</option>
                  <option value="assign_agent">Transfer to Human Agent</option>
                  <option value="api_call">Trigger Webhook / API</option>
                  <option value="end">End Conversation</option>
                </select>
              </div>

              {formData.action_type === 'message' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Message Format</label>
                    <select className="w-full bg-[#202c33] border border-gray-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none cursor-pointer" value={formData.reply_type} onChange={e => setFormData({...formData, reply_type: e.target.value})}>
                      <option value="text">Custom Text Message</option>
                      <option value="template">Meta Approved Template</option>
                    </select>
                  </div>
              )}

              {formData.action_type === 'message' && (
                  formData.reply_type === 'text' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Menu / Message Text</label>
                      <textarea required className="w-full bg-[#202c33] border border-gray-700 p-2.5 rounded-xl text-xs text-white outline-none min-h-[90px] font-mono leading-relaxed resize-none" value={formData.text_content} onChange={e => setFormData({...formData, text_content: e.target.value})} placeholder={"Welcome to iFastX\n\nPlease select an option:\n1. Billing\n2. Support"}></textarea>
                      <p className="text-[10px] text-gray-500 mt-1">Write the text exactly as it will appear on WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Template</label>
                      <select required className="w-full bg-[#202c33] border border-gray-700 px-3 py-1.5 rounded-xl text-xs text-white outline-none cursor-pointer" value={formData.template_name} onChange={e => {
                        const t = templates.find((temp: any) => temp.name === e.target.value);
                        setFormData({...formData, template_name: e.target.value, template_language: t?.language || 'en'});
                      }}>
                        <option value="">Select...</option>
                        {(Array.isArray(templates) ? templates : []).filter((t: any) => t.status === 'APPROVED').map((t: any) => (
                          <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Media URL (Optional, for Media Headers)</label>
                      <div className="flex gap-2 relative">
                          <input type="url" placeholder="https://example.com/image.jpg" className="w-full bg-[#202c33] border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-3 py-1.5 rounded-xl text-xs text-white font-mono" value={formData.media_url || ''} onChange={e => setFormData({...formData, media_url: e.target.value})} />
                          <button type="button" onClick={() => setShowMediaLib(!showMediaLib)} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 font-semibold text-xs rounded-xl hover:bg-blue-500/30 flex items-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer">
                              <ImageIcon size={14} /> <span>Library</span> <ChevronDown size={12} className={`transition-transform ${showMediaLib ? 'rotate-180' : ''}`} />
                          </button>
                          {showMediaLib && (
                              <div className="absolute top-full right-0 mt-1 w-64 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                  <div className="p-2 border-b border-gray-700 bg-black/20 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                    My Media Library
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    <button type="button" onClick={() => {setFormData({...formData, media_url: ''}); setShowMediaLib(false);}} className="w-full text-left p-2 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold cursor-pointer">
                                       [ Clear Attachment ]
                                    </button>
                                    {mediaAssets.length === 0 ? (
                                        <div className="p-3 text-xs text-gray-400 italic text-center">No media found.</div>
                                    ) : (
                                        mediaAssets.map((m: any) => (
                                          <button type="button" key={m.id} onClick={() => {setFormData({...formData, media_url: m.url}); setShowMediaLib(false);}} className="w-full text-left p-2 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-2 cursor-pointer">
                                            <img src={m.url} alt={m.name} className="w-7 h-7 object-cover rounded bg-black/50 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-white truncate">{m.name}</div>
                                                <div className="text-[9px] text-gray-500 font-mono truncate">{m.url}</div>
                                            </div>
                                          </button>
                                        ))
                                    )}
                                  </div>
                              </div>
                          )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Provide public media URL if template header requires media.</p>
                    </div>
                    </div>
                  )
              )}

              <div className="pt-3 border-t border-gray-800 flex justify-end items-center gap-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/10">
                  <Save size={15} /> <span>{formData.id ? 'Save Changes' : 'Save Option'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rootNodes.length === 0 ? (
        <div className="bg-[#1b262c] rounded-2xl border border-gray-700/50 p-6 sm:p-12 text-center shadow-lg my-2 max-w-lg mx-auto">
          <div className="bg-[#2a3942] w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Bot size={24} className="text-gray-400 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-2">Build Your First Automation Flow</h3>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 max-w-xs sm:max-w-md mx-auto leading-relaxed">Create an automated conversational flow with unlimited nested menus, smart routing, and logic branches.</p>
          <button 
            onClick={() => openAddNode(null)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold shadow-md shadow-blue-900/20 cursor-pointer"
          >
            <Plus size={16} /> <span>Create Main Menu Flow</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#111b21] rounded-2xl border border-gray-800/80 p-5 min-h-[500px] shadow-inner">
          {rootNodes.map(root => (
            <AutomationNode key={root.id} node={root} />
          ))}
        </div>
      )}
    </div>
  );
}
