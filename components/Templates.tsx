import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutTemplate, AlertCircle } from 'lucide-react';

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
  
  useEffect(() => {
    if (selectedInstance) fetchTemplates();
  }, [selectedInstance]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/api/meta/templates/${selectedInstance}`, {
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
      const res = await fetch(`${apiBase}/api/meta/templates/sync/${selectedInstance}`, {
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

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-lg md:text-xl md:text-2xl font-bold">Meta Templates</h2>
        <div className="flex flex-wrap gap-4">
          <select 
            value={selectedInstance} 
            onChange={(e) => setSelectedInstance(e.target.value)}
            className="bg-[#2a3942] border border-gray-700 p-2 rounded-lg text-white outline-none focus:border-blue-500 transition-colors"
          >
            {instances.filter(i => i.provider === 'meta').map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
            {instances.filter(i => i.provider === 'meta').length === 0 && (
              <option value="" disabled>No Meta instances available</option>
            )}
          </select>
          <button 
            onClick={syncTemplates} 
            disabled={loading || !selectedInstance}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            Sync from Meta
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm">{error}. Please check your Meta configuration in the Dashboard.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-[#202c33] p-6 rounded-xl shadow-sm border border-gray-700 hover:border-gray-600 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-lg text-green-500">
                  <LayoutTemplate size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-100">{t.name}</h3>
                  <p className="text-sm text-gray-400 uppercase tracking-wider text-[11px] font-semibold mt-1">{t.language}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${t.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {t.status}
              </span>
            </div>
            
            {t.category && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 font-mono">CATEGORY: {t.category}</p>
              </div>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex flex-col items-center justify-center p-12 bg-[#202c33]/50 border border-dashed border-gray-700 rounded-xl">
              <div className="w-16 h-16 bg-[#2a3942] rounded-full flex items-center justify-center mb-4 text-gray-500">
                <LayoutTemplate size={32} />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-200 mb-2">No templates found</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                Your approved WhatsApp templates will appear here. Click the sync button above to fetch them from your Meta Business account.
              </p>
              <button 
                onClick={syncTemplates} 
                disabled={loading || !selectedInstance}
                className="bg-[#2a3942] hover:bg-[#324550] text-gray-200 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}