const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

code = code.replace(
    `export default function MetaAutomations({ instances, currentUser, apiBase }) {`,
    `import { ChevronDown, Image as ImageIcon } from 'lucide-react';\n\nexport default function MetaAutomations({ instances, currentUser, apiBase, mediaAssets = [] }) {`
);

code = code.replace(
    `const [templates, setTemplates] = useState([]);`,
    `const [templates, setTemplates] = useState([]);\n  const [showMediaLib, setShowMediaLib] = useState(false);`
);

const oldMediaInput = `<div className="md:col-span-2 mt-4">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Media URL (Optional, for Media Headers)</label>
                      <input type="url" placeholder="https://example.com/image.jpg" className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all" value={formData.media_url || ''} onChange={e => setFormData({...formData, media_url: e.target.value})} />
                      <p className="text-xs text-gray-500 mt-1">If your template has an IMAGE, VIDEO, or DOCUMENT header, provide the public URL here.</p>
                    </div>`;

const newMediaInput = `<div className="md:col-span-2 mt-4">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Media URL (Optional, for Media Headers)</label>
                      <div className="flex gap-2 relative">
                          <input type="url" placeholder="https://example.com/image.jpg" className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all" value={formData.media_url || ''} onChange={e => setFormData({...formData, media_url: e.target.value})} />
                          <button type="button" onClick={() => setShowMediaLib(!showMediaLib)} className="px-4 py-2 bg-blue-500/20 text-blue-400 font-semibold rounded-lg hover:bg-blue-500/30 flex items-center gap-1 transition-all whitespace-nowrap">
                              <ImageIcon size={16} /> Library <ChevronDown size={14} className={\`transition-transform \${showMediaLib ? 'rotate-180' : ''}\`} />
                          </button>
                          {showMediaLib && (
                              <div className="absolute top-full right-0 mt-2 w-72 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                  <div className="p-3 border-b border-gray-700 bg-black/20 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    My Media Library
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    <button type="button" onClick={() => {setFormData({...formData, media_url: ''}); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 transition-all text-xs text-red-400 font-bold">
                                       [ Clear Attachment ]
                                    </button>
                                    {mediaAssets.length === 0 ? (
                                        <div className="p-4 text-xs text-gray-500 italic text-center">No media found. Upload in Media Library.</div>
                                    ) : (
                                        mediaAssets.map(m => (
                                          <button type="button" key={m.id} onClick={() => {setFormData({...formData, media_url: m.url}); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-[#2a3942] border-b border-gray-700/50 last:border-0 transition-all flex items-center gap-3">
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
                      <p className="text-xs text-gray-500 mt-1">If your template has an IMAGE, VIDEO, or DOCUMENT header, provide the public URL here. You can paste a link or choose from your media library.</p>
                    </div>`;

code = code.replace(oldMediaInput, newMediaInput);
fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', code);
console.log("Patched MetaAutomations.tsx Media picker");
