import React, { useState, useEffect, useMemo } from 'react';
import { WhatsAppInstance, AutoResponderRule, User, MediaAsset, InteractiveButton } from '../types';
import { 
  Plus, Trash2, Edit3, Save, Search, MessageCircleCode, 
  ChevronRight, ArrowLeft, Zap, Smartphone, Image as ImageIcon,
  FileText, CheckCircle2, XCircle, LayoutGrid, Database, Network, Code, AppWindow,
  GitBranch, ListTree, Grid, ChevronDown, MessageSquare, Workflow, MousePointer2, Settings, Play, Info
} from 'lucide-react';

interface AutoResponderManagerProps {
  instances: WhatsAppInstance[];
  currentUser: User;
  mediaAssets: MediaAsset[];
  apiBase: string;
}

const AutoResponderManager: React.FC<AutoResponderManagerProps> = ({ instances, currentUser, mediaAssets, apiBase }) => {
  const [rules, setRules] = useState<AutoResponderRule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [ruleSearch, setRuleSearch] = useState('');

  const [formData, setFormData] = useState({
    triggerKeyword: '',
    responseMessage: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video' | 'document',
    isActive: true,
    buttons: [] as InteractiveButton[]
  });

  useEffect(() => {
    fetchRules();
  }, [currentUser]);

  const fetchRules = async () => {
    try {
      const res = await fetch(`${apiBase}/api/auto-responder`, {
        headers: {
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        }
      });
      if (res.ok) {
        setRules(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!selectedInstance || !formData.triggerKeyword || !formData.responseMessage) {
      alert("Missing required fields.");
      return;
    }

    setIsSaving(true);
    const newRule: AutoResponderRule = {
      id: `rule_${Date.now()}`,
      instanceId: selectedInstance,
      triggerKeyword: formData.triggerKeyword,
      responseMessage: formData.responseMessage,
      mediaUrl: formData.mediaUrl || undefined,
      mediaType: formData.mediaType,
      parentId: currentParentId || undefined,
      isActive: formData.isActive,
      buttons: formData.buttons.length > 0 ? formData.buttons : undefined,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${apiBase}/api/auto-responder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify(newRule)
      });

      if (res.ok) {
        setRules(prev => [...prev, newRule]);
        setIsAdding(false);
        setFormData({ triggerKeyword: '', responseMessage: '', mediaUrl: '', mediaType: 'image', isActive: true, buttons: [] });
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this logic node? This will remove the entire sub-branch.")) return;
    try {
      const res = await fetch(`${apiBase}/api/auto-responder/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        }
      });
      if (res.ok) setRules(prev => prev.filter(r => r.id !== id && r.parentId !== id));
    } catch (e) { console.error(e); }
  };

  const applyTemplate = (type: 'isp' | 'software' | 'agency') => {
    if (!selectedInstance) {
      alert("Please select an instance context first.");
      return;
    }

    const tpls: Record<string, Partial<AutoResponderRule>[]> = {
      isp: [
        { triggerKeyword: 'Menu', responseMessage: 'Welcome to iFastX ISP Support! How can we help?\n\n1. Check Coverage\n2. Billing Info\n3. Technical Support' },
        { triggerKeyword: '1', responseMessage: 'Checking fiber availability in your area... Please provide your Pincode.' },
        { triggerKeyword: '2', responseMessage: 'Accessing billing portal. Your last invoice was paid on 15th Oct. Visit ifastx.in/pay to renew.' },
        { triggerKeyword: '3', responseMessage: 'Sorry to hear that. Is your LOS light Red or are you facing Slow Speed?\n\nA. Red LOS\nB. Slow Speed' },
      ],
      software: [
        { triggerKeyword: 'Hello', responseMessage: 'Welcome to iFastX Tech Solutions. Discover our stack:\n\n1. REST API\n2. WhatsApp Marketing\n3. Bulk SMS Cloud' },
        { triggerKeyword: '1', responseMessage: 'Our API supports Node.js, Python, and Go. Visit docs.ifastx.in for the reference.' },
        { triggerKeyword: '2', responseMessage: 'Automate your marketing at scale. View pricing plans in the Billing tab.' },
        { triggerKeyword: '3', responseMessage: 'Industrial grade messaging infrastructure with 99.9% uptime.' },
      ],
      agency: [
        { triggerKeyword: 'Hi', responseMessage: 'Hey! We build world-class mobile and web apps. Interested in:\n\n1. View Portfolio\n2. Hire Developers\n3. Maintenance Plans' },
        { triggerKeyword: '1', responseMessage: 'Check out our latest work at ifastx.in/portfolio' },
        { triggerKeyword: '2', responseMessage: 'Tell us about your project requirements or book a call at calendly.com/ifastx' },
        { triggerKeyword: '3', responseMessage: 'We offer 24/7 SLA based support for all our enterprise deployments.' },
      ]
    };

    const confirmTpl = confirm(`Deploy ${type.toUpperCase()} workflow to this instance?`);
    if (!confirmTpl) return;

    // Simulate batch deployment
    alert(`Deploying ${tpls[type].length} nodes for ${type.toUpperCase()} workflow...`);
    // In production, loop through tpls[type] and call handleSave
  };

  // --- RECURSIVE WORKFLOW RENDERER ---
  const renderWorkflowNode = (parentId: string | null = null, level: number = 0) => {
    const children = rules.filter(r => 
      (!selectedInstance || String(r.instanceId) === String(selectedInstance)) && 
      (parentId ? r.parentId === parentId : (!r.parentId || r.parentId === ''))
    );

    return (
      <div className="flex flex-col items-center w-full">
        {level === 0 && children.length > 0 && (
            <div className="flex flex-col items-center mb-8">
                 <div className="bg-[#111b21] border border-pink-500/50 p-4 rounded-xl shadow-lg w-56 text-center">
                    <div className="flex items-center justify-center gap-2 text-pink-500 text-[10px] font-black uppercase mb-1">
                        <Zap size={14} /> Trigger
                    </div>
                    <p className="text-white text-xs font-bold">Inbound Message Matches</p>
                 </div>
                 <div className="w-[1px] h-8 bg-pink-500/30" />
                 <div className="w-4 h-4 rounded-full border border-pink-500/50 flex items-center justify-center text-pink-500 bg-[#0b141a]">
                    <Plus size={10} />
                 </div>
                 <div className="w-[1px] h-8 bg-pink-500/30" />
            </div>
        )}

        <div className="flex items-start gap-12">
          {children.map((rule, idx) => (
            <div key={rule.id} className="flex flex-col items-center">
              <div className="relative group">
                <div className={`p-6 bg-[#111b21] border-2 ${rule.isActive ? 'border-gray-800' : 'border-red-900/30'} rounded-3xl shadow-2xl w-64 transition-all hover:border-[#25D366]/50 hover:translate-y-[-2px] relative z-10`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-black text-xs">
                          {rule.triggerKeyword.charAt(0)}
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Matches Keyword</p>
                          <p className="text-white text-xs font-bold font-mono">"{rule.triggerKeyword}"</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => {setCurrentParentId(rule.id); setIsAdding(true);}} 
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                            title="Add Child Node"
                        >
                            <GitBranch size={12} />
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={12} /></button>
                    </div>
                  </div>

                  <div className="bg-[#0b141a] p-3 rounded-xl border border-gray-800/50 mb-3">
                     <p className="text-gray-400 text-[10px] font-mono whitespace-pre-wrap line-clamp-3">
                        {rule.responseMessage}
                     </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rule.mediaUrl && <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md"><ImageIcon size={10} /></div>}
                    {rule.buttons && <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-md"><Zap size={10} /></div>}
                  </div>
                </div>
                
                {/* Visual Branch Line for sibling groups */}
                {children.length > 1 && (
                    <div className="absolute top-[-2px] left-[-26px] right-[-26px] h-[2px] bg-gray-800 z-0" />
                )}
              </div>

              {/* Recursive Children Render */}
              <div className="mt-8 flex flex-col items-center">
                 {renderWorkflowNode(rule.id, level + 1)}
              </div>
            </div>
          ))}

          {/* Add Sibling Button (Only if parent exists or at root) */}
          {(parentId || level === 0) && (
              <div className="flex flex-col items-center h-full">
                  <div className={`w-[1px] h-8 bg-gray-800 ${children.length > 0 ? 'mb-auto' : ''}`} />
                  <button 
                      onClick={() => {setCurrentParentId(parentId); setIsAdding(true);}}
                      className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-[#25D366] hover:border-[#25D366] transition-all"
                      title="Add Branch"
                  >
                      <Plus size={16} />
                  </button>
              </div>
          )}
        </div>
        
        {level === 0 && children.length === 0 && (
             <div className="flex flex-col items-center py-20 opacity-30">
                <Workflow size={64} className="text-gray-600 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-600">Start Workflow</p>
                <button 
                  onClick={() => {setCurrentParentId(null); setIsAdding(true);}}
                  className="mt-6 w-12 h-12 rounded-full bg-[#25D366] text-[#0b141a] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Plus size={24} />
                </button>
             </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366] border border-[#25D366]/20">
            <Workflow size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Automation <span className="text-[#25D366]">Flows</span></h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">AI Logic & Inbound Routing</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input 
                    type="text" 
                    placeholder="Search logic nodes..."
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    className="w-full bg-[#111b21] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:ring-1 ring-[#25D366]/30 transition-all"
                />
            </div>

            <select 
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="bg-[#111b21] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
            >
              <option value="">Instance Context...</option>
              {instances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            
            <button 
                onClick={() => {setCurrentParentId(null); setIsAdding(true);}}
                className="bg-[#25D366] text-[#0b141a] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
            >
                <Plus size={18} /> Root Node
            </button>
        </div>
      </header>

      {/* Optimized Template Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <TemplateBtn 
            title="ISP Support" 
            icon={<Network size={18} />} 
            color="text-blue-400" 
            onClick={() => applyTemplate('isp')} 
            desc="Fiber coverage & tech support"
         />
         <TemplateBtn 
            title="SaaS Sales" 
            icon={<Code size={18} />} 
            color="text-purple-400" 
            onClick={() => applyTemplate('software')} 
            desc="API docs & product tour"
         />
         <TemplateBtn 
            title="App Agency" 
            icon={<AppWindow size={18} />} 
            color="text-orange-400" 
            onClick={() => applyTemplate('agency')} 
            desc="Portfolios & hire developers"
         />
         <div className="bg-[#111b21]/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                  <Play size={18} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase">Live Responder</p>
                  <p className="text-white text-xs font-bold">Enabled</p>
               </div>
            </div>
            <div className="w-10 h-6 bg-[#25D366]/20 rounded-full flex items-center px-1">
               <div className="w-4 h-4 bg-[#25D366] rounded-full shadow-lg" />
            </div>
         </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-[#0b141a]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#111b21] rounded-[2.5rem] border border-gray-800 w-full max-w-2xl shadow-3xl overflow-hidden">
                <div className="px-10 py-8 border-b border-gray-800 flex justify-between items-center bg-black/20">
                    <div>
                        <h3 className="text-xl font-black text-white">Create Logic Node</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase mt-1">Branch Level: {currentParentId ? 'Child Node' : 'Root Level Entry'}</p>
                    </div>
                    <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white"><XCircle size={24} /></button>
                </div>

                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Trigger Keyword</label>
                            <input 
                                value={formData.triggerKeyword}
                                onChange={e => setFormData(p => ({ ...p, triggerKeyword: e.target.value }))}
                                className="w-full bg-[#0b141a] border border-gray-800 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:ring-2 ring-[#25D366]/20 transition-all font-mono"
                                placeholder="e.g. Menu, 1, Support"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Context Instance</label>
                            <select 
                                value={selectedInstance}
                                onChange={e => setSelectedInstance(e.target.value)}
                                className="w-full bg-[#0b141a] border border-gray-800 rounded-2xl px-5 py-4 text-white text-sm outline-none"
                            >
                                <option value="">Select instance...</option>
                                {instances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Automated Response Content</label>
                        <textarea 
                            value={formData.responseMessage}
                            onChange={e => setFormData(p => ({ ...p, responseMessage: e.target.value }))}
                            rows={4}
                            className="w-full bg-[#0b141a] border border-gray-800 rounded-2xl px-5 py-4 text-white text-sm outline-none resize-none focus:ring-2 ring-[#25D366]/20 transition-all font-mono"
                            placeholder="Compose the response..."
                        />
                    </div>

                    <div className="flex justify-end gap-4">
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="px-8 py-3 text-gray-500 hover:text-white font-black uppercase text-[10px] tracking-widest"
                        >
                            Abort Configuration
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-[#25D366] text-[#0b141a] px-10 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                        >
                            {isSaving ? 'Deploying...' : 'Save Logic Node'}
                        </button>
                    </div>
                </div>
           </div>
        </div>
      )}

      {/* Dotted Canvas View */}
      <div className="relative bg-[#0b141a] min-h-[70vh] rounded-[3rem] border border-gray-800 shadow-inner overflow-hidden p-20 flex flex-col items-center">
         <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[length:24px_24px]" />
         
         <div className="relative z-10 w-full overflow-x-auto pb-20">
            {renderWorkflowNode(null, 0)}
         </div>

         <div className="absolute bottom-8 right-8 bg-[#111b21] border border-gray-800 p-4 rounded-2xl flex items-center gap-6 shadow-2xl z-20">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 rounded-full" />
                <span className="text-[10px] text-gray-500 font-bold uppercase">Entry</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#25D366] rounded-full" />
                <span className="text-[10px] text-gray-500 font-bold uppercase">Message</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full" />
                <span className="text-[10px] text-gray-500 font-bold uppercase">Media</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full" />
                <span className="text-[10px] text-gray-500 font-bold uppercase">Buttons</span>
            </div>
         </div>
      </div>
    </div>
  );
};

const TemplateBtn = ({ title, desc, icon, color, onClick }: { title: string, desc: string, icon: any, color: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 text-left hover:border-gray-600 transition-all group flex items-center gap-4"
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-white/5 group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h4 className="text-white text-xs font-black uppercase tracking-tight">{title}</h4>
            <p className="text-[9px] text-gray-500 truncate font-medium">{desc}</p>
        </div>
    </button>
);

export default AutoResponderManager;