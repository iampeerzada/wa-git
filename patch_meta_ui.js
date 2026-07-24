const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

const oldInitialState = `const [formData, setFormData] = useState({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '' });`;
const newInitialState = `const [formData, setFormData] = useState({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '', options: [] });`;
code = code.replace(oldInitialState, newInitialState);

const oldReset1 = `setFormData({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '' });`;
const newReset1 = `setFormData({ id: null, name: '', keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '', options: [] });`;
code = code.replace(oldReset1, newReset1);

const oldReset2 = `setFormData({ id: null, name: '', keyword: '', match_type: parentId ? 'exact' : 'welcome', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '' });`;
const newReset2 = `setFormData({ id: null, name: '', keyword: '', match_type: parentId ? 'exact' : 'welcome', reply_type: 'text', text_content: '', template_name: '', template_language: 'en', action_type: 'message', media_url: '', options: [] });`;
code = code.replace(oldReset2, newReset2);

const oldEditData = `setFormData({ 
      id: node.id, 
      name: node.name || '',
      keyword: node.keyword, 
      match_type: node.match_type, 
      reply_type: node.reply_type, 
      text_content: node.text_content || '', 
      template_name: node.template_name || '', 
      template_language: node.template_language || 'en',
      action_type: node.action_type || 'message',
      media_url: node.media_url || '',
    });`;

const newEditData = `
    let parsedOpts = [];
    try {
        if (typeof node.options === 'string') parsedOpts = JSON.parse(node.options);
        else if (Array.isArray(node.options)) parsedOpts = node.options;
    } catch(e) {}
    setFormData({ 
      id: node.id, 
      name: node.name || '',
      keyword: node.keyword, 
      match_type: node.match_type, 
      reply_type: node.reply_type, 
      text_content: node.text_content || '', 
      template_name: node.template_name || '', 
      template_language: node.template_language || 'en',
      action_type: node.action_type || 'message',
      media_url: node.media_url || '',
      options: parsedOpts || []
    });`;
code = code.replace(oldEditData, newEditData);

const newButtonsUI = `
                    <div className="md:col-span-2 mt-4 bg-black/20 p-4 rounded-xl border border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-300">Interactive Buttons (Up to 3 Quick Replies)</label>
                            {(!formData.options || formData.options.length < 3) && (
                                <button type="button" onClick={() => setFormData({...formData, options: [...(formData.options || []), { text: '' }]})} className="text-xs text-blue-400 font-bold flex items-center gap-1 hover:text-blue-300">
                                    <Plus size={14} /> Add Button
                                </button>
                            )}
                        </div>
                        
                        {(formData.options || []).length > 0 ? (
                            <div className="space-y-2">
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Button Text (max 20 chars)" 
                                            maxLength={20}
                                            value={opt.text || opt.title || opt || ''} 
                                            onChange={e => {
                                                const newOpts = [...formData.options];
                                                newOpts[idx] = { text: e.target.value };
                                                setFormData({...formData, options: newOpts});
                                            }}
                                            className="flex-1 bg-[#111b21] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2 rounded-lg text-white transition-all text-sm"
                                        />
                                        <button type="button" onClick={() => {
                                            const newOpts = formData.options.filter((_, i) => i !== idx);
                                            setFormData({...formData, options: newOpts});
                                        }} className="p-2 text-gray-500 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No buttons added. Message will be sent as standard text/media.</p>
                        )}
                    </div>`;

code = code.replace(
    `className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all min-h-[100px]" value={formData.text_content} onChange={e => setFormData({...formData, text_content: e.target.value})} />\n                    </div>`,
    `className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all min-h-[100px]" value={formData.text_content} onChange={e => setFormData({...formData, text_content: e.target.value})} />\n                    </div>\n${newButtonsUI}`
);

fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', code);
console.log("Patched MetaAutomations.tsx UI");
