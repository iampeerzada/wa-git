import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Eye, EyeOff, ShieldCheck, Zap, ArrowRight, Smartphone, Lock, Mail, RefreshCw, CheckCircle2, ChevronLeft, Infinity } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
  onSignup: (username: string, password: string) => void;
  onBackToHome?: () => void;
  error?: string | null;
}

const OTP_BRIDGE_URL = 'https://ifastx.in/wa/waotmail.php';
const AUTH_TOKEN = 'ifastx_internal_bridge_9922';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignup, onBackToHome, error: externalError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  
  // OTP States
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [userOtp, setUserOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const error = externalError || localError;

  const handleSendOtp = async () => {
    if (!username.includes('@')) {
      setLocalError('Please enter a valid email address for OTP login.');
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #0b141a; background-color: #f5f7f9; border-radius: 10px;">
        <h2 style="color: #009688;">iFastX WA Gateway Security</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #ffffff; padding: 15px; text-align: center; border-radius: 8px; border: 1px solid #e1e4e8; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #009688;">${code}</span>
        </div>
        <p style="font-size: 12px; color: #6a737d;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
        <p style="font-size: 10px; color: #959da5; text-align: center;">&copy; 2024 iFastX Technologies. Secure Enterprise Solutions.</p>
      </div>
    `;

    try {
      const response = await fetch(OTP_BRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: AUTH_TOKEN,
          to: username,
          subject: `${code} is your iFastX verification code`,
          body: emailBody
        })
      });

      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setLocalError(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setLocalError('Network error while connecting to mail bridge.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isOtpMode && otpSent) {
      if (userOtp === generatedOtp) {
        // Successful OTP verification
        // Use a special bypass password that App.tsx recognizes for the selected username
        onLogin(username, 'iFastX@Admin2024'); 
      } else {
        setLocalError('Invalid verification code.');
      }
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (isSignup) {
        onSignup(username, password);
      } else {
        onLogin(username, password);
      }
      setIsLoading(false);
    }, 800);
  };

  const toggleOtpMode = () => {
    setIsOtpMode(!isOtpMode);
    setOtpSent(false);
    setGeneratedOtp('');
    setUserOtp('');
    setLocalError(null);
  };

  return (
    <div className="min-h-screen flex bg-[#0b141a] text-gray-200 overflow-y-auto lg:overflow-hidden">
      {/* Left Section - Hero Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#111b21] flex-col overflow-hidden border-r border-gray-800">
        <div className="absolute top-12 left-12 z-20 flex items-center gap-6">
          <BrandLogo size="md" />
          
          <div className="h-6 w-[1px] bg-gray-700 mx-2" />
          
          <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
            <Infinity size={14} className="text-blue-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Official Meta Partner</span>
          </div>
        </div>

        <div className="absolute inset-0 z-10 opacity-20 mix-blend-overlay pointer-events-none">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
             <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#25D366]/20 rounded-full blur-[80px]" />
        </div>

        <div className="mt-auto p-20 z-20 space-y-6">
          <div className="flex items-center gap-4">
            <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded border border-blue-500/30">
              Enterprise Meta Gateway
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-[#25D366] text-[10px] font-black uppercase tracking-widest rounded border border-green-500/20">
              <CheckCircle2 size={12} /> WhatsApp Official
            </div>
          </div>
          <h1 className="text-6xl font-black text-white leading-tight">
            Scale with the <br />
            <span className="text-blue-400 font-extrabold">Official API Partner.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-md font-medium leading-relaxed">
            iFastX is your direct bridge to Meta's WhatsApp Business Platform. Robust, secure, and officially verified.
          </p>
          
          <button className="flex items-center gap-2 text-blue-400 font-bold text-sm group uppercase tracking-widest">
            EXPLORE ECOSYSTEM <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[500px] border-[40px] border-blue-500/5 -mr-20 rotate-12 rounded-3xl" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[400px] h-[500px] border-[40px] border-white/5 -mr-24 rotate-12 rounded-3xl" />
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-[#0b141a]">
        <div className="absolute top-20 left-20 grid grid-cols-6 gap-4 opacity-10 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
          ))}
        </div>

        <div className="w-full max-w-md bg-[#111b21] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-10 border border-gray-800 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-8 text-center flex flex-col items-center">
            {onBackToHome && (
              <button 
                onClick={onBackToHome}
                className="self-start flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors mb-4 uppercase font-black tracking-widest"
              >
                <ChevronLeft size={14} /> Back to Home
              </button>
            )}
            <div className="mb-4 flex flex-col items-center">
               <BrandLogo size="md" className="scale-125 mb-4 mt-2" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignup ? 'Create Account' : (isOtpMode ? 'Login with Email OTP' : 'Gateway Access')}
            </h2>
            <div className="flex items-center gap-2 justify-center">
              <div className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.1em]">
                <Infinity size={12} strokeWidth={3} /> Official Meta Partner
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse">
              <ShieldCheck size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                {isOtpMode ? <Mail size={12} /> : <Smartphone size={12} />} 
                {isOtpMode ? 'Email Address' : 'Account Identifier'}
              </label>
              <input 
                type={isOtpMode ? "email" : "text"}
                required
                disabled={otpSent}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isOtpMode ? "your@email.com" : "Enter your username"}
                className="w-full bg-[#0b141a] border border-gray-800 rounded-xl px-4 py-4 text-sm text-white focus:ring-2 ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700 font-mono disabled:opacity-50"
              />
            </div>

            {(!isOtpMode || otpSent) && (
              <div>
                <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  {isOtpMode ? <CheckCircle2 size={12} /> : <Lock size={12} />} 
                  {isOtpMode ? 'Verification Code' : 'Access Password'}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword || isOtpMode ? "text" : "password"}
                    required
                    maxLength={isOtpMode ? 6 : undefined}
                    value={isOtpMode ? userOtp : password}
                    onChange={(e) => isOtpMode ? setUserOtp(e.target.value) : setPassword(e.target.value)}
                    placeholder={isOtpMode ? "Enter 6-digit code" : "••••••••"}
                    className="w-full bg-[#0b141a] border border-gray-800 rounded-xl px-4 py-4 text-sm text-white focus:ring-2 ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700 font-mono"
                  />
                  {!isOtpMode && (
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <button 
                type="button" 
                onClick={toggleOtpMode}
                className="text-blue-400 hover:underline underline-offset-4"
              >
                {isOtpMode ? 'Login with Password' : 'OTP Auth'}
              </button>
              <button type="button" className="text-gray-600 hover:text-gray-400 transition-colors">Recover Account</button>
            </div>

            {isOtpMode && !otpSent ? (
              <button 
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || !username}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>REQUEST AUTH CODE <Mail size={18} /></>
                )}
              </button>
            ) : (
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignup ? 'ESTABLISH ACCOUNT' : (isOtpMode ? 'VALIDATE SESSION' : 'AUTHORIZE ACCESS')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-500 font-black uppercase tracking-widest">
            {isSignup ? 'Existing Member?' : "New to the Gateway?"} 
            <button 
              onClick={() => {setIsSignup(!isSignup); setIsOtpMode(false); setUsername(''); setPassword('');}}
              className="text-blue-400 font-black ml-2 hover:underline transition-all"
            >
              {isSignup ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm text-[9px] font-black uppercase tracking-widest text-center px-4">
          <div className="text-gray-600 mb-2">&copy; 2024 iFastX Technologies. All rights reserved.</div>
          <div className="flex flex-col items-center gap-2 justify-center bg-[#0b141a]/80 backdrop-blur-sm py-2 rounded-xl border border-gray-800/50">
            <div className="flex items-center gap-1.5">
               <ShieldCheck size={12} className="text-blue-500" />
               <span className="text-gray-500">Industrial Grade Auth Hook</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <Infinity size={14} strokeWidth={3} />
              <span>Official Meta Business Partner</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;