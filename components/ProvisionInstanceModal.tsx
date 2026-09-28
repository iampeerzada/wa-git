import React, { useState, useEffect } from 'react';
import { X, Smartphone, Globe, Info, AlertCircle, ArrowRight, Lock, ExternalLink } from 'lucide-react';
import { Plan } from '../types';

interface ProvisionInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  planLimitReached: boolean;
  planMax: number;
  planName: string;
  currentPlan?: Plan | null;
  isSuperAdmin?: boolean;
  onNavigateToBilling?: () => void;
}

export default function ProvisionInstanceModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  planLimitReached, 
  planMax, 
  planName,
  currentPlan,
  isSuperAdmin = false,
  onNavigateToBilling
}: ProvisionInstanceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<'baileys' | 'meta'>('baileys');
  const [name, setName] = useState('');
  
  // Meta specific
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  
  const [loading, setLoading] = useState(false);

  const allowedProviders = isSuperAdmin 
    ? 'both' 
    : (currentPlan?.allowedProviders || 'baileys');

  const isBaileysAllowed = allowedProviders === 'baileys' || allowedProviders === 'both';
  const isMetaAllowed = allowedProviders === 'meta' || allowedProviders === 'both';

  useEffect(() => {
    if (isOpen) {
      if (allowedProviders === 'meta') {
        setProvider('meta');
      } else {
        setProvider('baileys');
      }
    }
  }, [isOpen, allowedProviders]);

  const launchWhatsAppSignup = () => {
    const appId = '4126835067540230';
    const configId = '1383757723972613';
    
    const url = `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${appId}&config_id=${configId}&extras=%7B%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v4%22%7D`;
    
    window.open(url, '_blank', 'width=1000,height=800');
    
    alert(
      "Facebook setup opened in a new window!\n\n" +
      "HOW TO GET YOUR CREDENTIALS:\n" +
      "1. Complete the Facebook setup in the popup window.\n" +
      "2. When finished, go to your Meta App Dashboard > WhatsApp > API Setup.\n" +
      "3. Copy the 'Phone Number ID' and 'WhatsApp Business Account ID'.\n" +
      "4. Generate a 'System User Access Token' (or Temporary Access Token).\n" +
      "5. Paste them into the manual entry section right here on this page."
    );
  };

  if (!isOpen) return null;

  const handleNext = () => {
    if (!name.trim()) {
      alert('Please enter an instance name');
      return;
    }

    if (provider === 'meta' && !isMetaAllowed) {
      alert(`Your active plan "${planName || 'Current Plan'}" does not allow Meta Cloud API instances. Please activate a Meta Cloud plan to continue.`);
      if (onNavigateToBilling) onNavigateToBilling();
      return;
    }

    if (provider === 'baileys' && !isBaileysAllowed) {
      alert(`Your active plan "${planName || 'Current Plan'}" does not allow Baileys instances. Please activate a Baileys plan to continue.`);
      if (onNavigateToBilling) onNavigateToBilling();
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provider === 'meta') {
      if (!metaPhoneNumberId || !metaWabaId || !metaAccessToken) {
        alert('Please fill all Meta configuration fields');
        return;
      }
    }
    
    setLoading(true);
    try {
      const payload: any = { name, provider };
      if (provider === 'meta') {
        payload.metaPhoneNumberId = metaPhoneNumberId;
        payload.metaWabaId = metaWabaId;
        payload.metaAccessToken = metaAccessToken;
      }
      await onSubmit(payload);
      onClose();
      // Reset state after success
      setStep(1);
      setName('');
      setMetaPhoneNumberId('');
      setMetaWabaId('');
      setMetaAccessToken('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-[#111b21] w-full max-w-lg sm:max-w-xl rounded-xl sm:rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        
        <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-800 bg-[#202c33]">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-white">Provision New Instance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {planLimitReached ? (
            <div className="bg-red-500/10 border border-red-500/20 p-5 sm:p-6 rounded-xl text-center space-y-4">
              <AlertCircle className="mx-auto text-red-500" size={42} />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">Plan Limit Reached</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
                  Your <span className="font-bold text-white">"{planName}"</span> plan allows a maximum of <span className="font-bold text-[#25D366]">{planMax}</span> instance{planMax === 1 ? '' : 's'}. Upgrade your plan to add more WhatsApp accounts or instance capacity.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onNavigateToBilling && (
                  <button 
                    onClick={() => {
                      onClose();
                      onNavigateToBilling();
                    }}
                    className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-[#0b141a] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
                  >
                    <span>Upgrade Plan / Add WhatsApp</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              
              {step === 1 && (
                <div className="space-y-4 sm:space-y-5 animate-fade-in">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5">Instance Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Sales Team, Support Bot"
                      className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#25D366] transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-2">Select Provider Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      <div 
                        onClick={() => setProvider('baileys')}
                        className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all relative ${
                          provider === 'baileys' 
                            ? (isBaileysAllowed ? 'border-[#25D366] bg-[#25D366]/5' : 'border-amber-500 bg-amber-500/5') 
                            : 'border-gray-700/80 bg-[#202c33] hover:border-gray-500'
                        }`}
                      >
                        {!isBaileysAllowed && (
                          <span className="absolute top-2.5 right-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock size={10} /> Upgrade Needed
                          </span>
                        )}
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${provider === 'baileys' ? (isBaileysAllowed ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-amber-500/20 text-amber-400') : 'bg-gray-800 text-gray-400'}`}>
                            <Smartphone size={18} />
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-white">Baileys (Web)</h3>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                          Connect by scanning a QR code with your WhatsApp mobile app. Best for personal numbers.
                        </p>
                      </div>

                      <div 
                        onClick={() => setProvider('meta')}
                        className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all relative ${
                          provider === 'meta' 
                            ? (isMetaAllowed ? 'border-blue-500 bg-blue-500/5' : 'border-amber-500 bg-amber-500/5') 
                            : 'border-gray-700/80 bg-[#202c33] hover:border-gray-500'
                        }`}
                      >
                        {!isMetaAllowed && (
                          <span className="absolute top-2.5 right-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock size={10} /> Upgrade Needed
                          </span>
                        )}
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${provider === 'meta' ? (isMetaAllowed ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400') : 'bg-gray-800 text-gray-400'}`}>
                            <Globe size={18} />
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-white">Meta Cloud API</h3>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                          Official WhatsApp Business API. Highly stable, requires Meta Developer account.
                        </p>
                      </div>

                    </div>
                  </div>

                  {provider === 'meta' && !isMetaAllowed && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white mb-0.5">Meta Activation Plan Required</h4>
                        <p className="text-[11px] text-gray-300 leading-relaxed mb-2.5">
                          Your active plan <strong className="text-amber-300">"{planName || 'Current Plan'}"</strong> does not support Meta Cloud API instances. Please activate a Meta plan to proceed with Meta instances.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToBilling) onNavigateToBilling();
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <ExternalLink size={13} />
                          Activate Meta Plan
                        </button>
                      </div>
                    </div>
                  )}

                  {provider === 'baileys' && !isBaileysAllowed && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white mb-0.5">Baileys Activation Plan Required</h4>
                        <p className="text-[11px] text-gray-300 leading-relaxed mb-2.5">
                          Your active plan <strong className="text-amber-300">"{planName || 'Current Plan'}"</strong> does not support Baileys instances. Please activate a Baileys plan to proceed.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToBilling) onNavigateToBilling();
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <ExternalLink size={13} />
                          Activate Baileys Plan
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 flex justify-end">
                    <button 
                      type="button"
                      onClick={handleNext}
                      className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                    >
                      Next Step <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  
                  {provider === 'baileys' ? (
                    <div className="bg-[#202c33] p-4 rounded-xl border border-gray-700/80">
                      <h3 className="text-xs sm:text-sm font-bold text-white mb-2">Baileys Provisioning</h3>
                      <div className="flex gap-3">
                        <div className="text-[#25D366] shrink-0 mt-0.5">
                          <Info size={18} />
                        </div>
                        <div className="text-gray-300 text-xs sm:text-sm leading-relaxed space-y-2">
                          <p>
                            You have selected the standard WhatsApp Web protocol (Baileys).
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[11px] sm:text-xs">
                            <li>After creation, your instance will enter a <strong>Pairing</strong> state.</li>
                            <li>Scan the provided QR Code using Linked Devices in your WhatsApp app.</li>
                            <li>Ensure your phone stays connected during setup.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl flex gap-3">
                         <div className="text-blue-400 shrink-0 mt-0.5">
                          <Info size={18} />
                        </div>
                        <div className="text-gray-300 text-xs leading-relaxed space-y-1.5 flex-1">
                          <p className="font-bold text-white">Automated Meta Onboarding & Billing Structure</p>
                          <p className="text-gray-400 text-[11px]">
                            Meta Cloud API instances use official Meta Cloud infrastructure. Activations require a Meta plan (one-time setup + recurring platform fee). Message charges for utility, marketing & authentication templates deduct directly from your Wallet as per Superadmin global rates.
                          </p>
                          <button type="button" onClick={launchWhatsAppSignup} className="mt-2 bg-[#1877F2] hover:bg-[#166FE5] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95">
                              <Globe size={15} /> Connect with Facebook
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 my-1">
                          <div className="h-px bg-gray-700/80 flex-1"></div>
                          <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider">OR ENTER MANUALLY</span>
                          <div className="h-px bg-gray-700/80 flex-1"></div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Phone Number ID</label>
                        <input 
                          type="text" 
                          required
                          value={metaPhoneNumberId}
                          onChange={e => setMetaPhoneNumberId(e.target.value)}
                          placeholder="e.g. 104234567891234"
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors font-mono text-xs"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">WhatsApp Business Account ID (WABA ID)</label>
                        <input 
                          type="text" 
                          required
                          value={metaWabaId}
                          onChange={e => setMetaWabaId(e.target.value)}
                          placeholder="e.g. 112233445566778"
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1">Access Token</label>
                        <input 
                          type="password" 
                          required
                          value={metaAccessToken}
                          onChange={e => setMetaAccessToken(e.target.value)}
                          placeholder="EAAGm0..."
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 flex justify-between items-center">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-gray-400 hover:text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="bg-[#25D366] hover:bg-[#128c7e] disabled:opacity-50 text-[#0b141a] px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                    >
                      {loading ? 'Provisioning...' : 'Provision Instance'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
