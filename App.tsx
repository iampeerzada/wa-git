
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { InstanceStatus, WhatsAppInstance, MessageTemplate, ContactGroup, User, UserRole, Plan, PlanInterval, Subscription, MediaAsset, Permission } from './types';
import Dashboard from './components/Dashboard';
import CodeSnippets from './components/CodeSnippets';
import Sidebar from './components/Sidebar';
import BulkSender from './components/BulkSender';
import MessageTemplates from './components/MessageTemplates';
import ContactManager from './components/ContactManager';
import ApiDocumentation from './components/ApiDocumentation';
import UserManagement from './components/UserManagement';
import BillingManager from './components/BillingManager';
import MediaLibrary from './components/MediaLibrary';
import AutoResponderManager from './components/AutoResponderManager';
import ChatInterface from './components/ChatInterface';
import TeamManager from './components/TeamManager';
import LoginPage from './components/LoginPage';
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
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('wa_current_user_id');
    const savedUser = localStorage.getItem('wa_cached_user');
    return savedUser ? JSON.parse(savedUser) : {
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'logs' | 'bulk' | 'templates' | 'contacts' | 'api-docs' | 'users' | 'billing' | 'media-library' | 'auto-responder' | 'chat' | 'team'>(() => {
    return (localStorage.getItem('wa_active_tab') as any) || 'dashboard';
  });
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    localStorage.setItem('wa_active_tab', activeTab);
  }, [activeTab]);

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
              dailyLimit: p.daily_limit || 0,
              monthlyLimit: (p.daily_limit || 0) * 30,
              yearlyLimit: (p.daily_limit || 0) * 365,
              maxInstances: p.max_instances || 1,
              rateLimitPerMin: p.rate_limit_per_min || 20,
              features: p.features || ['Standard Support', 'API Access'],
              description: p.description,
              icon: p.icon
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
    if (!isAuthenticated) return;
    if (currentUser.id === 'u_demo_user') return; // Skip fetch for demo user
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users?_t=${Date.now()}`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-Role': currentUser.role,
            'X-API-Key': currentUser.apiKey
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
            localStorage.setItem('wa_cached_user', JSON.stringify(me));
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
  }, [isAuthenticated, currentUser.id, refreshTrigger]);

  // 3. Polling Instances & Shared Resources
  useEffect(() => {
    if (!isAuthenticated) return;
    if (currentUser.id === 'u_demo_user') return; // Skip fetch for demo user

    const fetchAllData = async () => {
      const headers = { 
        'X-User-ID': currentUser.id, 
        'X-Role': currentUser.role,
        'X-API-Key': currentUser.apiKey
      };

      try {
        // Fetch Instances (Critical for Gateway Status)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const instRes = await fetch(`${API_BASE}/api/instances?_t=${Date.now()}`, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (instRes.ok) {
          setInstances(await instRes.json());
          setIsBackendConnected(true);
        } else {
          // If not ok, could be a 500, but let's wait for actual throw or prolonged failure to show disconnect
          console.warn("Instances fetch returned non-ok status", instRes.status);
        }
      } catch (err) {
        console.warn("Backend connection failing:", err);
        // Only set disconnected if we catch an actual network error
        setIsBackendConnected(false);
      }

      // Fetch Secondary Data Independently
      try {
        const mediaRes = await fetch(`${API_BASE}/api/media?_t=${Date.now()}`, { headers });
        if (mediaRes.ok) setMediaAssets(await mediaRes.json());
      } catch (e) {}

      try {
        const contactsRes = await fetch(`${API_BASE}/api/contacts/groups?_t=${Date.now()}`, { headers });
        if (contactsRes.ok) setContactGroups(await contactsRes.json());
      } catch (e) {}

      try {
        const hiddenRes = await fetch(`${API_BASE}/api/settings/hidden-modules?_t=${Date.now()}`, { headers });
        if (hiddenRes.ok) {
            const data = await hiddenRes.json();
            setHiddenModules(data);
        }
      } catch (e) {}

      try {
        const savedTemplates = localStorage.getItem(`wa_tpls_${currentUser.id}`);
        if (savedTemplates) {
          const loaded = JSON.parse(savedTemplates);
          setTemplates(loaded);
        }
      } catch (e) {
        localStorage.removeItem(`wa_tpls_${currentUser.id}`);
      }
    };

    const interval = setInterval(fetchAllData, 5000);
    fetchAllData();
    return () => clearInterval(interval);
  }, [currentUser.id, currentUser.role, currentUser.apiKey, isAuthenticated, refreshTrigger]);

  // Sync templates to local storage
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem(`wa_tpls_${currentUser.id}`, JSON.stringify(templates));
    }
  }, [templates, currentUser.id]);

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
        setIsAuthenticated(true);
        setShowLandingPage(false);
        localStorage.setItem('wa_auth_session', 'true');
        localStorage.setItem('wa_current_user_id', user.id);
        localStorage.setItem('wa_cached_user', JSON.stringify(user));
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
    localStorage.setItem('wa_cached_user', JSON.stringify(demoUser));
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
        localStorage.setItem('wa_cached_user', JSON.stringify(createdUser));
      } else {
        const errData = await res.json();
        setAuthError(errData.error || 'Signup failed on server.');
      }
    } catch (err) {
      setAuthError('Backend unreachable during signup.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowLandingPage(true);
    localStorage.removeItem('wa_auth_session');
    localStorage.removeItem('wa_current_user_id');
    localStorage.removeItem('wa_cached_user');
  };

  const visibleInstances = useMemo(() => {
    return instances.filter(inst => {
      if (currentUser.role !== UserRole.SUPERADMIN && inst.isVisible === false) return false;
      
      const owner = users.find(u => u.id === inst.userId) || (inst.userId === currentUser.id ? currentUser : null);
      if (currentUser.role === UserRole.SUPERADMIN || (owner && owner.role === UserRole.SUPERADMIN)) {
        return true; 
      }
      if (!owner) return true;
      const isExpired = owner.subscription && new Date(owner.subscription.expiryDate) < new Date();
      if (isExpired || owner.subscription?.status !== 'active') {
        return true; 
      }
      return true;
    }).map(inst => {
        const owner = users.find(u => u.id === inst.userId) || (inst.userId === currentUser.id ? currentUser : null);
        const isExpired = owner && owner.subscription && new Date(owner.subscription.expiryDate) < new Date();
        if (isExpired || (owner && owner.subscription?.status !== 'active')) {
            return { ...inst, status: InstanceStatus.SUSPENDED };
        }
        return inst;
    }).sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID to prevent shuffling
  }, [instances, users, currentUser]);

  const visibleUsers = useMemo(() => {
    if (currentUser.role === UserRole.SUPERADMIN) return users;
    if (currentUser.role === UserRole.RESELLER) return users.filter(u => u.parentId === currentUser.id);
    return [];
  }, [users, currentUser]);

  const handleCreateInstance = async () => {
    const currentPlan = plans.find(p => p.id === currentUser.subscription?.planId);
    const myInstancesCount = instances.filter(i => i.userId === currentUser.id).length;
    
    if (currentUser.role !== UserRole.SUPERADMIN) {
        if (!currentPlan) {
            alert("No active plan found. Please subscribe to a plan to create instances.");
            return;
        }
        if (currentPlan.maxInstances !== 0 && myInstancesCount >= currentPlan.maxInstances) {
            alert(`Plan Limit Reached: Your "${currentPlan.name}" plan only allows ${currentPlan.maxInstances} instances. Please upgrade.`);
            return;
        }
    }
    
    const name = prompt("Enter instance name:");
    if (!name) return;
    
    const isMeta = window.confirm("Use Official Meta Cloud API? \n\nClick OK for Meta API. Click Cancel for Baileys (QR Code).");
    
    let payload: any = { name, provider: isMeta ? 'meta' : 'baileys' };
    
    if (isMeta) {
        const metaPhoneNumberId = prompt("Enter Meta Phone Number ID:");
        if (!metaPhoneNumberId) return;
        const metaWabaId = prompt("Enter Meta WABA ID:");
        if (!metaWabaId) return;
        const metaAccessToken = prompt("Enter Meta Access Token:");
        if (!metaAccessToken) return;
        
        payload.metaPhoneNumberId = metaPhoneNumberId;
        payload.metaWabaId = metaWabaId;
        payload.metaAccessToken = metaAccessToken;
    }
    
    try {
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
      }
    } catch (err) { console.error(err); }
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

  return (
    <div className="flex h-screen bg-[#0b141a] text-gray-200 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser} 
        allUsers={users}
        onUserSwitch={setCurrentUser}
        hiddenModules={hiddenModules}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#111b21]">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h1>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold border ${
                currentUser.role === UserRole.SUPERADMIN ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                currentUser.role === UserRole.RESELLER ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                'bg-blue-500/10 text-blue-500 border-blue-500/20'
            }`}>
              {(currentUser.role || 'user').toUpperCase()}: {currentUser.username}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">API Endpoint Status</span>
                <code className={`text-[10px] font-mono ${isBackendConnected ? 'text-[#25D366]' : 'text-red-500'}`}>
                    {isBackendConnected ? 'LIVE GATEWAY' : 'BACKEND DISCONNECTED'}
                </code>
            </div>
            <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 border border-gray-700"
                title="Refresh Data"
            >
                <RefreshCw size={18} />
            </button>
            <button 
                onClick={handleCreateInstance}
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20"
            >
                <Plus size={20} />
                Provision Instance
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white text-xs font-bold px-3 uppercase tracking-widest">Logout</button>
          </div>
        </header>

        <div className={`flex-1 ${activeTab === 'chat' ? 'p-0 overflow-hidden' : 'p-8 overflow-y-auto'}`}>
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
              isMockMode={!isBackendConnected}
              currentUser={currentUser}
              onToggleVisibility={handleToggleVisibility}
              hiddenModules={hiddenModules}
              setHiddenModules={setHiddenModules}
              apiBase={API_BASE}
            />
          )}
          {activeTab === 'users' && <UserManagement users={visibleUsers} currentUser={currentUser} setUsers={setUsers} plans={plans} apiBase={API_BASE} />}
          {activeTab === 'billing' && <BillingManager currentUser={currentUser} plans={plans} setPlans={setPlans} users={users} setUsers={setUsers} instances={visibleInstances} apiBase={API_BASE} />}
          {activeTab === 'api-docs' && <ApiDocumentation instances={instances} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'bulk' && <BulkSender instances={visibleInstances} apiBase={API_BASE} templates={templates} contactGroups={contactGroups} currentUser={currentUser} plans={plans} mediaAssets={mediaAssets} hiddenModules={hiddenModules} />}
          {activeTab === 'templates' && <MessageTemplates templates={templates} setTemplates={setTemplates} mediaAssets={mediaAssets} />}
          {activeTab === 'contacts' && <ContactManager contactGroups={contactGroups} setContactGroups={setContactGroups} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'media-library' && <MediaLibrary currentUser={currentUser} mediaAssets={mediaAssets} setMediaAssets={setMediaAssets} apiBase={API_BASE} />}
          {activeTab === 'auto-responder' && <AutoResponderManager instances={visibleInstances} currentUser={currentUser} mediaAssets={mediaAssets} apiBase={API_BASE} />}
          {activeTab === 'chat' && <ChatInterface instances={visibleInstances} currentUser={currentUser} apiBase={API_BASE} />}
          {activeTab === 'team' && <TeamManager currentUser={currentUser} apiBase={API_BASE} />}
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
  );
};

export default App;
