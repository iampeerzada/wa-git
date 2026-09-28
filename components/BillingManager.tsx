
import React, { useState, useEffect } from 'react';
import { User, UserRole, Plan, PlanInterval, WhatsAppInstance } from '../types';
import { 
  CreditCard, Plus, Trash2, CheckCircle2, AlertTriangle, Zap, Calendar, 
  TrendingUp, Layers, Settings2, Users, IndianRupee, MessageCircle, 
  Info, Edit3, Crown, Star, Rocket, Shield, Globe, Cpu, Package, RefreshCw, X, Smartphone, Wallet,
  ArrowUp, ArrowDown, Sparkles, ListPlus, Check
} from 'lucide-react';

interface BillingManagerProps {
  currentUser: User;
  plans: Plan[];
  setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  instances: WhatsAppInstance[];
  apiBase: string; // Ensure apiBase is passed
  onUpdateUser?: (updated: Partial<User>) => void;
}

const RAZORPAY_KEY_ID = 'rzp_live_RmMPzyo61J8piH';

const ICON_MAP: Record<string, any> = {
  Zap, Crown, Star, Rocket, Shield, Globe, Cpu, Package, Layers
};

const DEFAULT_BAILEYS_FEATURES = [
  'Unlimited Messages / Day (Fair Usage)',
  'Multi-Session WhatsApp Web QR Login',
  'Smart Anti-Ban Engine with Spintax Delay',
  '1-Click Excel (.xlsx / .csv) Bulk Sender',
  'Auto-Responder Keyword Bot & Dynamic Rules',
  'REST API Access & Real-Time Incoming Webhooks',
  '24/7 Priority Support in India & Global'
];

const DEFAULT_META_FEATURES = [
  'Official Meta Cloud API (100% Zero Ban Risk)',
  'Meta Verified WhatsApp Business Account (WABA)',
  'Pre-Approved Rich Media Templates (Buttons & Media)',
  'Registered WhatsApp Business Phone Numbers',
  'Instant Cloud Webhooks & Read Receipts',
  'Wallet-based Transparent Per-Message Billing',
  'Interactive Quick Replies & Call-to-Action Buttons',
  '24/7 Priority Support in India & Global'
];

const DEFAULT_HYBRID_FEATURES = [
  'Dual Engine: Official Meta Cloud + Baileys Web QR',
  'Unlimited WhatsApp Multi-Session Messaging',
  'Total Connected Instances / Phone Numbers',
  'Anti-Ban Rotation & Smart Fallback Routing',
  'Excel (.xlsx / .csv) 1-Click Bulk Broadcast',
  'Dedicated High-Priority Worker Queue',
  'White-Label Documentation & Webhooks',
  'VIP Technical Assistance & Account Manager'
];

const POPULAR_FEATURE_SUGGESTIONS = [
  'Official Meta Cloud API (Zero Ban Risk)',
  'Pre-Approved Rich Media Templates',
  'Interactive Buttons & Quick Replies',
  '1-Click Excel (.xlsx / .csv) Bulk Sender',
  'Smart Anti-Ban Engine with Spintax',
  'Auto-Responder Keyword Bot',
  'Multi-Session Account Rotation',
  'REST API & Real-time Webhooks',
  'Wallet-Based Transparent Billing',
  'Human-like Typing Simulation & Interval',
  '24/7 Priority Support in India & Global',
  'White-label Documentation',
  'Dedicated High-Speed Queue Worker',
  'OTP & Transactional SMS Alert Support'
];

const getDefaultFeatures = (provider: 'baileys' | 'meta' | 'both' = 'baileys') => {
  if (provider === 'meta') return [...DEFAULT_META_FEATURES];
  if (provider === 'both') return [...DEFAULT_HYBRID_FEATURES];
  return [...DEFAULT_BAILEYS_FEATURES];
};

interface MetaStatsProps {
  instanceId: string;
  apiBase: string;
  currentUser: User;
}

