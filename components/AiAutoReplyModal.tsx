import React, { useState, useEffect } from 'react';
import { 
  Bot, Sparkles, X, Check, Key, Shield, HelpCircle, 
  Send, AlertCircle, RefreshCw, Eye, EyeOff, Sliders, MessageSquare, 
  CheckCircle2, ExternalLink, Zap, Plus, Trash2, ShieldCheck, Gauge, Clock, FileText, History,
  BookOpen, Database, Layers, Globe, FileCode, Edit3, Copy, Search
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

  // Fallback defaults from profile and active model state
  const [hasUserKey, setHasUserKey] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'config' | 'knowledge' | 'mysql' | 'logs'>('config');
  const [activeModelInfo, setActiveModelInfo] = useState<any>(null);

  // Business Knowledge Base & Software Catalog state
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [showAddKbModal, setShowAddKbModal] = useState(false);
  const [kbCategory, setKbCategory] = useState('OLT Management Software');
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbTags, setKbTags] = useState('');
  const [editingKbId, setEditingKbId] = useState<number | null>(null);
  const [isSavingKb, setIsSavingKb] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');

  // External MySQL Database & Webhook Integration state
  const [mysqlHost, setMysqlHost] = useState('');
  const [mysqlPort, setMysqlPort] = useState(3306);
  const [mysqlDb, setMysqlDb] = useState('');
  const [mysqlUser, setMysqlUser] = useState('');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [mysqlTables, setMysqlTables] = useState('products, software_features, faqs');
  const [mysqlWebhook, setMysqlWebhook] = useState('');
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [mysqlTestResult, setMysqlTestResult] = useState<any>(null);
  const [isSavingMysql, setIsSavingMysql] = useState(false);
  const [mysqlSaveSuccess, setMysqlSaveSuccess] = useState(false);
  const [rawStoreJson, setRawStoreJson] = useState('');
  const [isSyncingStoreData, setIsSyncingStoreData] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Live Knowledge Base AI response simulator state & handler
  const [testPrompt, setTestPrompt] = useState('');
  const [testReply, setTestReply] = useState<string | null>(null);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);

  // Handler: Run live test query against Knowledge Base AI pipeline
  const handleRunTestPrompt = async () => {
    if (!testPrompt.trim()) return;
    setIsTestingPrompt(true);
    setTestReply(null);
    try {
      // Clean trailing slashes from apiBase URL to prevent double-slash fetch errors
      const cleanBase = (apiBase || '').replace(/\/+$/, '');
      const res = await fetch(`${cleanBase}/api/ai/test-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser?.id || '',
          'X-API-Key': currentUser?.apiKey || ''
        },
        body: JSON.stringify({
          message: testPrompt.trim(),
          instanceId: instance.id
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setTestReply(data.reply || 'No output generated.');
      } else {
        setTestReply(`Error: ${data.error || 'Failed to generate test reply. Please check your Gemini or OpenAI API key.'}`);
      }
    } catch (e: any) {
      setTestReply(`Test Error: ${e.message || 'Failed to connect to backend server'}`);
    } finally {
      setIsTestingPrompt(false);
    }
  };

  // Fetch Knowledge Base items from backend
  const fetchKnowledge = async () => {
    setIsLoadingKnowledge(true);
    try {
      // Query global and user knowledge base articles so nothing disappears
      const res = await fetch(`${apiBase}/api/ai/knowledge`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeList(data.knowledge || []);
      }
    } catch (e) {
      console.error('Failed to fetch knowledge base', e);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // Fetch External MySQL Configuration from backend
  const fetchMysqlConfig = async () => {
    try {
      const res = await fetch(`${apiBase}/api/ai/mysql-config`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setMysqlHost(data.config.host || '');
          setMysqlPort(data.config.port || 3306);
          setMysqlDb(data.config.database_name || '');
          setMysqlUser(data.config.username || '');
          if (data.config.password) {
            setMysqlPassword(data.config.password);
          }
          setMysqlTables(data.config.tables_to_sync || 'all');
          setMysqlWebhook(data.config.api_webhook_url || '');
        }
      }
    } catch (e) {
      console.error('Failed to fetch MySQL config', e);
    }
  };

  // Create or Update Knowledge Base Document
  const handleSaveKbItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) return;
    setIsSavingKb(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          id: editingKbId,
          instanceId: instance.id,
          category: kbCategory,
          title: kbTitle,
          content: kbContent,
          tags: kbTags,
          isActive: true
        })
      });
      if (res.ok) {
        setShowAddKbModal(false);
        setEditingKbId(null);
        setKbTitle('');
        setKbContent('');
        setKbTags('');
        fetchKnowledge();
      }
    } catch (e) {
      console.error('Failed to save knowledge item', e);
    } finally {
      setIsSavingKb(false);
    }
  };

  // Delete Knowledge Base item
  const handleDeleteKbItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;
    try {
      const res = await fetch(`${apiBase}/api/ai/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (e) {
      console.error('Failed to delete knowledge item', e);
    }
  };

  // Seed sample pre-populated software feature documents (OLT software, WhatsApp platform, Store FAQ)
  const handleSeedKbSamples = async () => {
    setIsLoadingKnowledge(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/knowledge/seed-samples`, {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (e) {
      console.error('Failed to seed knowledge samples', e);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // Test external MySQL Database Connection
  const handleTestMysql = async () => {
    setIsTestingMysql(true);
    setMysqlTestResult(null);
    try {
      const res = await fetch(`${apiBase}/api/ai/mysql-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          host: mysqlHost,
          port: mysqlPort,
          databaseName: mysqlDb,
          username: mysqlUser,
          password: mysqlPassword
        })
      });
      const data = await res.json();
      setMysqlTestResult(data);
    } catch (e: any) {
      setMysqlTestResult({ success: false, error: e.message });
    } finally {
      setIsTestingMysql(false);
    }
  };

  // Save external MySQL connection settings
  const handleSaveMysqlConfig = async () => {
    setIsSavingMysql(true);
    setMysqlSaveSuccess(false);
    try {
      const res = await fetch(`${apiBase}/api/ai/mysql-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          host: mysqlHost,
          port: mysqlPort,
          databaseName: mysqlDb,
          username: mysqlUser,
          password: mysqlPassword,
          tablesToSync: mysqlTables,
          apiWebhookUrl: mysqlWebhook,
          autoSyncEnabled: true
        })
      });
      if (res.ok) {
        setMysqlSaveSuccess(true);
        setTimeout(() => setMysqlSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save MySQL config', e);
    } finally {
      setIsSavingMysql(false);
    }
  };

  // Fetch collections directly from MySQL table (e.g. app_store) and sync into AI Knowledge Base
  const handleFetchAndSyncMysql = async () => {
    setIsSyncingStoreData(true);
    setSyncSuccessMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/ai/mysql-fetch-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          host: mysqlHost,
          port: mysqlPort,
          databaseName: mysqlDb,
          username: mysqlUser,
          password: mysqlPassword,
          targetTable: mysqlTables || 'app_store'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccessMsg(data.message);
        fetchKnowledge();
      } else {
        alert(data.error || 'Failed to sync from MySQL');
      }
    } catch (e: any) {
      alert(`Sync Error: ${e.message}`);
    } finally {
      setIsSyncingStoreData(false);
    }
  };

  // Import JSON payload or store products into Knowledge Base
  const handleSyncStoreData = async () => {
    if (!rawStoreJson.trim()) return;
    setIsSyncingStoreData(true);
    setSyncSuccessMsg(null);
    try {
      let parsed = JSON.parse(rawStoreJson);
      if (!Array.isArray(parsed)) parsed = [parsed];

      const res = await fetch(`${apiBase}/api/ai/mysql-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          rawJsonData: parsed,
          tableName: 'external_mysql_store'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSyncSuccessMsg(`Successfully imported ${data.importedCount || parsed.length} product/feature items into AI Knowledge Base!`);
        setRawStoreJson('');
        fetchKnowledge();
      }
    } catch (e: any) {
      alert(`Invalid JSON or Import Error: ${e.message}`);
    } finally {
      setIsSyncingStoreData(false);
    }
  };

  useEffect(() => {
    if (activeModalTab === 'knowledge') fetchKnowledge();
    if (activeModalTab === 'mysql') fetchMysqlConfig();
  }, [activeModalTab]);

  useEffect(() => {
    // Fetch instance detailed AI config & sync key statuses
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

          // Automatically sync live key pool status with freshly loaded keys
          handleSyncPool(keys, data.aiProvider || 'gemini');
        }
      } catch (e) {
        console.error('Failed to load AI config', e);
      }
    };

    loadConfig();
    fetchActiveModelInfo();
  }, [instance.id, apiBase, currentUser.id, currentUser.apiKey]);

  // Fetch active model failover status for current instance
  const fetchActiveModelInfo = async () => {
    try {
      const res = await fetch(`${apiBase}/api/ai/active-model/${instance.id}`, {
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveModelInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch active model info', e);
    }
  };

  // Reset auto-shifted model back to primary model
  const handleResetModel = async () => {
    try {
      const res = await fetch(`${apiBase}/api/ai/reset-active-model/${instance.id}`, {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey }
      });
      if (res.ok) {
        fetchActiveModelInfo();
      }
    } catch (e) {
      console.error('Failed to reset active model', e);
    }
  };

  // Real-time Socket.IO listener for key pool status updates and model failovers
  useEffect(() => {
    const socket = io(apiBase);
    
    // Auto-sync status when component mounts or socket connects
    handleSyncPool();

    // Listen for live key failover or recovery events
    socket.on('key_pool_updated', () => {
      handleSyncPool();
    });

    // Listen for live model failover events
    socket.on('model_failover_updated', (data) => {
      if (!data?.instanceId || String(data.instanceId) === String(instance.id)) {
        fetchActiveModelInfo();
      }
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

  // Sync health and quota status of all candidate API keys in pool
  const handleSyncPool = async (overrideKeys?: any, overrideProvider?: string) => {
    setIsSyncingPool(true);
    try {
      let keysToUse: string[] = [];
      if (Array.isArray(overrideKeys)) {
        keysToUse = overrideKeys;
      } else if (Array.isArray(apiKeys)) {
        keysToUse = apiKeys;
      }

      const providerToUse = (typeof overrideProvider === 'string' ? overrideProvider : aiProvider) || 'gemini';
      const serializedKeys = keysToUse
        .filter(k => typeof k === 'string')
        .map(k => k.trim())
        .filter(Boolean)
        .join('\n');

      const res = await fetch(`${apiBase}/api/ai/pool-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        },
        body: JSON.stringify({
          provider: providerToUse,
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
              <div className="flex flex-wrap items-center gap-2 mt-2">
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
                  onClick={() => setActiveModalTab('knowledge')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'knowledge'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <BookOpen size={13} className="text-yellow-400" />
                  <span>Knowledge Base & FAQs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('mysql')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'mysql'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <Database size={13} className="text-cyan-400" />
                  <span>External MySQL Store Sync</span>
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
                  <span>AI Activity Logs</span>
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
        ) : activeModalTab === 'knowledge' ? (
          /* Business Knowledge Base & Software Catalog Tab */
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5 text-sm text-gray-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-[#182229] to-purple-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-yellow-400" />
                  <h4 className="font-bold text-white text-base">Business Knowledge Base & Software Catalog</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                    {knowledgeList.length} Article{knowledgeList.length !== 1 ? 's' : ''} Active
                  </span>
                </div>
                <p className="text-xs text-gray-300">
                  Provide detailed information about your software (e.g. OLT Management Software, Meta WhatsApp Platform), store products, and FAQs. The AI Auto-Responder uses this knowledge to give accurate answers in Hindi, English, Hinglish, or any customer language!
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSeedKbSamples}
                  disabled={isLoadingKnowledge}
                  className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Seed Software Samples</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingKbId(null);
                    setKbCategory('OLT Management Software');
                    setKbTitle('');
                    setKbContent('');
                    setKbTags('');
                    setShowAddKbModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <Plus size={14} />
                  <span>Add Article</span>
                </button>
              </div>
            </div>

            {/* Live Knowledge Base AI Response Simulator & Product Verification Console */}
            <div className="bg-[#182229] border border-cyan-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                  <h5 className="font-bold text-white text-xs">Verify AI Knowledge Base Response (Live Test Simulator)</h5>
                </div>
                <span className="text-[10px] text-cyan-300 font-mono">Test Product/Software Names In Realtime</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type product or software name (e.g. OLT software, VSOL GPON, WhatsApp Meta API, price)"
                  value={testPrompt}
                  onChange={e => setTestPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRunTestPrompt()}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleRunTestPrompt}
                  disabled={isTestingPrompt || !testPrompt.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30 shrink-0"
                >
                  {isTestingPrompt ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Test AI Output</span>
                </button>
              </div>

              {testReply && (
                <div className="p-3.5 bg-gray-900/90 border border-cyan-500/30 rounded-xl text-xs text-gray-200 space-y-1.5 leading-relaxed">
                  <div className="flex items-center justify-between text-[11px] text-cyan-400 font-bold border-b border-gray-800 pb-1">
                    <span>🤖 AI Generated Answer (Using Synced Knowledge Base):</span>
                    <span className="text-[10px] text-gray-400">Tested on {instance.name}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-gray-100">{testReply}</div>
                </div>
              )}
            </div>

            {/* Knowledge Base Instant Search & Filter Bar */}
            <div className="flex items-center justify-between gap-3 bg-[#182229] border border-gray-800 rounded-xl p-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={kbSearchQuery}
                  onChange={e => setKbSearchQuery(e.target.value)}
                  placeholder="Instant Search synced store items or manuals (e.g. OLT, price, stock, specs)..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <span className="text-[11px] font-mono text-gray-400 shrink-0">
                Showing {knowledgeList.filter((doc: any) => {
                  if (!kbSearchQuery.trim()) return true;
                  const q = kbSearchQuery.toLowerCase();
                  return (doc.title || '').toLowerCase().includes(q) || 
                         (doc.content || '').toLowerCase().includes(q) || 
                         (doc.tags || '').toLowerCase().includes(q) ||
                         (doc.category || '').toLowerCase().includes(q);
                }).length} of {knowledgeList.length} items
              </span>
            </div>

            {/* Knowledge Base Article List */}
            {isLoadingKnowledge ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <RefreshCw size={24} className="animate-spin mx-auto text-purple-400" />
                <p className="text-xs">Loading Knowledge Base articles...</p>
              </div>
            ) : knowledgeList.length === 0 ? (
              <div className="bg-[#182229] border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                <BookOpen size={36} className="mx-auto text-gray-600" />
                <h5 className="font-bold text-white text-sm">No Knowledge Articles Added Yet</h5>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Click <strong>&quot;Seed Software Samples&quot;</strong> to pre-fill standard manuals for OLT Management Software, WhatsApp Meta API Platform, and Store FAQs, or add your own custom product manuals!
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSeedKbSamples}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold rounded-xl text-xs border border-yellow-500/40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Auto-Seed Software Templates</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knowledgeList
                  .filter((doc: any) => {
                    if (!kbSearchQuery.trim()) return true;
                    const q = kbSearchQuery.toLowerCase();
                    return (doc.title || '').toLowerCase().includes(q) || 
                           (doc.content || '').toLowerCase().includes(q) || 
                           (doc.tags || '').toLowerCase().includes(q) ||
                           (doc.category || '').toLowerCase().includes(q);
                  })
                  .map((doc: any) => (
                  <div key={doc.id} className="bg-[#182229] border border-gray-800 rounded-xl p-4 space-y-2.5 hover:border-purple-500/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 inline-block">
                          {doc.category}
                        </span>
                        <h5 className="font-bold text-white text-sm line-clamp-1">{doc.title}</h5>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKbId(doc.id);
                            setKbCategory(doc.category || 'OLT Management Software');
                            setKbTitle(doc.title);
                            setKbContent(doc.content);
                            setKbTags(doc.tags || '');
                            setShowAddKbModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Document"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKbItem(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-4 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80 font-mono text-[11px]">
                      {doc.content}
                    </p>

                    {doc.tags && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-gray-500">Tags:</span>
                        {doc.tags.split(',').map((t: string, i: number) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">
                            #{t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add / Edit Knowledge Modal */}
            {showAddKbModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#111b21] border border-gray-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      <BookOpen size={18} className="text-purple-400" />
                      <span>{editingKbId ? 'Edit Knowledge Article' : 'Add Knowledge Article'}</span>
                    </h4>
                    <button onClick={() => setShowAddKbModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveKbItem} className="space-y-4">
                    {/* Quick Software Preset Quick-Fill Buttons */}
                    <div className="space-y-1.5 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                      <label className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                        <Sparkles size={12} />
                        <span>1-Click Software Feature Presets (Click to Auto-Fill):</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setKbCategory('OLT Management Software');
                            setKbTitle('OLT Management Software - Features & Hardware Compatibility');
                            setKbContent(`OLT Management Software Features:
- Real-time PON Port & ONU Status Monitoring
- Automated ONU/ONT Provisioning & Auto-Discovery
- Optical Power & Rx/Tx Signal Quality Diagnostics (-8dBm to -27dBm)
- Bandwidth Management, VLAN Tagging, and Speed Tier Control
- Supported Hardware: VSOL V1600G, Huawei MA5608T/MA5800, ZTE C320/C300, Syrotech EPON/GPON OLTs
- WhatsApp/SMS Alert Notifications for Fiber Cuts & Power Outages`);
                            setKbTags('olt, fiber, pon, onu, broadband, isp, hardware');
                          }}
                          className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded-lg text-[10px] font-medium cursor-pointer"
                        >
                          ⚡ OLT Management
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKbCategory('ISP Billing & RADIUS');
                            setKbTitle('ISP Billing & Bandwidth Control Software - Features');
                            setKbContent(`ISP Billing & Bandwidth Control Software Features:
- MikroTik API & RADIUS AAA Authentication Server
- Automated PPPoE, Hotspot & Static IP User Management
- Automated Billing Invoicing, Payment Reminders & Auto-Disconnection
- Online Payment Gateway Integration (UPI, Credit Cards, NetBanking)
- Subscriber Portal with Usage Graph, Speedometer & Renewal History`);
                            setKbTags('isp, billing, radius, mikrotik, pppoe, hotspot');
                          }}
                          className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-medium cursor-pointer"
                        >
                          ⚡ ISP Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKbCategory('Software Licensing');
                            setKbTitle('Software License Key & Serial Manager - Features');
                            setKbContent(`Software License Key Management Features:
- Online Serial Key Activation & HWID Device Locking
- Subscription Expiry & Auto-Renewal Alert System
- License Tier Levels (Trial, Standard, Professional, Enterprise)
- Anti-Piracy Protection & Remote Deactivation API`);
                            setKbTags('license, activation, software, serial key, hwid');
                          }}
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-medium cursor-pointer"
                        >
                          ⚡ License Key Manager
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKbCategory('WhatsApp Meta API');
                            setKbTitle('WhatsApp Meta API Platform - Capabilities');
                            setKbContent(`WhatsApp Official Meta Cloud API Platform Features:
- Green Badge Verified Official Business Profile
- Interactive Quick Reply Buttons, List Menus, and Template Broadcasts
- Unlimited Concurrent Customer Chats with Zero Account Ban Risk
- AI Auto-Responder with Key Failover & Custom Knowledge Base`);
                            setKbTags('whatsapp, meta, cloud api, broadcast, bot');
                          }}
                          className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 rounded-lg text-[10px] font-medium cursor-pointer"
                        >
                          ⚡ WhatsApp Meta API
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Category</label>
                      <select
                        value={kbCategory}
                        onChange={e => setKbCategory(e.target.value)}
                        className="w-full bg-[#182229] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="OLT Management Software">OLT Management Software</option>
                        <option value="ISP Billing & RADIUS">ISP Billing & RADIUS</option>
                        <option value="Software Licensing">Software Licensing</option>
                        <option value="WhatsApp Meta API Platform">WhatsApp Meta API Platform</option>
                        <option value="Online Store Products">Online Store Products</option>
                        <option value="Pricing & Plans">Pricing & Plans</option>
                        <option value="Custom Software">Custom Software / Other Product</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Article Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. OLT Management Software Features & PON Diagnostics"
                        value={kbTitle}
                        onChange={e => setKbTitle(e.target.value)}
                        className="w-full bg-[#182229] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Article Content / Features (Bullet points or detailed specs)</label>
                      <textarea
                        required
                        rows={6}
                        placeholder="Write features, answers, or specs here. The AI will read this context to answer customer queries accurately in Hindi, English, or Hinglish."
                        value={kbContent}
                        onChange={e => setKbContent(e.target.value)}
                        className="w-full bg-[#182229] border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. olt, pon, fiber, specs, pricing"
                        value={kbTags}
                        onChange={e => setKbTags(e.target.value)}
                        className="w-full bg-[#182229] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddKbModal(false)}
                        className="px-4 py-2 bg-gray-800 text-gray-300 font-semibold rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingKb}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingKb ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>Save Article</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : activeModalTab === 'mysql' ? (
          /* External MySQL Database & Webhook Integration Tab */
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-6 text-sm text-gray-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-[#182229] to-blue-950/40 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Database size={20} className="text-cyan-400" />
                <h4 className="font-bold text-white text-base">External MySQL Store Database & Webhook Sync</h4>
              </div>
              <p className="text-xs text-gray-300">
                Connect your online store database hosted on another server (cPanel, phpMyAdmin, AWS RDS, DigitalOcean, etc.) or import store catalog JSON to make your AI Auto-Responder 100% aware of your product inventory and software features!
              </p>
            </div>

            {/* MySQL Connection Config Card */}
            <div className="bg-[#182229] border border-gray-800 rounded-2xl p-5 space-y-4">
              <h5 className="font-bold text-white text-sm flex items-center gap-2">
                <Database size={16} className="text-cyan-400" />
                <span>External MySQL Server Credentials</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">MySQL Host / IP</label>
                  <input
                    type="text"
                    placeholder="e.g. sql.domain.com or 103.21.22.1"
                    value={mysqlHost}
                    onChange={e => setMysqlHost(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">MySQL Port</label>
                  <input
                    type="number"
                    value={mysqlPort}
                    onChange={e => setMysqlPort(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">Database Name</label>
                  <input
                    type="text"
                    placeholder="e.g. u1234_online_store"
                    value={mysqlDb}
                    onChange={e => setMysqlDb(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">Database Username</label>
                  <input
                    type="text"
                    placeholder="e.g. store_user"
                    value={mysqlUser}
                    onChange={e => setMysqlUser(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-bold">Database Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={mysqlPassword}
                    onChange={e => setMysqlPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 font-bold">Target Sync Tables (Main & Submenus)</label>
                    <span className="text-[10px] text-cyan-400 font-mono">Use 'all' or comma-separated tables</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Type 'all' or e.g. app_store, submenus, software_features"
                    value={mysqlTables}
                    onChange={e => setMysqlTables(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/80">
                <button
                  type="button"
                  onClick={handleTestMysql}
                  disabled={isTestingMysql}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-cyan-500/30"
                >
                  {isTestingMysql ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  <span>Test External MySQL Connection</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchAndSyncMysql}
                    disabled={isSyncingStoreData || !mysqlHost}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    {isSyncingStoreData ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
                    <span>Sync `{mysqlTables || 'all tables & submenus'}` into AI Knowledge Base</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveMysqlConfig}
                    disabled={isSavingMysql}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30"
                  >
                    {isSavingMysql ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Save Config</span>
                  </button>
                </div>
              </div>

              {mysqlTestResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  mysqlTestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {mysqlTestResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{mysqlTestResult.message || mysqlTestResult.error}</span>
                  </div>
                  {mysqlTestResult.tables && mysqlTestResult.tables.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-2">
                      <p className="text-[11px] text-gray-300 font-semibold">
                        Discovered MySQL Tables ({mysqlTestResult.tables.length}). Click any table below to set sync target:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMysqlTables('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-all border ${
                            mysqlTables === 'all' || !mysqlTables
                              ? 'bg-emerald-500 text-black font-bold border-emerald-400'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          ⚡ Sync All Tables & Submenus
                        </button>
                        {mysqlTestResult.tables.map((tbl: string) => (
                          <button
                            key={tbl}
                            type="button"
                            onClick={() => setMysqlTables(tbl)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-all border ${
                              mysqlTables === tbl
                                ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                                : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-700'
                            }`}
                          >
                            📁 {tbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mysqlSaveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>External MySQL settings successfully saved!</span>
                </div>
              )}

              {/* Hardware & Software AI Cross-Checking Guide */}
              <div className="p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl space-y-2.5 text-xs text-cyan-200">
                <div className="flex items-center gap-2 font-bold text-cyan-300">
                  <HelpCircle size={16} />
                  <span>How to Cross-Check Hardware Compatibility & Software FAQs in WhatsApp Chat</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-gray-300 list-disc list-inside leading-relaxed">
                  <li><strong>1. Sync All Store Tables & Submenus:</strong> Set Target Sync Tables to <code className="bg-cyan-900/60 px-1 py-0.5 rounded font-mono text-cyan-300">all</code> and click Sync. This imports OLT hardware specs, router models, software features, and submenu collections.</li>
                  <li><strong>2. Review Knowledge Base Items:</strong> Switch to the <strong>📚 Knowledge Base & FAQs</strong> tab to confirm your hardware specifications (e.g., <em>"Supported OLT Models: VSOL V1600G, Huawei MA5608T, ZTE C320"</em>) are listed and marked active.</li>
                  <li><strong>3. Test in WhatsApp Chat:</strong> Send a message from your phone to your connected WhatsApp instance number (e.g., <em>"Is VSOL 16 port GPON OLT supported?"</em> or <em>"OLT software me kya features hai?"</em>).</li>
                  <li><strong>4. Inspect AI Automation Logs:</strong> Go to the <strong>Logs</strong> tab to verify the exact Knowledge Base document retrieved and the generated response in Hindi, Hinglish, or English.</li>
                </ul>
              </div>
            </div>

            {/* Direct JSON / Store Product Batch Import Card */}
            <div className="bg-[#182229] border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCode size={16} className="text-yellow-400" />
                  <span>Direct Store Product / Software JSON Import</span>
                </h5>
                <span className="text-[10px] text-gray-400 font-mono">Accepts JSON Array</span>
              </div>
              <p className="text-xs text-gray-400">
                Paste JSON array of products or software features exported from your online store or custom database:
              </p>
              <textarea
                rows={4}
                placeholder={`[
  { "name": "OLT Management Software V2", "features": "PON port monitoring, Auto ONU provisioning, SMS alerts", "price": "$199" },
  { "name": "WhatsApp Meta API Service", "features": "Green badge, Unlimited broadcasts, Zero ban risk", "price": "$49/mo" }
]`}
                value={rawStoreJson}
                onChange={e => setRawStoreJson(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
              />
              <div className="flex items-center justify-between">
                {syncSuccessMsg ? (
                  <p className="text-xs text-emerald-400 font-semibold">{syncSuccessMsg}</p>
                ) : <div />}
                <button
                  type="button"
                  onClick={handleSyncStoreData}
                  disabled={isSyncingStoreData || !rawStoreJson.trim()}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-yellow-600/30"
                >
                  {isSyncingStoreData ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
                  <span>Import JSON into Knowledge Base</span>
                </button>
              </div>
            </div>

            {/* Guidance & Architecture Box */}
            <div className="bg-gradient-to-r from-purple-950/20 via-[#182229] to-indigo-950/20 border border-purple-500/30 rounded-2xl p-5 space-y-3">
              <h5 className="font-bold text-white text-sm flex items-center gap-2">
                <Globe size={16} className="text-purple-400" />
                <span>How External MySQL Store Knowledge Works</span>
              </h5>
              <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                <li><strong>1. Security & Firewall:</strong> Ensure your external MySQL server allows remote connections from our server host or cPanel Remote MySQL setting.</li>
                <li><strong>2. Auto-Injected Knowledge Context:</strong> Whenever a customer messages your WhatsApp bot (e.g. asking about OLT features, store product prices, order returns), the AI queries active Knowledge Base articles and injects product specs directly into the prompt context.</li>
                <li><strong>3. Multilingual AI Matching:</strong> Even if your store data is in English, if a user asks in Hindi or Hinglish (&quot;OLT software me kya features hai?&quot;), the AI reads your knowledge base and replies fluently in Hindi!</li>
                <li><strong>4. Webhook Sync Endpoint:</strong> You can configure your store&apos;s webhook to send new products directly to <code className="text-purple-300 bg-gray-900 px-1 py-0.5 rounded">POST /api/ai/mysql-sync</code> to keep the AI continuously updated!</li>
              </ul>
            </div>
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
                  onClick={() => handleSyncPool()}
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

          {/* Model Failover Status Alert Banner */}
          {activeModelInfo?.isShifted && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300">Model Auto-Shift Failover Active:</span> Currently responding with <strong className="font-mono text-white">{activeModelInfo.activeModel}</strong> because primary model ({activeModelInfo.primaryModel}) hit tier/rate limits.
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetModel}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer shadow-sm"
              >
                Reset Primary Model
              </button>
            </div>
          )}

          {/* Model Selector & Temperature Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-gray-300">Model Selection (Speed & Intelligence)</label>
                {activeModelInfo && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    activeModelInfo.isShifted ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {activeModelInfo.isShifted ? `Active: ${activeModelInfo.activeModel}` : 'Primary Active'}
                  </span>
                )}
              </div>
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
                    <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash (Ultra-Fast & Smart ~400-700ms - Recommended)</option>
                    <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (Ultra Lightweight & Fast)</option>
                    <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash (Fast Auto-Failover Backup)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro (Deep Reasoning)</option>
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
