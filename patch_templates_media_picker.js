const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Templates.tsx', 'utf8');

code = code.replace(
    `export default function Templates({ instances, currentUser, apiBase }) {`,
    `import { ChevronDown, Image as ImageIcon, XCircle } from 'lucide-react';\n\nexport default function Templates({ instances, currentUser, apiBase, mediaAssets = [] }) {`
);

code = code.replace(
    `const [headerMediaUrl, setHeaderMediaUrl] = useState('');`,
    `const [headerMediaUrl, setHeaderMediaUrl] = useState('');\n  const [showMediaLib, setShowMediaLib] = useState(false);`
);

const oldMediaInput = `{['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-3">
                              <input 
                                  type="url" 
                                  value={headerMediaUrl} 
                                  onChange={(e) => setHeaderMediaUrl(e.target.value)} 
                                  placeholder={\`Enter sample \${headerType.toLowerCase()} URL (e.g. https://...)\`}
                                  className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2"
                              />
                              <p className="text-xs text-gray-500 mt-1">A sample media URL is required by Meta for verification. If left empty, a placeholder will be used.</p>
                          </div>
                      )}`;

const newMediaInput = `{['IMAGE','VIDEO','DOCUMENT'].includes(headerType) && (
                          <div className="mt-3 space-y-2 relative">
                              <div className="flex gap-2 relative">
                                  <input 
                                      type="url" 
                                      value={headerMediaUrl} 
                                      onChange={(e) => setHeaderMediaUrl(e.target.value)} 
                                      placeholder={\`Enter sample \${headerType.toLowerCase()} URL (e.g. https://...)\`}
                                      className="w-full bg-[#202c33] text-white border border-gray-700 rounded-lg px-4 py-2 outline-none"
                                  />
                                  <button type="button" onClick={() => setShowMediaLib(!showMediaLib)} className="px-4 py-2 bg-blue-500/20 text-blue-400 font-semibold rounded-lg hover:bg-blue-500/30 flex items-center gap-1 transition-all">
                                      <ImageIcon size={16} /> Library <ChevronDown size={14} className={\`transition-transform \${showMediaLib ? 'rotate-180' : ''}\`} />
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
                      )}`;

code = code.replace(oldMediaInput, newMediaInput);
fs.writeFileSync('/app/applet/components/Templates.tsx', code);
console.log("Patched Templates.tsx Media picker");
