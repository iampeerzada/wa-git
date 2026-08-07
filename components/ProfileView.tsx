import React from 'react';
import { User, Plan } from '../types';
import { UserCircle, Shield, CreditCard, Activity, Calendar } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  plans: Plan[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, plans }) => {
  const currentPlan = plans.find(p => p.id === currentUser.subscription?.planId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#111b21] rounded-2xl border border-gray-800 p-8 shadow-xl">
        <div className="flex items-center gap-6 border-b border-gray-800 pb-8 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#25D366] to-teal-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">{currentUser.username}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  currentUser.role === 'superadmin' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                  currentUser.role === 'reseller' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {currentUser.role}
              </span>
              <span className="text-sm text-gray-500 font-mono">ID: {currentUser.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              Account Details
            </h3>
            <div className="space-y-4 bg-[#0b141a] p-4 rounded-xl border border-gray-800/50">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Member Since</span>
                <span className="text-white font-mono text-sm">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Status</span>
                <span className="text-[#25D366] font-bold text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">API Key</span>
                <span className="text-gray-500 font-mono text-xs blur-sm hover:blur-none transition-all cursor-pointer">
                  {currentUser.apiKey}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-purple-400" />
              Subscription & Plan
            </h3>
            <div className="space-y-4 bg-[#0b141a] p-4 rounded-xl border border-gray-800/50">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Current Plan</span>
                <span className="text-white font-bold text-sm bg-[#202c33] px-2 py-1 rounded">
                  {currentPlan?.name || 'Unknown Plan'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Renewal Date</span>
                <span className="text-white font-mono text-sm flex items-center gap-1">
                  <Calendar size={14} className="text-gray-500" />
                  {new Date(currentUser.subscription?.expiryDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Messages Sent Today</span>
                <span className="text-white font-bold text-sm flex items-center gap-1">
                  <Activity size={14} className="text-blue-400" />
                  {currentUser.subscription?.messagesSentToday || 0} / {currentPlan?.dailyMessageLimit === -1 ? '∞' : currentPlan?.dailyMessageLimit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
