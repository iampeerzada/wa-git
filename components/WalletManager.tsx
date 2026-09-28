import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { CreditCard, History, Settings, Plus, RefreshCw, Loader2 } from 'lucide-react';

interface WalletManagerProps {
  apiBase: string;
  currentUser: User;
  users?: User[]; // Optional list of users for superadmin to add funds
}

const WalletManager: React.FC<WalletManagerProps> = ({ apiBase, currentUser, users = [] }) => {
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
      baileys_credit_cost: '1',
      meta_regular_credit_cost: '1',
      meta_utility_credit_cost: '2',
      meta_marketing_credit_cost: '3',
      meta_authentication_credit_cost: '1.5'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/wallet/ledger?userId=${selectedUserId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' }
      });
      const data = await res.json();
      setBalance(data.balance || 0);
      setLedger(data.ledger || []);
      
      if (currentUser.role === UserRole.SUPERADMIN) {
        const sRes = await fetch(`${apiBase}/api/wallet/settings`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' }
        });
        const sData = await sRes.json();
        const newSettings = { ...settings };
        sData.settings?.forEach((s: any) => {
            if (newSettings.hasOwnProperty(s.key)) {
                newSettings[s.key as keyof typeof newSettings] = s.value;
            }
        });
        setSettings(newSettings);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedUserId]);

  const handleAddFunds = async (e: React.FormEvent) => {
      e.preventDefault();
      
      setIsAdding(true);
      try {
          const res = await fetch(`${apiBase}/api/wallet/fund`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' },
              body: JSON.stringify({
                  userId: selectedUserId,
                  amount: Number(addAmount),
                  description: addDescription || 'Manual Adjustment'
              })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          alert('Funds added successfully');
          setAddAmount('');
          setAddDescription('');
          fetchData();
      } catch (err: any) {
          alert('Error: ' + err.message);
      }
      setIsAdding(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingSettings(true);
      try {
          const res = await fetch(`${apiBase}/api/wallet/settings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' },
              body: JSON.stringify({ settings })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          alert('Settings saved successfully');
      } catch (err: any) {
          alert('Error: ' + err.message);
      }
      setSavingSettings(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-[#25D366] shrink-0" /> Wallet & Ledger
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-[#111b21] rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-800">
              <h3 className="text-xs sm:text-sm font-medium text-gray-400">Current Balance</h3>
              <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                      {balance.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">Credits</span>
              </div>
          </div>
          
          {currentUser.role === UserRole.SUPERADMIN && (
              <div className="md:col-span-2 bg-[#111b21] rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                      <h3 className="text-sm sm:text-base font-bold text-white">Add / Deduct Funds</h3>
                      {users.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">Select User:</span>
                            <select 
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="flex-1 sm:flex-initial bg-[#202c33] border border-gray-700 rounded-xl px-3 py-1.5 text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all text-xs sm:text-sm min-w-0"
                            >
                                {users.map(u => (
                                    <option key={u.id} value={u.id} className="bg-[#111b21] text-white">{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                      )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                  <form onSubmit={handleAddFunds} className="flex flex-col gap-3 flex-1 p-3.5 sm:p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                      <h4 className="text-green-500 font-bold text-xs sm:text-sm">Add Funds</h4>
                      <div>
                          <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Amount</label>
                          <input type="number" min="0.01" step="0.01" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-green-500/50 outline-none transition-all" value={addAmount} onChange={e => setAddAmount(e.target.value)} required />
                      </div>
                      <div>
                          <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Description</label>
                          <input type="text" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-green-500/50 outline-none transition-all" placeholder="Optional" value={addDescription} onChange={e => setAddDescription(e.target.value)} />
                      </div>
                      <button type="submit" disabled={isAdding} className="bg-green-500/20 text-green-500 hover:bg-green-500/30 font-bold py-2 rounded-xl text-xs sm:text-sm flex justify-center items-center gap-2 cursor-pointer transition-all">
                          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Add Funds
                      </button>
                  </form>

                  <form onSubmit={(e) => {
                      e.preventDefault();
                      
                      const amtInput = (e.target as HTMLFormElement).elements.namedItem('deductAmount') as HTMLInputElement;
                      const descInput = (e.target as HTMLFormElement).elements.namedItem('deductDescription') as HTMLInputElement;
                      const val = Number(amtInput.value);
                      const desc = descInput.value;
                      if (val <= 0) return alert('Enter a positive amount to deduct');
                      
                      // we need a separate state for deduction, or we can just call the api directly here
                      setIsAdding(true);
                      fetch(`${apiBase}/api/wallet/fund`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' },
                          body: JSON.stringify({ userId: selectedUserId, amount: -val, description: desc || 'Manual Deduction' })
                      }).then(r => r.json()).then(data => {
                          if (data.error) throw new Error(data.error);
                          alert('Funds deducted successfully');
                          setAddAmount('');
                          setAddDescription('');
                          fetchData();
                      }).catch(err => alert('Error: ' + err.message)).finally(() => setIsAdding(false));
                  }} className="flex flex-col gap-3 flex-1 p-3.5 sm:p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <h4 className="text-red-500 font-bold text-xs sm:text-sm">Deduct Funds</h4>
                      <div>
                          <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Amount</label>
                          <input type="number" min="0.01" step="0.01" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-red-500/50 outline-none transition-all" name="deductAmount" id="deductAmount" required />
                      </div>
                      <div>
                          <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Description</label>
                          <input type="text" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-red-500/50 outline-none transition-all" placeholder="Optional" name="deductDescription" id="deductDescription" />
                      </div>
                      <button type="submit" disabled={isAdding} className="bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold py-2 rounded-xl text-xs sm:text-sm flex justify-center items-center gap-2 cursor-pointer transition-all">
                          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" style={{ transform: 'rotate(45deg)' }} />}
                          Deduct Funds
                      </button>
                  </form>
                  </div>
              </div>
          )}
      </div>

      {currentUser.role === UserRole.SUPERADMIN && (
          <div className="bg-[#111b21] rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-800">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#25D366] shrink-0" /> Global Credit Cost Settings
              </h3>
              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
                  <div>
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Baileys Cost / Msg</label>
                      <input type="number" step="0.0001" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all" value={settings.baileys_credit_cost} onChange={e => setSettings({...settings, baileys_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Meta Regular Cost</label>
                      <input type="number" step="0.0001" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all" value={settings.meta_regular_credit_cost} onChange={e => setSettings({...settings, meta_regular_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Meta Utility Cost</label>
                      <input type="number" step="0.0001" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all" value={settings.meta_utility_credit_cost} onChange={e => setSettings({...settings, meta_utility_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Meta Marketing Cost</label>
                      <input type="number" step="0.0001" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all" value={settings.meta_marketing_credit_cost} onChange={e => setSettings({...settings, meta_marketing_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-[11px] sm:text-xs font-medium text-gray-400 mb-1">Meta Auth Cost</label>
                      <input type="number" step="0.0001" className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:ring-1 ring-[#25D366]/50 outline-none transition-all" value={settings.meta_authentication_credit_cost} onChange={e => setSettings({...settings, meta_authentication_credit_cost: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2 md:col-span-5 flex justify-end pt-1">
                      <button type="submit" disabled={savingSettings} className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128c7e] text-black font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-green-500/10">Save Settings</button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-[#111b21] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-gray-800 flex justify-between items-center bg-[#202c33]">
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white flex items-center">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#25D366] shrink-0" /> Transaction Ledger
              </h3>
              <button onClick={fetchData} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                  <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800/80">
                  <thead className="bg-[#182229]">
                      <tr>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
                          <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                  </thead>
                  <tbody className="bg-[#111b21] divide-y divide-gray-800/80">
                      {ledger.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-xs sm:text-sm text-gray-400">
                                  No transactions found.
                              </td>
                          </tr>
                      ) : (
                          ledger.map(txn => (
                              <tr key={txn.id} className="hover:bg-[#182229] transition-colors">
                                  <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap text-xs text-gray-400">
                                      {new Date(txn.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs leading-4 font-bold rounded-full ${txn.type === 'credit' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                          {txn.type.toUpperCase()}
                                      </span>
                                  </td>
                                  <td className={`px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap text-xs sm:text-sm font-bold ${txn.type === 'credit' ? 'text-[#25D366]' : 'text-red-400'}`}>
                                      {txn.type === 'credit' ? '+' : '-'}{parseFloat(txn.amount).toFixed(2)}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 text-xs text-gray-300">
                                      {txn.description}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap text-xs text-gray-400 font-mono">
                                      {txn.message_number || '-'}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2.5 sm:py-3.5 whitespace-nowrap text-xs text-gray-400">
                                      {txn.status}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default WalletManager;
