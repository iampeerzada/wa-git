import React, { useState, useEffect } from 'react';
import { Bot, Plus, Trash2 } from 'lucide-react';

export default function MetaAutomations({ instances, currentUser }) {
  const [automations, setAutomations] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(instances.find(i => i.provider === "meta")?.id || "");
  useEffect(() => {
    if (instances.length > 0 && !selectedInstance) {
      const metaInst = instances.find(i => i.provider === "meta");
      if (metaInst) setSelectedInstance(metaInst.id);
    }
  }, [instances]);
  const [templates, setTemplates] = useState([]);
  
  const [formData, setFormData] = useState({
    keyword: '',
    match_type: 'exact',
    reply_type: 'text',
    text_content: '',
    template_name: '',
    template_language: 'en'
  });

  useEffect(() => {
    if (selectedInstance) {
      fetchAutomations();
      fetchTemplates();
    }
  }, [selectedInstance]);

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`/api/automations/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) setAutomations(data);
    } catch (e) {}
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/meta/templates/${selectedInstance}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      const data = await res.json();
      if (res.ok) setTemplates(data);
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/automations/${selectedInstance}`, {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchAutomations();
        setFormData({ keyword: '', match_type: 'exact', reply_type: 'text', text_content: '', template_name: '', template_language: 'en' });
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) fetchAutomations();
    } catch (e) {}
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bot /> Meta Automations</h2>
        <select 
          value={selectedInstance} 
          onChange={(e) => setSelectedInstance(e.target.value)}
          className="bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white"
        >
          {instances.filter(i => i.provider === 'meta').map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#202c33] p-6 rounded-xl shadow-sm border border-gray-700 mb-8">
        <h3 className="font-semibold mb-4">Create New Automation</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trigger Keyword</label>
            <input required type="text" className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Match Type</label>
            <select className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
              <option value="exact">Exact Match</option>
              <option value="contains">Contains</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reply Type</label>
            <select className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.reply_type} onChange={e => setFormData({...formData, reply_type: e.target.value})}>
              <option value="text">Standard Text</option>
              <option value="template">Meta Template</option>
            </select>
          </div>
          
          {formData.reply_type === 'text' ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Reply Text</label>
              <textarea required className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" rows="3" value={formData.text_content} onChange={e => setFormData({...formData, text_content: e.target.value})}></textarea>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Select Template</label>
                <select required className="w-full bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white" value={formData.template_name} onChange={e => {
                  const t = templates.find(temp => temp.name === e.target.value);
                  setFormData({...formData, template_name: e.target.value, template_language: t?.language || 'en'});
                }}>
                  <option value="">Select...</option>
                  {templates.filter(t => t.status === 'APPROVED').map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
              <Plus size={18} /> Add Automation
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {automations.map(a => (
          <div key={a.id} className="bg-[#202c33] p-4 rounded-xl shadow-sm border border-gray-700 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-lg">"{a.keyword}"</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{a.match_type}</span>
              </div>
              <p className="text-gray-400 text-sm">
                Replies with {a.reply_type === 'template' ? `Template: ${a.template_name}` : 'Text'}
              </p>
            </div>
            <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
