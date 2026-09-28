import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X, ArrowUpRight, ArrowDownLeft, RefreshCw, History, Filter } from 'lucide-react';
import { User } from '../types';

export const HeaderWallet = ({ currentUser, apiBase }: { currentUser: User, apiBase: string }) => {
    if (!currentUser) return null;

    const [balance, setBalance] = useState<number>(0);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [ledgerFilter, setLedgerFilter] = useState<'all' | 'credit' | 'debit'>('all');
    const [amount, setAmount] = useState<string>('');

    const fetchLedger = async () => {
        if (!currentUser?.id) return;
        setLoadingLedger(true);
        try {
            const res = await fetch(`${apiBase}/api/wallet/ledger`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}`, 'X-User-ID': currentUser.id, 'X-API-Key': currentUser.apiKey || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setBalance(data.balance || 0);
                setLedger(data.ledger || []);
            }
        } catch (e) {
            console.error('Failed to fetch ledger:', e);
        }
        setLoadingLedger(false);
    };

    useEffect(() => {
        if (!currentUser?.id) return;
        fetchLedger();
        const interval = setInterval(fetchLedger, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const handleProceed = async () => {
        const val = parseInt(amount, 10);
        if (isNaN(val) || val < 500) {
            alert('Minimum refill amount is 500 INR');
            return;
        }

        try {
            const res = await fetch(`${apiBase}/api/wallet/refill-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
                    'X-User-ID': currentUser.id,
                    'X-API-Key': currentUser.apiKey
                },
                body: JSON.stringify({ amount: val })
            });
            
            if (res.ok) {
                const data = await res.json();
                setShowRefillModal(false);
                const options = {
                    key: 'rzp_live_RmMPzyo61J8piH',
                    amount: val * 100, // amount in paisa
                    currency: 'INR',
                    name: 'iFastX Gateway',
                    description: 'Wallet Refill',
                    image: 'https://ifastx.in/favicon.ico',
                    handler: async function (response: any) {
                        try {
                            await fetch(`${apiBase}/api/wallet/refill-success`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
                                    'X-User-ID': currentUser.id,
                                    'X-API-Key': currentUser.apiKey
                                },
                                body: JSON.stringify({ amount: val, paymentId: response.razorpay_payment_id })
                            });
                        } catch (e) {}
                        alert('Payment successful! Payment ID: ' + response.razorpay_payment_id);
                        fetchLedger(); // Refresh balance & ledger
                    },
                    prefill: {
                        name: currentUser.username,
                        email: currentUser.email || 'contact@ifastx.in'
                    },
                    theme: {
                        color: '#25D366'
                    }
                };
                
                if ((window as any).Razorpay) {
                    const rzp = new (window as any).Razorpay(options);
                    rzp.on('payment.failed', function (response: any){
                        alert('Payment failed: ' + response.error.description);
                    });
                    rzp.open();
                } else {
                    alert('Razorpay SDK not loaded');
                }
            } else {
                const data = await res.text();
                let errorMsg = 'Failed to initiate refill';
                try {
                    const json = JSON.parse(data);
                    if (json.error) errorMsg = json.error;
                } catch (e) {}
                alert(errorMsg);
            }
        } catch (err) {
            alert('Error connecting to payment gateway');
        }
    };

    const filteredLedger = ledger.filter(item => {
        if (ledgerFilter === 'all') return true;
        return (item.type || 'debit').toLowerCase() === ledgerFilter;
    });

    return (
        <div className="flex items-center bg-[#202c33] border border-gray-800 rounded-lg p-0.5 sm:p-1 pr-1 sm:pr-1.5 relative text-xs sm:text-sm">
            <button 
                onClick={() => {
                    fetchLedger();
                    setShowLedgerModal(true);
                }}
                title="Click to view Wallet Ledger & Statement"
                className="flex items-center px-1.5 sm:px-2.5 py-1 text-white font-medium gap-1 sm:gap-2 hover:bg-[#2a3942] rounded transition-all cursor-pointer group"
            >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25D366] group-hover:scale-110 transition-transform" />
                <span className="font-bold">{balance.toFixed(2)}</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider font-mono">CR</span>
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowRefillModal(true);
                }}
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] p-1 sm:p-1.5 px-2 sm:px-3 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 shadow-sm"
            >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" /> <span className="hidden xs:inline sm:inline">Refill</span><span className="xs:hidden sm:hidden">+</span>
            </button>

            {/* Wallet Ledger Modal */}
            {showLedgerModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-[#111b21] border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-3.5 sm:p-5 border-b border-gray-800 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-3 bg-[#202c33]/40">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <div className="p-2 sm:p-2.5 bg-[#25D366]/10 text-[#25D366] rounded-xl border border-[#25D366]/20 shrink-0">
                                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                        Wallet Ledger
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                                        Balance: <span className="text-[#25D366] font-bold font-mono">₹{balance.toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
                                <button
                                    onClick={() => {
                                        setShowLedgerModal(false);
                                        setShowRefillModal(true);
                                    }}
                                    className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow whitespace-nowrap"
                                >
                                    <Plus size={13} /> Refill
                                </button>
                                <button 
                                    onClick={fetchLedger} 
                                    className="p-1.5 sm:p-2 text-gray-400 hover:text-white bg-[#202c33] rounded-lg border border-gray-700 transition-colors"
                                    title="Refresh Ledger"
                                >
                                    <RefreshCw size={15} className={loadingLedger ? 'animate-spin' : ''} />
                                </button>
                                <button 
                                    onClick={() => setShowLedgerModal(false)} 
                                    className="p-1.5 sm:p-2 text-gray-400 hover:text-white bg-[#202c33] rounded-lg border border-gray-700 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-black/20 text-xs">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter size={13} className="text-gray-400 shrink-0 hidden sm:inline" />
                                <div className="flex bg-[#202c33] p-0.5 rounded-lg border border-gray-700 w-full sm:w-auto text-[11px] sm:text-xs">
                                    <button 
                                        onClick={() => setLedgerFilter('all')}
                                        className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1 rounded-md font-bold transition-all text-center whitespace-nowrap ${ledgerFilter === 'all' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        All ({ledger.length})
                                    </button>
                                    <button 
                                        onClick={() => setLedgerFilter('credit')}
                                        className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1 rounded-md font-bold transition-all text-center whitespace-nowrap ${ledgerFilter === 'credit' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Credits (+)
                                    </button>
                                    <button 
                                        onClick={() => setLedgerFilter('debit')}
                                        className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1 rounded-md font-bold transition-all text-center whitespace-nowrap ${ledgerFilter === 'debit' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Debits (-)
                                    </button>
                                </div>
                            </div>
                            <span className="text-gray-500 font-mono text-[10px] sm:text-xs text-right sm:text-left">Showing {filteredLedger.length} records</span>
                        </div>

                        {/* Ledger Table */}
                        <div className="flex-1 overflow-y-auto p-2.5 sm:p-6">
                            {loadingLedger ? (
                                <p className="text-gray-500 text-center py-12">Loading wallet ledger...</p>
                            ) : filteredLedger.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="mx-auto mb-3 text-gray-600" size={32} />
                                    <p className="text-gray-400 font-medium text-xs sm:text-sm">No transaction records found.</p>
                                    <p className="text-gray-600 text-[11px] sm:text-xs mt-1">Refill funds or send messages to view transaction history.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-800">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead className="bg-[#202c33] text-gray-300 text-[10px] sm:text-xs uppercase font-black">
                                            <tr>
                                                <th className="px-2.5 sm:px-4 py-2 sm:py-3">Date & Time</th>
                                                <th className="px-2.5 sm:px-4 py-2 sm:py-3">Type</th>
                                                <th className="px-2.5 sm:px-4 py-2 sm:py-3 text-right">Amount</th>
                                                <th className="px-2.5 sm:px-4 py-2 sm:py-3">Description</th>
                                                <th className="px-2.5 sm:px-4 py-2 sm:py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/60 bg-black/10 text-[11px] sm:text-xs">
                                            {filteredLedger.map((tx: any) => {
                                                const isCredit = (tx.type || 'credit').toLowerCase() === 'credit';
                                                const dateStr = String(tx.created_at || tx.timestamp || '').trim();
                                                const formattedDate = dateStr ? new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + (dateStr.endsWith('Z') ? '' : 'Z')).toLocaleString() : 'N/A';

                                                return (
                                                    <tr key={tx.id || Math.random()} className="hover:bg-[#202c33]/40 transition-colors">
                                                        <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 font-mono text-gray-400 whitespace-nowrap text-[10px] sm:text-xs">
                                                            {formattedDate}
                                                        </td>
                                                        <td className="px-2.5 sm:px-4 py-2.5 sm:py-3">
                                                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                                                                isCredit ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            }`}>
                                                                {isCredit ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                                {isCredit ? 'CREDIT' : 'DEBIT'}
                                                            </span>
                                                        </td>
                                                        <td className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-right font-mono font-bold text-xs sm:text-sm ${isCredit ? 'text-[#25D366]' : 'text-red-400'}`}>
                                                            {isCredit ? '+' : '-'} ₹{parseFloat(tx.amount || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-gray-300 font-medium max-w-[120px] sm:max-w-none truncate" title={tx.description}>
                                                            {tx.description || 'Transaction'}
                                                        </td>
                                                        <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-center">
                                                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase ${
                                                                tx.status === 'completed' || tx.status === 'success' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-yellow-500/10 text-yellow-500'
                                                            }`}>
                                                                {tx.status || 'completed'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Refill Modal */}
            {showRefillModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold">Refill Wallet</h3>
                            <button onClick={() => setShowRefillModal(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Enter amount to refill (Minimum ₹500)</p>
                        <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input 
                                type="number" 
                                min="500"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-[#0b141a] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white font-bold outline-none focus:ring-2 ring-[#25D366]/20"
                            />
                        </div>
                        <button 
                            onClick={handleProceed}
                            className="w-full bg-[#25D366] text-[#0b141a] font-bold py-3 rounded-xl hover:bg-[#128c7e] transition-colors uppercase tracking-wider text-xs font-black"
                        >
                            Proceed to Pay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

