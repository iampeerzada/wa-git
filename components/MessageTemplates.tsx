
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', content: '', mediaUrl: '', buttons: [], isTemporary: false }); }}
          className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/10"
        >
          <Plus size={18} />
          Add Template
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            {editingId ? <Edit3 size={20} className="text-yellow-500" /> : <Plus size={20} className="text-[#25D366]" />}
            {editingId ? 'Edit Template' : 'New Template'}
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Template Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Welcome Message"
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Attached Media (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="Media URL..."
                    className="flex-1 bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs outline-none font-mono"
                  />
                  <button 
                    onClick={() => setShowMediaLib(!showMediaLib)}
                    className="px-4 bg-[#2a3942] rounded-xl text-[#25D366] hover:bg-[#32444f] transition-all"
                  >
                    <ImageIcon size={18} />
                  </button>
                </div>
                {showMediaLib && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="p-3 border-b border-gray-700 bg-black/20 text-[10px] font-black uppercase text-gray-500 tracking-widest">Select Asset</div>
                    <div className="max-h-60 overflow-y-auto">
                      <button onClick={() => {setFormData(p => ({...p, mediaUrl: ''})); setShowMediaLib(false);}} className="w-full text-left p-3 hover:bg-red-500/10 text-red-500 text-xs font-bold border-b border-gray-700/50">Remove Attachment</button>
                      {mediaAssets.length === 0 ? <p className="p-4 text-xs text-gray-500 italic">Library empty.</p> : mediaAssets.map(a => (
                        <button key={a.id} onClick={() => {setFormData(p => ({...p, mediaUrl: a.url})); setShowMediaLib(false);}} className="w-full flex items-center gap-3 p-3 hover:bg-[#2a3942] border-b border-gray-800/50 last:border-0 transition-all">
                           <div className="w-10 h-10 bg-black/20 rounded flex items-center justify-center shrink-0 overflow-hidden">
                              {a.type === 'image' ? <img src={a.url} className="w-full h-full object-cover" /> : <FileText size={16} className="text-gray-600" />}
                           </div>
                           <div className="truncate text-left">
                             <div className="text-xs font-bold text-white truncate">{a.name}</div>
                             <div className="text-[9px] text-gray-500 uppercase">{a.type}</div>
                           </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="isTemp"
                    checked={formData.isTemporary}
                    onChange={(e) => setFormData(p => ({ ...p, isTemporary: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-700 bg-[#202c33] text-[#25D366] focus:ring-[#25D366]/50 outline-none"
                />
                <label htmlFor="isTemp" className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 cursor-pointer select-none">
                    <Zap size={14} className={formData.isTemporary ? "text-yellow-500" : "text-gray-600"} />
                    Temporary / Quick Use Template
                </label>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Content (Spintax support: {'{Hi|Hello}'})</label>
              <textarea 
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your message here..."
                rows={4}
                className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 ring-[#25D366]/50 outline-none transition-all resize-none font-mono text-sm"
              />
            </div>

            {/* Interactive Buttons Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Interactive Buttons (Max 3)</label>
                <button 
                  onClick={addButton}
                  className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus size={12} /> Add Button
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {formData.buttons.map((btn, index) => (
                  <div key={btn.id} className="p-4 bg-[#0b141a] rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-4 relative animate-in slide-in-from-left-2">
                    <button onClick={() => removeButton(btn.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"><Trash2 size={12} /></button>
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Button Type</label>
                          <select 
                            value={btn.type}
                            onChange={(e) => updateButton(btn.id, { type: e.target.value as any })}
                            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="reply">Quick Reply (Back)</option>
                            <option value="url">Visit Website (URL)</option>
                            <option value="call">Call Phone</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Label</label>
                          <input 
                            type="text"
                            value={btn.displayText}
                            onChange={(e) => updateButton(btn.id, { displayText: e.target.value })}
                            placeholder="Button Text"
                            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                      </div>
                      
                      {btn.type === 'url' && (
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">URL Address</label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={btn.url || ''}
                              onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                              placeholder="https://example.com"
                              className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white outline-none"
                            />
                            <ExternalLink size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      )}

                      {btn.type === 'call' && (
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Phone Number</label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={btn.phoneNumber || ''}
                              onChange={(e) => updateButton(btn.id, { phoneNumber: e.target.value })}
                              placeholder="+919876543210"
                              className="w-full bg-[#202c33] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white outline-none"
                            />
                            <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-4 py-2 md:px-6 md:py-2.5 text-gray-400 hover:text-white font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-8 py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Save size={18} />
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#111b21] rounded-2xl border border-dashed border-gray-800">
            <FileText size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-medium">No templates found.</p>
          </div>
        ) : (
          filteredTemplates.map(tpl => (
            <div key={tpl.id} className={`bg-[#111b21] rounded-2xl border ${tpl.isTemporary ? 'border-yellow-500/20' : 'border-gray-800'} p-6 flex flex-col group hover:border-gray-600 transition-all shadow-xl relative`}>
              {tpl.isTemporary && (
                  <div className="absolute top-0 right-0 p-2">
                      <div className="bg-yellow-500/10 text-yellow-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                          <Zap size={8} /> Temp
                      </div>
                  </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tpl.isTemporary ? 'bg-yellow-500/10 text-yellow-500' : 'bg-[#25D366]/10 text-[#25D366]'}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-[#25D366] transition-colors">{tpl.name}</h4>
                    <span className="text-[10px] text-gray-500 font-mono">{(() => {
                      const dateStr = String(tpl.createdAt).trim();
                      const isoDate = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
                      const utcDateStr = isoDate.endsWith('Z') ? isoDate : isoDate + 'Z';
                      return new Date(utcDateStr).toLocaleDateString();
                    })()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tpl)} className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tpl.mediaUrl && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-black uppercase">
                      <ImageIcon size={10} /> Media
                    </div>
                  )}
                  {tpl.buttons && tpl.buttons.length > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] text-purple-400 font-black uppercase">
                      <MousePointer2 size={10} /> {tpl.buttons.length} Buttons
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 bg-[#0b141a]/50 p-3 rounded-xl border border-gray-800/50 font-mono">
                  {tpl.content}
                </p>
                {tpl.buttons && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tpl.buttons.map(b => (
                      <div key={b.id} className="flex items-center gap-1 text-[9px] text-gray-500 bg-gray-800/30 px-2 py-1 rounded">
                        {b.type === 'url' ? <ExternalLink size={10} /> : b.type === 'call' ? <Phone size={10} /> : <Reply size={10} />}
                        {b.displayText}
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
