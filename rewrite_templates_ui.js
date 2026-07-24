const fs = require('fs');

const tsx = `import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutTemplate, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function Templates({ instances, currentUser, apiBase }) {
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
  
  // Template Builder State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en');
  
  const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
  const [headerText, setHeaderText] = useState('');
  
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  
  const [buttons, setButtons] = useState([]);
  
  const [examples, setExamples] = useState({ body: {}, header: {} });

  useEffect(() => {
    if (selectedInstance && !isCreating) fetchTemplates();
  }, [selectedInstance, isCreating]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(\`\${apiBase}/api/meta/templates/\${selectedInstance}\`, {
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
      const res = await fetch(\`\${apiBase}/api/meta/templates/sync/\${selectedInstance}\`, {
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
    const matches = text.match(/\\{\\{(\\d+)\\}\\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\\D/g, '')))].sort((a, b) => a - b);
  };
  
  const bodyVars = extractVariables(bodyText);
  const headerVars = extractVariables(headerText);
  
  const handleAddButton = () => {
      if (buttons.length >= 3) return;
      setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
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
                    headerComp.example = { header_text: [headerVars.map(v => examples.header[v])] };
                }
            } else {
                // Media headers require example handler in meta api, we will omit for simple creation or provide a dummy
                // Meta API requires an example for media. Let's provide a generic sample url based on type
                let sampleUrl = "https://ifastx.in/sample.jpg";
                if (headerType === 'VIDEO') sampleUrl = "https://ifastx.in/sample.mp4";
                if (headerType === 'DOCUMENT') sampleUrl = "https://ifastx.in/sample.pdf";
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

        const res = await fetch(\`\${apiBase}/api/meta/templates/create/\${selectedInstance}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            setIsCreating(false);
            setName(''); setBodyText(''); setHeaderText(''); setFooterText('');
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
              <h3 className="text-lg font-bold mb-4">Create New Template</h3>
              
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                          <input 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                              placeholder="e.g. order_confirmation"
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">Lowercase, numbers, underscores.</p>
                      </div>
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Category</label>
                          <select 
                              value={category} 
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
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
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
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
                                        <input key={'hv'+v} type="text" placeholder={\`Example for {{\${v}}}\`} value={examples.header[v] || ''} onChange={e => setExamples({...examples, header: {...examples.header, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-1 text-sm mb-2" />
                                    ))}
                                </div>
                            )}
                          </div>
                      )}
                      {['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-2 text-xs text-gray-500">
                              A placeholder sample media URL will be sent for verification.
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
                                  <input key={'bv'+v} type="text" placeholder={\`Example for {{\${v}}}\`} value={examples.body[v] || ''} onChange={e => setExamples({...examples, body: {...examples.body, [v]: e.target.value}})} className="w-full bg-[#202c33] text-white border border-gray-700 rounded px-3 py-1 text-sm mb-2" />
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
                      <button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>
                      <button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg">
                          {loading ? 'Creating...' : 'Submit to Meta for Verification'}
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
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white truncate pr-2" title={tpl.name}>{tpl.name}</h3>
                    <span className={\`px-2 py-1 rounded text-xs font-bold whitespace-nowrap \${
                        tpl.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 
                        tpl.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 
                        'bg-yellow-500/20 text-yellow-500'
                    }\`}>
                        {tpl.status}
                    </span>
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
                            if (c.type === 'HEADER') return <div key={i} className="font-bold mb-2 pb-2 border-b border-gray-800">{c.text || \`[\${c.format} HEADER]\`}</div>;
                            if (c.type === 'BODY') return <div key={i} className="whitespace-pre-wrap mb-2">{c.text}</div>;
                            if (c.type === 'FOOTER') return <div key={i} className="text-xs text-gray-500 mt-2">{c.text}</div>;
                            if (c.type === 'BUTTONS') return (
                                <div key={i} className="mt-3 space-y-1">
                                    {c.buttons?.map((b, j) => (
                                        <div key={j} className="text-xs bg-[#202c33] text-center p-2 rounded text-[#00a884]">
                                            {b.type === 'URL' ? \`🔗 \${b.text}\` : b.type === 'PHONE_NUMBER' ? \`📞 \${b.text}\` : \`💬 \${b.text}\`}
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
`;
fs.writeFileSync('/app/applet/components/Templates.tsx', tsx);
console.log("Rewrote Templates.tsx successfully.");
