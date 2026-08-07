import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X } from 'lucide-react';
import { User } from '../types';

export const HeaderWallet = ({ currentUser, apiBase }: { currentUser: User, apiBase: string }) => {
    const [balance, setBalance] = useState<number>(0);
    const [showRefillModal, setShowRefillModal] = useState(false);
    const [amount, setAmount] = useState<string>('500');

    const fetchBalance = async () => {
        try {
            const res = await fetch(`${apiBase}/api/wallet/ledger`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('wa_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBalance(data.balance || 0);
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [currentUser.id]);

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
                    'X-User-ID': currentUser.id,
                    'X-API-Key': currentUser.apiKey
                },
                body: JSON.stringify({ amount: val })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Redirecting to Razorpay for ₹${val}... (Mock Gateway)`);
                setShowRefillModal(false);
                // The gateway would redirect back or webhook would update balance.
            } else {
                alert(data.error || 'Failed to initiate refill');
            }
        } catch (err) {
            alert('Error connecting to payment gateway');
        }
    };

    return (
        <div className="hidden sm:flex items-center bg-[#202c33] border border-gray-800 rounded-lg p-1 pr-2 relative">
            <div className="flex items-center px-3 text-white font-medium gap-2">
                <Wallet className="w-4 h-4 text-[#25D366]" />
                <span>{balance.toFixed(2)}</span>
                <span className="text-xs text-gray-400 uppercase tracking-wider">CR</span>
            </div>
            <button 
                onClick={() => setShowRefillModal(true)}
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] p-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center gap-1"
            >
                <Plus className="w-3 h-3" /> Refill
            </button>

            {showRefillModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
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
                            className="w-full bg-[#25D366] text-[#0b141a] font-bold py-3 rounded-xl hover:bg-[#128c7e] transition-colors"
                        >
                            Proceed to Pay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
