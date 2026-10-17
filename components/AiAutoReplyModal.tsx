import React, { useState, useEffect } from 'react';
import { 
  Bot, Sparkles, X, Check, Key, Shield, HelpCircle, 
  Send, AlertCircle, RefreshCw, Eye, EyeOff, Sliders, MessageSquare, 
  CheckCircle2, ExternalLink, Zap, Plus, Trash2, ShieldCheck, Gauge, Clock, FileText, History
} from 'lucide-react';
import io from 'socket.io-client';
import { WhatsAppInstance, User } from '../types';
import AiAutomationLogs from './AiAutomationLogs';

interface AiAutoReplyModalProps {
  instance: WhatsAppInstance;
  currentUser: User;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedInstance: Partial<WhatsAppInstance>) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Customer Support & FAQ',
    description: 'Polite, concise answers for store hours, orders, and support.',
    prompt: 'You are a friendly and professional customer support representative for our business on WhatsApp. Answer customer questions politely, accurately, and concisely. Keep your answers brief (under 60-80 words). If you do not know a specific order detail, kindly ask for their Order ID or ask them to hold for a human agent.'
  },
  {
    title: 'Sales & Lead Qualifier',
    description: 'Greets leads, asks for requirements, and captures contact info.',
    prompt: 'You are a consultative sales assistant for our business. Warmly welcome the customer, ask what products or services they are looking for today, answer questions about our pricing and features enthusiastically, and politely ask for their name and email so our team can follow up.'
  },
  {
    title: 'Booking & Appointment Assistant',
    description: 'Collects booking details, preferred dates, and service type.',
    prompt: 'You are an appointment scheduling assistant. Welcome the customer, ask what date and time works best for their appointment, inquire about the specific service required, and confirm their booking request politely.'
  },
  {
    title: 'Minimalist WhatsApp Direct',
    description: 'Ultra-concise, natural direct messaging without fluff.',
    prompt: 'You are a direct, helpful WhatsApp assistant. Answer customer queries in 1-2 friendly sentences. Do not use corporate jargon or lengthy disclaimers. Always sound human, helpful, and natural.'
  }
];

