import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutTemplate, AlertCircle, Plus, Trash2, Edit, ChevronDown, Image as ImageIcon, XCircle, X } from 'lucide-react';

export default function Templates({ instances = [], currentUser, apiBase, mediaAssets = [] }) {
  const [templates, setTemplates] = useState([]);
  
  // Filter meta instances, or fallback to all instances if no provider="meta" tag is set
  const metaInstances = instances.filter(i => i.provider === "meta" || i.metaPhoneNumberId || i.metaWabaId);
  const availableInstances = metaInstances.length > 0 ? metaInstances : instances;

  const [selectedInstance, setSelectedInstance] = useState(() => {
    return availableInstances.length > 0 ? availableInstances[0].id : "";
  });
  
  const [error, setError] = useState("");

  useEffect(() => {
    if (availableInstances.length > 0 && (!selectedInstance || !availableInstances.some(i => i.id === selectedInstance))) {
      setSelectedInstance(availableInstances[0].id);
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
      if (res.ok) {
        const tplList = Array.isArray(data) ? data : (Array.isArray(data?.templates) ? data.templates : (Array.isArray(data?.data) ? data.data : []));
        setTemplates(tplList);
      }
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
                headerComp.example = { header_url: [sampleUrl] };
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
    <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 p-2.5 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-4 bg-[#111b21] rounded-2xl border border-gray-800/80">
        <div>
          <h2 className="text-xs sm:text-sm md:text-base font-bold text-white flex items-center gap-2">
            <LayoutTemplate size={18} className="text-[#25D366] shrink-0" />
            <span>Meta Templates</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Manage and sync official Meta WhatsApp message templates</p>
        </div>
        {availableInstances.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Meta Instance:</span>
            <select 
              value={selectedInstance} 
              onChange={e => setSelectedInstance(e.target.value)}
              className="bg-[#202c33] text-white border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs w-full sm:w-auto outline-none focus:ring-1 focus:ring-[#25D366] cursor-pointer font-medium"
            >
              {availableInstances.map(i => (
                <option key={i.id} value={i.id}>{i.name} {i.phoneNumber ? `(${i.phoneNumber})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-xs">{error}</div>}
      
      {isCreating ? (
          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-3 sm:p-4 mb-4 space-y-2.5 sm:space-y-3 max-w-2xl mx-auto shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <LayoutTemplate size={15} className="text-[#25D366]" />
                  <span>{editingTemplateId ? 'Edit Template' : 'Create New Template'}</span>
                </h3>
                <button onClick={() => { setIsCreating(false); setEditingTemplateId(null); }} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 cursor-pointer">
                  <X size={15} />
                </button>
              </div>
              
              <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Template Name</label>
                          <input 
                              type="text" 
                              value={name} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                              placeholder="e.g. order_update"
                              className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs disabled:opacity-50 font-mono"
                          />
                          <p className="text-[8px] text-gray-500 mt-0.5">Lowercase, numbers, underscores.</p>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Category</label>
                          <select 
                              value={category} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs disabled:opacity-50 cursor-pointer"
                          >
                              <option value="MARKETING">Marketing (Promotions)</option>
                              <option value="UTILITY">Utility (Updates, Alerts)</option>
                              <option value="AUTHENTICATION">Authentication (OTPs)</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Language</label>
                          <select 
                              value={language} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs disabled:opacity-50 cursor-pointer"
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
                  <div className="border border-gray-800/80 p-2.5 rounded-xl bg-[#182229]/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[11px] font-bold text-gray-300">Header (Optional)</label>
                        <select value={headerType} onChange={e => setHeaderType(e.target.value)} className="bg-[#202c33] text-xs text-white border border-gray-700 rounded-lg px-2 py-0.5 outline-none cursor-pointer">
                            <option value="NONE">None</option>
                            <option value="TEXT">Text</option>
                            <option value="IMAGE">Image</option>
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Document</option>
                        </select>
                      </div>
                      {headerType === 'TEXT' && (
                          <div className="mt-1 space-y-1">
                            <input type="text" maxLength={60} value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Header text (max 60 chars, {{1}})" className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs font-mono" />
                            {headerVars.length > 0 && (
                                <div className="p-2 bg-[#0b141a] rounded-lg border border-gray-800/80 space-y-1">
                                    <p className="text-[9px] text-gray-400">Header Variable Examples:</p>
                                    {headerVars.map(v => (
                                        <input key={'hv'+v} type="text" placeholder={`Example for {{${v}}}`} value={examples.header[v] || ''} onChange={e => setExamples({...examples, header: {...examples.header, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded-md px-2 py-0.5 text-xs font-mono" />
                                    ))}
                                </div>
                            )}
                          </div>
                      )}
                      {['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-1 space-y-1 relative">
                              <div className="flex gap-1.5 relative">
                                  <input 
                                      type="url" 
                                      value={headerMediaUrl} 
                                      onChange={(e) => setHeaderMediaUrl(e.target.value)} 
                                      placeholder={`Sample ${headerType.toLowerCase()} URL`}
                                      className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs font-mono"
                                  />
                                  <button type="button" onClick={() => setShowMediaLib(!showMediaLib)} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 font-semibold text-[11px] rounded-lg hover:bg-blue-500/30 flex items-center gap-1 transition-all shrink-0 cursor-pointer">
                                      <ImageIcon size={13} /> <span>Library</span> <ChevronDown size={11} className={`transition-transform ${showMediaLib ? 'rotate-180' : ''}`} />
                                  </button>
                                  {showMediaLib && (
                                      <div className="absolute top-full right-0 mt-1 w-60 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                          <div className="p-1.5 border-b border-gray-700 bg-black/20 text-[9px] font-bold uppercase text-gray-400 tracking-wider">
                                            My Media Library
                                          </div>
                                          <div className="max-h-40 overflow-y-auto">
                                            <button onClick={() => {setHeaderMediaUrl(''); setShowMediaLib(false);}} className="w-full text-left p-1.5 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold cursor-pointer">
                                               [ Clear Attachment ]
                                            </button>
                                            {mediaAssets.length === 0 ? (
                                                <div className="p-2 text-xs text-gray-400 italic text-center">No media found.</div>
                                            ) : (
                                                mediaAssets.map(m => (
                                                  <button key={m.id} onClick={() => {setHeaderMediaUrl(m.url); setShowMediaLib(false);}} className="w-full text-left p-1.5 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-2 cursor-pointer">
                                                    <img src={m.url} alt={m.name} className="w-6 h-6 object-cover rounded bg-black/50 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-bold text-white truncate">{m.name}</div>
                                                        <div className="text-[8px] text-gray-500 font-mono truncate">{m.url}</div>
                                                    </div>
                                                  </button>
                                                ))
                                            )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <p className="text-[8px] text-gray-500">Sample media URL is required by Meta for verification.</p>
                          </div>
                      )}
                  </div>
                  
                  {/* Body */}
                  <div className="border border-gray-800/80 p-2.5 rounded-xl bg-[#182229]/40 space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-300">Body Text</label>
                      <textarea 
                          value={bodyText} 
                          onChange={(e) => setBodyText(e.target.value)}
                          placeholder="Hello {{1}}, your order {{2}} is confirmed..."
                          rows={2}
                          maxLength={1024}
                          className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg p-2 text-xs font-mono leading-relaxed resize-none"
                      />
                      {bodyVars.length > 0 && (
                          <div className="p-2 bg-[#0b141a] rounded-lg border border-gray-800/80 space-y-1">
                              <p className="text-[9px] text-gray-400">Body Variable Examples (Required by Meta):</p>
                              {bodyVars.map(v => (
                                  <input key={'bv'+v} type="text" placeholder={`Example for {{${v}}}`} value={examples.body[v] || ''} onChange={e => setExamples({...examples, body: {...examples.body, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded-md px-2 py-0.5 text-xs font-mono" />
                              ))}
                          </div>
                      )}
                  </div>
                  
                  {/* Footer */}
                  <div className="border border-gray-800/80 p-2.5 rounded-xl bg-[#182229]/40 space-y-1">
                      <label className="block text-[11px] font-bold text-gray-300">Footer (Optional)</label>
                      <input 
                          type="text" 
                          value={footerText} 
                          onChange={(e) => setFooterText(e.target.value)} 
                          placeholder="Footer text (max 60 chars)"
                          maxLength={60}
                          className="w-full bg-[#202c33] text-white border border-gray-700 focus:border-[#25D366] outline-none rounded-lg px-2.5 py-1 text-xs font-mono"
                      />
                  </div>
                  
                  {/* Buttons */}
                  <div className="border border-gray-800/80 p-2.5 rounded-xl bg-[#182229]/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                          <label className="block text-[11px] font-bold text-gray-300">Buttons (Max 3)</label>
                          <button onClick={handleAddButton} disabled={buttons.length >= 3} className="text-[11px] bg-[#202c33] hover:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"><Plus size={12}/> <span>Add Button</span></button>
                      </div>
                      <div className="space-y-1.5">
                          {buttons.map((btn, i) => (
                              <div key={i} className="flex gap-1.5 items-start">
                                  <select value={btn.type} onChange={e => { const nb = [...buttons]; nb[i].type = e.target.value; setButtons(nb); }} className="bg-[#202c33] text-white border border-gray-700 rounded-lg px-2 py-1 text-xs w-1/3 outline-none cursor-pointer">
                                      <option value="QUICK_REPLY">Quick Reply</option>
                                      <option value="URL">URL</option>
                                      <option value="PHONE_NUMBER">Phone</option>
                                  </select>
                                  <div className="w-full space-y-1">
                                      <input type="text" value={btn.text} onChange={e => { const nb = [...buttons]; nb[i].text = e.target.value; setButtons(nb); }} placeholder="Button Text (Max 25)" maxLength={25} className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-2 py-1 text-xs outline-none" />
                                      {btn.type === 'URL' && <input type="url" value={btn.url} onChange={e => { const nb = [...buttons]; nb[i].url = e.target.value; setButtons(nb); }} placeholder="https://..." className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-2 py-1 text-xs outline-none font-mono" />}
                                      {btn.type === 'PHONE_NUMBER' && <input type="tel" value={btn.phone} onChange={e => { const nb = [...buttons]; nb[i].phone = e.target.value; setButtons(nb); }} placeholder="+1234567890" className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-2 py-1 text-xs outline-none font-mono" />}
                                  </div>
                                  <button onClick={() => { const nb = [...buttons]; nb.splice(i, 1); setButtons(nb); }} className="text-red-400 hover:text-red-300 p-1 cursor-pointer rounded-lg hover:bg-red-500/10"><Trash2 size={14} /></button>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                      <button onClick={() => { setIsCreating(false); setEditingTemplateId(null); }} className="px-3 py-1 rounded-xl border border-gray-700 text-xs font-bold text-gray-300 hover:bg-gray-800 cursor-pointer">Cancel</button>
                      <button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-3.5 py-1 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-md shadow-green-500/10">
                          {loading ? 'Submitting...' : (editingTemplateId ? 'Save Changes' : 'Submit to Meta for Verification')}
                      </button>
                  </div>
              </div>
          </div>
       ) : (
          <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={() => setIsCreating(true)} 
                className="flex-1 sm:flex-none bg-[#111b21] hover:bg-[#202c33] border border-gray-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                  <LayoutTemplate size={14} className="text-[#25D366]" /> <span>Create Template</span>
              </button>
              <button 
                  onClick={syncTemplates} 
                  disabled={loading}
                  className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-green-500/10"
              >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span>Sync from Meta</span>
              </button>
          </div>
       )}

       {!selectedInstance ? (
        <div className="bg-[#111b21] p-5 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center my-3 max-w-md mx-auto space-y-2">
            <div className="p-2 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white">No Instance Selected</h3>
            <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">Templates are only available for official Meta WhatsApp instances.</p>
        </div>
       ) : (!Array.isArray(templates) || templates.length === 0) ? (
        <div className="bg-[#111b21] p-5 sm:p-6 rounded-2xl border border-gray-800 text-center text-xs text-gray-400 max-w-lg mx-auto">
            No templates found. Click 'Sync from Meta' to fetch your templates, or 'Create Template' to submit a new one for verification.
        </div>
       ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
          {(Array.isArray(templates) ? templates : []).map(tpl => (
            <div key={tpl.id} className="bg-[#111b21] rounded-xl border border-gray-800/80 p-2 sm:p-2.5 flex flex-col hover:border-gray-700 transition-colors shadow-md">
                <div className="flex justify-between items-start mb-1 gap-1.5">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[11px] sm:text-xs text-white truncate" title={tpl.name}>{tpl.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            tpl.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 
                            tpl.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 
                            'bg-amber-500/20 text-amber-400'
                        }`}>
                            {tpl.status}
                        </span>
                        <button onClick={() => openEdit(tpl)} className="text-gray-400 hover:text-blue-400 p-0.5 cursor-pointer" title="Edit"><Edit size={12}/></button>
                        <button onClick={() => deleteTemplate(tpl.name)} className="text-gray-400 hover:text-red-400 p-0.5 cursor-pointer" title="Delete"><Trash2 size={12}/></button>
                    </div>
                </div>
                <div className="flex gap-1 text-[8px] sm:text-[9px] text-gray-400 mb-1.5">
                    <span className="bg-[#202c33] px-1 py-0.5 rounded border border-gray-800 font-medium">{tpl.category}</span>
                    <span className="bg-[#202c33] px-1 py-0.5 rounded border border-gray-800 font-mono">{tpl.language}</span>
                </div>
                
                <div className="bg-[#0b141a] rounded-lg p-1.5 flex-1 overflow-y-auto max-h-24 text-[10px] text-gray-300 border border-gray-800/60 leading-relaxed">
                    {(() => {
                        let components = [];
                        try {
                            components = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components;
                        } catch (e) {}
                        
                        return components?.map((c, i) => {
                            if (c.type === 'HEADER') return <div key={i} className="font-bold text-white mb-0.5 pb-0.5 border-b border-gray-800 text-[9px]">{c.text || `[${c.format} HEADER]`}</div>;
                            if (c.type === 'BODY') return <div key={i} className="whitespace-pre-wrap mb-0.5 text-gray-300 text-[9.5px] line-clamp-3">{c.text}</div>;
                            if (c.type === 'FOOTER') return <div key={i} className="text-[8px] text-gray-500 mt-0.5">{c.text}</div>;
                            if (c.type === 'BUTTONS') return (
                                <div key={i} className="mt-1 space-y-0.5">
                                    {c.buttons?.map((b, j) => (
                                        <div key={j} className="text-[8px] font-medium bg-[#202c33] text-center py-0.5 px-1 rounded text-[#25D366] border border-gray-800 truncate">
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
