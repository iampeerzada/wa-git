import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutTemplate, AlertCircle, Plus, Trash2, Edit } from 'lucide-react';

import { ChevronDown, Image as ImageIcon, XCircle } from 'lucide-react';

export default function Templates({ instances, currentUser, apiBase, mediaAssets = [] }) {
  const [templates, setTemplates] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(instances.find(i => i.provider === "meta")?.id || "");
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const metaInst = instances.find(i => i.provider === "meta");
      if (metaInst) setSelectedInstance(metaInst.id);
    }
  }, [instances]);
  
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  
  // Template Builder State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en');
  
  const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [showMediaLib, setShowMediaLib] = useState(false);
  
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  
  const [buttons, setButtons] = useState([]);
  
  const [examples, setExamples] = useState({ body: {}, header: {} });

  useEffect(() => {
    if (selectedInstance && !isCreating) fetchTemplates();
  }, [selectedInstance, isCreating]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) setTemplates(data);
    } catch (e) {}
  };

  const syncTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/meta/templates/sync/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        fetchTemplates();
      } else { 
        const e = await res.json(); 
        setError(e.error || "Failed to sync templates"); 
      }
    } catch (e) {
      setError("Network error or server unreachable");
    }
    setLoading(false);
  };
  
  const extractVariables = (text) => {
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\D/g, '')))].sort((a, b) => a - b);
  };
  
  const bodyVars = extractVariables(bodyText);
  const headerVars = extractVariables(headerText);
  
  const handleAddButton = () => {
      if (buttons.length >= 3) return;
      setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
  };

  const openEdit = (tpl) => {
    let comps = [];
    try { comps = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components; } catch(e){}
    setName(tpl.name);
    setCategory(tpl.category);
    setLanguage(tpl.language);
    
    let h = comps.find(c => c.type === 'HEADER');
    if (h) {
      setHeaderType(h.format || 'NONE');
      setHeaderText(h.text || '');
      setHeaderMediaUrl(h.example?.header_handle?.[0] || '');
    } else {
      setHeaderType('NONE');
      setHeaderText('');
      setHeaderMediaUrl('');
    }
    
    let b = comps.find(c => c.type === 'BODY');
    if (b) setBodyText(b.text || '');
    
    let f = comps.find(c => c.type === 'FOOTER');
    if (f) setFooterText(f.text || '');
    
    let btns = comps.find(c => c.type === 'BUTTONS');
    if (btns) setButtons(btns.buttons || []);
    else setButtons([]);
    
    setEditingTemplateId(tpl.id);
    setIsCreating(true);
  };
  
  const deleteTemplate = async (templateName) => {
      if (!confirm("Delete template? This will also delete it from WhatsApp.")) return;
      try {
          const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstance}/${templateName}`, {
              method: 'DELETE',
              headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
          });
          if (res.ok) fetchTemplates();
          else {
              const data = await res.json();
              setError(data.error || "Failed to delete");
          }
      } catch (e) {
          setError("Network error");
      }
  };

  const createTemplate = async () => {
    if (!name || !bodyText) {
        setError("Name and Body are required.");
        return;
    }
    
    // Check if examples are provided
    if (bodyVars.length > 0 && bodyVars.some(v => !examples.body[v])) {
        setError("Please provide examples for all body variables.");
        return;
    }
    if (headerType === 'TEXT' && headerVars.length > 0 && headerVars.some(v => !examples.header[v])) {
        setError("Please provide examples for all header variables.");
        return;
    }

    setLoading(true);
    setError("");
    
    try {
        const components = [];
        
        // Header
        if (headerType !== 'NONE') {
            let headerComp = { type: 'HEADER', format: headerType };
            if (headerType === 'TEXT') {
                headerComp.text = headerText;
                if (headerVars.length > 0) {
                    headerComp.example = { header_text: headerVars.map(v => examples.header[v]) };
                }
            } else {
                let sampleUrl = headerMediaUrl;
                if (!sampleUrl) {
                    sampleUrl = "https://ifastx.in/sample.jpg";
                    if (headerType === 'VIDEO') sampleUrl = "https://ifastx.in/sample.mp4";
                    if (headerType === 'DOCUMENT') sampleUrl = "https://ifastx.in/sample.pdf";
                }
                headerComp.example = { header_handle: [sampleUrl] };
            }
            components.push(headerComp);
        }
        
        // Body
        let bodyComp = { type: 'BODY', text: bodyText };
        if (bodyVars.length > 0) {
            bodyComp.example = { body_text: [bodyVars.map(v => examples.body[v])] };
        }
        components.push(bodyComp);
        
        // Footer
        if (footerText) {
            components.push({ type: 'FOOTER', text: footerText });
        }
        
        // Buttons
        if (buttons.length > 0) {
            components.push({
                type: 'BUTTONS',
                buttons: buttons.map(b => {
                    if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
                    if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
                    if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone };
                    return null;
                }).filter(Boolean)
            });
        }
        
        const payload = { name, category, language, components };

        const url = editingTemplateId 
            ? `${apiBase}/api/meta/templates/edit/${selectedInstance}/${editingTemplateId}`
            : `${apiBase}/api/meta/templates/create/${selectedInstance}`;
            
        const payloadToSend = editingTemplateId ? { components } : payload;
            
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey },
            body: JSON.stringify(payloadToSend)
        });
        const data = await res.json();
        if (res.ok) {
            setIsCreating(false);
            setEditingTemplateId(null);
            setName(''); setBodyText(''); setHeaderText(''); setFooterText(''); setHeaderMediaUrl('');
            setHeaderType('NONE'); setButtons([]); setExamples({body: {}, header: {}});
            syncTemplates();
        } else {
            setError(data.error || "Failed to create template");
        }
    } catch (e) {
        setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg md:text-xl md:text-2xl font-bold">Meta Templates</h2>
        {instances.filter(i => i.provider === "meta").length > 0 && (
          <select 
            value={selectedInstance} 
            onChange={e => setSelectedInstance(e.target.value)}
            className="bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
          >
            {instances.filter(i => i.provider === "meta").map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</div>}
      
      {isCreating ? (
          <div className="bg-[#111b21] rounded-xl border border-gray-800 p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">{editingTemplateId ? 'Edit Template' : 'Create New Template'}</h3>
              
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                          <input 
                              type="text" 
                              value={name} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                              placeholder="e.g. order_confirmation"
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">Lowercase, numbers, underscores.</p>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Category</label>
                          <select 
                              value={category} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          >
                              <option value="MARKETING">Marketing (Promotions, Offers)</option>
                              <option value="UTILITY">Utility (Updates, Alerts)</option>
                              <option value="AUTHENTICATION">Authentication (OTPs)</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Language</label>
                          <select 
                              value={language} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          >
                              <option value="en">English (en)</option>
                              <option value="en_US">English (US)</option>
                              <option value="en_GB">English (UK)</option>
                              <option value="es">Spanish (es)</option>
                              <option value="pt_BR">Portuguese (BR)</option>
                              <option value="id">Indonesian (id)</option>
                          </select>
                      </div>
                  </div>
                  
                  {/* Header */}
                  <div className="border border-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-gray-300">Header (Optional)</label>
                        <select value={headerType} onChange={e => setHeaderType(e.target.value)} className="bg-[#202c33] text-sm text-white border border-gray-700 rounded px-2 py-1">
                            <option value="NONE">None</option>
                            <option value="TEXT">Text</option>
                            <option value="IMAGE">Image</option>
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Document</option>
                        </select>
                      </div>
                      {headerType === 'TEXT' && (
                          <div className="mt-2">
                            <input type="text" maxLength={60} value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Header text (max 60 chars, supports {{1}})" className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2" />
                            {headerVars.length > 0 && (
                                <div className="mt-2 p-3 bg-[#0b141a] rounded">
                                    <p className="text-xs text-gray-400 mb-2">Provide example values for header variables (Required for Meta Verification)</p>
                                    {headerVars.map(v => (
                                        <input key={'hv'+v} type="text" placeholder={`Example for {{${v}}}`} value={examples.header[v] || ''} onChange={e => setExamples({...examples, header: {...examples.header, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-1 text-sm mb-2" />
                                    ))}
                                </div>
                            )}
                          </div>
                      )}
                      {['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-3 space-y-2 relative">
                              <div className="flex gap-2 relative">
                                  <input 
                                      type="url" 
                                      value={headerMediaUrl} 
                                      onChange={(e) => setHeaderMediaUrl(e.target.value)} 
                                      placeholder={`Enter sample ${headerType.toLowerCase()} URL (e.g. https://...)`}
                                      className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 outline-none"
                                  />
                                  <button type="button" onClick={() => setShowMediaLib(!showMediaLib)} className="px-4 py-2 bg-blue-500/20 text-blue-400 font-semibold rounded-lg hover:bg-blue-500/30 flex items-center gap-1 transition-all">
                                      <ImageIcon size={16} /> Library <ChevronDown size={14} className={`transition-transform ${showMediaLib ? 'rotate-180' : ''}`} />
                                  </button>
                                  {showMediaLib && (
                                      <div className="absolute top-full right-0 mt-2 w-72 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                          <div className="p-3 border-b border-gray-700 bg-black/20 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                            My Media Library
                                          </div>
                                          <div className="max-h-64 overflow-y-auto">
                                            <button onClick={() => {setHeaderMediaUrl(''); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold">
                                               [ Clear Attachment ]
                                            </button>
                                            {mediaAssets.length === 0 ? (
                                                <div className="p-4 text-xs text-gray-500 italic text-center">No media found. Upload in Media Library.</div>
                                            ) : (
                                                mediaAssets.map(m => (
                                                  <button key={m.id} onClick={() => {setHeaderMediaUrl(m.url); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-3">
                                                    <img src={m.url} alt={m.name} className="w-8 h-8 object-cover rounded bg-black/50" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-white mb-0.5 truncate">{m.name}</div>
                                                        <div className="text-[9px] text-gray-500 font-mono truncate">{m.url}</div>
                                                    </div>
                                                  </button>
                                                ))
                                            )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">A sample media URL is required by Meta for verification. You can paste a link or choose from your media library.</p>
                          </div>
                      )}
                  </div>
                  
                  {/* Body */}
                  <div className="border border-gray-800 p-4 rounded-lg">
                      <label className="block text-sm font-bold text-gray-300 mb-2">Body Text</label>
                      <textarea 
                          value={bodyText} 
                          onChange={(e) => setBodyText(e.target.value)}
                          placeholder="Hello {{1}}, your order {{2}} is confirmed..."
                          rows={4}
                          maxLength={1024}
                          className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                      />
                      {bodyVars.length > 0 && (
                          <div className="mt-2 p-3 bg-[#0b141a] rounded">
                              <p className="text-xs text-gray-400 mb-2">Provide example values for body variables (Required for Meta Verification)</p>
                              {bodyVars.map(v => (
                                  <input key={'bv'+v} type="text" placeholder={`Example for {{${v}}}`} value={examples.body[v] || ''} onChange={e => setExamples({...examples, body: {...examples.body, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-1 text-sm mb-2" />
                              ))}
                          </div>
                      )}
                  </div>
                  
                  {/* Footer */}
                  <div className="border border-gray-800 p-4 rounded-lg">
                      <label className="block text-sm font-bold text-gray-300 mb-2">Footer (Optional)</label>
                      <input 
                          type="text" 
                          value={footerText} 
                          onChange={(e) => setFooterText(e.target.value)} 
                          placeholder="Footer text (max 60 chars)"
                          maxLength={60}
                          className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                      />
                  </div>
                  
                  {/* Buttons */}
                  <div className="border border-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-bold text-gray-300">Buttons (Max 3)</label>
                          <button onClick={handleAddButton} disabled={buttons.length >= 3} className="text-xs bg-[#202c33] hover:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"><Plus size={14}/> Add Button</button>
                      </div>
                      <div className="space-y-3">
                          {buttons.map((btn, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                  <select value={btn.type} onChange={e => { const nb = [...buttons]; nb[i].type = e.target.value; setButtons(nb); }} className="bg-[#202c33] text-white border border-gray-700 rounded px-2 py-2 text-sm w-1/3">
                                      <option value="QUICK_REPLY">Quick Reply</option>
                                      <option value="URL">URL</option>
                                      <option value="PHONE_NUMBER">Phone</option>
                                  </select>
                                  <div className="w-full space-y-2">
                                      <input type="text" value={btn.text} onChange={e => { const nb = [...buttons]; nb[i].text = e.target.value; setButtons(nb); }} placeholder="Button Text (Max 25)" maxLength={25} className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-2 text-sm" />
                                      {btn.type === 'URL' && <input type="url" value={btn.url} onChange={e => { const nb = [...buttons]; nb[i].url = e.target.value; setButtons(nb); }} placeholder="https://..." className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-2 text-sm" />}
                                      {btn.type === 'PHONE_NUMBER' && <input type="tel" value={btn.phone} onChange={e => { const nb = [...buttons]; nb[i].phone = e.target.value; setButtons(nb); }} placeholder="+1234567890" className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-2 text-sm" />}
                                  </div>
                                  <button onClick={() => { const nb = [...buttons]; nb.splice(i, 1); setButtons(nb); }} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                      <button onClick={() => { setIsCreating(false); setEditingTemplateId(null); }} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>
                      <button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg">
                          {loading ? 'Submitting...' : (editingTemplateId ? 'Save Changes' : 'Submit to Meta for Verification')}
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          <div className="flex justify-end gap-4 mb-6">
              <button onClick={() => setIsCreating(true)} className="bg-[#111b21] hover:bg-[#202c33] border border-gray-800 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2">
                  <LayoutTemplate size={18} /> Create Template
              </button>
              <button 
                  onClick={syncTemplates} 
                  disabled={loading}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sync from Meta
              </button>
          </div>
      )}

      {!selectedInstance ? (
        <div className="bg-[#111b21] p-8 rounded-xl border border-gray-800 flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="text-yellow-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Meta Instance Found</h3>
            <p className="text-gray-400">Templates are only available for official Meta WhatsApp instances.</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-[#111b21] p-8 rounded-xl border border-gray-800 text-center text-gray-400">
            No templates found. Click 'Sync from Meta' to fetch your templates, or 'Create Template' to submit a new one for verification.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-[#111b21] rounded-xl border border-gray-800 p-5 flex flex-col hover:border-gray-700 transition-colors">
                <div className="flex justify-end gap-2 mb-2">
                    <button onClick={() => openEdit(tpl)} className="text-gray-400 hover:text-blue-400 p-1"><Edit size={16}/></button>
                    <button onClick={() => deleteTemplate(tpl.name)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                </div>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-bold text-lg text-white truncate" title={tpl.name}>{tpl.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                            tpl.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 
                            tpl.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 
                            'bg-yellow-500/20 text-yellow-500'
                        }`}>
                            {tpl.status}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 text-xs text-gray-500 mb-4">
                    <span className="bg-[#202c33] px-2 py-1 rounded">{tpl.category}</span>
                    <span className="bg-[#202c33] px-2 py-1 rounded">{tpl.language}</span>
                </div>
                
                <div className="bg-[#202c33]/50 rounded p-3 flex-1 overflow-y-auto max-h-48 text-sm text-gray-300">
                    {(() => {
                        let components = [];
                        try {
                            components = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components;
                        } catch (e) {}
                        
                        return components?.map((c, i) => {
                            if (c.type === 'HEADER') return <div key={i} className="font-bold mb-2 pb-2 border-b border-gray-800">{c.text || `[${c.format} HEADER]`}</div>;
                            if (c.type === 'BODY') return <div key={i} className="whitespace-pre-wrap mb-2">{c.text}</div>;
                            if (c.type === 'FOOTER') return <div key={i} className="text-xs text-gray-500 mt-2">{c.text}</div>;
                            if (c.type === 'BUTTONS') return (
                                <div key={i} className="mt-3 space-y-1">
                                    {c.buttons?.map((b, j) => (
                                        <div key={j} className="text-xs bg-[#202c33] text-center p-2 rounded text-[#00a884]">
                                            {b.type === 'URL' ? `🔗 ${b.text}` : b.type === 'PHONE_NUMBER' ? `📞 ${b.text}` : `💬 ${b.text}`}
                                        </div>
                                    ))}
                                </div>
                            );
                            return null;
                        });
                    })()}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