const MetaInstanceStatsView: React.FC<MetaStatsProps> = ({ instanceId, apiBase, currentUser }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/meta/details/${instanceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.details) {
          setDetails(data.details);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [instanceId, apiBase]);

  if (loading) {
    return (
      <div className="bg-[#16222b] p-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2 text-xs text-blue-300 animate-pulse">
        <RefreshCw size={14} className="animate-spin" />
        <span>Fetching Meta Messaging Tier & Account Status...</span>
      </div>
    );
  }

  const quality = details?.qualityRating || 'PENDING';
  const qualityLabel = details?.qualityRatingLabel || 'Pending / N/A';
  const limitLabel = details?.messagingLimitLabel || '2,000 Msgs / 24 hrs';
  const totalSent = details?.totalSent || 0;
  const accountStatus = details?.accountStatus || 'PENDING';
  const apiError = details?.apiError;

  return (
    <div className="space-y-2.5 mt-1">
      <div className="flex justify-between items-center text-[10px] text-blue-300 font-bold uppercase tracking-wider px-0.5">
        <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-400" /> Meta WhatsApp Official Metrics</span>
        <button onClick={fetchDetails} className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors text-[9px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-blue-300">
          <RefreshCw size={10} /> Refresh Live Meta Data
        </button>
      </div>

      {apiError && (
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
          <Info size={14} className="shrink-0 text-amber-400" />
          <span>Meta API Info: {apiError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Messages Sent */}
        <div className="bg-[#16222b] border border-blue-500/20 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Messages Sent</div>
          <div className="text-sm font-black text-white flex items-center gap-1">
            <MessageCircle size={13} className="text-blue-400" />
            {totalSent.toLocaleString()}
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">Sent via Meta Cloud API</div>
        </div>

        {/* Messaging Tier Limit */}
        <div className="bg-[#16222b] border border-blue-500/20 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Messaging Tier Limit</div>
          <div className="text-xs font-black text-blue-300 flex items-center gap-1 truncate">
            <Zap size={13} className="text-amber-400 shrink-0" />
            <span className="truncate">{limitLabel}</span>
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">24h limit assigned by Meta</div>
        </div>

        {/* Quality Rating */}
        <div className="bg-[#16222b] border border-blue-500/20 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Quality Rating</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
              quality === 'GREEN' || quality === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              quality === 'YELLOW' || quality === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              quality === 'RED' || quality === 'LOW' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
              'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {qualityLabel}
            </span>
          </div>
          <div className="text-[8px] text-gray-400 mt-1">Phone number health score</div>
        </div>

        {/* Account Approval Status */}
        <div className="bg-[#16222b] border border-blue-500/20 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Approval Status</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
              accountStatus === 'APPROVED' || accountStatus === 'VERIFIED' || accountStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              accountStatus === 'PENDING' || accountStatus === 'IN_REVIEW' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              accountStatus === 'REJECTED' || accountStatus === 'DECLINED' || accountStatus === 'DISABLED' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
              'bg-gray-800 text-gray-300 border-gray-700'
            }`}>
              {accountStatus}
            </span>
          </div>
          <div className="text-[8px] text-gray-400 mt-1">WABA account review</div>
        </div>
      </div>
    </div>
  );
};

const BillingManager: React.FC<BillingManagerProps> = ({ currentUser, plans, setPlans, users, setUsers, instances, apiBase, onUpdateUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  const [planFilterTab, setPlanFilterTab] = useState<'all' | 'baileys' | 'meta'>('all');
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillAmount, setRefillAmount] = useState<string>('500');
  const [featureInput, setFeatureInput] = useState<string>('');
  
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    interval: PlanInterval.MONTHLY,
    dailyLimit: 0,
    monthlyLimit: 0,
    yearlyLimit: 0,
    maxInstances: 1,
    rateLimitPerMin: 20,
    features: getDefaultFeatures('baileys'),
    assignedTo: '',
    description: '',
    icon: 'Package',
    allowedProviders: 'baileys',
    metaSetupFee: 0
  });

  const currentPlan = plans.find(p => p.id === currentUser.subscription?.planId)
    || plans.find(p => p.name.toLowerCase() === (currentUser.subscription?.planId || '').toLowerCase())
    || plans.find(p => p.allowedProviders === 'baileys' || p.allowedProviders === 'both')
    || plans[0];
  const isSuper = currentUser.role === UserRole.SUPERADMIN;

  const sentToday = currentUser.subscription?.messagesSentToday || 0;
  const sentMonth = Math.max(currentUser.subscription?.messagesSentThisMonth || 0, sentToday);
  const sentYear = Math.max(currentUser.subscription?.messagesSentThisYear || 0, sentMonth, sentToday);

  const limitDaily = currentUser.subscription?.customDailyLimit !== undefined && currentUser.subscription?.customDailyLimit !== null
    ? currentUser.subscription.customDailyLimit
    : (currentPlan?.dailyLimit || 5000);
  const limitMonthly = currentPlan?.monthlyLimit || (limitDaily ? limitDaily * 30 : 150000);
  const limitYearly = currentPlan?.yearlyLimit || (limitDaily ? limitDaily * 365 : 1825000);

  const getInstancePlan = (inst: WhatsAppInstance) => {
    if (inst.provider === 'meta') {
      if (currentPlan && (currentPlan.allowedProviders === 'meta' || currentPlan.allowedProviders === 'both')) {
        return currentPlan;
      }
      return plans.find(p => p.allowedProviders === 'meta' || p.allowedProviders === 'both') || currentPlan;
    } else {
      if (currentPlan && (currentPlan.allowedProviders === 'baileys' || currentPlan.allowedProviders === 'both')) {
        return currentPlan;
      }
      return plans.find(p => p.allowedProviders === 'baileys' || p.allowedProviders === 'both') || currentPlan;
    }
  };

  const getInstancePlanName = (inst: WhatsAppInstance) => {
    const plan = getInstancePlan(inst);
    return plan?.name || (inst.provider === 'meta' ? 'Meta Cloud Tier' : 'Baileys Tier');
  };

  const handleActivatePlan = async (targetPlan: Plan, paymentId?: string) => {
    try {
      const res = await fetch(`${apiBase}/api/subscription/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey || ''
        },
        body: JSON.stringify({ planId: targetPlan.id, paymentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => {
          if (u.id === currentUser.id) {
            return {
              ...u,
              subscription: {
                ...u.subscription,
                planId: targetPlan.id,
                status: 'active',
                expiryDate: data.expiryDate,
                customMaxInstances: null,
                customDailyLimit: null
              }
            };
          }
          return u;
        }));
        if (onUpdateUser) {
          onUpdateUser({
            subscription: {
              ...currentUser.subscription,
              planId: targetPlan.id,
              status: 'active',
              expiryDate: data.expiryDate,
              customMaxInstances: null,
              customDailyLimit: null
            }
          });
        }
        alert(`Successfully activated plan: ${data.planName || targetPlan.name}!`);
      } else {
        alert(`Plan activation error: ${data.error || 'Failed to update subscription'}`);
      }
    } catch (err: any) {
      console.error('Plan activation error:', err);
      alert('Failed to connect to server during plan activation.');
    }
  };

  const initiatePayment = (amount: number, targetPlan: Plan) => {
    if (amount <= 0) {
      handleActivatePlan(targetPlan);
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: 'iFastX WhatsApp Gateway',
      description: `${targetPlan.name} - Plan Activation`,
      image: 'https://ifastx.in/favicon.ico',
      handler: function (response: any) {
        handleActivatePlan(targetPlan, response.razorpay_payment_id);
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

  const handleWalletRefillClick = () => {
    setRefillAmount('500');
    setShowRefillModal(true);
  };

  const handleRefillProceed = async () => {
    const val = parseInt(refillAmount, 10);
    if (isNaN(val) || val < 100) {
      alert("Minimum refill amount is 100 INR");
      return;
    }

    try {
      await fetch(`${apiBase}/api/wallet/refill-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
          'X-User-ID': currentUser.id,
          'X-API-Key': currentUser.apiKey || ''
        },
        body: JSON.stringify({ amount: val })
      });
    } catch (e) {
      console.error('Refill intent error:', e);
    }

    setShowRefillModal(false);

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: val * 100,
      currency: 'INR',
      name: 'iFastX Gateway',
      description: 'Wallet Refill for Message Billing',
      image: 'https://ifastx.in/favicon.ico',
      handler: async function (response: any) {
        try {
          await fetch(`${apiBase}/api/wallet/refill-success`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('wa_token')}`,
              'X-User-ID': currentUser.id,
              'X-API-Key': currentUser.apiKey || ''
            },
            body: JSON.stringify({ amount: val, paymentId: response.razorpay_payment_id })
          });
        } catch (e) {
          console.error(e);
        }
        alert(`Wallet successfully refilled with ₹${val}! Payment ID: ${response.razorpay_payment_id}`);
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

    if ((window as any).Razorpay) {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } else {
      alert('Razorpay SDK is loading or not available');
    }
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
      const prov = newPlan.allowedProviders || 'baileys';
      const resolvedFeatures = (newPlan.features && newPlan.features.length > 0)
        ? newPlan.features
        : getDefaultFeatures(prov);

      if (editingPlanId) {
        const payload = {
          ...newPlan,
          features: resolvedFeatures
        };
        const res = await fetch(`${apiBase}/api/plans/${editingPlanId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setPlans(prev => prev.map(p => p.id === editingPlanId ? { ...p, ...payload as Plan } : p));
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
          features: resolvedFeatures
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

  const handleAddFeature = (featureText?: string) => {
    const textToAdd = (featureText !== undefined ? featureText : featureInput).trim();
    if (!textToAdd) return;
    const currentFeatures = newPlan.features || [];
    if (currentFeatures.includes(textToAdd)) return;
    setNewPlan(p => ({ ...p, features: [...(p.features || []), textToAdd] }));
    if (featureText === undefined) setFeatureInput('');
  };

  const handleRemoveFeature = (indexToRemove: number) => {
    setNewPlan(p => ({
      ...p,
      features: (p.features || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    const list = [...(newPlan.features || [])];
    if (direction === 'up' && index > 0) {
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      setNewPlan(p => ({ ...p, features: list }));
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      setNewPlan(p => ({ ...p, features: list }));
    }
  };

  const handleLoadRecommendedFeatures = () => {
    const prov = newPlan.allowedProviders || 'baileys';
    setNewPlan(p => ({ ...p, features: getDefaultFeatures(prov) }));
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
    const prov = plan.allowedProviders || 'baileys';
    const planFeatures = (plan.features && plan.features.length > 0)
      ? [...plan.features]
      : getDefaultFeatures(prov);
    setNewPlan({
      ...plan,
      features: planFeatures
    });
    setEditingPlanId(plan.id);
    setFeatureInput('');
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
      features: getDefaultFeatures('baileys'),
      assignedTo: '',
      description: '',
      icon: 'Package',
      allowedProviders: 'baileys',
      metaSetupFee: 0
    });
    setEditingPlanId(null);
    setFeatureInput('');
  };

  const userRolePlans = isSuper 
    ? plans 
    : plans.filter(p => !p.assignedTo || p.assignedTo === currentUser.id || p.assignedTo === currentUser.parentId);

  const visiblePlans = userRolePlans.filter(p => {
    const prov = p.allowedProviders || 'baileys';
    if (planFilterTab === 'baileys') return prov === 'baileys' || prov === 'both';
    if (planFilterTab === 'meta') return prov === 'meta' || prov === 'both';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-8">
      {!isSuper && (
        <div className="space-y-4">
          {instances.length === 0 ? (
            <div className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <CreditCard size={90} />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <CreditCard size={18} className="text-[#25D366]" />
                      Active Subscription
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-800/50 px-2.5 py-0.5 rounded-md">
                            Tier: {currentPlan?.name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider bg-yellow-500/10 px-2.5 py-0.5 rounded-md border border-yellow-500/20">
                            Expires: {new Date(currentUser.subscription.expiryDate).toLocaleDateString()}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${currentUser.subscription.status === 'active' ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>
                            Status: {currentUser.subscription.status}
                        </span>
                    </div>
                  </div>
                  <button 
                    onClick={handleWalletRefillClick} 
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#0b141a] px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
                  >
                    <Wallet size={14} />
                    Refill Wallet Balance
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <UsageBar label="Daily Used" current={sentToday} limit={limitDaily} color="bg-blue-500" />
                  <UsageBar label="Monthly Used" current={sentMonth} limit={limitMonthly} color="bg-[#25D366]" />
                  <UsageBar label="Yearly Used" current={sentYear} limit={limitYearly} color="bg-purple-500" />
                </div>
            </div>
          ) : (
            instances.map((inst) => {
                const instPlan = getInstancePlan(inst);
                const instDailyLimit = currentUser.subscription?.customDailyLimit !== undefined && currentUser.subscription?.customDailyLimit !== null
                  ? currentUser.subscription.customDailyLimit
                  : (instPlan?.dailyLimit || 5000);
                const instMonthlyLimit = instPlan?.monthlyLimit || (instDailyLimit ? instDailyLimit * 30 : 150000);
                const instYearlyLimit = instPlan?.yearlyLimit || (instDailyLimit ? instDailyLimit * 365 : 1825000);

                return (
                <div key={inst.id} className="bg-[#111b21] rounded-xl border border-gray-800/80 p-3.5 sm:p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Cpu size={90} />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <Cpu size={18} className={inst.provider === 'meta' ? 'text-blue-400' : 'text-[#25D366]'} />
                          Instance: {inst.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${inst.provider === 'meta' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                                Engine: {inst.provider === 'meta' ? 'Meta Cloud API' : 'Baileys Web Device'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-800/50 px-2.5 py-0.5 rounded-md">
                                Tier: {getInstancePlanName(inst)}
                            </span>
                            <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider bg-yellow-500/10 px-2.5 py-0.5 rounded-md border border-yellow-500/20">
                                Expires: {new Date(currentUser.subscription.expiryDate).toLocaleDateString()}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${currentUser.subscription.status === 'active' ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>
                                Sub: {currentUser.subscription.status}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${inst.status === 'open' ? 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20' : 'text-orange-500 bg-orange-500/10 border-orange-500/20'}`}>
                                Status: {inst.status}
                            </span>
                        </div>
                      </div>
                      <button 
                        onClick={handleWalletRefillClick} 
                        className="bg-emerald-500 hover:bg-emerald-400 text-[#0b141a] px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
                      >
                        <Wallet size={14} />
                        Refill Wallet Balance
                      </button>
                    </div>

                    {inst.provider === 'meta' ? (
                      <MetaInstanceStatsView instanceId={inst.id} apiBase={apiBase} currentUser={currentUser} />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <UsageBar label="Daily Quota" current={sentToday} limit={instDailyLimit} color="bg-blue-500" />
                        <UsageBar label="Monthly Quota" current={sentMonth} limit={instMonthlyLimit} color="bg-[#25D366]" />
                        <UsageBar label="Yearly Quota" current={sentYear} limit={instYearlyLimit} color="bg-purple-500" />
                      </div>
                    )}
                </div>
                );
            })
          )}
        </div>
      )}


      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#25D366]" />
              {isSuper ? 'Enterprise Plan Management' : 'Activation & Renewal Plans'}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-bold">
              {isSuper ? `Platform Infrastructure: ${plans.length} Tiers Configured` : 'Select a subscription plan for Baileys or Meta Cloud API instances'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Filter Tabs */}
            <div className="flex bg-[#202c33] p-1 rounded-xl border border-gray-800 text-[11px] font-bold">
              <button
                onClick={() => setPlanFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${planFilterTab === 'all' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white'}`}
              >
                All ({userRolePlans.length})
              </button>
              <button
                onClick={() => setPlanFilterTab('baileys')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${planFilterTab === 'baileys' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white'}`}
              >
                Baileys ({userRolePlans.filter(p => (p.allowedProviders || 'baileys') === 'baileys' || p.allowedProviders === 'both').length})
              </button>
              <button
                onClick={() => setPlanFilterTab('meta')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${planFilterTab === 'meta' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Meta Cloud API ({userRolePlans.filter(p => p.allowedProviders === 'meta' || p.allowedProviders === 'both').length})
              </button>
            </div>

            {isSuper && (
              <button 
                onClick={() => { resetForm(); setIsAdding(true); }} 
                className="bg-[#25D366] hover:bg-[#20bd5a] text-[#0b141a] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-green-500/10 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Tier</span>
              </button>
            )}
          </div>
        </div>

        {isAdding && isSuper && (
          <div className="bg-[#111b21] rounded-2xl border border-[#25D366]/30 p-3.5 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-top-4 mb-4">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-800">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Settings2 size={15} className="text-[#25D366]" />
                <span>{editingPlanId ? 'Edit Plan Template' : 'Advanced Plan Configuration'}</span>
              </h3>
              <button 
                onClick={() => { setIsAdding(false); resetForm(); }} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Plan Name</label>
                <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({...p, name: e.target.value}))} className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all" placeholder="e.g. Meta Cloud Growth" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Target Engine / Provider</label>
                <select 
                  value={newPlan.allowedProviders || 'baileys'} 
                  onChange={e => setNewPlan(p => ({...p, allowedProviders: e.target.value as any}))} 
                  className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] outline-none cursor-pointer"
                >
                  <option value="baileys">Baileys (WhatsApp Web / QR)</option>
                  <option value="meta">Meta Cloud API (Official)</option>
                  <option value="both">Both (Baileys + Meta Hybrid)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Recurring Platform Price (₹)</label>
                <input type="number" value={newPlan.price} onChange={e => setNewPlan(p => ({...p, price: parseInt(e.target.value) || 0}))} className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all" />
              </div>

              {(newPlan.allowedProviders === 'meta' || newPlan.allowedProviders === 'both') && (
                <div>
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">One-Time Meta Setup Fee (₹)</label>
                  <input 
                    type="number" 
                    value={newPlan.metaSetupFee || 0} 
                    onChange={e => setNewPlan(p => ({...p, metaSetupFee: parseFloat(e.target.value) || 0}))} 
                    className="w-full bg-[#202c33] border border-blue-500/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-blue-400 outline-none transition-all font-bold text-blue-300" 
                    placeholder="e.g. 1999" 
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Interval</label>
                <select value={newPlan.interval} onChange={e => setNewPlan(p => ({...p, interval: e.target.value as PlanInterval}))} className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] outline-none cursor-pointer">
                  <option value={PlanInterval.MONTHLY}>Monthly</option>
                  <option value={PlanInterval.YEARLY}>Yearly</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  value={newPlan.description} 
                  onChange={e => setNewPlan(p => ({...p, description: e.target.value}))} 
                  className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none resize-none h-10" 
                  placeholder="Summarize the plan details..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Icon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.keys(ICON_MAP).map(iconName => {
                    const IconComp = ICON_MAP[iconName];
                    return (
                      <button 
                        key={iconName}
                        onClick={() => setNewPlan(p => ({...p, icon: iconName}))}
                        className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${newPlan.icon === iconName ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-[#0b141a] border-gray-800 text-gray-500 hover:text-white'}`}
                      >
                        <IconComp size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Instance Limit</label>
                <input type="number" value={newPlan.maxInstances} onChange={e => setNewPlan(p => ({...p, maxInstances: parseInt(e.target.value) || 1}))} className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all" />
              </div>

              {newPlan.allowedProviders !== 'meta' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Daily Message Limit</label>
                    <input 
                      type="number" 
                      value={newPlan.dailyLimit} 
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setNewPlan(p => ({
                          ...p, 
                          dailyLimit: val,
                          monthlyLimit: val * 30,
                          yearlyLimit: val * 365
                        }));
                      }} 
                      className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all" 
                      placeholder="0 for Unlimited" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">API Rate Limit (msgs/min)</label>
                    <input type="number" value={newPlan.rateLimitPerMin} onChange={e => setNewPlan(p => ({...p, rateLimitPerMin: parseInt(e.target.value) || 60}))} className="w-full bg-[#202c33] border border-gray-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all" />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2 bg-[#182229] border border-blue-500/20 p-2.5 rounded-xl text-[11px] text-gray-300">
                  <span className="font-bold text-blue-300">Meta Message Limits:</span> No fixed daily/rate limits apply here. All template & session messages are authorized and billed directly per message from the user's Wallet at official Meta rates.
                </div>
              )}

              {(newPlan.allowedProviders === 'meta' || newPlan.allowedProviders === 'both') && (
                <div className="lg:col-span-3 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-[11px] text-blue-300 flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-blue-400" />
                  <span>Meta Cloud Plan Architecture: One-time setup fee (₹{newPlan.metaSetupFee || 0}) + recurring platform fee (₹{newPlan.price || 0}/{newPlan.interval}). Message/template charges are deducted per-message from the user's Wallet.</span>
                </div>
              )}

              {/* Dynamic Plan Features Section */}
              <div className="lg:col-span-3 bg-[#16222b] border border-gray-800 p-3 sm:p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <ListPlus size={14} className="text-[#25D366]" />
                      <span>Plan Features & Highlights (Displayed on Frontend & Homepage)</span>
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Configure bullet points that showcase what is included in this plan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadRecommendedFeatures}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700 transition-all flex items-center gap-1 cursor-pointer w-fit"
                  >
                    <Sparkles size={12} className="text-yellow-400" />
                    <span>Reset to Recommended ({newPlan.allowedProviders || 'baileys'})</span>
                  </button>
                </div>

                {/* Add Custom Feature Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Type a feature (e.g., 5,000 Messages / Day, Zero Ban Risk, Excel Bulk Dispatcher)..."
                    className="flex-1 bg-[#202c33] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFeature()}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-[#0b141a] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Add Suggestions Chips */}
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Quick Suggestions (Click to Add):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_FEATURE_SUGGESTIONS.map((sug, sIdx) => {
                      const alreadyAdded = (newPlan.features || []).includes(sug);
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddFeature(sug)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            alreadyAdded
                              ? 'bg-gray-800/40 text-gray-600 border-gray-800 cursor-not-allowed'
                              : 'bg-[#202c33] text-gray-300 border-gray-700 hover:border-[#25D366] hover:text-[#25D366]'
                          }`}
                        >
                          {alreadyAdded ? <Check size={10} /> : <Plus size={10} />}
                          <span>{sug}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Features List */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Features ({(newPlan.features || []).length}):</span>
                    {(newPlan.features || []).length === 0 && (
                      <span className="text-amber-400 font-normal">No features added yet. Click suggestions or type above.</span>
                    )}
                  </p>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {(newPlan.features || []).map((feat, idx) => (
                      <div
                        key={idx}
                        className="bg-[#202c33] border border-gray-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs text-white group hover:border-gray-700"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CheckCircle2 size={13} className="text-[#25D366] shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveFeature(idx, 'up')}
                            className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (newPlan.features || []).length - 1}
                            onClick={() => handleMoveFeature(idx, 'down')}
                            className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer"
                            title="Remove Feature"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-800">
                <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-3.5 py-1.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-all cursor-pointer">Cancel</button>
                <button 
                    onClick={handleCreatePlan} 
                    disabled={isSaving}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-[#0b141a] px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-green-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={14} /> : (editingPlanId ? <Edit3 size={14} /> : <Plus size={14} />)}
                  <span>{editingPlanId ? 'Update Plan' : 'Deploy Plan'}</span>
                </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {visiblePlans.map(plan => {
            const IconComp = ICON_MAP[plan.icon || 'Package'] || Package;
            const providerTag = plan.allowedProviders || 'baileys';
            const isMetaPlan = providerTag === 'meta' || providerTag === 'both';
            const customSetupFee = currentUser.subscription?.customMetaSetupFee;
            const effectiveSetupFee = (customSetupFee !== undefined && customSetupFee !== null) ? customSetupFee : (plan.metaSetupFee || 0);
            const isSetupWaived = Boolean(currentUser.subscription?.metaSetupWaived);
            const hasSetupFee = isMetaPlan && !isSetupWaived && effectiveSetupFee > 0;

            return (
              <div key={plan.id} className={`bg-[#111b21] rounded-xl border ${currentUser.subscription.planId === plan.id ? 'border-[#25D366]' : isMetaPlan ? 'border-blue-500/30' : 'border-gray-800/80'} p-3 sm:p-3.5 flex flex-col relative group transition-all hover:border-gray-700 shadow-md`}>
                {currentUser.subscription.planId === plan.id && (
                  <div className="absolute top-2.5 right-2.5 bg-[#25D366] text-[#0b141a] px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">Active</div>
                )}
                {plan.assignedTo && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border border-blue-500/30">
                    <Users size={9} /> Custom
                  </div>
                )}
                
                {/* Engine Tag Badge */}
                <div className="mb-1">
                  {providerTag === 'meta' && (
                    <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border border-blue-500/30">
                      <Globe size={10} /> Meta Cloud API
                    </span>
                  )}
                  {providerTag === 'baileys' && (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border border-emerald-500/30">
                      <Smartphone size={10} /> Baileys Web / QR
                    </span>
                  )}
                  {providerTag === 'both' && (
                    <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border border-purple-500/30">
                      <Cpu size={10} /> Hybrid (Web + Meta)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 mb-2">
                  <div className={`p-1.5 bg-gray-800/40 rounded-lg shrink-0 ${isMetaPlan ? 'text-blue-400' : 'text-[#25D366]'}`}>
                    <IconComp size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">{plan.name}</h3>
                    {plan.description && <p className="text-[9px] text-gray-400 truncate">{plan.description}</p>}
                  </div>
                </div>

                <div className="space-y-0.5 mb-2.5 bg-[#16222b] p-2 rounded-lg border border-gray-800/60">
                  <div className="flex items-center gap-0.5">
                    <IndianRupee className={isMetaPlan ? 'text-blue-400' : 'text-[#25D366]'} size={15} />
                    <span className="text-lg font-black text-white">{plan.price}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider ml-1">/ {plan.interval} platform</span>
                  </div>
                  {hasSetupFee ? (
                    <div className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                      <span>+ ₹{effectiveSetupFee} one-time setup charge</span>
                    </div>
                  ) : isMetaPlan && isSetupWaived ? (
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span>✓ One-Time Setup Fee Waived / Paid</span>
                    </div>
                  ) : null}
                  {isMetaPlan && (
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      • Messages billed from Wallet per Meta rate
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 flex-1 mb-3">
                  {providerTag === 'meta' ? (
                    <>
                      <PlanDetail label="Meta Instances" value={`${plan.maxInstances} Allowed`} />
                      <PlanDetail label="Setup Charge" value={isSetupWaived ? 'Waived (SuperAdmin)' : hasSetupFee ? `₹${effectiveSetupFee} (One-Time)` : 'Included'} />
                      <PlanDetail label="Message Billing" value="Wallet (Meta Global Rates)" />
                      <PlanDetail label="Rate Limits" value="Managed by Meta" />
                    </>
                  ) : (
                    <>
                      <PlanDetail label="Daily limit" value={plan.dailyLimit === 0 ? 'Unlimited' : `${plan.dailyLimit} msgs`} />
                      <PlanDetail label="Monthly limit" value={plan.monthlyLimit === 0 ? 'Unlimited' : `${plan.monthlyLimit} msgs`} />
                      <PlanDetail label="WhatsApp" value={`${plan.maxInstances} Account${plan.maxInstances > 1 ? 's' : ''}`} />
                      <PlanDetail label="Message Speed" value={`${plan.rateLimitPerMin} msgs/min`} />
                    </>
                  )}
                </div>

                {/* Dynamically Rendered Features List */}
                <div className="my-2 pt-2 border-t border-gray-800/60 space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Features Included</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {((plan.features && plan.features.length > 0) ? plan.features : getDefaultFeatures(providerTag)).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                        <CheckCircle2 size={12} className={isMetaPlan ? 'text-blue-400 shrink-0 mt-0.5' : 'text-[#25D366] shrink-0 mt-0.5'} />
                        <span className="leading-tight text-[11px]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isSuper ? (
                  <div className="flex gap-1.5 pt-1">
                    <button 
                      onClick={() => handleEditPlan(plan)}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-blue-500/20 cursor-pointer"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/20 cursor-pointer" title="Delete Plan">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : currentUser.subscription.planId !== plan.id ? (
                  <button 
                    onClick={() => initiatePayment(plan.price + (hasSetupFee ? effectiveSetupFee : 0), plan)}
                    className={`w-full text-[#0b141a] py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer ${isMetaPlan ? 'bg-blue-400 hover:bg-blue-300 shadow-blue-500/10' : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-green-500/10'}`}
                  >
                    Activate {isMetaPlan ? 'Meta' : ''} Tier {hasSetupFee ? `(₹${plan.price + effectiveSetupFee})` : ''}
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full bg-gray-800/80 text-gray-500 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-not-allowed"
                  >
                    Currently Subscribed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/10 p-3.5 sm:p-4 rounded-xl flex items-center gap-3 mt-4">
         <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-500 shrink-0">
            <AlertTriangle size={16} />
         </div>
         <div>
            <p className="text-white font-bold text-xs mb-0.5">Secure Payments</p>
            <p className="text-gray-400 text-[10px] leading-relaxed">
              We use <span className="text-yellow-500">Razorpay (rzp_live_...)</span> for all transactions. Your payment is secured via 256-bit encryption. 
              Once the payment is successful, your account validity is automatically extended by 30 days.
            </p>
         </div>
      </div>

      {/* Theme Refill Modal Popup */}
      {showRefillModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base">Refill Wallet Balance</h3>
                  <p className="text-[10px] text-gray-400">Message & Meta template billing credit</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRefillModal(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Enter Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-base">₹</span>
                  <input 
                    type="number" 
                    min="100"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(e.target.value)}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white font-bold text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Preset Quick Select Chips */}
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Quick Select</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {['500', '1000', '2000', '5000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRefillAmount(preset)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        refillAmount === preset
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-[#202c33] border-gray-800 text-gray-300 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleRefillProceed}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b141a] font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider text-xs font-black flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Wallet size={16} />
                <span>Proceed to Pay ₹{refillAmount || 0}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsageBar: React.FC<{ label: string, current: number, limit: number, color: string }> = ({ label, current, limit, color }) => {
  const currentFormatted = (current || 0).toLocaleString();
  const limitFormatted = (limit === 0 || limit === undefined || limit === null) ? 'Unlimited' : limit.toLocaleString();
  const percent = limit === 0 ? 0 : Math.min(100, ((current || 0) / limit) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider text-gray-400">
        <span>{label}</span>
        <span className="text-white font-mono">{currentFormatted} / {limitFormatted}</span>
      </div>
      <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const PlanDetail: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-800/50">
    <div className="flex items-center gap-1.5 text-gray-400">
       <CheckCircle2 size={11} className="text-[#25D366]" />
       <span>{label}</span>
    </div>
    <span className="text-white font-bold">{value}</span>
  </div>
);

export default BillingManager;
