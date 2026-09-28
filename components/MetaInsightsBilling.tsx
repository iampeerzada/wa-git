import React, { useState, useEffect } from 'react';
import { Infinity, DollarSign, TrendingUp, ShieldCheck, Activity, RefreshCw, AlertCircle, Cpu, FileText, PieChart, Layers } from 'lucide-react';
import { User, WhatsAppInstance } from '../types';

interface MetaInsightsProps {
  currentUser: User;
  instances: WhatsAppInstance[];
  apiBase: string;
}

interface MetaSummary {
  totalMetaInstances: number;
  totalMessagesSent: number;
  totalMessagesFailed: number;
  totalPlatformRevenueCollected: number;
  estimatedMetaWholesaleCost: number;
  estimatedPlatformGrossProfit: number;
  platformRates: {
    marketing: number;
    utility: number;
    authentication: number;
    regular: number;
  };
}

interface InstanceMetaBreakdown {
  id: string;
  name: string;
  wabaId: string;
  phoneNumberId: string;
  userId: string;
  totalSent: number;
  totalFailed: number;
  platformRevenueCollected: number;
  estimatedMetaCost: number;
  estimatedMargin: number;
  metaGraphAnalytics?: any;
  metaError?: string | null;
}

const MetaInsightsBilling: React.FC<MetaInsightsProps> = ({ currentUser, instances, apiBase }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MetaSummary | null>(null);
  const [breakdown, setBreakdown] = useState<InstanceMetaBreakdown[]>([]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/superadmin/meta-insights`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-role': currentUser.role
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Meta insights');
      }
      setSummary(data.summary);
      setBreakdown(data.instances || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading Meta Insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#25D366] uppercase tracking-wider mb-1">
            <ShieldCheck size={14} /> Superadmin Executive Panel
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Infinity className="text-[#25D366]" size={28} />
            Meta Official API Usage & Billing Insights
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time Meta Cloud API conversation estimates, platform wallet revenue, and wholesale cost margins.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 bg-[#202c33] hover:bg-[#2a3942] border border-gray-700/80 px-4 py-2 rounded-xl text-xs font-medium transition-all text-gray-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-[#25D366]' : ''} />
          {loading ? 'Refreshing...' : 'Sync Meta Metrics'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Wallet Revenue */}
        <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">User Wallet Revenue</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                ₹{summary?.totalPlatformRevenueCollected?.toFixed(2) || '0.00'}
              </h2>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">Collected from client wallets via platform rates</p>
        </div>

        {/* Estimated Meta Wholesale Cost */}
        <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Meta Wholesale Cost</p>
              <h2 className="text-2xl font-bold text-amber-400 mt-1">
                ₹{summary?.estimatedMetaWholesaleCost?.toFixed(2) || '0.00'}
              </h2>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">Estimated Meta Cloud API wholesale bill</p>
        </div>

        {/* Platform Gross Profit Margin */}
        <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Platform Net Profit</p>
              <h2 className="text-2xl font-bold text-[#25D366] mt-1">
                ₹{summary?.estimatedPlatformGrossProfit?.toFixed(2) || '0.00'}
              </h2>
            </div>
            <div className="p-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl text-[#25D366]">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">Estimated profit margin across Meta instances</p>
        </div>

        {/* Meta Messages Sent */}
        <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Meta Messages Delivered</p>
              <h2 className="text-2xl font-bold text-sky-400 mt-1">
                {summary?.totalMessagesSent?.toLocaleString() || '0'}
              </h2>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Cpu size={20} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Across {summary?.totalMetaInstances || 0} connected Meta WABA accounts
          </p>
        </div>
      </div>

      {/* Current Platform Rates Card */}
      <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2 mb-3">
          <Layers size={16} className="text-[#25D366]" />
          Current Platform Wallet Rates Charged to Users
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#1f2c34] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[11px]">Marketing Message</span>
            <span className="text-base font-bold text-white mt-1 block">
              ₹{summary?.platformRates?.marketing?.toFixed(2) || '1.00'} / msg
            </span>
          </div>
          <div className="bg-[#1f2c34] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[11px]">Utility Message</span>
            <span className="text-base font-bold text-white mt-1 block">
              ₹{summary?.platformRates?.utility?.toFixed(2) || '0.50'} / msg
            </span>
          </div>
          <div className="bg-[#1f2c34] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[11px]">Authentication Message</span>
            <span className="text-base font-bold text-white mt-1 block">
              ₹{summary?.platformRates?.authentication?.toFixed(2) || '0.25'} / msg
            </span>
          </div>
          <div className="bg-[#1f2c34] p-3 rounded-xl border border-gray-800">
            <span className="text-gray-400 block text-[11px]">Regular / Session</span>
            <span className="text-base font-bold text-white mt-1 block">
              ₹{summary?.platformRates?.regular?.toFixed(2) || '0.50'} / msg
            </span>
          </div>
        </div>
      </div>

      {/* Connected Instances Breakdown */}
      <div className="bg-[#111b21] border border-gray-800/90 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <PieChart size={16} className="text-[#25D366]" />
            Connected Meta WhatsApp Business Accounts (WABA)
          </h3>
          <span className="text-xs bg-[#202c33] text-gray-300 px-2.5 py-1 rounded-full font-medium">
            {breakdown.length} Meta Accounts
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Fetching live Meta WABA analytics...
          </div>
        ) : breakdown.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No Meta API accounts connected yet. Create a Meta instance to start tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#182229] text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Instance / WABA</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4 text-center">Messages Sent</th>
                  <th className="py-3 px-4 text-right">Wallet Revenue</th>
                  <th className="py-3 px-4 text-right">Estimated Meta Cost</th>
                  <th className="py-3 px-4 text-right">Profit Margin</th>
                  <th className="py-3 px-4 text-center">Meta Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {breakdown.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#182229]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{inst.name || inst.id}</div>
                      <div className="text-[10px] text-gray-500 font-mono">WABA ID: {inst.wabaId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {inst.userId}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {inst.totalSent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      ₹{inst.platformRevenueCollected.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-400">
                      ₹{inst.estimatedMetaCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#25D366]">
                      ₹{inst.estimatedMargin.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inst.metaError ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full" title={inst.metaError}>
                          <AlertCircle size={10} /> Meta Sync Err
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Active WABA
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaInsightsBilling;
