const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Templates.tsx', 'utf8');

const stateVars = `  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Template Builder State`;
  
const newStateVars = `  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  
  // Template Builder State`;

code = code.replace(stateVars, newStateVars);

const createTemplateFn = `  const createTemplate = async () => {`;
const newCreateTemplateFn = `  const openEdit = (tpl) => {
    let comps = [];
    try { comps = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components; } catch(e){}
    setName(tpl.name);
    setCategory(tpl.category);
    setLanguage(tpl.language);
    
    let h = comps.find(c => c.type === 'HEADER');
    if (h) {
      setHeaderType(h.format || 'NONE');
      setHeaderText(h.text || '');
    } else {
      setHeaderType('NONE');
      setHeaderText('');
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
          const res = await fetch(\`\${apiBase}/api/meta/templates/\${selectedInstance}/\${templateName}\`, {
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

  const createTemplate = async () => {`;

code = code.replace(createTemplateFn, newCreateTemplateFn);

const fetchCall = `        const res = await fetch(\`\${apiBase}/api/meta/templates/create/\${selectedInstance}\`, {
            method: 'POST',`;
const newFetchCall = `        const url = editingTemplateId 
            ? \`\${apiBase}/api/meta/templates/edit/\${selectedInstance}/\${editingTemplateId}\`
            : \`\${apiBase}/api/meta/templates/create/\${selectedInstance}\`;
            
        const payloadToSend = editingTemplateId ? { components } : payload;
            
        const res = await fetch(url, {
            method: 'POST',`;

code = code.replace(fetchCall, newFetchCall);
code = code.replace(`body: JSON.stringify(payload)`, `body: JSON.stringify(payloadToSend)`);

const resetState = `            setIsCreating(false);
            setName(''); setBodyText(''); setHeaderText(''); setFooterText('');
            setHeaderType('NONE'); setButtons([]); setExamples({body: {}, header: {}});`;
const newResetState = `            setIsCreating(false);
            setEditingTemplateId(null);
            setName(''); setBodyText(''); setHeaderText(''); setFooterText('');
            setHeaderType('NONE'); setButtons([]); setExamples({body: {}, header: {}});`;
code = code.replace(resetState, newResetState);

const createTitle = `<h3 className="text-lg font-bold mb-4">Create New Template</h3>`;
const newCreateTitle = `<h3 className="text-lg font-bold mb-4">{editingTemplateId ? 'Edit Template' : 'Create New Template'}</h3>`;
code = code.replace(createTitle, newCreateTitle);

const nameInput = `<input 
                              type="text" 
                              value={name} 
                              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                              placeholder="e.g. order_confirmation"
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                          />`;
const newNameInput = `<input 
                              type="text" 
                              value={name} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                              placeholder="e.g. order_confirmation"
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          />`;
code = code.replace(nameInput, newNameInput);

const categorySelect = `<select 
                              value={category} 
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                          >`;
const newCategorySelect = `<select 
                              value={category} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          >`;
code = code.replace(categorySelect, newCategorySelect);

const langSelect = `<select 
                              value={language} 
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                          >`;
const newLangSelect = `<select 
                              value={language} 
                              disabled={!!editingTemplateId}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 disabled:opacity-50"
                          >`;
code = code.replace(langSelect, newLangSelect);

const cancelBtn = `<button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>`;
const newCancelBtn = `<button onClick={() => { setIsCreating(false); setEditingTemplateId(null); }} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>`;
code = code.replace(cancelBtn, newCancelBtn);

const submitBtn = `<button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg">
                          {loading ? 'Creating...' : 'Submit to Meta for Verification'}
                      </button>`;
const newSubmitBtn = `<button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg">
                          {loading ? 'Submitting...' : (editingTemplateId ? 'Save Changes' : 'Submit to Meta for Verification')}
                      </button>`;
code = code.replace(submitBtn, newSubmitBtn);

const newTplHeader = `                    <h3 className="font-bold text-lg text-white truncate pr-2" title={tpl.name}>{tpl.name}</h3>
                    <span className={\`px-2 py-1 rounded text-xs font-bold whitespace-nowrap \${
                        tpl.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 
                        tpl.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 
                        'bg-yellow-500/20 text-yellow-500'
                    }\`}>
                        {tpl.status}
                    </span>`;
const newTplHeaderWithButtons = `                    <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-bold text-lg text-white truncate" title={tpl.name}>{tpl.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={\`px-2 py-1 rounded text-xs font-bold whitespace-nowrap \${
                            tpl.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 
                            tpl.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 
                            'bg-yellow-500/20 text-yellow-500'
                        }\`}>
                            {tpl.status}
                        </span>
                    </div>`;
code = code.replace(newTplHeader, newTplHeaderWithButtons);

const deleteEditBtn = `                <div className="flex justify-between items-start mb-3">`;
const newDeleteEditBtn = `                <div className="flex justify-end gap-2 mb-2">
                    <button onClick={() => openEdit(tpl)} className="text-gray-400 hover:text-blue-400 p-1"><Edit size={16}/></button>
                    <button onClick={() => deleteTemplate(tpl.name)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                </div>
                <div className="flex justify-between items-start mb-3">`;
code = code.replace(deleteEditBtn, newDeleteEditBtn);

const icons = `import { RefreshCw, LayoutTemplate, AlertCircle, Plus, Trash2 } from 'lucide-react';`;
const newIcons = `import { RefreshCw, LayoutTemplate, AlertCircle, Plus, Trash2, Edit } from 'lucide-react';`;
code = code.replace(icons, newIcons);

fs.writeFileSync('/app/applet/components/Templates.tsx', code);
console.log("Patched Templates.tsx");
