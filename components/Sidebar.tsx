import React from 'react';
import { Layout, MessageSquare, Terminal, Code, Send, FileText, Users, Book, ShieldCheck, CreditCard, Image as ImageIcon, MessageCircleCode, Infinity, UserCog, LogOut, Wallet, Eye } from 'lucide-react';
import { User, UserRole, Permission } from '../types';
import BrandLogo from './BrandLogo';

interface SidebarProps { isMeta?: boolean;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: User;
  authenticatedUser?: User;
  allUsers: User[];
  onUserSwitch: (user: User) => void;
  hiddenModules: string[];
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, authenticatedUser, allUsers, onUserSwitch, hiddenModules, onLogout, isMeta = false }) => {
  const menuCategories = [
    {
      title: 'Main Operations',
      items: [
        { id: 'dashboard', icon: Layout, label: 'Dashboard', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_INSTANCES },
        { id: 'chat', icon: MessageSquare, label: 'Direct Chat', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.VIEW_CHATS },
        { id: 'bulk', icon: Send, label: 'Bulk Sender', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.SEND_BULK },
        { id: 'contacts', icon: Users, label: 'Contacts', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_CONTACTS },
        { id: 'media-library', icon: ImageIcon, label: 'Media Library', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
      ]
    },
    {
      title: 'Official Meta Cloud API',
      items: [
        { id: 'meta-templates', icon: FileText, label: 'Meta Templates', badgeText: 'META', badgeStyle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
        { id: 'meta-automations', icon: MessageCircleCode, label: 'Meta Automations', badgeText: 'META', badgeStyle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
        { id: 'meta-insights', icon: Infinity, label: 'Meta Insights & Billing', badgeText: 'META', badgeStyle: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', roles: [UserRole.SUPERADMIN] },
      ]
    },
    {
      title: 'Baileys / QR API',
      items: [
        { id: 'templates', icon: FileText, label: 'Baileys Templates', badgeText: 'QR', badgeStyle: 'bg-amber-500/15 text-amber-400 border-amber-500/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
        { id: 'auto-responder', icon: MessageCircleCode, label: 'Baileys Auto Responder', badgeText: 'QR', badgeStyle: 'bg-amber-500/15 text-amber-400 border-amber-500/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_AUTO_RESPONDER },
      ]
    },
    {
      title: 'Wallet & Billing',
      items: [
        { id: 'wallet', icon: Wallet, label: 'Wallet & Ledger', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN] },
        { id: 'billing', icon: CreditCard, label: 'Billing & Plans', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN] },
      ]
    },
    {
      title: 'Admin & System',
      items: [
        { id: 'team', icon: UserCog, label: 'Team Access', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN], permission: Permission.MANAGE_TEAM },
        { id: 'visibility', icon: Eye, label: 'Visibility Manager', roles: [UserRole.SUPERADMIN] },
        { id: 'users', icon: ShieldCheck, label: 'Users', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] },
        { id: 'api-docs', icon: Book, label: 'API Docs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
        { id: 'code', icon: Code, label: 'Backend Code', roles: [UserRole.SUPERADMIN] },
        { id: 'logs', icon: Terminal, label: 'Live Logs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] }
      ]
    }
  ];

  const filterItem = (item: any) => {
    if (!currentUser) return false;
    if (!item.roles.includes(currentUser.role)) return false;
    if (currentUser.role === UserRole.TEAM_MEMBER && item.permission) {
      if (!currentUser.permissions?.includes(item.permission)) return false;
    }
    if (currentUser.role !== UserRole.SUPERADMIN && hiddenModules.includes(item.id)) return false;
    return true;
  };

  return (
    <aside className="w-64 h-full bg-[#111b21] border-r border-gray-800 flex flex-col">
      <div className="p-4 pb-3 flex items-center pr-2 border-b border-gray-800/40">
        <BrandLogo size="sm" className="scale-90 origin-left" isMeta={isMeta} />
      </div>

      <nav className="flex-1 px-3 py-2 space-y-3 overflow-y-auto">
        {menuCategories.map((category, idx) => {
          const visibleItems = category.items.filter(filterItem);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>{category.title}</span>
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-[#2a3942] text-[#25D366] font-semibold' 
                        : 'text-gray-400 hover:bg-[#202c33] hover:text-gray-200 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon size={15} className="shrink-0" />
                      <span className="text-xs tracking-wide truncate">{item.label}</span>
                    </div>
                    {item.badgeText && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-extrabold border rounded tracking-wider uppercase shrink-0 ${item.badgeStyle}`}>
                        {item.badgeText}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Role Switcher for Demo Purposes */}
      {(authenticatedUser?.role === UserRole.SUPERADMIN || currentUser.role === UserRole.SUPERADMIN || authenticatedUser?.id === 'u_super_9595' || currentUser.id === 'u_super_9595') && allUsers.length > 0 && (
      <div className="p-3 border-t border-gray-800 bg-[#0b141a]/50">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch User Role</span>
            <ShieldCheck size={12} className="text-gray-500" />
          </div>
          <select 
            value={currentUser.id}
            onChange={(e) => {
              const user = allUsers.find(u => u.id === e.target.value);
              if (user) onUserSwitch(user);
            }}
            className="w-full bg-[#202c33] border border-gray-700/80 rounded-lg px-2 py-1 text-[11px] text-gray-200 focus:ring-1 ring-[#25D366] outline-none cursor-pointer"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.role.toUpperCase()}: {u.username}</option>
            ))}
          </select>
        </div>
      </div>
      )}

      
    
      <div className="p-2.5 border-t border-gray-800">
        <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 font-medium transition-all cursor-pointer"
        >
            <LogOut size={16} />
            Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;