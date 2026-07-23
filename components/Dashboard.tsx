
import React from 'react';
import { WhatsAppInstance, InstanceStatus, User, UserRole, Permission } from '../types';
import { QrCode, Trash2, Send, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, Info, Zap, Smartphone, Edit3, Power, Lock, Eye, EyeOff, LayoutPanelLeft, Globe } from 'lucide-react';

interface DashboardProps {
  instances: WhatsAppInstance[];
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onReboot: (id: string) => void;
  onSendTest: (id: string) => void;
  onSimulateConnect: (id: string) => void;
  onUpdateWebhook: (id: string, currentUrl?: string) => void;
  isMockMode: boolean;
  currentUser: User;
  onToggleVisibility: (id: string, current: boolean) => void;
  hiddenModules: string[];
  setHiddenModules: React.Dispatch<React.SetStateAction<string[]>>;
  apiBase: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    instances, onDelete, onRename, onReboot, onSendTest, onSimulateConnect, onUpdateWebhook, onToggleAi, isMockMode, 
    currentUser, onToggleVisibility, hiddenModules, setHiddenModules, apiBase 
}) => {
  const isSuper = currentUser.role === UserRole.SUPERADMIN;
  const canManage = currentUser.role === UserRole.SUPERADMIN || 
                    currentUser.role === UserRole.ADMIN || 
                    currentUser.role === UserRole.RESELLER ||
                    (currentUser.role === UserRole.TEAM_MEMBER && currentUser.permissions?.includes(Permission.MANAGE_INSTANCES));

  const toggleModule = async (id: string) => {
    const newHiddenModules = hiddenModules.includes(id) 
        ? hiddenModules.filter(m => m !== id) 
        : [...hiddenModules, id];
        
    setHiddenModules(newHiddenModules);

    if (isSuper) {
        try {
            await fetch(`${apiBase}/api/settings/hidden-modules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': currentUser.id,
                    'X-Role': currentUser.role,
                    'X-API-Key': currentUser.apiKey
                },
                body: JSON.stringify({ hiddenModules: newHiddenModules })
            });
        } catch (err) {
            console.error('Failed to save hidden modules', err);
        }
    }
  };

  if (instances.length === 0 && !isSuper) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-[#202c33] rounded-full flex items-center justify-center mb-4 text-gray-500">
          <MessageSquare size={40} />
        </div>
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">No API Instances Provisioned</h2>
        <p className="text-gray-400 max-w-xs">Start your reseller business by creating your first WhatsApp Instance.</p>
      </div>
    );
  }

  const getQrUrl = (qr: string | undefined) => {
    if (!qr) return '';
    if (qr.startsWith('http')) return qr;
    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr)}&margin=10&color=000000&bgcolor=FFFFFF`;
  };

  const platformModules = [
    { id: 'dashboard', label: 'Dashboard Tab' },
    { id: 'chat', label: 'Direct Chat Tab' },
    { id: 'auto-responder', label: 'Auto Responder Tab' },
    { id: 'team', label: 'Team Access Tab' },
    { id: 'users', label: 'Users Tab' },
    { id: 'billing', label: 'Billing & Plans Tab' },
    { id: 'media-library', label: 'Media Library Tab' },
    { id: 'bulk', label: 'Bulk Sender Tab' },
    { id: 'bulk-templates', label: 'Bulk: Templates' },
    { id: 'bulk-media', label: 'Bulk: Media' },
    { id: 'bulk-quick-buttons', label: 'Bulk: Temp Buttons' },
    { id: 'contacts', label: 'Contacts Tab' },
    { id: 'templates', label: 'Templates Tab' },
    { id: 'api-docs', label: 'API Docs Tab' },
    { id: 'code', label: 'Backend Code Tab' },
    { id: 'logs', label: 'Logs Tab' }
  ];

  return (
    <div className="space-y-6">
      {isMockMode && (
        <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl flex gap-5 items-center">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <Zap size={24} />
          </div>
          <div className="text-sm">
            <p className="text-white font-bold text-base mb-1">Gateway Simulation Active</p>
            <p className="text-gray-400 leading-relaxed">
              Instances are isolated by <span className="text-blue-400">userId</span>. 
              Billing tier enforcement is currently active in demonstration mode.
            </p>
          </div>
        </div>
      )}

      {isSuper && (
        <div className="bg-[#111b21] p-6 rounded-2xl border border-yellow-500/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
                <LayoutPanelLeft className="text-yellow-500" size={20} />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Superadmin Hide Function (Module Visibility)</h3>
            </div>
            <div className="flex flex-wrap gap-3">
                {platformModules.map(mod => (
                    <button 
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            hiddenModules.includes(mod.id) 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                : 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20'
                        }`}
                    >
                        {hiddenModules.includes(mod.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        {mod.label} {hiddenModules.includes(mod.id) ? '(HIDDEN)' : '(VISIBLE)'}
                    </button>
                ))}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map((instance) => (
          <div 
            key={instance.id} 
            className={`bg-[#111b21] rounded-2xl border ${instance.status === InstanceStatus.SUSPENDED ? 'border-red-500/30 grayscale opacity-60' : 'border-gray-800'} overflow-hidden flex flex-col shadow-2xl transition-all hover:border-gray-600 group relative ${instance.isVisible === false && isSuper ? 'opacity-50' : ''}`}
          >
            {instance.status === InstanceStatus.SUSPENDED && (
                <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-8 text-center">
                    <div className="bg-[#111b21] border border-red-500 p-4 rounded-xl shadow-2xl">
                        <Lock className="text-red-500 mx-auto mb-2" size={24} />
                        <h4 className="text-white font-bold text-sm">Instance Suspended</h4>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Subscription Expired or Over Limit</p>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#25D366] transition-colors truncate">{instance.name}</h3>
                    {canManage && <button onClick={() => onRename(instance.id)} className="text-gray-500 hover:text-white transition-all"><Edit3 size={14} /></button>}
                  </div>
                  <code className="text-[10px] text-gray-500 font-mono uppercase">ID: {instance.id} | TYPE: {instance.provider?.toUpperCase() || "BAILEYS"}</code>
                </div>
                <div className="flex gap-1">
                    {isSuper && (
                        <button 
                            onClick={() => onToggleVisibility(instance.id, instance.isVisible !== false)}
                            className={`p-2 rounded-lg transition-all ${instance.isVisible === false ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10'}`}
                            title={instance.isVisible === false ? "Hidden from users" : "Visible to users"}
                        >
                            {instance.isVisible === false ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    {canManage && (
                        <>
                            
                            {instance.provider === 'meta' && (
      <button 
          onClick={() => window.onEditMetaConfig && window.onEditMetaConfig(instance.id)}
          className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
          title="Edit Meta Configuration"
      >
          <Edit3 size={18} />
      </button>
  )}
  <button 
      onClick={() => onToggleAi && onToggleAi(instance.id, instance.aiEnabled)}
                                disabled={instance.status === InstanceStatus.SUSPENDED}
                                title={instance.aiEnabled ? "Disable AI Auto-Reply" : "Enable AI Auto-Reply"}
                                className={`p-2 rounded-lg transition-all disabled:opacity-0 ${instance.aiEnabled ? 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-400/10'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            </button>

                            <button 
                                onClick={() => onUpdateWebhook(instance.id, instance.webhookUrl)}
                                disabled={instance.status === InstanceStatus.SUSPENDED}
                                title={instance.webhookUrl ? "Update Webhook URL" : "Set Webhook URL"}
                                className={`p-2 rounded-lg transition-all disabled:opacity-0 ${instance.webhookUrl ? 'text-[#25D366] hover:bg-[#25D366]/10' : 'text-gray-500 hover:text-[#25D366] hover:bg-[#25D366]/10'}`}
                            >
                                <Globe size={18} />
                            </button>
                            <button 
                                onClick={() => onReboot(instance.id)}
                                disabled={instance.status === InstanceStatus.SUSPENDED}
                                title="Reboot Instance"
                                className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all disabled:opacity-0"
                            >
                                <Power size={18} />
                            </button>
                            <button 
                                onClick={() => onDelete(instance.id)}
                                title="Delete Instance"
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={instance.status} />
                <span className="text-[10px] text-gray-500 font-bold">
                   Owner: {instance.userId}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col bg-[#0b141a]/30">
              {instance.status === InstanceStatus.QR_REQUIRED ? (
                <div className="flex flex-col items-center justify-center gap-6 py-2">
                  <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center justify-center ring-4 ring-white/5 overflow-hidden">
                    {instance.qrCode ? (
                      <img src={getQrUrl(instance.qrCode)} alt="WhatsApp QR" className="w-44 h-44 block" />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-gray-400 text-xs text-center font-mono">
                        Generating session...
                      </div>
                    )}
                  </div>
                </div>
              ) : instance.status === InstanceStatus.OPEN ? (
                <div className="flex-1 space-y-6 pt-2">
                  <div className="p-4 bg-[#111b21] rounded-2xl border border-gray-800 space-y-4 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Device</span>
                      <span className="text-[#25D366] font-mono font-bold">{instance.phoneNumber || 'Authenticated'}</span>
                    </div>
                  </div>
                  <div className="space-y-2 px-1">
                    <div className="flex justify-between text-[10px] text-gray-500 font-black uppercase">
                      <span>Gateway Load</span>
                      <span className="text-green-500 font-bold">Optimal</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#111b21] rounded-full overflow-hidden border border-gray-800">
                      <div className="h-full bg-green-500 w-[10%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              ) : instance.status === InstanceStatus.SUSPENDED ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="text-red-500 mb-2" size={32} />
                    <p className="text-[10px] text-gray-500 uppercase font-black">Plan Suspension Active</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14">
                  <RefreshCw className="animate-spin text-[#25D366]" size={40} />
                  <p className="mt-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Handshake...</p>
                </div>
              )}
            </div>

            <div className="px-6 py-5 bg-[#111b21] border-t border-gray-800">
               <button 
                disabled={instance.status !== InstanceStatus.OPEN}
                onClick={() => onSendTest(instance.id)}
                className="w-full bg-[#2a3942] hover:bg-[#32444f] disabled:opacity-20 text-white text-[11px] py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
               >
                 <Send size={14} className={instance.status === InstanceStatus.OPEN ? "text-[#25D366]" : ""} />
                 Test Through Gateway
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: InstanceStatus }> = ({ status }) => {
  const configs = {
    [InstanceStatus.OPEN]: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2, label: 'Live' },
    [InstanceStatus.QR_REQUIRED]: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: QrCode, label: 'Pairing' },
    [InstanceStatus.CONNECTING]: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: RefreshCw, label: 'Init' },
    [InstanceStatus.CLOSED]: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle, label: 'Offline' },
    [InstanceStatus.ERROR]: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle, label: 'Error' },
    [InstanceStatus.SUSPENDED]: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Lock, label: 'Suspended' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${config.color}`}>
      <Icon size={10} className={status === InstanceStatus.CONNECTING ? 'animate-spin' : ''} />
      {config.label}
    </div>
  );
};

export default Dashboard;
