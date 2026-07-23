import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutTemplate } from 'lucide-react';

export default function Templates({ instances }) {
  const [templates, setTemplates] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(instances[0]?.id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedInstance) fetchTemplates();
  }, [selectedInstance]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(\`/api/meta/templates/\${selectedInstance}\`, {
        headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
      });
      const data = await res.json();
      if (res.ok) setTemplates(data);
    } catch (e) {}
  };

  const syncTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`/api/meta/templates/sync/\${selectedInstance}\`, {
        headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (res.ok) fetchTemplates();
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Meta Templates</h2>
        <div className="flex gap-4">
          <select 
            value={selectedInstance} 
            onChange={(e) => setSelectedInstance(e.target.value)}
            className="border p-2 rounded-lg"
          >
            {instances.filter(i => i.provider === 'meta').map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <button 
            onClick={syncTemplates} 
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={20} />
            Sync from Meta
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg text-green-600">
                  <LayoutTemplate size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-sm text-gray-500">{t.language}</p>
                </div>
              </div>
              <span className={\`px-3 py-1 rounded-full text-xs font-medium \${t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}\`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            No templates found. Click sync to fetch approved templates from Meta.
          </div>
        )}
      </div>
    </div>
  );
}
