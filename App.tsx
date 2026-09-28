
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { Plus, RefreshCw, Menu, Bell, AlertCircle, User as UserIcon, CreditCard, History, LogOut } from 'lucide-react';
import { InstanceStatus, WhatsAppInstance, MessageTemplate, ContactGroup, User, UserRole, Plan, PlanInterval, Subscription, MediaAsset, Permission } from './types';
import Dashboard from './components/Dashboard';
import CodeSnippets from './components/CodeSnippets';
import { HeaderWallet } from './components/HeaderWallet';
import WalletManager from './components/WalletManager';

import Sidebar from './components/Sidebar';
import BulkSender from './components/BulkSender';
import MetaAutomations from './components/MetaAutomations';
import Templates from './components/Templates';
import MessageTemplates from './components/MessageTemplates';
import ContactManager from './components/ContactManager';
import ApiDocumentation from './components/ApiDocumentation';
import UserManagement from './components/UserManagement';
import VisibilityManager from './components/VisibilityManager';
import BillingManager from './components/BillingManager';
import MediaLibrary from './components/MediaLibrary';
import AutoResponderManager from './components/AutoResponderManager';
import ChatInterface from './components/ChatInterface';
import TeamManager from './components/TeamManager';
import MetaInsightsBilling from './components/MetaInsightsBilling';
import { ProfileView } from './components/ProfileView';
import LoginPage from './components/LoginPage';
import ProvisionInstanceModal from './components/ProvisionInstanceModal';
import LandingPage from './components/LandingPage';

const getApiBase = () => {
  return 'https://wa-api.ifastx.in'; // Localhost ko VPS se connect kar do
};

