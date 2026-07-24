import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2, ChevronRight, ChevronDown, Edit, ArrowLeft, Home, MessageSquare, Webhook, X, Save, AlertCircle } from 'lucide-react';

export default function MetaAutomations({ instances, currentUser, apiBase }) {
  const [automations, setAutomations] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(instances.find(i => i.provider === "meta")?.id || "");

  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const metaInst = instances.find(i => i.provider === "meta");
      if (metaInst) setSelectedInstance(metaInst.id);
    }
  }, [instances]);

  const [templates, setTemplates] = useState([]);
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
    template_language: 'en',
    action_type: 'message'
  });

  useEffect(() => {
    if (selectedInstance) {
      fetchAutomations();
      fetchTemplates();
    }
  }, [selectedInstance]);

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
      if (res.ok) setTemplates(data);
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
        setFormData({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message' });
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
    setFormData({ id: null, name: '', keyword: '', match_type: parentId ? 'exact' : 'welcome', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message' });
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

  const AutomationNode = ({ node, level = 0 }) => {
    const children = automations.filter(a => a.parent_id === node.id);
    const [expanded, setExpanded] = useState(true);

    return (
      <div className="mb-2">
        <div className={`flex items-center gap-3 p-3 rounded-xl border border-gray-700/50 bg-[#1b262c]/80 hover:bg-[#202c33] transition-colors shadow-sm ${level > 0 ? 'ml-8' : ''}`}>
          {children.length > 0 ? (
            <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-white bg-gray-800/50 p-1 rounded">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div className="w-[24px]"></div>
          )}
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-white text-base">{node.name || 'Unnamed Option'}</span>
              
              {!node.parent_id && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-medium tracking-wider">
                  {node.match_type === 'welcome' ? 'Start: Welcome Msg' : `Start: "${node.keyword}"`}
                </span>
              )}
              {node.parent_id && (
                <span className="text-[11px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-mono flex items-center gap-1">
                  If User Types <span className="font-bold text-blue-200 px-1 bg-blue-900/30 rounded">"{node.keyword}"</span>
                </span>
              )}
              
              <span className="text-[11px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded flex items-center gap-1.5 border border-gray-700">
                <ActionIcon type={node.action_type} />
                {node.action_type === 'message' ? 'Send Menu/Msg' :
                 node.action_type === 'go_back' ? 'Go Back' :
                 node.action_type === 'go_main' ? 'Main Menu' :
                 node.action_type === 'end' ? 'End Chat' : node.action_type}
              </span>
            </div>
            
            {node.action_type === 'message' && (
              <div className="text-sm text-gray-400 bg-[#111b21] p-2 rounded border border-gray-800/50 line-clamp-2">
                {node.reply_type === 'template' ? `Template: ${node.template_name}` : node.text_content}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            {node.action_type === 'message' && (
              <button onClick={() => openAddNode(node.id)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg flex items-center gap-1 text-xs font-medium" title="Add Child Option">
                <Plus size={14} /> Add Option
              </button>
            )}
            <div className="w-px h-6 bg-gray-700 mx-1"></div>
            <button onClick={() => openEditNode(node)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="Edit">
              <Edit size={16} />
            </button>
            <button onClick={() => handleDelete(node.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {expanded && children.length > 0 && (
          <div className={`mt-2 border-l-2 border-gray-700/50 ml-6 pl-4 relative`}>
            {children.map(child => (
              <AutomationNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = automations.filter(a => !a.parent_id);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg md:text-xl md:text-2xl font-bold flex items-center gap-2"><Bot /> Visual Flow Builder</h2>
          <p className="text-sm text-gray-400 mt-1">Create intelligent, nested conversational menus without limits.</p>
        </div>
        <div className="flex items-center gap-4">
            <select 
              value={selectedInstance} 
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white"
            >
              {instances.filter(i => i.provider === 'meta').map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <button onClick={() => openAddNode(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
              <Plus size={16} /> New Flow
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#111b21] p-4 border-b border-gray-700 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {formData.id ? 'Edit Node' : (editingParentId ? 'Add Menu Option' : 'Create Main Flow')}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5 text-gray-300">Option Name (For Admin)</label>
                <input required placeholder="e.g. Billing Menu" type="text" className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              {editingParentId ? (
                 <div className="md:col-span-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                    <label className="block text-sm font-medium mb-1.5 text-blue-200">If Customer Replies With:</label>
                    <input required placeholder="e.g. 1, Yes, Pay Bill" type="text" className="w-full bg-[#111b21] border border-blue-500/30 focus:border-blue-500 outline-none p-2.5 rounded-lg text-white font-mono text-lg" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
                    <p className="text-xs text-blue-300/60 mt-2 flex items-center gap-1"><AlertCircle size={14}/> This option triggers when the user types this exact keyword while in the parent menu.</p>
                 </div>
              ) : (
                <div className="md:col-span-2 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-emerald-200">Start Flow When:</label>
                    <select className="w-full bg-[#111b21] border border-emerald-500/30 p-2.5 rounded-lg text-white outline-none" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
                      <option value="welcome">First Time User Messages (Welcome)</option>
                      <option value="exact">User Sends Exact Keyword</option>
                      <option value="contains">Message Contains Keyword</option>
                    </select>
                  </div>
                  {formData.match_type !== 'welcome' && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-emerald-200">Keyword</label>
                      <input required type="text" className="w-full bg-[#111b21] border border-emerald-500/30 p-2.5 rounded-lg text-white outline-none" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2 pt-2">
                <label className="block text-sm font-medium mb-1.5 text-gray-300">Action to Perform</label>
                <select className="w-full bg-[#202c33] border border-gray-600 p-2.5 rounded-lg text-white outline-none" value={formData.action_type} onChange={e => setFormData({...formData, action_type: e.target.value})}>
                  <option value="message">Send a Menu / Message</option>
                  <option value="go_back">Go to Previous Menu</option>
                  <option value="go_main">Go to Main Menu</option>
                  <option value="assign_agent">Transfer to Human Agent</option>
                  <option value="api_call">Trigger Webhook / API</option>
                  <option value="end">End Conversation</option>
                </select>
              </div>

              {formData.action_type === 'message' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 text-gray-300">Message Format</label>
                    <select className="w-full bg-[#202c33] border border-gray-600 p-2.5 rounded-lg text-white outline-none" value={formData.reply_type} onChange={e => setFormData({...formData, reply_type: e.target.value})}>
                      <option value="text">Custom Text Message</option>
                      <option value="template">Meta Approved Template</option>
                    </select>
                  </div>
              )}

              {formData.action_type === 'message' && (
                  formData.reply_type === 'text' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Menu / Message Text</label>
                      <textarea required className="w-full bg-[#202c33] border border-gray-600 p-3 rounded-lg text-white outline-none min-h-[140px]" value={formData.text_content} onChange={e => setFormData({...formData, text_content: e.target.value})} placeholder={"Welcome to iFastX\n\nPlease select an option:\n1. Billing\n2. Support"}></textarea>
                      <p className="text-xs text-gray-500 mt-2">Write the text exactly as it will appear on WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Select Template</label>
                      <select required className="w-full bg-[#202c33] border border-gray-600 p-2.5 rounded-lg text-white outline-none" value={formData.template_name} onChange={e => {
                        const t = templates.find(temp => temp.name === e.target.value);
                        setFormData({...formData, template_name: e.target.value, template_language: t?.language || 'en'});
                      }}>
                        <option value="">Select...</option>
                        {templates.filter(t => t.status === 'APPROVED').map(t => (
                          <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                        ))}
                      </select>
                    </div>
                  )
              )}

              <div className="md:col-span-2 pt-4 border-t border-gray-700 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium">
                  <Save size={18} /> {formData.id ? 'Save Changes' : 'Save Option'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rootNodes.length === 0 ? (
        <div className="bg-[#1b262c] rounded-2xl border border-gray-700/50 p-12 text-center shadow-lg">
          <div className="bg-[#2a3942] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Bot size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Build Your First Automation Flow</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">Create an automated conversational flow with unlimited nested menus, smart routing, and logic branches.</p>
          <button onClick={() => openAddNode(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg inline-flex items-center gap-2 font-medium shadow-md shadow-blue-900/20">
            <Plus size={18} /> Create Main Menu Flow
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
