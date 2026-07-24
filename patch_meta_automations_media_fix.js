const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MetaAutomations.tsx', 'utf8');

const target = `<div className="md:col-span-2">
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
                    <div className="md:col-span-2 mt-4">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Media URL (Optional, for Media Headers)</label>
                      <input type="url" placeholder="https://example.com/image.jpg" className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all" value={formData.media_url || ''} onChange={e => setFormData({...formData, media_url: e.target.value})} />
                      <p className="text-xs text-gray-500 mt-1">If your template has an IMAGE, VIDEO, or DOCUMENT header, provide the public URL here.</p>
                    </div>`;

const replace = `<>
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
                    <div className="md:col-span-2 mt-4">
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Media URL (Optional, for Media Headers)</label>
                      <input type="url" placeholder="https://example.com/image.jpg" className="w-full bg-[#202c33] border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none p-2.5 rounded-lg text-white transition-all" value={formData.media_url || ''} onChange={e => setFormData({...formData, media_url: e.target.value})} />
                      <p className="text-xs text-gray-500 mt-1">If your template has an IMAGE, VIDEO, or DOCUMENT header, provide the public URL here.</p>
                    </div>
                    </>`;

code = code.replace(target, replace);
fs.writeFileSync('/app/applet/components/MetaAutomations.tsx', code);
console.log("Patched MetaAutomations fragment fix");
