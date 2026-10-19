import React from 'react';
import { 
  Layout, MessageSquare, Terminal, Code, Send, FileText, Users, Book, 
  ShieldCheck, CreditCard, Image as ImageIcon, MessageCircleCode, Infinity, 
  UserCog, LogOut, Wallet, Eye, Sparkles 
} from 'lucide-react';
import { User, UserRole, Permission } from '../types';
import BrandLogo from './BrandLogo';

/**
 * Sidebar Component Props
 * Logic: Controls navigation tabs, permissions, multi-role visibility, and logout action.
 */
interface SidebarProps { 
  isMeta?: boolean;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: User;
  authenticatedUser?: User;
  allUsers: User[];
  onUserSwitch: (user: User) => void;
  hiddenModules: string[];
  onLogout: () => void;
}

/**
 * Sidebar: Primary navigation drawer for the iFastX WhatsApp Gateway platform
 * Logic: Renders categorized menu navigation aligned with WhatsApp Dark UI theme (#111b21 & #202c33).
 */
const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  authenticatedUser, 
  allUsers, 
  onUserSwitch, 
  hiddenModules, 
  onLogout, 
  isMeta = false 
}) => {
  // Instruction: Define categorized navigation items with role-based and permission access rules
  // Logic: Filters navigation sections by user tier (SuperAdmin, Reseller, Admin, Team Member)
  const menuCategories = [
    {
      title: 'Main Operations',
      items: [
        { id: 'dashboard', icon: Layout, label: 'Dashboard', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_INSTANCES },
        { id: 'chat', icon: MessageSquare, label: 'Direct Chat', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.VIEW_CHATS },
        { id: 'bulk', icon: Send, label: 'Bulk Sender', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.SEND_BULK },
        { id: 'contacts', icon: Users, label: 'Contacts', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_CONTACTS },
        { id: 'media-library', icon: ImageIcon, label: 'Media Library', badgeText: 'REGULAR', badgeStyle: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
      ]
    },
    {
      title: 'Official Meta Cloud API',
      items: [
        { id: 'meta-templates', icon: FileText, label: 'Meta Templates', badgeText: 'META', badgeStyle: 'bg-[#1877F2]/15 text-[#53bdeb] border-[#1877F2]/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
        { id: 'meta-automations', icon: MessageCircleCode, label: 'Meta Auto Responder', badgeText: 'META', badgeStyle: 'bg-[#1877F2]/15 text-[#53bdeb] border-[#1877F2]/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
        { id: 'meta-insights', icon: Infinity, label: 'Meta Insights & Billing', badgeText: 'META', badgeStyle: 'bg-[#1877F2]/15 text-[#53bdeb] border-[#1877F2]/30', roles: [UserRole.SUPERADMIN] },
      ]
    },
    {
      title: 'Baileys / QR API',
      items: [
        { id: 'templates', icon: FileText, label: 'Regular Templates', badgeText: 'REGULAR', badgeStyle: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER], permission: Permission.MANAGE_TEMPLATES },
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
        { id: 'ai-logs', icon: Sparkles, label: 'AI Automation Logs', badgeText: 'AI', badgeStyle: 'bg-purple-500/15 text-purple-400 border-purple-500/30', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
        { id: 'team', icon: UserCog, label: 'Team Access', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN], permission: Permission.MANAGE_TEAM },
        { id: 'visibility', icon: Eye, label: 'Visibility Manager', roles: [UserRole.SUPERADMIN] },
        { id: 'users', icon: ShieldCheck, label: 'Users', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] },
        { id: 'api-docs', icon: Book, label: 'API Docs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER, UserRole.ADMIN, UserRole.TEAM_MEMBER] },
        { id: 'code', icon: Code, label: 'Backend Code', roles: [UserRole.SUPERADMIN] },
        { id: 'logs', icon: Terminal, label: 'Live Logs', roles: [UserRole.SUPERADMIN, UserRole.RESELLER] }
      ]
    }
  ];

  // Instruction: Determine visibility of menu item based on user role and permissions
  // Logic: Validates currentUser rights, team member restrictions, and hidden module settings
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
    <aside className="w-64 h-full bg-[#111b21] border-r border-[#202c33] flex flex-col font-sans select-none">
      {/* Logic: Top Header Brand Section displaying theme-harmonized iFastX logo and partner badge */}
      <div className="p-4 pb-3.5 flex items-center pr-2 border-b border-[#202c33] bg-[#111b21]">
        <BrandLogo size="sm" className="origin-left" isMeta={isMeta} />
      </div>

      {/* Logic: Scrollable navigation container styled with dark WhatsApp palette */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto bg-[#111b21] custom-scrollbar">
        {menuCategories.map((category, idx) => {
          const visibleItems = category.items.filter(filterItem);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {/* Logic: Category Section Heading with theme-aligned typography and muted tone */}
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>{category.title}</span>
              </div>

              {/* Logic: Group of navigable items for this category */}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all cursor-pointer group text-left ${
                        isActive 
                          ? 'bg-[#202c33] text-[#25D366] font-semibold border-l-2 border-[#25D366] shadow-xs' 
                          : 'text-gray-300 hover:bg-[#202c33]/70 hover:text-white font-medium'
                      }`}
                    >
                      {/* Logic: Nav icon and label with clean sans-serif typography */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon 
                          size={16} 
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-[#25D366]' : 'text-gray-400 group-hover:text-gray-200'
                          }`} 
                        />
                        <span className="text-xs tracking-normal truncate">{item.label}</span>
                      </div>

                      {/* Logic: Module indicator badge (e.g. META, REGULAR, QR, AI) */}
                      {item.badgeText && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded tracking-wider uppercase shrink-0 leading-none ${item.badgeStyle}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logic: Bottom Footer Section containing Logout action button */}
      <div className="p-3 border-t border-[#202c33] bg-[#111b21]">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;