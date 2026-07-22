
import React, { useState, useEffect } from 'react';
import { User, UserRole, Plan, PlanInterval, WhatsAppInstance } from '../types';
import { 
  CreditCard, Plus, Trash2, CheckCircle2, AlertTriangle, Zap, Calendar, 
  TrendingUp, Layers, Settings2, Users, IndianRupee, MessageCircle, 
  Info, Edit3, Crown, Star, Rocket, Shield, Globe, Cpu, Package, RefreshCw
} from 'lucide-react';

interface BillingManagerProps {
  currentUser: User;
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  instances: WhatsAppInstance[];
  apiBase: string; // Ensure apiBase is passed
}

const RAZORPAY_KEY_ID = 'rzp_live_RmMPzyo61J8piH';

const ICON_MAP: Record<string, any> = {
  Zap, Crown, Star, Rocket, Shield, Globe, Cpu, Package, Layers
};

const BillingManager: React.FC<BillingManagerProps> = ({ currentUser, plans, setPlans, users, setUsers, instances, apiBase }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [customMsgCount, setCustomMsgCount] = useState(500);
  const [selectedInstanceForTopup, setSelectedInstanceForTopup] = useState<string>('global');
  
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    interval: PlanInterval.MONTHLY,
    dailyLimit: 0,
    monthlyLimit: 0,
    yearlyLimit: 0,
    maxInstances: 1,
    rateLimitPerMin: 20,
    features: ['API Access'],
    assignedTo: '',
    description: '',
    icon: 'Package'
  });

  const currentPlan = plans.find(p => p.id === currentUser.subscription.planId);
  const isSuper = currentUser.role === UserRole.SUPERADMIN;

  const calculateCustomPrice = (count: number) => {
    let rate = 1;
    if (count < 600) rate = 2;
    else if (count < 700) rate = 1.9;
    else if (count < 900) rate = 1.8;
    else if (count < 1000) rate = 1.7;
    else if (count < 1100) rate = 1.6;
    else if (count < 1200) rate = 1.4;
    else if (count < 1300) rate = 1.3;
    else if (count < 1400) rate = 1.2;
    else if (count < 1500) rate = 1.1;
    else rate = 1;

    return Math.round(count * rate);
  };

  const customPrice = calculateCustomPrice(customMsgCount);

  const initiatePayment = (amount: number, planName: string, isTopup: boolean = false) => {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: 'iFastX WhatsApp Gateway',
      description: `${planName} - ${isTopup ? 'Topup' : 'Renewal'}`,
      image: 'https://ifastx.in/favicon.ico',
      handler: function (response: any) {
        alert(`Payment successful! ID: ${response.razorpay_payment_id}`);
        handleSubscriptionUpdate(isTopup);
      },
      prefill: {
        name: currentUser.username,
        email: currentUser.email || '',
        contact: currentUser.mobile || ''
      },
      theme: {
        color: '#25D366'
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleSubscriptionUpdate = (isTopup: boolean) => {
    setUsers(prev => prev.map(u => {
        if (u.id === currentUser.id) {
            const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            if (isTopup) {
              return {
                ...u,
                subscription: {
                  ...u.subscription,
                  status: 'active' as const,
                  expiryDate: newExpiry,
                }
              };
            }
            return {
                ...u,
                subscription: {
                    ...u.subscription,
                    expiryDate: newExpiry,
                    status: 'active' as const
                }
            };
        }
        return u;
    }));
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name) {
      alert("Plan name is required");
      return;
    }

    setIsSaving(true);
    const headers = {
      'Content-Type': 'application/json',
      'X-User-ID': currentUser.id,
      'X-Role': currentUser.role,
      'X-API-Key': currentUser.apiKey
    };

    try {
      if (editingPlanId) {
        const res = await fetch(`${apiBase}/api/plans/${editingPlanId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(newPlan)
        });
        if (res.ok) {
          setPlans(prev => prev.map(p => p.id === editingPlanId ? { ...p, ...newPlan as Plan } : p));
          setEditingPlanId(null);
        } else {
          const err = await res.json();
          alert("Update Failed: " + (err.error || 'Server error'));
        }
      } else {
        const id = `p_${Date.now()}`;
        const planToCreate = {
          ...newPlan,
          id,
          features: (newPlan.features || []).length > 0 ? newPlan.features! : ['API Access', 'Standard Support']
        };
        const res = await fetch(`${apiBase}/api/plans`, {
          method: 'POST',
          headers,
          body: JSON.stringify(planToCreate)
        });
        if (res.ok) {
          setPlans(prev => [...prev, planToCreate as Plan]);
        } else {
          const err = await res.json();
          alert("Creation Failed: " + (err.error || 'Server error'));
        }
      }
      setIsAdding(false);
      resetForm();
    } catch (err) {
      alert("Network Error: Could not reach backend API");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan tier?")) return;
    
    try {
      const res = await fetch(`${apiBase}/api/plans/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': currentUser.id,
          'X-Role': currentUser.role,
          'X-API-Key': currentUser.apiKey
        }
      });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      alert("Network Error during deletion");
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setNewPlan({ ...plan });
    setEditingPlanId(plan.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setNewPlan({
      name: '',
      price: 0,
      interval: PlanInterval.MONTHLY,
      dailyLimit: 0,
      monthlyLimit: 0,
      yearlyLimit: 0,
      maxInstances: 1,
      rateLimitPerMin: 20,
      features: ['API Access'],
      assignedTo: '',
      description: '',
      icon: 'Package'
    });
    setEditingPlanId(null);
  };

  const visiblePlans = isSuper 
    ? plans 
    : plans.filter(p => !p.assignedTo || p.assignedTo === currentUser.id || p.assignedTo === currentUser.parentId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {!isSuper && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#111b21] rounded-2xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp size={160} />
            </div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CreditCard className="text-[#25D366]" />
                  Active Subscription
                </h2>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">
                  Current Tier: {currentPlan?.name || 'Unknown'}
                </p>
              </div>
              <button 
                onClick={() => initiatePayment(currentPlan?.price || 0, currentPlan?.name || 'Plan Renewal')} 
                className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
              >
                <Zap size={18} />
                Renew via Razorpay
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <UsageBar label="Daily Used" current={currentUser.subscription.messagesSentToday} limit={currentPlan?.dailyLimit || 0} color="bg-blue-500" />
              <UsageBar label="Monthly Used" current={currentUser.subscription.messagesSentThisMonth} limit={currentPlan?.monthlyLimit || 0} color="bg-[#25D366]" />
              <UsageBar label="Yearly Used" current={currentUser.subscription.messagesSentThisYear} limit={currentPlan?.yearlyLimit || 0} color="bg-purple-500" />
            </div>
          </div>
          <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-6 shadow-xl space-y-4 flex flex-col justify-center">
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-3 text-yellow-500 mb-2">
                    <Calendar size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Expiration</span>
                </div>
                <p className="text-lg font-bold text-white">{new Date(currentUser.subscription.expiryDate).toLocaleDateString()}</p>
            </div>
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3 text-green-500 mb-2">
                    <Zap size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Status</span>
                </div>
                <p className="text-lg font-bold text-white uppercase">{currentUser.subscription.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customize Plan / Topup Builder */}
      {!isSuper && (
        <div className="bg-[#111b21] rounded-3xl border border-blue-500/20 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <div className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-500/20">
               Dynamic Scaling
             </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <MessageCircle className="text-blue-400" />
            Customize Message Topup / Solo Instance Plan
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Target Instance (Solo/Topup)</label>
                  <span className="text-[10px] text-blue-400 font-bold uppercase">1 Session Max</span>
                </div>
                <select 
                  value={selectedInstanceForTopup}
                  onChange={(e) => setSelectedInstanceForTopup(e.target.value)}
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 ring-blue-500/50 transition-all"
                >
                  <option value="global">Account-wide Daily Quota</option>
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Daily Message Count</label>
                  <span className="text-2xl font-black text-white">{customMsgCount} <span className="text-xs text-gray-500">Msgs/Day</span></span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="5000" 
                  step="100" 
                  value={customMsgCount} 
                  onChange={(e) => setCustomMsgCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                  <span>500 (Base)</span>
                  <span>5000 (Bulk)</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0b141a] rounded-2xl p-6 border border-gray-800 flex flex-col justify-between">
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold">Base Rate</span>
                    <span className="text-white font-mono text-xs">₹{(customPrice / customMsgCount).toFixed(2)} / msg</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold">Validity</span>
                    <span className="text-white font-bold text-xs uppercase">30 Days</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                    <span className="text-sm text-gray-400 font-black uppercase">Total Payable</span>
                    <div className="flex items-center gap-1 text-[#25D366]">
                       <IndianRupee size={20} />
                       <span className="text-3xl font-black">{customPrice}</span>
                    </div>
                 </div>
               </div>
               
               <button 
                onClick={() => initiatePayment(customPrice, `Topup ${customMsgCount} Msgs`, true)}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
               >
                 <IndianRupee size={18} />
                 Checkout with Razorpay
               </button>

               <div className="mt-4 flex items-start gap-2 text-[9px] text-gray-600">
                  <Info size={12} className="shrink-0" />
                  <p>Rates drop as you increase volume. Minimum starting package is 500 messages per day for one month. Only one session active per topup plan.</p>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Layers className="text-[#25D366]" />
              {isSuper ? 'Enterprise Plan Management' : 'Standard Renewal Tiers'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">
              {isSuper ? `Platform Infrastructure: ${plans.length} Tiers Configured` : 'Stable fixed-rate plans for business growth'}
            </p>
          </div>
          {isSuper && (
            <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20">
              <Plus size={18} />
              Create Custom Tier
            </button>
          )}
        </div>

        {isAdding && isSuper && (
          <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-8 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Settings2 size={20} className="text-[#25D366]" />
              {editingPlanId ? 'Edit Plan Template' : 'Advanced Plan Configuration'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Plan Name</label>
                <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="Pro Enterprise" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Pricing (₹)</label>
                <input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({...p, price: parseInt(e.target.value)}))} className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Billing Interval</label>
                <select value={newPlan.interval} onChange={e => setNewPlan(p => ({...p, interval: e.target.value as PlanInterval}))} className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none">
                  <option value={PlanInterval.MONTHLY}>Monthly</option>
                  <option value={PlanInterval.YEARLY}>Yearly</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Description</label>
                <textarea 
                  value={newPlan.description} 
                  onChange={e => setNewPlan(p => ({...p, description: e.target.value}))} 
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none h-12" 
                  placeholder="Summarize the core value proposition of this tier..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Select Icon</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(ICON_MAP).map(iconName => {
                    const IconComp = ICON_MAP[iconName];
                    return (
                      <button 
                        key={iconName}
                        onClick={() => setNewPlan(p => ({...p, icon: iconName}))}
                        className={`p-2 rounded-lg border flex items-center justify-center transition-all ${newPlan.icon === iconName ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-[#0b141a] border-gray-800 text-gray-500 hover:text-white'}`}
                      >
                        <IconComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Daily Message Limit</label>
                <input 
                  type="number" 
                  value={newPlan.dailyLimit} 
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setNewPlan(p => ({
                      ...p, 
                      dailyLimit: val,
                      monthlyLimit: val * 30, // Auto-recalculate monthly
                      yearlyLimit: val * 365   // Auto-recalculate yearly
                    }));
                  }} 
                  className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none" 
                  placeholder="0 for Unlimited" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Instance Limit</label>
                <input type="number" value={newPlan.maxInstances} onChange={e => setNewPlan(p => ({...p, maxInstances: parseInt(e.target.value)}))} className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">API Rate Limit (msgs/min)</label>
                <input type="number" value={newPlan.rateLimitPerMin} onChange={e => setNewPlan(p => ({...p, rateLimitPerMin: parseInt(e.target.value)}))} className="w-full bg-[#202c33] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => { setIsAdding(false); resetForm(); }} className="text-gray-400 font-bold px-4">Cancel</button>
                <button 
                    onClick={handleCreatePlan} 
                    disabled={isSaving}
                    className="bg-[#25D366] text-[#0b141a] px-10 py-3 rounded-xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : (editingPlanId ? <Edit3 size={18} /> : <Plus size={18} />)}
                  {editingPlanId ? 'Update Plan Tier' : 'Deploy Plan Tier'}
                </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePlans.map(plan => {
            const IconComp = ICON_MAP[plan.icon || 'Package'] || Package;
            return (
              <div key={plan.id} className={`bg-[#111b21] rounded-3xl border ${currentUser.subscription.planId === plan.id ? 'border-[#25D366]' : 'border-gray-800'} p-8 flex flex-col relative group transition-all hover:scale-[1.02] shadow-2xl`}>
                {currentUser.subscription.planId === plan.id && (
                  <div className="absolute top-4 right-4 bg-[#25D366] text-[#0b141a] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-green-500/20">Active</div>
                )}
                {plan.assignedTo && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-500/30">
                    <Users size={12} /> Custom
                  </div>
                )}
                
                <div className="flex items-center gap-3 pt-6 mb-4">
                  <div className="p-3 bg-gray-800/40 rounded-2xl text-[#25D366]">
                    <IconComp size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.description && <p className="text-[10px] text-gray-500 line-clamp-1">{plan.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-6">
                  <IndianRupee className="text-[#25D366]" size={28} />
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-gray-500 uppercase font-black tracking-widest ml-1">/ {plan.interval}</span>
                </div>
                
                <div className="space-y-4 flex-1 mb-8">
                  <PlanDetail label="Daily limit" value={plan.dailyLimit === 0 ? 'Unlimited' : `${plan.dailyLimit} msgs`} />
                  <PlanDetail label="Monthly limit" value={plan.monthlyLimit === 0 ? 'Unlimited' : `${plan.monthlyLimit} msgs`} />
                  <PlanDetail label="Instances" value={`${plan.maxInstances} sessions`} />
                  <PlanDetail label="Speed" value={`${plan.rateLimitPerMin} msgs/min`} />
                </div>

                {isSuper ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditPlan(plan)}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white py-3 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-blue-500/20"
                    >
                      <Edit3 size={16} /> Edit
                    </button>
                    <button onClick={() => handleDeletePlan(plan.id)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : currentUser.subscription.planId !== plan.id ? (
                  <button 
                    onClick={() => initiatePayment(plan.price, plan.name)}
                    className="w-full bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                  >
                    Switch Tier
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full bg-gray-800 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest cursor-not-allowed"
                  >
                    Currently Subscribed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/10 p-6 rounded-3xl flex items-center gap-6">
         <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 shrink-0">
            <AlertTriangle size={24} />
         </div>
         <div>
            <p className="text-white font-bold text-sm mb-1">Secure Payments</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              We use <span className="text-yellow-500">Razorpay (rzp_live_...)</span> for all transactions. Your payment is secured via 256-bit encryption. 
              Once the payment is successful, your account validity is automatically extended by 30 days.
            </p>
         </div>
      </div>
    </div>
  );
};

const UsageBar: React.FC<{ label: string, current: number, limit: number, color: string }> = ({ label, current, limit, color }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] uppercase font-black tracking-tighter text-gray-500">
      <span>{label}</span>
      <span className="text-white">{current} / {limit === 0 ? '∞' : limit}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${limit === 0 ? 0 : Math.min(100, (current / limit) * 100)}%` }} />
    </div>
  </div>
);

const PlanDetail: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm py-1 border-b border-gray-800/50">
    <div className="flex items-center gap-2 text-gray-500">
       <CheckCircle2 size={14} className="text-[#25D366]" />
       <span>{label}</span>
    </div>
    <span className="text-white font-bold">{value}</span>
  </div>
);

export default BillingManager;
