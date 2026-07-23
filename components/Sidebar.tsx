import React from 'react';
import { Layout, MessageSquare, Terminal, Code, Send, FileText, Users, Book, ShieldCheck, CreditCard, Image as ImageIcon, MessageCircleCode, Infinity, UserCog, LogOut } from 'lucide-react';
import { User, UserRole, Permission } from '../types';
import BrandLogo from './BrandLogo';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: User;
  allUsers: User[];
  onUserSwitch: (user: User) => void;
  hiddenModules: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, allUsers, onUserSwitch, hiddenModules }) => {
  const menuItems = [
    { id: 'dashboard', icon: Layout, label: 'Dashboard', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_INSTANCES },
    { id: 'chat', icon: MessageSquare, label: 'Direct Chat', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.VIEW_CHATS },
    { id: 'auto-responder', icon: MessageCircleCode, label: 'Auto Responder', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_AUTO_RESPONDER },
    { id: 'team', icon: UserCog, label: 'Team Access', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN], permission: Permission.MANAGE_TEAM },
    { id: 'users', icon: ShieldCheck, label: 'Users', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] },
    { id: 'billing', icon: CreditCard, label: 'Billing & Plans', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN] },
    { id: 'media-library', icon: ImageIcon, label: 'Media Library', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
    { id: 'bulk', icon: Send, label: 'Bulk Sender', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.SEND_BULK },
    { id: 'contacts', icon: Users, label: 'Contacts', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_CONTACTS },
    { id: 'templates', icon: FileText, label: 'Templates', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
    { id: 'meta-templates', icon: FileText, label: 'Meta Templates', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
    { id: 'meta-automations', icon: MessageCircleCode, label: 'Meta Automations', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
    { id: 'api-docs', icon: Book, label: 'API Docs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
    { id: 'code', icon: Code, label: 'Backend Code', roles: [UserRole.SUPERADMIN] },
    { id: 'logs', icon: Terminal, label: 'Live Logs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    // Basic role check
    if (!item.roles.includes(currentUser.role)) return false;
    
    // Team Member Permission Check
    if (currentUser.role === UserRole.TEAM_MEMBER && item.permission) {
        if (!currentUser.permissions?.includes(item.permission)) return false;
    }
    
    // Hidden modules check (only apply to non-superadmins)
    if (currentUser.role !== UserRole.SUPERADMIN && hiddenModules.includes(item.id)) return false;
    
    return true;
  });

  return (
    <aside className="w-64 h-full bg-[#111b21] border-r border-gray-800 flex flex-col">
      <div className="p-6 flex items-center pr-2">
        <BrandLogo size="sm" className="scale-90 origin-left" />
      </div>

      <nav className="flex-1 px-4 py-3 md:py-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-[#2a3942] text-[#25D366]' 
                : 'text-gray-400 hover:bg-[#202c33] hover:text-gray-100'
            }`}
          >
            <item.icon size={18} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Role Switcher for Demo Purposes */}
      <div className="p-3 lg:p-4 border-t border-gray-800 bg-[#0b141a]/50">
        <div className="space-y-2 lg:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Simulate Role</span>
            <ShieldCheck size={12} className="text-gray-600" />
          </div>
          <select 
            value={currentUser.id}
            onChange={(e) => {
              const user = allUsers.find(u => u.id === e.target.value);
              if (user) onUserSwitch(user);
            }}
            className="w-full bg-[#202c33] border border-gray-700 rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-[10px] lg:text-xs text-white focus:ring-1 ring-[#25D366] outline-none"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.role.toUpperCase()}: {u.username}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-3 lg:p-4 border-t border-gray-800">
        <div className="p-2 lg:p-3 bg-[#202c33] rounded-lg">
          <p className="text-[10px] text-gray-500 mb-1 uppercase font-black">Account Type</p>
          <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              currentUser.role === UserRole.SUPERADMIN ? 'bg-yellow-500/10 text-yellow-500' :
              currentUser.role === UserRole.RESELLER ? 'bg-purple-500/10 text-purple-400' :
              currentUser.role === UserRole.TEAM_MEMBER ? 'bg-green-500/10 text-green-400' :
              'bg-blue-500/10 text-blue-400'
          }`}>
            {currentUser.role}
          </div>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            {currentUser.subscription?.planId ? currentUser.subscription.planId.replace('p_', '') : 'Trial'}
          </p>
        </div>
      </div>
    
      <div className="p-3 lg:p-4 border-t border-gray-800">
        <button 
            onClick={() => {
                localStorage.removeItem('wa_token');
                window.location.reload();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-500 hover:bg-red-500/10 font-bold transition-all sm:hidden"
        >
            <LogOut size={20} />
            Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;