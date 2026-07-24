const fs = require('fs');
let comp = fs.readFileSync('/app/applet/components/Templates.tsx', 'utf8');

if (comp.includes('createTemplate')) {
    console.log("Already patched Templates.tsx");
} else {
    // Add imports and state variables
    comp = comp.replace(/const \[loading, setLoading\] = useState\(false\);/, 
        `const [loading, setLoading] = useState(false);
         const [isCreating, setIsCreating] = useState(false);
         const [createForm, setCreateForm] = useState({ name: '', category: 'MARKETING', language: 'en', body: '' });`);
         
    // Add createTemplate function
    comp = comp.replace(/const syncTemplates = async \(\) => \{/, 
        `const createTemplate = async () => {
            if (!createForm.name || !createForm.body) {
                setError("Name and Body are required.");
                return;
            }
            setLoading(true);
            setError("");
            try {
                const res = await fetch(\`\${apiBase}/api/meta/templates/create/\${selectedInstance}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey },
                    body: JSON.stringify(createForm)
                });
                const data = await res.json();
                if (res.ok) {
                    setIsCreating(false);
                    setCreateForm({ name: '', category: 'MARKETING', language: 'en', body: '' });
                    syncTemplates(); // sync from Meta after create
                } else {
                    setError(data.error || "Failed to create template");
                }
            } catch (e) {
                setError("Network error");
            }
            setLoading(false);
        };
        
        const syncTemplates = async () => {`);

    // Add UI components
    const uiInsert = `
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-4">{error}</div>}
      
      {isCreating ? (
          <div className="bg-[#111b21] rounded-xl border border-gray-800 p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Create New Template</h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                      <input 
                          type="text" 
                          value={createForm.name} 
                          onChange={(e) => setCreateForm({...createForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})} 
                          placeholder="e.g. order_confirmation"
                          className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and underscores only.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Category</label>
                          <select 
                              value={createForm.category} 
                              onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
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
                              value={createForm.language} 
                              onChange={(e) => setCreateForm({...createForm, language: e.target.value})}
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
                  
                  <div>
                      <label className="block text-sm text-gray-400 mb-1">Body Text</label>
                      <textarea 
                          value={createForm.body} 
                          onChange={(e) => setCreateForm({...createForm, body: e.target.value})}
                          placeholder="Hello {{1}}, your order is confirmed..."
                          rows={4}
                          className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {{1}}, {{2}} for variables.</p>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>
                      <button onClick={createTemplate} disabled={loading} className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg">
                          {loading ? 'Creating...' : 'Submit to Meta'}
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
      )}`;

    comp = comp.replace(/<div className="flex justify-end mb-6">[\s\S]*?<\/div>/, uiInsert);
    
    // Also remove the old error display if it's there
    comp = comp.replace(/\{error && <div className="bg-red-500\/10 text-red-500 p-3 rounded-lg text-sm mb-6">\{error\}<\/div>\}/, '');

    fs.writeFileSync('/app/applet/components/Templates.tsx', comp);
    console.log("Patched Templates.tsx");
}
