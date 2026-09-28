import React, { useState } from 'react';
import { Eye, EyeOff, LayoutPanelLeft } from 'lucide-react';
import { User, UserRole, Permission } from '../types';

interface VisibilityManagerProps {
  currentUser: User;
  hiddenModules: string[];
  setHiddenModules: React.Dispatch<React.SetStateAction<string[]>>;
  apiBase: string;
}

export const platformModules = [
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
  { id: 'logs', label: 'Logs Tab' },
  { id: 'wallet', label: 'Wallet & Ledger Tab' },
  { id: 'profile', label: 'Profile Tab' },
  { id: 'meta-templates', label: 'Meta Templates Tab' },
  { id: 'meta-automations', label: 'Meta Automations Tab' },
];

const VisibilityManager: React.FC<VisibilityManagerProps> = ({ currentUser, hiddenModules, setHiddenModules, apiBase }) => {
  const canManageVisibility = currentUser.role === UserRole.SUPERADMIN;

  const toggleModule = async (id: string) => {
    if (!canManageVisibility) return;
    
    const newHiddenModules = hiddenModules.includes(id) 
        ? hiddenModules.filter(m => m !== id) 
        : [...hiddenModules, id];
        
    setHiddenModules(newHiddenModules);
    
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
  };

  if (!canManageVisibility) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <EyeOff size={48} className="text-gray-600 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-gray-400">You do not have permission to manage visibility.</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <LayoutPanelLeft size={18} className="text-[#25D366]" />
                    <span>Visibility Manager</span>
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">Control which modules are visible across the platform.</p>
            </div>
        </div>
        
        <div className="bg-[#111b21] p-3.5 sm:p-5 rounded-xl border border-gray-800/80 shadow-md">
            <h3 className="text-white font-bold mb-3 uppercase tracking-wider text-xs">Platform Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {platformModules.map(mod => {
                    const isHidden = hiddenModules.includes(mod.id);
                    return (
                        <button 
                            key={mod.id}
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                                isHidden 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                                    : 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/20'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 truncate">
                                {isHidden ? <EyeOff size={14} className="shrink-0 text-red-400" /> : <Eye size={14} className="shrink-0 text-[#25D366]" />}
                                <span className="truncate">{mod.label}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0 uppercase ${
                                isHidden ? 'bg-red-500/20 text-red-400' : 'bg-[#25D366]/20 text-[#25D366]'
                            }`}>
                                {isHidden ? 'Hidden' : 'Visible'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default VisibilityManager;
