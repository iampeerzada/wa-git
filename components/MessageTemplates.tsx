
import React, { useState } from 'react';
import { MessageTemplate, MediaAsset, InteractiveButton } from '../types';
import { FileText, Plus, Trash2, Edit3, Save, X, Search, Image as ImageIcon, MousePointer2, ExternalLink, Phone, Reply, Zap } from 'lucide-react';

interface MessageTemplatesProps {
  templates: MessageTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
  mediaAssets: MediaAsset[];
}

const MessageTemplates: React.FC<MessageTemplatesProps> = ({ templates, setTemplates, mediaAssets }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaLib, setShowMediaLib] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    content: '', 
    mediaUrl: '',
    isTemporary: false,
    buttons: [] as InteractiveButton[]
  });

  const handleSave = () => {
    if (!formData.name || !formData.content) {
      alert('Please fill in both name and content');
      return;
    }

    if (editingId) {
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } : t));
      setEditingId(null);
    } else {
      const newTemplate: MessageTemplate = {
        id: `tpl_${Date.now()}`,
        name: formData.name,
        content: formData.content,
        mediaUrl: formData.mediaUrl || undefined,
        buttons: formData.buttons.length > 0 ? formData.buttons : undefined,
        isTemporary: formData.isTemporary,
        createdAt: new Date().toISOString()
      };
      setTemplates(prev => [newTemplate, ...prev]);
      setIsAdding(false);
    }
    setFormData({ name: '', content: '', mediaUrl: '', buttons: [], isTemporary: false });
  };

  const handleEdit = (template: MessageTemplate) => {
    setFormData({ 
      name: template.name, 
      content: template.content, 
      mediaUrl: template.mediaUrl || '',
      buttons: template.buttons || [],
      isTemporary: template.isTemporary || false
    });
    setEditingId(template.id);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const addButton = () => {
    if (formData.buttons.length >= 3) {
      alert("WhatsApp usually supports a maximum of 3 interactive buttons.");
      return;
    }
    const newBtn: InteractiveButton = {
      id: `btn_${Date.now()}`,
      type: 'reply',
      displayText: 'New Button'
    };
    setFormData(p => ({ ...p, buttons: [...p.buttons, newBtn] }));
  };

  const updateButton = (id: string, updates: Partial<InteractiveButton>) => {
    setFormData(p => ({
      ...p,
      buttons: p.buttons.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const removeButton = (id: string) => {
    setFormData(p => ({
      ...p,
      buttons: p.buttons.filter(b => b.id !== id)
    }));
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-12 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm focus:ring-1 ring-[#25D366]/50 outline-none transition-all text-white placeholder-gray-500"
          />
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', content: '', mediaUrl: '', buttons: [], isTemporary: false }); }}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-green-500/10 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Add Template</span>
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-4 sm:p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm sm:text-base font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            {editingId ? <Edit3 size={18} className="text-yellow-500" /> : <Plus size={18} className="text-[#25D366]" />}
            <span>{editingId ? 'Edit Template' : 'New Template'}</span>
          </h3>
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Template Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Welcome Message"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Attached Media (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="Media URL..."
                    className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none font-mono"
                  />
                  <button 
                    onClick={() => setShowMediaLib(!showMediaLib)}
                    className="px-3 bg-[#2a3942] rounded-xl text-[#25D366] hover:bg-[#32444f] transition-all flex items-center justify-center cursor-pointer"
                  >
                    <ImageIcon size={16} />
                  </button>
                </div>
                {showMediaLib && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="p-2.5 border-b border-gray-700 bg-black/20 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Select Asset</div>
                    <div className="max-h-60 overflow-y-auto">
                      <button onClick={() => {setFormData(p => ({...p, mediaUrl: ''})); setShowMediaLib(false);}} className="w-full text-left p-2.5 hover:bg-red-500/10 text-red-400 text-xs font-bold border-b border-gray-700/50 cursor-pointer">Remove Attachment</button>
                      {mediaAssets.length === 0 ? <p className="p-3 text-xs text-gray-400 italic">Library empty.</p> : mediaAssets.map(a => (
                        <button key={a.id} onClick={() => {setFormData(p => ({...p, mediaUrl: a.url})); setShowMediaLib(false);}} className="w-full flex items-center gap-2.5 p-2.5 hover:bg-[#2a3942] border-b border-gray-800/50 last:border-0 transition-all text-left cursor-pointer">
                           <div className="w-8 h-8 bg-black/20 rounded flex items-center justify-center shrink-0 overflow-hidden">
                              {a.type === 'image' ? <img src={a.url} className="w-full h-full object-cover" /> : <FileText size={14} className="text-gray-500" />}
                           </div>
                           <div className="truncate min-w-0">
                             <div className="text-xs font-bold text-white truncate">{a.name}</div>
                             <div className="text-[9px] text-gray-400 uppercase">{a.type}</div>
                           </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
                <input 
                    type="checkbox" 
                    id="isTemp"
                    checked={formData.isTemporary}
                    onChange={(e) => setFormData(p => ({ ...p, isTemporary: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-700 bg-[#202c33] text-[#25D366] focus:ring-[#25D366]/50 outline-none cursor-pointer"
                />
                <label htmlFor="isTemp" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none">
                    <Zap size={14} className={formData.isTemporary ? "text-amber-400" : "text-gray-500"} />
                    <span>Temporary / Quick Use Template</span>
                </label>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Content (Spintax support: {'{Hi|Hello}'})</label>
              <textarea 
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your message here..."
                rows={3}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all resize-none font-mono text-xs sm:text-sm"
              />
            </div>

            {/* Interactive Buttons Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Interactive Buttons (Max 3)</label>
                <button 
                  onClick={addButton}
                  className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Button
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {formData.buttons.map((btn) => (
                  <div key={btn.id} className="p-3 bg-[#0b141a] rounded-xl border border-gray-800 flex flex-col md:flex-row gap-3 relative animate-in slide-in-from-left-2">
                    <button onClick={() => removeButton(btn.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all cursor-pointer"><Trash2 size={10} /></button>
                    
                    <div className="flex-1 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Button Type</label>
                          <select 
                            value={btn.type}
                            onChange={(e) => updateButton(btn.id, { type: e.target.value as any })}
                            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                          >
                            <option value="reply">Quick Reply (Back)</option>
                            <option value="url">Visit Website (URL)</option>
                            <option value="call">Call Phone</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Label</label>
                          <input 
                            type="text"
                            value={btn.displayText}
                            onChange={(e) => updateButton(btn.id, { displayText: e.target.value })}
                            placeholder="Button Text"
                            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                      
                      {btn.type === 'url' && (
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">URL Address</label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={btn.url || ''}
                              onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                              placeholder="https://example.com"
                              className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white outline-none"
                            />
                            <ExternalLink size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      )}

                      {btn.type === 'call' && (
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Phone Number</label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={btn.phoneNumber || ''}
                              onChange={(e) => updateButton(btn.id, { phoneNumber: e.target.value })}
                              placeholder="+919876543210"
                              className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white outline-none"
                            />
                            <Phone size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-gray-800">
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-3.5 py-2 text-gray-400 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-500/10 cursor-pointer"
              >
                <Save size={16} />
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full py-10 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <FileText size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">No templates found.</p>
          </div>
        ) : (
          filteredTemplates.map(tpl => (
            <div key={tpl.id} className={`bg-[#111b21] rounded-xl border ${tpl.isTemporary ? 'border-amber-500/30' : 'border-gray-800/80'} p-2.5 sm:p-3 flex flex-col group hover:border-gray-600 transition-all shadow-md relative`}>
              {tpl.isTemporary && (
                  <div className="absolute top-2 right-2">
                      <div className="bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                          <Zap size={9} /> Temp
                      </div>
                  </div>
              )}
              <div className="flex justify-between items-start mb-2 pr-10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tpl.isTemporary ? 'bg-amber-500/10 text-amber-400' : 'bg-[#25D366]/10 text-[#25D366]'}`}>
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs group-hover:text-[#25D366] transition-colors truncate" title={tpl.name}>{tpl.name}</h4>
                    <span className="text-[9px] text-gray-500 font-mono">{(() => {
                      const dateStr = String(tpl.createdAt).trim();
                      const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                      const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                      return new Date(utcDateStr).toLocaleDateString();
                    })()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mb-1.5">
                <button onClick={() => handleEdit(tpl)} className="p-1 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer" title="Edit">
                  <Edit3 size={13} />
                </button>
                <button onClick={() => handleDelete(tpl.id)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tpl.mediaUrl && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] text-blue-400 font-bold uppercase">
                      <ImageIcon size={9} /> Media
                    </div>
                  )}
                  {tpl.buttons && tpl.buttons.length > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[8px] text-purple-400 font-bold uppercase">
                      <MousePointer2 size={9} /> {tpl.buttons.length} Buttons
                    </div>
                  )}
                </div>
                <p className="text-gray-300 text-[11px] line-clamp-2 bg-[#0b141a]/60 p-2 rounded-lg border border-gray-800/60 font-mono leading-relaxed">
                  {tpl.content}
                </p>
                {tpl.buttons && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {tpl.buttons.map(b => (
                      <div key={b.id} className="flex items-center gap-1 text-[8px] text-gray-400 bg-gray-800/40 border border-gray-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {b.type === 'url' ? <ExternalLink size={9} /> : b.type === 'call' ? <Phone size={9} /> : <Reply size={9} />}
                        <span className="truncate">{b.displayText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageTemplates;