export default function AiAutoReplyModal({
  instance,
  currentUser,
  apiBase,
  isOpen,
  onClose,
  onSaved
}: AiAutoReplyModalProps) {
  if (!isOpen) return null;

  // Helper to split keys
  const parseKeys = (str: string | undefined): string[] => {
    if (!str) return [''];
    const list = str.split(/[\r\n,;]+/).map(k => k.trim()).filter(Boolean);
    return list.length > 0 ? list : [''];
  };

  const [aiEnabled, setAiEnabled] = useState(instance.aiEnabled ?? false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>((instance.aiProvider as any) || 'gemini');
  const [apiKeys, setApiKeys] = useState<string[]>(parseKeys(instance.aiApiKey));
  const [aiModel, setAiModel] = useState(instance.aiModel || (instance.aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash'));
  const [aiSystemPrompt, setAiSystemPrompt] = useState(instance.aiSystemPrompt || '');
  const [aiTemperature, setAiTemperature] = useState(instance.aiTemperature ?? 0.7);
  const [aiAutoReplyGroups, setAiAutoReplyGroups] = useState(instance.aiAutoReplyGroups ?? false);
  const [aiMaxTokens, setAiMaxTokens] = useState<number>(instance.aiMaxTokens ?? 1800);
  const [uncappedTokens, setUncappedTokens] = useState<boolean>((instance.aiMaxTokens ?? 1800) >= 4000);
  const [poolStatus, setPoolStatus] = useState<any[]>([]);
  const [isSyncingPool, setIsSyncingPool] = useState(false);

  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live test state
  const [testInput, setTestInput] = useState('Hi, what are your business hours and how do I order?');
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testKeyResults, setTestKeyResults] = useState<any[]>([]);
  const [testError, setTestError] = useState<string | null>(null);

  // Fallback defaults from profile
  const [hasUserKey, setHasUserKey] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'config' | 'logs'>('config');

  useEffect(() => {
    // Fetch instance detailed AI config
    const loadConfig = async () => {
      try {
        const res = await fetch(`${apiBase}/api/instance/${instance.id}/ai-config`, {
          headers: {
            'X-User-ID': currentUser.id,
            'X-API-Key': currentUser.apiKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAiEnabled(data.aiEnabled ?? false);
          setAiProvider(data.aiProvider || 'gemini');
          const keys = parseKeys(data.aiApiKey);
          setApiKeys(keys);
          setAiModel(data.aiModel || (data.aiProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.8-flash'));
          setAiSystemPrompt(data.aiSystemPrompt || data.defaultAiPrompt || '');
          setAiTemperature(data.aiTemperature ?? 0.7);
          setAiAutoReplyGroups(data.aiAutoReplyGroups ?? false);
          setAiMaxTokens(data.aiMaxTokens ? Number(data.aiMaxTokens) : 1800);
          setUncappedTokens(data.aiMaxTokens ? Number(data.aiMaxTokens) >= 4000 : false);
          setHasUserKey(data.hasUserGeminiKey || data.hasUserOpenAiKey);
        }
      } catch (e) {
        console.error('Failed to load AI config', e);
      }
    };
    loadConfig();
  }, [instance.id, apiBase, currentUser.id, currentUser.apiKey]);

  // Real-time Socket.IO listener for key pool status updates
  useEffect(() => {
    const socket = io(apiBase);
    
    // Auto-sync status when component mounts or socket connects
    handleSyncPool();

    // Listen for live key failover or recovery events
    socket.on('key_pool_updated', () => {
      handleSyncPool();
    });

    return () => {
      socket.disconnect();
    };
  }, [apiBase, instance.id]);

  // Adjust default model if provider switches
  const handleProviderChange = (newProvider: 'gemini' | 'openai') => {
    setAiProvider(newProvider);
    if (newProvider === 'openai') {
      if (aiModel.includes('gemini')) setAiModel('gpt-4o-mini');
    } else {
      if (aiModel.includes('gpt')) setAiModel('gemini-3.8-flash');
    }
  };

  const handleAddKey = () => {
    setApiKeys([...apiKeys, '']);
  };

  const handleUpdateKey = (index: number, val: string) => {
    // If user pasted multiple keys into one box (newline or comma separated)
    if (val.includes('\n') || val.includes(',') || val.includes(';')) {
      const parts = val.split(/[\r\n,;]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        const updated = [...apiKeys];
        updated.splice(index, 1, ...parts);
        setApiKeys(updated);
        return;
      }
    }
    const updated = [...apiKeys];
    updated[index] = val;
    setApiKeys(updated);
  };

  const handleRemoveKey = (index: number) => {
    if (apiKeys.length <= 1) {
      setApiKeys(['']);
      return;
    }
    setApiKeys(apiKeys.filter((_, i) => i !== index));
  };

  const handleSyncPool = async () => {
    setIsSyncingPool(true);
    try {
      const serializedKeys = apiKeys.map(k => k.trim()).filter(Boolean).join('\n');
      const res = await fetch(`${apiBase}/api/ai/pool-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: serializedKeys,
          instanceId: instance.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool || []);
      }
    } catch (e) {
      console.error('Failed to sync pool status', e);
    } finally {
      setIsSyncingPool(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const serializedKeys = apiKeys.map(k => k.trim()).filter(Boolean).join('\n');
      const effectiveTokens = uncappedTokens ? 4096 : (aiMaxTokens || 1800);

      const res = await fetch(`${apiBase}/api/instance/${instance.id}/ai-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          aiEnabled,
          aiProvider,
          aiApiKey: serializedKeys,
          aiModel,
          aiSystemPrompt,
          aiTemperature,
          aiAutoReplyGroups,
          aiMaxTokens: effectiveTokens
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save AI configuration');
      }

      setSaveSuccess(true);
      onSaved({
        aiEnabled,
        aiProvider,
        aiApiKey: serializedKeys,
        aiModel,
        aiSystemPrompt,
        aiTemperature,
        aiAutoReplyGroups,
        aiMaxTokens: effectiveTokens
      });

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!testInput.trim()) return;
    setIsTesting(true);
    setTestResponse(null);
    setTestLatency(null);
    setTestKeyResults([]);
    setTestError(null);

    try {
      const serializedKeys = apiKeys.map(k => k.trim()).filter(Boolean).join('\n');
      const effectiveTokens = uncappedTokens ? 4096 : (aiMaxTokens || 1800);

      const res = await fetch(`${apiBase}/api/ai/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: serializedKeys,
          model: aiModel,
          systemPrompt: aiSystemPrompt,
          testMessage: testInput,
          maxTokens: effectiveTokens
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.keyResults) setTestKeyResults(data.keyResults);
        throw new Error(data.error || 'Test request failed');
      }
      setTestResponse(data.reply);
      setTestLatency(data.latencyMs);
      setTestKeyResults(data.keyResults || []);
    } catch (err: any) {
      setTestError(err.message || 'AI request failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111b21] border border-gray-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800/80 bg-gradient-to-r from-[#111b21] via-[#1a2730] to-[#111b21] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  AI Auto-Reply Bot
                  <Sparkles size={16} className="text-purple-400 animate-pulse" />
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {instance.name} ({instance.provider === 'meta' ? 'META OFFICIAL' : 'BAILEYS QR'})
                </span>
              </div>
              
              {/* Tab Navigation Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('config')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'config'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Bot size={13} />
                  <span>Bot Settings & Failover Keys</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('logs')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'logs'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <History size={13} />
                  <span>AI Activity Logs & Key History</span>
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-lg transition-colors self-start"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {activeModalTab === 'logs' ? (
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
            <AiAutomationLogs 
              instances={[instance]} 
              currentUser={currentUser} 
              apiBase={apiBase} 
              selectedInstanceId={instance.id} 
            />
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-gray-200">
            
            {/* Master Enable Toggle Card */}
            <div className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
            aiEnabled 
              ? 'bg-purple-950/20 border-purple-500/40 shadow-inner' 
              : 'bg-[#182229] border-gray-800'
          }`}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Enable AI Auto-Reply</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  aiEnabled ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {aiEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                When enabled, incoming messages to this instance are answered by your custom AI persona in the direct chat box.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                aiEnabled ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                aiEnabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* AI Provider Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={14} className="text-purple-400" />
              Choose AI Engine Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google Gemini Card */}
              <div 
                onClick={() => handleProviderChange('gemini')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  aiProvider === 'gemini'
                    ? 'bg-purple-500/10 border-purple-500/60 ring-1 ring-purple-500/40'
                    : 'bg-[#182229] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Google Gemini</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">Free Tier</span>
                  </div>
                  {aiProvider === 'gemini' && <Check size={16} className="text-purple-400" />}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Fast, ultra-smart model via Google AI Studio. Generous free token quota.
                </p>
              </div>

              {/* OpenAI ChatGPT Card */}
              <div 
                onClick={() => handleProviderChange('openai')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  aiProvider === 'openai'
                    ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-[#182229] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">OpenAI ChatGPT</span>
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/30">GPT-4o</span>
                  </div>
                  {aiProvider === 'openai' && <Check size={16} className="text-emerald-400" />}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Industry-standard conversational AI using your own OpenAI API key.
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Key Pool & Free-Tier Auto-Shift Section */}
          <div className="space-y-3 bg-[#182229] p-4 rounded-xl border border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Key size={14} className="text-purple-400" />
                  {aiProvider === 'openai' ? 'OpenAI API Key Pool' : 'Google Gemini API Key Pool'}
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Zap size={10} className="text-yellow-400" />
                  {apiKeys.filter(k => k.trim()).length} Key{apiKeys.filter(k => k.trim()).length !== 1 ? 's' : ''} in Pool
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncPool}
                  disabled={isSyncingPool || apiKeys.filter(k => k.trim()).length === 0}
                  className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer disabled:opacity-40"
                  title="Check live quota and failover status of all keys in pool"
                >
                  <RefreshCw size={11} className={isSyncingPool ? 'animate-spin' : ''} />
                  <span>{isSyncingPool ? 'Checking...' : 'Sync Free-Tier Status'}</span>
                </button>
                <a
                  href={aiProvider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/apikey'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1"
                >
                  Get Free Key <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Free-Tier Auto-Shift Explainer Banner */}
            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-gray-300 leading-relaxed">
                <strong className="text-white">Free-Tier Quota Auto-Shift Active:</strong> You can add multiple free API keys. If your active key hits Gemini&apos;s free-tier rate limits (15 RPM or daily quota), the engine <span className="text-emerald-400 font-semibold">instantly auto-shifts to your backup keys</span> with 0s downtime!
              </div>
            </div>

            {/* List of Keys in Pool */}
            <div className="space-y-2">
              {apiKeys.map((key, idx) => {
                const keyStatus = poolStatus.find(p => p.index === idx + 1);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          keyStatus?.status === 'cooldown' 
                            ? 'bg-amber-400 animate-pulse' 
                            : idx === 0 ? 'bg-[#25D366]' : 'bg-purple-400'
                        }`} />
                        <span>Key #{idx + 1} {idx === 0 ? '(Primary Key)' : '(Failover Backup Key)'}</span>
                        {keyStatus && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            keyStatus.status === 'cooldown' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {keyStatus.status === 'cooldown' ? `⏳ Limit Hit (Wait ${keyStatus.cooldownRemainingSec}s)` : '✓ Ready / Active'}
                          </span>
                        )}
                      </span>
                      {apiKeys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKey(idx)}
                          className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] cursor-pointer"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showApiKeys ? 'text' : 'password'}
                        value={key}
                        onChange={e => handleUpdateKey(idx, e.target.value)}
                        placeholder={
                          aiProvider === 'openai' 
                            ? 'sk-proj-... (or paste multiple keys separated by commas/newlines)'
                            : 'AIzaSy... (or paste multiple keys separated by commas/newlines)'
                        }
                        className="w-full bg-[#111b21] border border-gray-700 focus:border-purple-400 rounded-xl px-3 py-2 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                        className="absolute right-3 text-gray-400 hover:text-white"
                        title={showApiKeys ? 'Hide keys' : 'Show keys'}
                      >
                        {showApiKeys ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-800/60">
              <button
                type="button"
                onClick={handleAddKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer w-fit"
              >
                <Plus size={13} />
                <span>+ Add Another API Key (Failover)</span>
              </button>
              <p className="text-[10px] text-gray-400">
                {hasUserKey && apiKeys.filter(k => k.trim()).length === 0
                  ? '✓ Using fallback key from Profile'
                  : 'Keys automatically shift if free tier rate limit is reached'}
              </p>
            </div>
          </div>

          {/* Speed & Acceleration Info Card */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-950/25 via-[#182229] to-purple-950/25 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg shrink-0">
                <Zap size={18} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Fast Response Mode Active
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold uppercase">~200-600ms</span>
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Direct REST connection with WhatsApp &ldquo;typing...&rdquo; presence indicator and multi-key auto-failover.
                </p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 shrink-0">
              ⚡ Ultra-Fast
            </span>
          </div>

          {/* Customizable Output Token Capping Section (No Half Answers) */}
          <div className="p-4 bg-[#182229] rounded-xl border border-gray-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Response Length & Output Token Capping
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {uncappedTokens ? 'Uncapped (4096)' : `${aiMaxTokens} Tokens`}
                </span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-purple-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uncappedTokens}
                  onChange={e => {
                    setUncappedTokens(e.target.checked);
                    if (e.target.checked) setAiMaxTokens(4096);
                    else setAiMaxTokens(1800);
                  }}
                  className="rounded border-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="font-semibold text-[11px]">No Strict Cap (Full Output)</span>
              </label>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Controls maximum allowed response tokens. Set to <strong className="text-white">1800 tokens</strong> (or uncapped) so that complete explanations, product catalogs, FAQ lists, and thorough answers are <span className="text-emerald-400 font-medium">never cut off midway (eliminates half-answers)</span>.
            </p>

            {/* Quick Token Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '⚡ Concise', tokens: 350, desc: '~250 words' },
                { label: '💬 Standard', tokens: 800, desc: '~600 words' },
                { label: '📝 Full & Detailed', tokens: 1800, desc: '~1350 words (Recommended)' },
                { label: '🚀 Comprehensive', tokens: 3000, desc: '~2250 words' }
              ].map((preset) => {
                const isSelected = !uncappedTokens && aiMaxTokens === preset.tokens;
                return (
                  <button
                    key={preset.tokens}
                    type="button"
                    onClick={() => {
                      setUncappedTokens(false);
                      setAiMaxTokens(preset.tokens);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-purple-500/20 border-purple-500/60 ring-1 ring-purple-500/40' 
                        : 'bg-[#111b21] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{preset.label}</span>
                      {isSelected && <Check size={13} className="text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{preset.tokens} tokens • {preset.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Custom Token Number Input & Slider */}
            {!uncappedTokens && (
              <div className="pt-2 border-t border-gray-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">Customize Exact Token Limit (100 - 4096):</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={100}
                      max={4096}
                      step={50}
                      value={aiMaxTokens}
                      onChange={e => setAiMaxTokens(Math.max(100, Math.min(4096, parseInt(e.target.value) || 1800)))}
                      className="w-20 bg-[#111b21] border border-gray-700 focus:border-purple-400 rounded-lg px-2 py-1 text-xs text-white text-right font-mono focus:outline-none"
                    />
                    <span className="text-[11px] text-gray-400">tokens</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={200}
                  max={4096}
                  step={50}
                  value={aiMaxTokens}
                  onChange={e => setAiMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Model Selector & Temperature Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Model Selection (Speed & Intelligence)</label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full bg-[#182229] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none cursor-pointer"
              >
                {aiProvider === 'openai' ? (
                  <>
                    <option value="gpt-4o-mini">⚡ GPT-4o Mini (Fast ~500ms & Cost Effective)</option>
                    <option value="gpt-4o">🧠 GPT-4o (Most Intelligent - Slower)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
                  </>
                ) : (
                  <>
                    <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (Lowest Latency ~200-400ms - Fastest for WhatsApp)</option>
                    <option value="gemini-3.8-flash">⚡ Gemini 3.8 Flash (Ultra-Fast & Smart ~400-700ms - Recommended)</option>
                    <option value="gemini-flash-latest">Gemini Flash Latest</option>
                    <option value="gemini-4-argon">🧠 Gemini 4 Argon (Deep Reasoning - Slower)</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-gray-300 flex items-center gap-1">
                  <Sliders size={12} className="text-purple-400" />
                  Creativity / Temperature
                </span>
                <span className="font-mono text-purple-400">{aiTemperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={aiTemperature}
                onChange={e => setAiTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-gray-700 rounded-lg mt-2"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0.1 (Strict & Factual)</span>
                <span>1.0 (Creative & Conversational)</span>
              </div>
            </div>
          </div>

          {/* Persona Prompt Configuration */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-purple-400" />
                Custom System Persona & Instructions
              </label>
              <span className="text-[10px] text-gray-400">
                Click a preset to quickly pre-fill:
              </span>
            </div>

            {/* Prompt Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAiSystemPrompt(p.prompt)}
                  className="p-2 text-left bg-[#182229] hover:bg-purple-950/20 border border-gray-800 hover:border-purple-500/40 rounded-lg transition-all group"
                >
                  <p className="text-[11px] font-bold text-white group-hover:text-purple-300 truncate">{p.title}</p>
                  <p className="text-[9px] text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>

            {/* Prompt Textarea */}
            <textarea
              rows={4}
              value={aiSystemPrompt}
              onChange={e => setAiSystemPrompt(e.target.value)}
              placeholder="e.g. You are a WhatsApp assistant for ACME Store. Answer inquiries politely and inform customers our office hours are 9am-6pm. Keep replies under 60 words."
              className="w-full bg-[#182229] border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Group Chats Exclude Filter */}
          <div className="p-3 bg-[#182229] rounded-xl border border-gray-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Auto-Reply to Group Chats</p>
              <p className="text-[11px] text-gray-400">Keep disabled to only reply to direct 1-on-1 customer chats.</p>
            </div>
            <button
              type="button"
              onClick={() => setAiAutoReplyGroups(!aiAutoReplyGroups)}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                aiAutoReplyGroups ? 'bg-[#25D366]' : 'bg-gray-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                aiAutoReplyGroups ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Live Interactive Test Playground */}
          <div className="p-4 bg-[#0d1418] rounded-xl border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-400" />
                Live Bot Playground (Test Before Saving)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Real API Call</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                placeholder="Ask your bot a test question..."
                className="flex-1 bg-[#182229] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRunTest}
                disabled={isTesting || (apiKeys.filter(k => k.trim()).length === 0 && !hasUserKey)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md cursor-pointer"
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Test Reply</span>
              </button>
            </div>

            {testResponse && (
              <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-300 font-bold uppercase">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Bot Response Preview:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testLatency !== null && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Zap size={10} className="text-emerald-400" />
                        <span>{testLatency}ms Latency</span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {testResponse.split(/\s+/).filter(Boolean).length} words • Complete Answer
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-200 leading-relaxed bg-black/40 p-3 rounded-lg border border-purple-500/20 whitespace-pre-wrap">
                  {testResponse}
                </div>

                {/* Key Pool Health Breakdown */}
                {testKeyResults.length > 0 && (
                  <div className="pt-2 border-t border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Key Pool Health & Failover Check:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {testKeyResults.map((r, i) => (
                        <div
                          key={i}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center justify-between ${
                            r.isHealthy
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          <span className="truncate">
                            Key #{r.index} ({r.keyMasked})
                          </span>
                          <span className="shrink-0 font-bold ml-1">
                            {r.isHealthy ? `⚡ ${r.latencyMs}ms OK` : `⚠️ ${r.status}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {testError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{testError}</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>AI Auto-Reply configuration successfully saved and activated!</span>
            </div>
          )}

        </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#182229] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-400 hidden sm:block">
            Auto-replies sync directly to the live Chat box in real-time.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/30"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save & Apply</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
