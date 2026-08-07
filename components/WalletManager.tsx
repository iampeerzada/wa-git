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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}` }
      });
      const data = await res.json();
      setBalance(data.balance || 0);
      setLedger(data.ledger || []);
      
      if (currentUser.role === UserRole.SUPERADMIN) {
        const sRes = await fetch(`${apiBase}/api/wallet/settings`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}` }
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
      if (!addAmount || isNaN(Number(addAmount))) return alert('Invalid amount');
      setIsAdding(true);
      try {
          const res = await fetch(`${apiBase}/api/wallet/fund`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('wa_token')}`
              },
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
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('wa_token')}`
              },
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
        <h2 className="text-2xl font-bold text-white flex items-center">
          <CreditCard className="mr-2" /> Wallet & Ledger
        </h2>
        {currentUser.role === UserRole.SUPERADMIN && users.length > 0 && (
            <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input"
            >
                {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                ))}
            </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111b21] rounded-xl p-6 shadow-sm border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400">Current Balance</h3>
              <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">
                      {balance.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">Credits</span>
              </div>
          </div>
          
          {currentUser.role === UserRole.SUPERADMIN && (
              <div className="md:col-span-2 bg-[#111b21] rounded-xl p-6 shadow-sm border border-gray-800">
                  <h3 className="text-lg font-medium text-white mb-4">Add / Deduct Funds</h3>
                  <form onSubmit={handleAddFunds} className="flex gap-4 items-end">
                      <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-400 mb-1">Amount (Use negative for deduction)</label>
                          <input type="number" step="0.01" className="input" value={addAmount} onChange={e => setAddAmount(e.target.value)} required />
                      </div>
                      <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                          <input type="text" className="input" placeholder="Optional" value={addDescription} onChange={e => setAddDescription(e.target.value)} />
                      </div>
                      <button type="submit" disabled={isAdding} className="btn-primary">
                          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Submit
                      </button>
                  </form>
              </div>
          )}
      </div>

      {currentUser.role === UserRole.SUPERADMIN && (
          <div className="bg-[#111b21] rounded-xl p-6 shadow-sm border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" /> Global Credit Cost Settings
              </h3>
                            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Baileys Cost / Msg</label>
                      <input type="number" step="0.0001" className="input bg-[#202c33] border-gray-800 text-white" value={settings.baileys_credit_cost} onChange={e => setSettings({...settings, baileys_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Meta Regular Cost</label>
                      <input type="number" step="0.0001" className="input bg-[#202c33] border-gray-800 text-white" value={settings.meta_regular_credit_cost} onChange={e => setSettings({...settings, meta_regular_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Meta Utility Cost</label>
                      <input type="number" step="0.0001" className="input bg-[#202c33] border-gray-800 text-white" value={settings.meta_utility_credit_cost} onChange={e => setSettings({...settings, meta_utility_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Meta Marketing Cost</label>
                      <input type="number" step="0.0001" className="input bg-[#202c33] border-gray-800 text-white" value={settings.meta_marketing_credit_cost} onChange={e => setSettings({...settings, meta_marketing_credit_cost: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Meta Auth Cost</label>
                      <input type="number" step="0.0001" className="input bg-[#202c33] border-gray-800 text-white" value={settings.meta_authentication_credit_cost} onChange={e => setSettings({...settings, meta_authentication_credit_cost: e.target.value})} />
                  </div>
                  <div className="md:col-span-5 flex justify-end">
                      <button type="submit" disabled={savingSettings} className="btn-primary px-8">Save Settings</button>
                  </div>
              </form>
          </div>
      )}

      <div className="bg-[#111b21] rounded-xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#202c33]">
              <h3 className="text-lg font-medium text-white flex items-center">
                  <History className="w-5 h-5 mr-2" /> Transaction Ledger
              </h3>
              <button onClick={fetchData} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-[#202c33]">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recipient</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                  </thead>
                  <tbody className="bg-[#111b21] divide-y divide-gray-800">
                      {ledger.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                                  No transactions found.
                              </td>
                          </tr>
                      ) : (
                          ledger.map(txn => (
                              <tr key={txn.id} className="hover:bg-[#202c33]">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                      {new Date(txn.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${txn.type === 'credit' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                          {txn.type.toUpperCase()}
                                      </span>
                                  </td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                      {txn.type === 'credit' ? '+' : '-'}{parseFloat(txn.amount).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                                      {txn.description}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                      {txn.message_number || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
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
