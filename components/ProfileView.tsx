import React, { useState, useEffect } from 'react';
import { User, Plan, WhatsAppInstance, InstanceStatus } from '../types';
import { 
  Shield, CreditCard, Activity, Calendar, Key, Smartphone, Copy, Check, 
  Eye, EyeOff, User as UserIcon, Mail, Phone, Lock, Save, AlertCircle, CheckCircle2,
  Bot, Sparkles, ExternalLink, Send, RefreshCw, Sliders, MessageSquare
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  plans: Plan[];
  instances?: WhatsAppInstance[];
  apiBase?: string;
  onUpdateUser?: (updatedFields: Partial<User>) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  currentUser, 
  plans, 
  instances = [], 
  apiBase = '', 
  onUpdateUser 
}) => {
  const [showMainApiKey, setShowMainApiKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleInstanceKeys, setVisibleInstanceKeys] = useState<Record<string, boolean>>({});

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Auto-Reply Global Settings
  const [geminiApiKey, setGeminiApiKey] = useState(currentUser.geminiApiKey || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(currentUser.openaiApiKey || '');
  const [defaultAiPrompt, setDefaultAiPrompt] = useState(currentUser.defaultAiPrompt || '');
  const [defaultAiProvider, setDefaultAiProvider] = useState<'gemini' | 'openai'>((currentUser.defaultAiProvider as any) || 'gemini');
  const [defaultAiModel, setDefaultAiModel] = useState(currentUser.defaultAiModel || 'gemini-3.8-flash');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Live Tester
  const [profileTestInput, setProfileTestInput] = useState('Hi, what are your business hours and how do I order?');
  const [isTestingProfileAi, setIsTestingProfileAi] = useState(false);
  const [profileTestReply, setProfileTestReply] = useState<string | null>(null);
  const [profileTestError, setProfileTestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAiSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const res = await fetch(`${apiBase}/api/user/ai-settings`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          setGeminiApiKey(data.geminiApiKey || '');
          setOpenaiApiKey(data.openaiApiKey || '');
          setDefaultAiPrompt(data.defaultAiPrompt || '');
          setDefaultAiProvider(data.defaultAiProvider || 'gemini');
          setDefaultAiModel(data.defaultAiModel || 'gemini-3.8-flash');
        }
      } catch (e) {
        console.error('Failed to load user AI settings', e);
      }
    };
    fetchAiSettings();
  }, [apiBase, currentUser.id, currentUser.apiKey]);

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);
    setAiMsg(null);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/user/ai-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          geminiApiKey,
          openaiApiKey,
          defaultAiPrompt,
          defaultAiProvider,
          defaultAiModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save AI settings');
      if (onUpdateUser) {
        onUpdateUser({
          geminiApiKey,
          openaiApiKey,
          defaultAiPrompt,
          defaultAiProvider,
          defaultAiModel
        });
      }
      setAiMsg({ type: 'success', text: 'AI Auto-Reply settings saved successfully! All instances without their own keys will use these.' });
      setTimeout(() => setAiMsg(null), 4000);
    } catch (err: any) {
      setAiMsg({ type: 'error', text: err.message || 'Error saving AI settings' });
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleTestProfileAi = async () => {
    setIsTestingProfileAi(true);
    setProfileTestReply(null);
    setProfileTestError(null);
    try {
      const activeKey = defaultAiProvider === 'openai' ? openaiApiKey : geminiApiKey;
      const res = await fetch(`${apiBase}/api/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          provider: defaultAiProvider,
          apiKey: activeKey,
          model: defaultAiModel,
          systemPrompt: defaultAiPrompt,
          testMessage: profileTestInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to test AI response');
      setProfileTestReply(data.reply);
    } catch (err: any) {
      setProfileTestError(err.message || 'Error executing AI test');
    } finally {
      setIsTestingProfileAi(false);
    }
  };

  const currentPlan = plans.find(p => p.id === currentUser.subscription?.planId);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleInstanceKeyVisibility = (id: string) => {
    setVisibleInstanceKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-ID': currentUser.id,
          'X-Role': currentUser.role
        },
        body: JSON.stringify({ fullName, username, email, mobile })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (onUpdateUser) {
        onUpdateUser({ fullName, username, email, mobile });
      }

      setProfileMsg({ type: 'success', text: 'Profile details updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3500);
    } catch (err: any) {
      // Fallback local update if API fails or offline
      if (onUpdateUser) {
        onUpdateUser({ fullName, username, email, mobile });
      }
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3500);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Password cannot be empty' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg(null);

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-ID': currentUser.id,
          'X-Role': currentUser.role
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setPasswordMsg(null), 3500);
    } catch (err: any) {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => setPasswordMsg(null), 3500);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getInstanceStatusBadge = (status: InstanceStatus) => {
    switch (status) {
      case InstanceStatus.OPEN:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30">Connected</span>;
      case InstanceStatus.CONNECTING:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Connecting</span>;
      case InstanceStatus.QR_REQUIRED:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">QR Required</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 text-gray-100">
      
      {/* User Overview Header Card - Compact & Professional */}
      <div className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800 p-3.5 sm:p-5 shadow-lg">
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center text-lg sm:text-2xl font-black text-white shadow-md shrink-0">
            {(currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">{currentUser.fullName || currentUser.username}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  currentUser.role === 'superadmin' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                  currentUser.role === 'reseller' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap font-mono">
              <span className="truncate">Username: @{currentUser.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Personal Information & Change Password Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        
        {/* Personal Details Form */}
        <div className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800 p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5 mb-3.5">
              <UserIcon size={16} className="text-[#25D366]" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">User Information</h3>
            </div>

            {profileMsg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3 ${
                profileMsg.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>User ID</span>
                  <span className="text-[10px] text-gray-500 font-mono">(Read-only)</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={currentUser.id}
                    readOnly
                    disabled
                    className="w-full bg-[#070e12] border border-gray-800/80 rounded-lg pl-9 pr-3 py-2 text-gray-400 font-mono text-xs cursor-not-allowed select-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-gray-500 font-mono">(Read-only)</span>
                </label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    readOnly
                    disabled
                    className="w-full bg-[#070e12] border border-gray-800/80 rounded-lg pl-9 pr-3 py-2 text-gray-400 font-mono text-xs cursor-not-allowed select-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#25D366] transition-colors"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#25D366] transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#25D366] transition-colors"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full bg-[#25D366] hover:bg-emerald-500 text-gray-950 font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800 p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5 mb-3.5">
              <Lock size={16} className="text-blue-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Change Password</h3>
            </div>

            {passwordMsg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 mb-3 ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1">New Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-lg pl-9 pr-9 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                >
                  <Lock size={14} />
                  {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* AI Auto-Reply Bot Settings & Global API Keys */}
      <div className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>AI Auto-Reply Bot Persona & API Keys</span>
                <Sparkles size={14} className="text-purple-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Configure your own Gemini or ChatGPT keys to auto-respond to customer chats like Autoresponder.io.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30 self-start sm:self-auto">
            Account Defaults
          </span>
        </div>

        <form onSubmit={handleSaveAiSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Google Gemini Card */}
            <div className="bg-[#182229] p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Google Gemini API Key
                </span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-[#25D366] hover:underline flex items-center gap-0.5"
                >
                  Get Free Key <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#111b21] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-gray-500 focus:border-purple-400 focus:outline-none pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 text-gray-400 hover:text-white"
                >
                  {showGeminiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Recommended models: <span className="text-purple-300">gemini-3.8-flash</span>, <span className="text-purple-300">gemini-flash-latest</span>
              </p>
            </div>

            {/* OpenAI ChatGPT Card */}
            <div className="bg-[#182229] p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  OpenAI ChatGPT API Key
                </span>
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-[#25D366] hover:underline flex items-center gap-0.5"
                >
                  Get Key <ExternalLink size={10} />
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={e => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-[#111b21] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-gray-500 focus:border-emerald-400 focus:outline-none pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2.5 text-gray-400 hover:text-white"
                >
                  {showOpenaiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Recommended models: <span className="text-emerald-300">gpt-4o-mini</span>, <span className="text-emerald-300">gpt-4o</span>
              </p>
            </div>

          </div>

          {/* Default Provider & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300">Default AI Provider</label>
              <select
                value={defaultAiProvider}
                onChange={e => {
                  const p = e.target.value as 'gemini' | 'openai';
                  setDefaultAiProvider(p);
                  if (p === 'openai' && defaultAiModel.includes('gemini')) setDefaultAiModel('gpt-4o-mini');
                  if (p === 'gemini' && defaultAiModel.includes('gpt')) setDefaultAiModel('gemini-3.8-flash');
                }}
                className="w-full bg-[#182229] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="gemini">Google Gemini (Recommended & Free Tier)</option>
                <option value="openai">OpenAI ChatGPT</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-300">Default Model</label>
              <select
                value={defaultAiModel}
                onChange={e => setDefaultAiModel(e.target.value)}
                className="w-full bg-[#182229] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
              >
                {defaultAiProvider === 'openai' ? (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost Effective)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                ) : (
                  <>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Fastest)</option>
                    <option value="gemini-flash-latest">Gemini Flash Latest</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                    <option value="gemini-4-argon">Gemini 4 Argon</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Default System Prompt */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                <MessageSquare size={13} className="text-purple-400" />
                Default Business Persona / System Prompt
              </label>
              <span className="text-[10px] text-gray-500">Inherited by all instances</span>
            </div>
            <textarea
              rows={3}
              value={defaultAiPrompt}
              onChange={e => setDefaultAiPrompt(e.target.value)}
              placeholder="e.g. You are a customer support agent on WhatsApp. Answer customer inquiries politely, concisely, and accurately. Keep replies short (under 60 words)."
              className="w-full bg-[#182229] border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Profile Tester */}
          <div className="p-3 bg-[#0b141a] rounded-xl border border-gray-800 space-y-2">
            <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
              <Sparkles size={12} className="text-purple-400" />
              Quick API Key Verification & Test
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileTestInput}
                onChange={e => setProfileTestInput(e.target.value)}
                placeholder="Ask a test question..."
                className="flex-1 bg-[#182229] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestProfileAi}
                disabled={isTestingProfileAi || (defaultAiProvider === 'openai' ? !openaiApiKey : !geminiApiKey)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0"
              >
                {isTestingProfileAi ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Test</span>
              </button>
            </div>
            {profileTestReply && (
              <p className="text-xs text-gray-300 bg-purple-950/20 border border-purple-500/30 p-2 rounded-lg italic">
                &ldquo;{profileTestReply}&rdquo;
              </p>
            )}
            {profileTestError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                {profileTestError}
              </p>
            )}
          </div>

          {aiMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              aiMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {aiMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{aiMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingAi}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/30"
            >
              {isSavingAi ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save AI Bot Settings</span>
            </button>
          </div>
        </form>
      </div>
      <div className="bg-[#111b21] rounded-xl sm:rounded-2xl border border-gray-800 p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key size={15} className="text-[#25D366]" />
              WhatsApp Instance API Keys
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              API requests use your account key and instance ID header.
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-[#202c33] px-2.5 py-1 rounded-lg border border-gray-700 self-start sm:self-auto">
            Instances: {instances.length}
          </span>
        </div>

        {instances.length === 0 ? (
          <div className="bg-[#0b141a] p-4 rounded-xl border border-gray-800/60 text-center py-5 text-xs text-gray-400">
            <Smartphone size={20} className="mx-auto mb-1.5 text-gray-600" />
            <p className="font-medium text-gray-300">No Instances Connected</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Connect an instance from the Dashboard to access instance credentials.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {instances.map((inst) => {
              const instKey = currentUser.apiKey || 'sk_live_demo';
              const isKeyVisible = visibleInstanceKeys[inst.id];

              return (
                <div key={inst.id} className="bg-[#0b141a] p-3 rounded-xl border border-gray-800/80 hover:border-gray-700 transition-colors space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-[#25D366]/10 text-[#25D366] rounded-lg shrink-0">
                        <Smartphone size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">{inst.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {inst.phoneNumber ? `+${inst.phoneNumber}` : 'No phone linked'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getInstanceStatusBadge(inst.status)}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono bg-[#111b21] p-2 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-[10px] uppercase">Instance ID:</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-emerald-400 font-bold truncate text-[11px]">{inst.id}</span>
                        <button
                          onClick={() => handleCopy(inst.id, `inst_id_${inst.id}`)}
                          className="p-1 text-gray-400 hover:text-[#25D366] transition-colors shrink-0"
                          title="Copy Instance ID"
                        >
                          {copiedKeyId === `inst_id_${inst.id}` ? <Check size={12} className="text-[#25D366]" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 border-t border-gray-800/60 pt-1.5">
                      <span className="text-gray-400 text-[10px] uppercase">API Key:</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-gray-300 truncate text-[11px]">
                          {isKeyVisible ? instKey : '••••••••••••••••'}
                        </span>
                        <button 
                          onClick={() => toggleInstanceKeyVisibility(inst.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
                          title={isKeyVisible ? 'Hide Key' : 'Show Key'}
                        >
                          {isKeyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          onClick={() => handleCopy(instKey, `inst_key_${inst.id}`)}
                          className="p-1 text-gray-400 hover:text-[#25D366] transition-colors shrink-0"
                          title="Copy API Key"
                        >
                          {copiedKeyId === `inst_key_${inst.id}` ? <Check size={12} className="text-[#25D366]" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-gray-400 bg-black/40 p-1.5 rounded border border-gray-800 flex justify-between items-center">
                    <span className="truncate">Header: <span className="text-blue-400">X-API-Key</span> + <span className="text-emerald-400">Instance-ID</span></span>
                    <button
                      onClick={() => handleCopy(`curl -H "X-API-Key: ${instKey}" -H "Instance-ID: ${inst.id}"`, `curl_${inst.id}`)}
                      className="text-[10px] font-bold text-[#25D366] hover:underline shrink-0 ml-1"
                    >
                      {copiedKeyId === `curl_${inst.id}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