const API_BASE = getApiBase();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('wa_auth_session') === 'true';
  });
  const [showLandingPage, setShowLandingPage] = useState<boolean>(!isAuthenticated);
  const [authError, setAuthError] = useState<string | null>(null);

  const [hiddenModules, setHiddenModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('wa_hidden_modules');
    return saved ? JSON.parse(saved) : [];
  });

  const [plans, setPlans] = useState<Plan[]>([
    { id: 'p_basic', name: 'Basic', price: 1499, interval: PlanInterval.MONTHLY, dailyLimit: 500, monthlyLimit: 15000, yearlyLimit: 182500, maxInstances: 2, rateLimitPerMin: 30, features: ['Standard Support', 'Daily Reports'], description: 'Ideal for small businesses starting their automation journey.', icon: 'Package' },
    { id: 'p_pro', name: 'Pro', price: 4999, interval: PlanInterval.MONTHLY, dailyLimit: 5000, monthlyLimit: 150000, yearlyLimit: 1825000, maxInstances: 10, rateLimitPerMin: 100, features: ['Priority Support', 'API Access', 'Webhooks'], description: 'Advanced tools for scaling communication and bulk engagement.', icon: 'Rocket' },
    { id: 'p_enterprise', name: 'Enterprise', price: 24999, interval: PlanInterval.YEARLY, dailyLimit: 0, monthlyLimit: 0, yearlyLimit: 0, maxInstances: 100, rateLimitPerMin: 500, features: ['Unlimited Messages', 'Dedicated Support', 'White-label Docs'], description: 'Unlimited possibilities with dedicated support and high speed.', icon: 'Crown' },
  ]);

  const [users, setUsers] = useState<User[]>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const savedAuthUser = localStorage.getItem('wa_original_user');
    if (savedAuthUser) return JSON.parse(savedAuthUser);
    return null;
  });
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('wa_current_user_id');
    const savedOriginalUser = localStorage.getItem('wa_original_user');
    return savedOriginalUser ? JSON.parse(savedOriginalUser) : {
      id: savedId || 'u_super_9595',
      username: '9595956392',
      role: UserRole.SUPERADMIN,
      apiKey: 'sk_super_9595',
      accessToken: 'tok_super_9595',
      tokenExpiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      createdAt: new Date().toISOString(),
      subscription: {
        planId: 'p_enterprise',
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        messagesSentToday: 0,
        messagesSentThisMonth: 0,
        messagesSentThisYear: 0
      }
    };
  });

  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'logs' | 'bulk' | 'templates' | 'contacts' | 'api-docs' | 'users' | 'billing' | 'media-library' | 'auto-responder' | 'chat' | 'team' | 'visibility' | 'meta-insights' | 'meta-templates' | 'meta-automations' | 'wallet'>(() => {
    return (localStorage.getItem('wa_active_tab') as any) || 'dashboard';
  });
  const [bulkInitialMode, setBulkInitialMode] = useState<'sender' | 'history'>('sender');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Restrict worker / team members from accessing admin/reseller tabs
    if (currentUser?.role === UserRole.TEAM_MEMBER) {
      const restrictedTabs = ['users', 'billing', 'visibility', 'team', 'wallet', 'code', 'logs'];
      if (restrictedTabs.includes(activeTab)) {
        setActiveTab('dashboard');
        return;
      }
    }
    localStorage.setItem('wa_active_tab', activeTab);
  }, [activeTab, currentUser?.role]);

  useEffect(() => {
    localStorage.setItem('wa_hidden_modules', JSON.stringify(hiddenModules));
  }, [hiddenModules]);

  // 1. Fetch Plans from Backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plans?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setPlans(data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: parseFloat(p.price),
              interval: p.interval || PlanInterval.MONTHLY,
              dailyLimit: p.daily_limit !== undefined ? p.daily_limit : (p.dailyLimit || 0),
              monthlyLimit: ((p.daily_limit !== undefined ? p.daily_limit : (p.dailyLimit || 0))) * 30,
              yearlyLimit: ((p.daily_limit !== undefined ? p.daily_limit : (p.dailyLimit || 0))) * 365,
              maxInstances: p.max_instances !== undefined ? p.max_instances : (p.maxInstances || 1),
              rateLimitPerMin: p.rate_limit_per_min || p.rateLimitPerMin || 20,
              features: p.features || ['Standard Support', 'API Access'],
              description: p.description,
              icon: p.icon,
              allowedProviders: p.allowedProviders || p.allowed_providers || 'baileys',
              metaSetupFee: parseFloat(p.metaSetupFee !== undefined ? p.metaSetupFee : (p.meta_setup_fee || 0))
          })));
        }
      } catch (err) {
        console.warn("Could not fetch plans, using defaults");
      }
    };
    fetchPlans();
  }, [refreshTrigger]);

  // 2. Fetch Users from Backend
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    if (currentUser.id === 'u_demo_user') return; // Skip fetch for demo user
    const fetchUsers = async () => {
      try {
        const authU = authenticatedUser || currentUser;
        const res = await fetch(`${API_BASE}/api/users?_t=${Date.now()}`, {
          headers: {
            'X-User-ID': authU.id,
            'X-Role': authU.role,
            'X-API-Key': authU.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          let me = data.find((u: User) => u.id === currentUser.id);
          
          if (me) {
            if (me.id === 'u_super_9595') {
               me = { 
                 ...me, 
                 role: UserRole.SUPERADMIN,
                 subscription: me.subscription || {
                    planId: 'p_enterprise',
                    status: 'active',
                    startDate: new Date().toISOString(),
                    expiryDate: '2030-01-01T00:00:00Z',
                    messagesSentToday: 0,
                    messagesSentThisMonth: 0,
                    messagesSentThisYear: 0
                 }
               };
            }
            setCurrentUser(me);
            localStorage.setItem('wa_original_user', JSON.stringify(me));
          }
        }
      } catch (err) {
        console.error("User fetch error", err);
      }
    };
    fetchUsers();
    // Also poll users every 10 seconds to keep list fresh
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, refreshTrigger]);

  // 3. Polling Instances & Shared Resources
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    if (currentUser.id === 'u_demo_user') return; // Skip fetch for demo user

    const fetchAllData = async () => {
      if (!currentUser) return;
      const headers = { 
        'X-User-ID': currentUser.id, 
        'X-Role': currentUser.role,
        'X-API-Key': currentUser.apiKey
      };

      const fetchInstances = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const instRes = await fetch(`${API_BASE}/api/instances?_t=${Date.now()}`, { headers, signal: controller.signal });
          clearTimeout(timeoutId);
          if (instRes.ok) {
            setInstances(await instRes.json());
            setIsBackendConnected(true);
          }
        } catch (err) {
          console.warn("Backend connection failing:", err);
          setIsBackendConnected(false);
        }
      };

      const fetchMedia = async () => {
        try {
          const mediaRes = await fetch(`${API_BASE}/api/media?_t=${Date.now()}`, { headers });
          if (mediaRes.ok) setMediaAssets(await mediaRes.json());
        } catch (e) {}
      };

      const fetchContacts = async () => {
        try {
          const contactsRes = await fetch(`${API_BASE}/api/contacts/groups?_t=${Date.now()}`, { headers });
          if (contactsRes.ok) setContactGroups(await contactsRes.json());
        } catch (e) {}
      };

      const fetchHiddenModules = async () => {
        try {
          const hiddenRes = await fetch(`${API_BASE}/api/settings/hidden-modules?_t=${Date.now()}`, { headers });
          if (hiddenRes.ok) setHiddenModules(await hiddenRes.json());
        } catch (e) {}
      };

      try {
        if (currentUser?.id) {
          const savedTemplates = localStorage.getItem(`wa_tpls_${currentUser.id}`);
          if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
        }
      } catch (e) {}

      // Parallelize fetches for instant load
      await Promise.allSettled([
        fetchInstances(),
        fetchMedia(),
        fetchContacts(),
        fetchHiddenModules()
      ]);
    };

    const interval = setInterval(fetchAllData, 15000);
    fetchAllData();
    
    // Add real-time Socket.IO listeners
    const socket = io(API_BASE);
    socket.on('connect', () => {
        setIsBackendConnected(true);
        fetchAllData(); // Refresh data on reconnect
    });
    
    socket.on('disconnect', () => {
        setIsBackendConnected(false);
    });

    socket.on('instances_updated', () => {
        fetchAllData();
    });

    socket.on('media_updated', () => {
        fetchAllData();
    });

    socket.on('contacts_updated', () => {
        fetchAllData();
    });

    socket.on('plans_updated', () => {
        setRefreshTrigger(p => p + 1);
    });

    socket.on('users_updated', () => {
        setRefreshTrigger(p => p + 1);
    });

    socket.on('qr', (data) => {
        setInstances(prev => prev.map(inst => 
            inst.id === data.instanceId ? { ...inst, qr: data.qr, status: 'qr' } : inst
        ));
    });

    socket.on('status', (data) => {
        setInstances(prev => prev.map(inst => 
            inst.id === data.instanceId ? { ...inst, status: data.status, qr: null } : inst
        ));
    });

    socket.on('wallet_update', (data) => {
        if (currentUser && data.userId === currentUser.id) {
            setCurrentUser(prev => prev ? ({ ...prev, walletBalance: data.balance }) : prev);
        }
    });

    return () => {
        clearInterval(interval);
        socket.disconnect();
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.apiKey, isAuthenticated, refreshTrigger]);

  // Auto-refresh fresh server data whenever user navigates between pages or refocuses tab
  useEffect(() => {
    if (isAuthenticated && currentUser?.id && currentUser.id !== 'u_demo_user') {
      setRefreshTrigger(p => p + 1);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleWindowFocus = () => {
      if (isAuthenticated && currentUser?.id && currentUser.id !== 'u_demo_user') {
        setRefreshTrigger(p => p + 1);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [isAuthenticated, currentUser?.id]);

  // Sync templates to local storage
  useEffect(() => {
    if (currentUser?.id && templates.length > 0) {
      localStorage.setItem(`wa_tpls_${currentUser.id}`, JSON.stringify(templates));
    }
  }, [templates, currentUser?.id]);

  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        let user = await res.json();
        if (username === '9595956392' && password === 'iFastX@Admin2024') {
            user = { ...user, id: 'u_super_9595', role: UserRole.SUPERADMIN };
        }
        setCurrentUser(user);
        setAuthenticatedUser(user);
        setIsAuthenticated(true);
        setShowLandingPage(false);
        localStorage.setItem('wa_auth_session', 'true');
        localStorage.setItem('wa_current_user_id', user.id);
        localStorage.setItem('wa_original_user', JSON.stringify(user));
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Invalid credentials. Check your username and password.');
      }
    } catch (err) {
      setAuthError('Backend unreachable during login. Please check server status.');
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'u_demo_user',
      username: 'demo_viewer',
      role: UserRole.ADMIN,
      apiKey: 'sk_demo_xxx',
      accessToken: 'tok_demo_xxx',
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      subscription: {
        planId: 'p_pro',
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        messagesSentToday: 154,
        messagesSentThisMonth: 4230,
        messagesSentThisYear: 15400
      }
    };
    setCurrentUser(demoUser);
    localStorage.setItem('wa_current_user_id', demoUser.id);
    localStorage.setItem('wa_auth_session', 'true');
    setInstances([
       { id: 'inst_demo_1', name: 'Sales Line 1', status: InstanceStatus.OPEN, qr: null, phone: '919876543210', messagesProcessed: 1240, lastPing: new Date().toISOString(), assignedTo: 'u_demo_user', createdAt: new Date().toISOString() },
       { id: 'inst_demo_2', name: 'Support Bot', status: InstanceStatus.CLOSED, qr: null, phone: null, messagesProcessed: 0, lastPing: null, assignedTo: 'u_demo_user', createdAt: new Date().toISOString() }
    ]);
    setContactGroups([
      { id: 'cg_demo_1', name: 'VIP Customers', description: 'Top tier clients', contacts: [{phone: '919876543211', name: 'Client A'}, {phone: '919876543212', name: 'Client B'}], createdAt: new Date().toISOString() }
    ]);
    setTemplates([
      { id: 'tpl_demo_1', parentId: 'system', name: 'Welcome Message', content: 'Hello {{name}}, welcome to our service!', variables: ['name'], readonly: true }
    ]);
    setIsBackendConnected(false); // Disable backend fetch override for demo
    setIsAuthenticated(true);
    setShowLandingPage(false);
  };

  const handleSignup = async (username: string, password: string) => {
    const userId = `u_${Date.now()}`;
    const newUser: User = {
      id: userId,
      username: username,
      role: UserRole.ADMIN,
      apiKey: `sk_live_${Math.random().toString(36).substring(7)}`,
      accessToken: `tok_${Math.random().toString(36).substring(7)}`,
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      subscription: {
        planId: 'p_basic',
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        messagesSentToday: 0,
        messagesSentThisMonth: 0,
        messagesSentThisYear: 0
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-ID': 'u_super_9595',
          'X-Role': 'superadmin' 
        },
        body: JSON.stringify({ ...newUser, password })
      });

      if (res.ok) {
        const createdUser = await res.json();
        setUsers(prev => [...prev, createdUser]);
        setCurrentUser(createdUser);
        setIsAuthenticated(true);
        setShowLandingPage(false);
        localStorage.setItem('wa_auth_session', 'true');
        localStorage.setItem('wa_current_user_id', userId);
        } else {
        const errData = await res.json();
        setAuthError(errData.error || 'Signup failed on server.');
      }
    } catch (err) {
      setAuthError('Backend unreachable during signup.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wa_auth_session');
    localStorage.removeItem('wa_current_user_id');
    localStorage.removeItem('wa_original_user');
    localStorage.removeItem('wa_token');
    setIsAuthenticated(false);
    setShowLandingPage(true);
    setAuthenticatedUser(null);
  };

  const visibleInstances = useMemo(() => {
    if (!currentUser || !currentUser.role) return [];
    return instances.filter(inst => {
      const instUserId = inst.userId || (inst as any).user_id;
      // Hide instances marked as hidden for non-superadmins
      if (currentUser.role !== UserRole.SUPERADMIN && inst.isVisible === false) return false;
      
      // Strict role-based isolation:
      if (currentUser.role === UserRole.SUPERADMIN) {
        return true;
      }
      
      if (currentUser.role === UserRole.TEAM_MEMBER) {
        // Worker / team member MUST ONLY see instances belonging to their parent admin or created by them
        const isMineOrParents = instUserId === currentUser.id || (currentUser.parentId && instUserId === currentUser.parentId);
        if (!isMineOrParents) return false;
      } else if (currentUser.role === UserRole.ADMIN) {
        // Admin sees their own instances or sub-user/team instances
        const isMine = instUserId === currentUser.id;
        const owner = users.find(u => u.id === instUserId);
        const isSubUser = owner && owner.parentId === currentUser.id;
        if (!isMine && !isSubUser) return false;
      } else if (currentUser.role === UserRole.RESELLER) {
        // Reseller sees their own instances and sub-admin instances
        const owner = users.find(u => u.id === instUserId);
        const isMineOrSub = instUserId === currentUser.id || (owner && owner.parentId === currentUser.id);
        if (!isMineOrSub) return false;
      }

      return true;
    }).map(inst => {
        const instUserId = inst.userId || (inst as any).user_id;
        const owner = users.find(u => u.id === instUserId) || (instUserId === currentUser.id ? currentUser : null);
        const isExpired = owner && owner.subscription && new Date(owner.subscription.expiryDate) < new Date();
        if (isExpired || (owner && owner.subscription?.status !== 'active')) {
            return { ...inst, userId: instUserId, status: InstanceStatus.SUSPENDED };
        }
        return { ...inst, userId: instUserId };
    }).sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID to prevent shuffling
  }, [instances, users, currentUser]);

  const visibleUsers = useMemo(() => {
    if (!currentUser || !currentUser.role) return [];
    if (currentUser.role === UserRole.SUPERADMIN) return users;
    if (currentUser.role === UserRole.RESELLER) return users.filter(u => u.parentId === currentUser.id || u.id === currentUser.id);
    if (currentUser.role === UserRole.ADMIN) return users.filter(u => u.parentId === currentUser.id);
    return []; // TEAM_MEMBER / Worker cannot view users list
  }, [users, currentUser]);

  const handleCreateInstance = () => {
    setIsProvisionModalOpen(true);
  };
  
  const submitProvisionInstance = async (payload: any) => {
    const res = await fetch(`${API_BASE}/api/create`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create instance');
        throw new Error(data.error);
    }
    // Note: polling will pick it up automatically
  };

  const handleRenameInstance = async (id: string) => {
    const newName = prompt("Enter new name:");
    if (!newName) return;
    try {
      await fetch(`${API_BASE}/api/instance/${id}/rename`, {
          method: 'PATCH',
          headers: { 
              'Content-Type': 'application/json', 
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey
          },
          body: JSON.stringify({ name: newName })
      });
    } catch (err) { console.error(err); }
  };

  
  const handleToggleAi = async (id: string, currentVal?: boolean) => {
    try {
      const newVal = !currentVal;
      await fetch(`${API_BASE}/api/instance/${id}/ai`, {
          method: 'PATCH',
          headers: { 
              'Content-Type': 'application/json', 
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey
          },
          body: JSON.stringify({ aiEnabled: newVal })
      });
      setInstances(prev => prev.map(i => i.id === id ? { ...i, aiEnabled: newVal } : i));
    } catch (err) { console.error(err); }
  };

  const handleUpdateWebhook = async (id: string, currentUrl?: string) => {
    const newUrl = prompt("Enter incoming webhook URL (leave empty to remove):", currentUrl || "");
    if (newUrl === null) return; // Cancelled
    try {
      await fetch(`${API_BASE}/api/instance/${id}/webhook`, {
          method: 'PATCH',
          headers: { 
              'Content-Type': 'application/json', 
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey
          },
          body: JSON.stringify({ webhookUrl: newUrl })
      });
      setInstances(prev => prev.map(i => i.id === id ? { ...i, webhookUrl: newUrl } : i));
    } catch (err) { console.error(err); }
  };

  const handleEditMetaConfig = async (id: string) => {
    const metaPhoneNumberId = prompt("Enter new Meta Phone Number ID (leave blank to keep current):");
    const metaWabaId = prompt("Enter new Meta WABA ID (leave blank to keep current):");
    const metaAccessToken = prompt("Enter new Meta Access Token (leave blank to keep current):");
    
    if (!metaPhoneNumberId && !metaWabaId && !metaAccessToken) return;

    try {
        const res = await fetch(`/api/instances/${id}/meta-config`, {
            method: 'PUT',
            headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ metaPhoneNumberId, metaWabaId, metaAccessToken })
        });
        if (res.ok) {
            alert('Meta config updated successfully!');
            setRefreshTrigger(prev => prev + 1);
        } else {
            const e = await res.json();
            alert(e.error || 'Failed to update config');
        }
    } catch (e) {
        alert('Error updating config');
    }
  };
  (window as any).onEditMetaConfig = handleEditMetaConfig;
  
  const handleToggleVisibility = async (id: string, current: boolean) => {
    try {
        await fetch(`${API_BASE}/api/instance/${id}/visibility`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json', 
                'X-User-ID': currentUser.id,
                'X-API-Key': currentUser.apiKey
            },
            body: JSON.stringify({ isVisible: !current })
        });
        setInstances(prev => prev.map(i => i.id === id ? { ...i, isVisible: !current } : i));
    } catch (err) { console.error(err); }
  };

  const handleRebootInstance = async (id: string) => {
    if (!confirm("Rebooting will temporarily disconnect the session. Proceed?")) return;
    try {
      await fetch(`${API_BASE}/api/instance/${id}/reboot`, {
          method: 'POST',
          headers: { 
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey
          }
      });
    } catch (err) { console.error(err); }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm("Are you sure? This will delete all session data.")) return;
    try {
      await fetch(`${API_BASE}/api/instance/${id}`, { 
          method: 'DELETE',
          headers: { 
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey
          }
      });
      setInstances(prev => prev.filter(i => i.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleSendTest = async (id: string) => {
    const number = prompt("Enter phone number with country code (e.g. 911234567890):");
    if (!number) return;
    const message = "Hello! Secure Auth & Rate Limit Check Success.";
    try {
      const res = await fetch(`${API_BASE}/api/send`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({ instanceId: id, number, message })
      });
      const data = await res.json();
      if (data.success) alert("Message sent successfully!");
      else alert("Error: " + data.error);
    } catch (e) { alert("Failed to connect to API"); }
  };

  if (!isAuthenticated && showLandingPage) {
    return (
      <LandingPage 
        plans={plans} 
        onLoginClick={() => setShowLandingPage(false)} 
        onSignupClick={() => {
          setShowLandingPage(false);
        }} 
        onDemoClick={handleDemoLogin}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} onSignup={handleSignup} error={authError} onBackToHome={() => setShowLandingPage(true)} />;
  }

  const activePlan = plans.find(p => p.id === currentUser?.subscription?.planId)
    || plans.find(p => p.name.toLowerCase() === (currentUser?.subscription?.planId || '').toLowerCase())
    || plans[0];
  const userCustomMax = currentUser?.subscription?.customMaxInstances;
  const effectiveMaxInstances = (userCustomMax !== undefined && userCustomMax !== null)
    ? userCustomMax
    : (activePlan ? activePlan.maxInstances : 10);

  const currentUserInstancesCount = currentUser
    ? instances.filter(i => (i.userId || (i as any).user_id) === currentUser.id).length
    : 0;

  const isPlanLimitReached = Boolean(
    currentUser &&
    currentUser.role !== UserRole.SUPERADMIN &&
    effectiveMaxInstances !== 0 &&
    currentUserInstancesCount >= effectiveMaxInstances
  );

  return (
    <>
      {currentUser && (
        <ProvisionInstanceModal 
          isOpen={isProvisionModalOpen} 
          onClose={() => setIsProvisionModalOpen(false)} 
          onSubmit={submitProvisionInstance}
          planLimitReached={isPlanLimitReached}
          planMax={effectiveMaxInstances}
          planName={activePlan?.name || 'Current Plan'}
          currentPlan={activePlan || null}
          isSuperAdmin={currentUser.role === UserRole.SUPERADMIN}
          onNavigateToBilling={() => {
            setIsProvisionModalOpen(false);
            setActiveTab('billing');
          }}
        />
      )}
    <div className="flex h-[100dvh] bg-[#0b141a] text-gray-200 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - responsive */}
      <div className={`fixed inset-y-0 left-0 z-50 h-full transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isMeta={instances.some(i => i.provider === "meta")} activeTab={activeTab} 
          onTabChange={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
          currentUser={currentUser} authenticatedUser={authenticatedUser || currentUser} 
          allUsers={users}
          onUserSwitch={setCurrentUser}
          hiddenModules={hiddenModules}
          onLogout={handleLogout}
        />
      </div>
      
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <header className="h-14 sm:h-16 shrink-0 border-b border-gray-800 flex items-center justify-between px-2.5 sm:px-4 lg:px-8 bg-[#111b21] gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button 
              className="lg:hidden p-1 text-gray-400 hover:text-white shrink-0"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xs sm:text-base md:text-lg font-bold text-white capitalize leading-none tracking-tight truncate max-w-[85px] xs:max-w-[130px] sm:max-w-none">{activeTab.replace('-', ' ')}</h1>
            <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${
                currentUser.role === UserRole.SUPERADMIN ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                currentUser.role === UserRole.RESELLER ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                'bg-green-500/10 text-green-500 border-green-500/20'
            }`}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button 
                onClick={() => handleCreateInstance()}
                title="Add New WhatsApp Instance"
                className="hidden sm:flex items-center gap-2 bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 px-3 py-1.5 rounded-lg text-sm font-bold border border-[#25D366]/30 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
            >
                <Plus size={15} className="shrink-0 stroke-[2.5]" />
                <span>Add Instance</span>
            </button>
            <HeaderWallet currentUser={currentUser} apiBase={API_BASE} />
            <div className="relative group">
              <button className="block p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors relative" title="Notifications">
                <Bell size={20} />
                {((currentUser.subscription?.undeliveredToday || 0) > 0 || (!currentUser.walletBalance || currentUser.walletBalance < 10)) ? (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#111b21]"></span>
                ) : (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#25D366] rounded-full"></span>
                )}
              </button>
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden">
                  <div className="p-3 border-b border-gray-700 font-bold text-white text-sm flex justify-between items-center bg-black/20">
                      <span className="flex items-center gap-1.5"><Bell size={16} className="text-[#25D366]" /> Notifications</span>
                      <span className="text-[10px] font-mono text-gray-400 uppercase bg-gray-800 px-2 py-0.5 rounded">Today</span>
                  </div>
                  <div className="p-3 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Daily Messages Sent:</span>
                          <span className="text-emerald-400 font-bold font-mono">{currentUser.subscription?.messagesSentToday || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Undelivered (Today):</span>
                          <span className={`font-bold font-mono ${(currentUser.subscription?.undeliveredToday || 0) > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                            {currentUser.subscription?.undeliveredToday || 0}
                          </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Total Undelivered:</span>
                          <span className={`font-bold font-mono ${(currentUser.subscription?.undeliveredTotal || 0) > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                            {currentUser.subscription?.undeliveredTotal || 0}
                          </span>
                      </div>
                      {(!currentUser.walletBalance || currentUser.walletBalance < 10) && (
                          <div className="text-xs text-orange-400 font-bold bg-orange-400/10 p-2.5 rounded-lg border border-orange-400/20 flex items-center gap-2">
                             <AlertCircle size={14} className="shrink-0" /> Low Wallet Balance!
                          </div>
                      )}
                      {((currentUser.subscription?.undeliveredToday || 0) > 0 || (currentUser.subscription?.undeliveredTotal || 0) > 0) && (
                          <button 
                            onClick={() => { setBulkInitialMode('history'); setActiveTab('bulk'); }}
                            className="w-full text-center text-xs text-[#25D366] hover:underline font-bold pt-1 block"
                          >
                            View Failed Campaign Logs →
                          </button>
                      )}
                  </div>
              </div>
            </div>
            <div className="relative group">
                <button className="w-8 h-8 rounded-full bg-gradient-to-r from-[#25D366] to-teal-500 flex items-center justify-center text-sm font-bold text-white shadow-lg hover:scale-105 transition-transform">
                  {currentUser.username.charAt(0).toUpperCase()}
                </button>
                <div className="absolute right-0 mt-2 w-52 bg-[#202c33] border border-gray-700 rounded-xl shadow-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden">
                    <div className="p-3 border-b border-gray-700 font-bold text-white text-sm bg-black/20 text-center">
                        {currentUser.username}
                    </div>
                    <button onClick={() => setActiveTab('profile')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a3942] hover:text-white transition-colors flex items-center gap-2">
                        <UserIcon size={16} className="text-gray-400" /> My Profile
                    </button>
                    <button onClick={() => { setBulkInitialMode('history'); setActiveTab('bulk'); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a3942] hover:text-white transition-colors flex items-center gap-2">
                        <History size={16} className="text-[#25D366]" /> Campaign Logs
                    </button>
                    <button onClick={() => setActiveTab('billing')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2a3942] hover:text-white transition-colors flex items-center gap-2">
                        <CreditCard size={16} className="text-blue-400" /> Billing & Plans
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors font-bold border-t border-gray-700 flex items-center gap-2">
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </div>
          </div>
        </header>

        <div className={`flex-1 min-h-0 ${activeTab === 'chat' ? 'p-0 overflow-hidden' : 'p-4 md:p-8 overflow-y-auto overscroll-y-contain'}`}>
          {activeTab === 'profile' && (
            <ProfileView 
              currentUser={currentUser} 
              plans={plans} 
              instances={visibleInstances} 
              apiBase={API_BASE}
              onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
            />
          )}
          {activeTab === 'dashboard' && (
            <Dashboard 
              instances={visibleInstances} 
              onDelete={handleDeleteInstance}
              onRename={handleRenameInstance}
              onReboot={handleRebootInstance}
              onSendTest={handleSendTest}
              onSimulateConnect={() => {}}
              onUpdateWebhook={handleUpdateWebhook}
              onToggleAi={handleToggleAi}
              onCreateInstance={handleCreateInstance}
              isMockMode={!isBackendConnected}
              currentUser={currentUser}
              onToggleVisibility={handleToggleVisibility}
              hiddenModules={hiddenModules}
              setHiddenModules={setHiddenModules}
              apiBase={API_BASE}
            />
          )}
          {activeTab === 'wallet' && <WalletManager apiBase={API_BASE} currentUser={currentUser} users={users} />}
          {activeTab === 'meta-insights' && <MetaInsightsBilling currentUser={currentUser} instances={instances} apiBase={API_BASE} />}
          {activeTab === 'users' && <UserManagement users={visibleUsers} currentUser={currentUser} setUsers={setUsers} plans={plans} apiBase={API_BASE} />}
          {activeTab === 'billing' && <BillingManager currentUser={currentUser} plans={plans} setPlans={setPlans} users={users} setUsers={setUsers} instances={visibleInstances} apiBase={API_BASE} onUpdateUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))} />}
          {activeTab === 'api-docs' && <ApiDocumentation instances={instances} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'bulk' && <BulkSender instances={visibleInstances} apiBase={API_BASE} templates={templates} contactGroups={contactGroups} currentUser={currentUser} plans={plans} mediaAssets={mediaAssets} hiddenModules={hiddenModules} initialViewMode={bulkInitialMode} />}
          {activeTab === 'templates' && <MessageTemplates templates={templates} setTemplates={setTemplates} mediaAssets={mediaAssets} />}
          {activeTab === 'meta-templates' && <Templates instances={instances} currentUser={currentUser} apiBase={API_BASE} mediaAssets={mediaAssets} />}
          {activeTab === 'meta-automations' && <MetaAutomations instances={instances} currentUser={currentUser} apiBase={API_BASE} mediaAssets={mediaAssets} />}
          {activeTab === 'contacts' && <ContactManager contactGroups={contactGroups} setContactGroups={setContactGroups} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'media-library' && <MediaLibrary currentUser={currentUser} mediaAssets={mediaAssets} setMediaAssets={setMediaAssets} apiBase={API_BASE} />}
          {activeTab === 'auto-responder' && <AutoResponderManager instances={visibleInstances} currentUser={currentUser} mediaAssets={mediaAssets} apiBase={API_BASE} />}
          {activeTab === 'chat' && <ChatInterface instances={visibleInstances} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'team' && <TeamManager currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'visibility' && <VisibilityManager currentUser={currentUser} hiddenModules={hiddenModules} setHiddenModules={setHiddenModules} apiBase={API_BASE} />}
          {activeTab === 'code' && <CodeSnippets />}
          {activeTab === 'logs' && (
            <div className="bg-black/40 p-6 rounded-xl border border-gray-800 font-mono text-sm h-full overflow-y-auto space-y-1">
              <div className="text-gray-500 border-b border-gray-800 pb-2 mb-4 uppercase tracking-widest text-[10px] font-black">System Logs - Live Hook</div>
              {visibleInstances.map(inst => (
                <div key={inst.id} className="text-xs">
                   <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                   <span className="text-[#25D366] ml-2">[{inst.name}]</span>
                   <span className="text-white ml-2 uppercase">{inst.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default App;
