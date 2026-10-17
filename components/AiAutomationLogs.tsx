import React, { useState, useEffect } from 'react';
import { 
  History, Sparkles, Filter, RefreshCw, Trash2, Search, Zap, 
  CheckCircle2, AlertTriangle, XCircle, Key, Cpu, Phone, Clock, MessageSquare, Bot, Building2
} from 'lucide-react';
import io from 'socket.io-client';
import { WhatsAppInstance, User } from '../types';

interface AiAutomationLogsProps {
  instances: WhatsAppInstance[];
  currentUser: User;
  apiBase: string;
  selectedInstanceId?: string;
  onClose?: () => void;
}

export default function AiAutomationLogs({
  instances = [],
  currentUser,
  apiBase,
  selectedInstanceId = 'all',
  onClose
}: AiAutomationLogsProps) {
  // State for log records and filtering options
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterInstance, setFilterInstance] = useState<string>(selectedInstanceId);
  const [filterProvider, setFilterProvider] = useState<'all' | 'meta' | 'baileys'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'rate_limited' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch AI Automation Logs from API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        instanceId: filterInstance,
        provider: filterProvider,
        status: filterStatus,
        search: searchQuery,
        page: String(page),
        limit: '25'
      });

      const res = await fetch(`${apiBase}/api/ai/logs?${params.toString()}`, {
        headers: {
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch AI logs', e);
    } finally {
      setLoading(false);
    }
  };

  // Trigger log fetch on filter or page change
  useEffect(() => {
    fetchLogs();
  }, [filterInstance, filterProvider, filterStatus, page, apiBase]);

  // Connect Socket.IO for live real-time AI automation log updates
  useEffect(() => {
    const socket = io(apiBase);

    // Listen for new AI log creation events broadcasted from server
    socket.on('ai_log_created', (newLog) => {
      setLogs(prev => [newLog, ...prev.slice(0, 24)]);
      setTotalCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [apiBase]);

  // Clear all AI automation logs
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all AI automation history logs?')) return;
    setIsClearing(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/logs?instanceId=${filterInstance !== 'all' ? filterInstance : ''}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey
        }
      });
      if (res.ok) {
        setLogs([]);
        setTotalCount(0);
      }
    } catch (e) {
      console.error('Error clearing logs', e);
    } finally {
      setIsClearing(false);
    }
  };

  // Calculate summary metrics
  const successCount = logs.filter(l => l.status === 'success').length;
  const rateLimitCount = logs.filter(l => l.status === 'rate_limited').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const avgLatency = logs.length > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / (logs.filter(l => l.latency_ms > 0).length || 1))
    : 0;

  return (
    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 sm:p-6 text-white space-y-5 shadow-xl">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400">
            <History size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              AI Automation Activity & Key Failover Logs
              <Sparkles size={16} className="text-purple-400 animate-pulse" />
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time response history, latency stats, and exact API key failover tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 bg-[#182229] hover:bg-gray-800 text-gray-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-gray-700 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-red-500/20 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 size={13} />
            <span>Clear Logs</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Analytics Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Calls Card */}
        <div className="p-3 bg-[#182229] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total AI Responses</span>
            <Bot size={14} className="text-purple-400" />
          </div>
          <p className="text-lg font-bold text-white mt-1">{totalCount}</p>
        </div>

        {/* Success Rate Card */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Successful Replies</span>
            <CheckCircle2 size={14} />
          </div>
          <p className="text-lg font-bold text-emerald-300 mt-1">{successCount}</p>
        </div>

        {/* Key Failover Count Card */}
        <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Key Failovers (Quota)</span>
            <Zap size={14} />
          </div>
          <p className="text-lg font-bold text-amber-300 mt-1">{rateLimitCount}</p>
        </div>

        {/* Average Latency Card */}
        <div className="p-3 bg-[#182229] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Avg Response Speed</span>
            <Clock size={14} className="text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-400 mt-1">~{avgLatency}ms</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#182229] p-3 rounded-xl border border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Category Provider Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter size={13} className="text-purple-400" />
            <span className="font-semibold text-white">Category:</span>
            <select
              value={filterProvider}
              onChange={e => setFilterProvider(e.target.value as any)}
              className="bg-[#111b21] border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-purple-400 focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="meta">Meta Official Category</option>
              <option value="baileys">Baileys WhatsApp Category</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-semibold text-white">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-[#111b21] border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-purple-400 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">✓ Success Only</option>
              <option value="rate_limited">⚡ Failover / Rate Limited</option>
              <option value="failed">⚠️ Failed / Errors</option>
            </select>
          </div>

          {/* Instance Selection */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-semibold text-white">Instance:</span>
            <select
              value={filterInstance}
              onChange={e => setFilterInstance(e.target.value)}
              className="bg-[#111b21] border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-purple-400 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">All Instances</option>
              {instances.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.provider === 'meta' ? 'META' : 'BAILEYS'})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Search Bar */}
        <form onSubmit={e => { e.preventDefault(); fetchLogs(); }} className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prompt, key, phone..."
            className="w-full sm:w-56 bg-[#111b21] border border-gray-700 focus:border-purple-400 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <Search size={13} className="absolute left-2.5 text-gray-400" />
        </form>
      </div>

      {/* Logs Table / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-purple-400" />
            <p className="text-xs font-semibold">Loading AI Automation History...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center bg-[#182229] border border-gray-800 rounded-2xl space-y-2">
            <Bot size={32} className="mx-auto text-gray-600" />
            <p className="text-sm font-bold text-gray-300">No AI Automation Logs Found</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Incoming WhatsApp messages answered by AI will automatically log responses, latencies, and exact API key failover details here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map(log => {
              const isMeta = log.provider === 'meta';
              const isSuccess = log.status === 'success';
              const isRateLimit = log.status === 'rate_limited';

              return (
                <div 
                  key={log.id} 
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-2.5 ${
                    isSuccess 
                      ? 'bg-[#182229] border-gray-800 hover:border-gray-700' 
                      : isRateLimit 
                        ? 'bg-amber-950/20 border-amber-500/30' 
                        : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  {/* Log Card Header Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      
                      {/* Category Badge (META vs BAILEYS) */}
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                        isMeta 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      }`}>
                        {isMeta ? 'META OFFICIAL' : 'BAILEYS QR'}
                      </span>

                      {/* Instance Name */}
                      <span className="font-bold text-white flex items-center gap-1">
                        <Building2 size={13} className="text-gray-400" />
                        {log.instance_name || log.instance_id}
                      </span>

                      {/* Customer Phone JID */}
                      <span className="text-gray-400 font-mono text-[11px] flex items-center gap-1">
                        <Phone size={11} />
                        {log.remote_jid ? log.remote_jid.split('@')[0] : 'Unknown'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      
                      {/* Latency Badge */}
                      {log.latency_ms > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          <Zap size={10} className="text-emerald-400" />
                          {log.latency_ms}ms
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isSuccess 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : isRateLimit 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {isSuccess && <><CheckCircle2 size={11} /> Success</>}
                        {isRateLimit && <><Zap size={11} /> Key Failover (Limit Hit)</>}
                        {!isSuccess && !isRateLimit && <><XCircle size={11} /> Failed</>}
                      </span>

                      {/* Created At Timestamp */}
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* AI Model & Exact Masked API Key Used Info Bar */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-gray-300 bg-[#111b21] px-3 py-1.5 rounded-lg border border-gray-800">
                    <span className="flex items-center gap-1 text-purple-300">
                      <Cpu size={12} />
                      Model: <strong className="text-white font-sans">{log.model_used || 'gemini-3.8-flash'}</strong>
                    </span>

                    <span className="flex items-center gap-1 text-emerald-400">
                      <Key size={12} />
                      API Key Used: <strong className="text-emerald-300">{log.api_key_masked || 'Primary Key'}</strong>
                    </span>

                    {log.error_message && (
                      <span className="text-amber-300 flex items-center gap-1 text-[10px] truncate max-w-md">
                        <AlertTriangle size={11} className="shrink-0 text-amber-400" />
                        {log.error_message}
                      </span>
                    )}
                  </div>

                  {/* Incoming Customer Message & AI Reply */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    
                    {/* User Prompt Box */}
                    <div className="bg-[#111b21] p-2.5 rounded-lg border border-gray-800 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Customer Prompt:
                      </span>
                      <p className="text-gray-200 leading-relaxed font-sans">{log.user_prompt || '—'}</p>
                    </div>

                    {/* AI Response Box */}
                    <div className="bg-[#111b21] p-2.5 rounded-lg border border-purple-500/20 space-y-1">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare size={11} /> AI Auto-Reply Response:
                      </span>
                      <p className="text-purple-100 leading-relaxed font-sans whitespace-pre-wrap">
                        {log.ai_response || (log.error_message ? `⚠️ ${log.error_message}` : '—')}
                      </p>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 bg-[#182229] border border-gray-700 rounded-lg disabled:opacity-40 hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 bg-[#182229] border border-gray-700 rounded-lg disabled:opacity-40 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
