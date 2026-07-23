import React, { useState } from 'react';
import { X, Smartphone, Globe, Info, AlertCircle, ArrowRight } from 'lucide-react';

interface ProvisionInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  planLimitReached: boolean;
  planMax: number;
  planName: string;
}

export default function ProvisionInstanceModal({ isOpen, onClose, onSubmit, planLimitReached, planMax, planName }: ProvisionInstanceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<'baileys' | 'meta'>('baileys');
  const [name, setName] = useState('');
  
  // Meta specific
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (!name.trim()) {
      alert('Please enter an instance name');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111b21] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#202c33]">
          <h2 className="text-xl font-bold text-white">Provision New Instance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {planLimitReached ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-lg font-bold text-white mb-2">Plan Limit Reached</h3>
              <p className="text-gray-400">
                Your "{planName}" plan only allows {planMax} instances. Please upgrade your plan to provision more instances.
              </p>
              <button 
                onClick={onClose}
                className="mt-6 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Instance Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Sales Team, Support Bot"
                      className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#25D366] transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">Select Provider Type</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div 
                        onClick={() => setProvider('baileys')}
                        className={`cursor-pointer border-2 rounded-xl p-5 transition-all ${provider === 'baileys' ? 'border-[#25D366] bg-[#25D366]/5' : 'border-gray-700 bg-[#202c33] hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${provider === 'baileys' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-gray-800 text-gray-400'}`}>
                            <Smartphone size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-white">Baileys (Web)</h3>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Connect by scanning a QR code with your WhatsApp mobile app. Best for personal numbers or testing.
                        </p>
                      </div>

                      <div 
                        onClick={() => setProvider('meta')}
                        className={`cursor-pointer border-2 rounded-xl p-5 transition-all ${provider === 'meta' ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 bg-[#202c33] hover:border-gray-500'}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${provider === 'meta' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
                            <Globe size={24} />
                          </div>
                          <h3 className="text-lg font-bold text-white">Meta Cloud API</h3>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Official WhatsApp Business API. Highly stable, requires Meta Developer account and approved app.
                        </p>
                      </div>

                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button 
                      type="button"
                      onClick={handleNext}
                      className="bg-[#25D366] hover:bg-[#128c7e] text-[#0b141a] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                      Next Step <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  
                  {provider === 'baileys' ? (
                    <div className="bg-[#202c33] p-6 rounded-xl border border-gray-700">
                      <h3 className="text-lg font-bold text-white mb-4">Baileys Provisioning</h3>
                      <div className="flex gap-4">
                        <div className="text-[#25D366] shrink-0 mt-1">
                          <Info size={24} />
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed space-y-4">
                          <p>
                            You have selected the standard WhatsApp Web protocol (Baileys).
                          </p>
                          <ul className="list-disc pl-5 space-y-2 text-gray-400">
                            <li>After creation, your instance will enter a <strong>Pairing</strong> state.</li>
                            <li>You will need to scan the provided QR Code using the Linked Devices section in your WhatsApp mobile app.</li>
                            <li>Ensure your phone stays connected to the internet for the first sync.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl flex gap-4">
                         <div className="text-blue-400 shrink-0 mt-1">
                          <Info size={24} />
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed space-y-2">
                          <p>You need to create an app in the <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">Meta Developer Dashboard</a> and set up WhatsApp.</p>
                          <p className="text-gray-400">Ensure your app has the WhatsApp product added, and you have generated a permanent access token.</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Phone Number ID</label>
                        <input 
                          type="text" 
                          required
                          value={metaPhoneNumberId}
                          onChange={e => setMetaPhoneNumberId(e.target.value)}
                          placeholder="e.g. 104234567891234"
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">WhatsApp Business Account ID (WABA ID)</label>
                        <input 
                          type="text" 
                          required
                          value={metaWabaId}
                          onChange={e => setMetaWabaId(e.target.value)}
                          placeholder="e.g. 112233445566778"
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Access Token</label>
                        <input 
                          type="password" 
                          required
                          value={metaAccessToken}
                          onChange={e => setMetaAccessToken(e.target.value)}
                          placeholder="EAAGm0..."
                          className="w-full bg-[#2a3942] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-between items-center">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-gray-400 hover:text-white px-4 py-2 font-semibold transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="bg-[#25D366] hover:bg-[#128c7e] disabled:opacity-50 text-[#0b141a] px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
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
