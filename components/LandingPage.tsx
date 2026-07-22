import React, { useEffect } from 'react';
import { 
  Zap, MessageSquare, Send, Layout, ShieldCheck, 
  Users, Layers, ArrowRight, IndianRupee, Package, 
  Rocket, Crown, Star, Shield, Globe, Cpu, CheckCircle2,
  Home, Github, Twitter, Facebook, Mail, Smartphone,
  BarChart3, ShieldAlert, Workflow, Instagram, Linkedin, MapPin, Phone,
  Infinity, Bot, MessageSquareQuote, FolderGit2, Terminal
} from 'lucide-react';
import { Plan } from '../types';

import BrandLogo from './BrandLogo';

interface LandingPageProps {
  plans: Plan[];
  onLoginClick: () => void;
  onSignupClick: () => void;
  onDemoClick: () => void;
}

const ICON_MAP: Record<string, any> = {
  Zap, Crown, Star, Rocket, Shield, Globe, Cpu, Package, Layers
};

const LandingPage: React.FC<LandingPageProps> = ({ plans, onLoginClick, onSignupClick, onDemoClick }) => {
  
  // Handle smooth scrolling for internal links
  useEffect(() => {
    const handleScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const href = target.closest('a')?.getAttribute('href');
      if (href?.startsWith('#') && !href.includes('ifastx.in')) {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    document.addEventListener('click', handleScroll);
    return () => document.removeEventListener('click', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b141a] text-gray-200 overflow-x-hidden selection:bg-[#25D366] selection:text-[#0b141a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#0b141a]/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => window.location.href = 'https://ifastx.in'}>
              <BrandLogo size="md" className="group-hover:scale-105 transition-transform duration-300 origin-left scale-75 sm:scale-100" />
            </div>
            
            <div className="hidden xs:flex items-center gap-2 bg-[#25D366]/5 border border-[#25D366]/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <Infinity size={12} className="text-[#25D366]" />
              <span className="text-[8px] sm:text-[10px] font-black text-[#25D366]/80 uppercase tracking-widest">Official Meta Partner</span>
            </div>
          </div>
          
          <div className="hidden xl:flex items-center gap-10">
            <a href="#features" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Features</a>
            <a href="#pricing" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Pricing</a>
            <a href="#integration" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Integration</a>
            <a href="https://ifastx.in" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#0668E1] hover:text-blue-400 transition-colors">
              <Home size={14} /> Home
            </a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onDemoClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-700 text-[#25D366] hover:bg-[#25D366]/10 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <Terminal size={12} />
              Live Demo
            </button>
            <button 
              onClick={onLoginClick}
              className="hidden sm:block text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white hover:text-[#25D366] transition-colors ml-2"
            >
              Sign In
            </button>
            <button 
              onClick={onSignupClick}
              className="bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wide shadow-lg shadow-[#25D366]/20 transition-all hover:translate-y-[-1px] active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

{/* Hero Section */}
      {/* UPDATE 1: Yahan maine pt-32 sm:pt-48 ko kam karke pt-24 sm:pt-32 kar diya hai */}
      <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-[10%] -left-[10%] w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-blue-600/5 rounded-full blur-[100px] sm:blur-[180px] animate-pulse" />
             <div className="absolute bottom-[20%] -right-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-[#25D366]/5 rounded-full blur-[80px] sm:blur-[140px]" />
             <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
            
            {/* UPDATE 2: Is div mein glowing shadow, bright text aur border add kiya hai highlight karne ke liye */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#0668E1]/15 border border-[#0668E1]/50 shadow-[0_0_20px_rgba(6,104,225,0.3)] rounded-full backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,104,225,0.5)] hover:bg-[#0668E1]/20">
              <Infinity size={16} className="text-[#60A5FA]" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#60A5FA] text-center drop-shadow-md">
                Official Meta Business Partner
              </span>
            </div>
            
            <div className="hidden xs:inline-flex items-center gap-3 px-4 py-2 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full">
              <CheckCircle2 size={14} className="text-[#25D366]" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#25D366]">Direct API Access</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[1.1] sm:leading-[0.95] mb-6 sm:mb-8 px-2">
            Infinite Scale. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#25D366] via-[#128C7E] to-[#0668E1]">Zero Friction.</span>
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed mb-10 sm:mb-12 px-4">
            The world's most robust multi-session WhatsApp Gateway. Verified by Meta, optimized for enterprise scale. Provision instances in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4 mb-6 sm:mb-8 px-4">
            <button 
              onClick={onSignupClick}
              className="group w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] px-6 py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wide shadow-lg shadow-[#25D366]/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              Start Building <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                const pricing = document.getElementById('pricing');
                pricing?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto bg-[#111b21]/50 backdrop-blur-md border border-gray-800 text-white px-6 py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-[#202c33] hover:border-gray-600 transition-all flex items-center justify-center gap-2"
            >
              View Plans
            </button>
          </div>
          
          <div className="flex justify-center mb-16 sm:mb-24">
             <button onClick={onDemoClick} className="text-gray-400 hover:text-[#25D366] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border border-gray-800 hover:border-[#25D366]/50 bg-[#111b21]/30 px-4 py-2 rounded-lg">
               <span>Play with Live Demo Dashboard</span>
               <ArrowRight size={14} />
             </button>
          </div>

          <div className="pt-8 sm:pt-10 border-t border-gray-800/50">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-8 sm:mb-12">Authorized Enterprise Technology</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-500 px-4">
                <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter">FINTECH.</span>
                <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter">ECOMMERCE.</span>
                <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter">SAAS_CORP.</span>
                <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter">LOGISTICS.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-20 bg-[#111b21]/30 border-y border-gray-800/50 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
             <StatItem label="Daily Volume" value="5M+" suffix="Msgs" />
             <StatItem label="Global Nodes" value="12" suffix="Regions" />
             <StatItem label="Average Latency" value="150" suffix="ms" />
             <StatItem label="API Uptime" value="99.9" suffix="%" />
          </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 sm:py-32 relative px-4 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-24 space-y-4 sm:space-y-6">
             <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter">Engineered for <br/><span className="text-[#25D366]">Performance.</span></h2>
             <p className="text-gray-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[9px] sm:text-[10px]">Official Partner Infrastructure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
            <FeatureCard 
              icon={<Send />} 
              title="Campaign Orchestrator" 
              desc="Next-gen bulk sender with sequence randomization, spintax injection, and native interactive button support for maximum engagement." 
            />
            <FeatureCard 
              icon={<Layers />} 
              title="Multi-Instance Core" 
              desc="Isolated sandbox environments for every session. Scale horizontally across hundreds of numbers without cross-session interference." 
            />
            <FeatureCard 
              icon={<Workflow />} 
              title="API-First Design" 
              desc="Fully documented RESTful architecture with JSON webhooks. Integrate with Python, Node.js, PHP, or Go in under 5 minutes." 
            />
            <FeatureCard 
              icon={<ShieldAlert />} 
              title="Ban Prevention Engine" 
              desc="Sophisticated behavior simulation including typing indicators, staggered delays, and dynamic metadata rotation to protect your assets." 
            />
            <FeatureCard 
              icon={<BarChart3 />} 
              title="Real-time Analytics" 
              desc="Granular delivery reporting and instance load monitoring. Know exactly when your messages land with second-by-second updates." 
            />
            <FeatureCard 
              icon={<Users />} 
              title="CRM Bridge & Contact Groups" 
              desc="Unified contact management with group segmentation and verification. Sync your existing customer data effortlessly." 
            />
            <FeatureCard 
              icon={<Bot />} 
              title="Auto Responder Rules" 
              desc="Create advanced rules to reply to queries instantly. Match exact text or substring triggers with rich media support." 
            />
            <FeatureCard 
              icon={<MessageSquareQuote />} 
              title="Template Management" 
              desc="Store pre-approved layouts, greetings, and promotional scripts in the Template Library for ultra-fast bulk sending." 
            />
            <FeatureCard 
              icon={<FolderGit2 />} 
              title="Global Media Storage" 
              desc="Built-in super-fast media library. Upload images, videos, and PDFs once and reuse them across thousands of messages seamlessly." 
            />
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integration" className="py-16 sm:py-32 bg-[#111b21]/20 px-4">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 items-center">
            <div className="space-y-6 sm:space-y-8">
               <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">Official <br/><span className="text-[#0668E1]">Meta Bridge.</span></h2>
               <p className="text-gray-400 text-base sm:text-lg leading-relaxed font-medium">
                  Whether you're building a custom CRM, a notification system, or a support bot, our API is designed to be the official backbone of your communication.
               </p>
               <ul className="space-y-3 sm:space-y-4">
                  <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                     <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                     Automated Order Notifications
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                     <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                     Two-Factor Authentication (2FA)
                  </li>
                  <li className="flex items-center gap-3 text-sm font-bold text-gray-300">
                     <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                     AI Customer Support Bots
                  </li>
               </ul>
               <button 
                onClick={onLoginClick}
                className="inline-flex items-center gap-3 text-[#0668E1] font-black uppercase tracking-widest text-[10px] sm:text-xs hover:gap-5 transition-all"
               >
                 Explore API Docs <ArrowRight size={16} />
               </button>
            </div>
            <div className="bg-[#0b141a] rounded-2xl sm:rounded-3xl border border-gray-800 p-6 sm:p-8 shadow-3xl font-mono text-[10px] sm:text-xs overflow-hidden group">
               <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-gray-800 pb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  <span className="ml-4 text-gray-600 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">send_message.py</span>
               </div>
               <div className="space-y-2 group-hover:translate-x-1 transition-transform overflow-x-auto pb-2">
                  <p className="text-purple-400 whitespace-nowrap">import <span className="text-white">requests</span></p>
                  <p className="text-gray-500 whitespace-nowrap"># Production Payload</p>
                  <p className="text-white whitespace-nowrap">payload = {'{'}</p>
                  <p className="pl-4 sm:pl-6 text-white whitespace-nowrap">"instanceId": <span className="text-green-400">"inst_9922"</span>,</p>
                  <p className="pl-4 sm:pl-6 text-white whitespace-nowrap">"number": <span className="text-green-400">"919876543210"</span>,</p>
                  <p className="pl-4 sm:pl-6 text-white whitespace-nowrap">"message": <span className="text-green-400">"Your order is out! 🚚"</span></p>
                  <p className="text-white whitespace-nowrap">{'}'}</p>
                  <p className="text-blue-400 whitespace-nowrap">requests<span className="text-white">.post(</span><span className="text-green-400">"https://wa-api.ifastx.in/api/send"</span><span className="text-white">, json=payload)</span></p>
               </div>
            </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-32 relative px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-24 space-y-4 sm:space-y-6">
             <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter">Premium <span className="text-[#25D366]">Tiers.</span></h2>
             <p className="text-gray-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[9px] sm:text-[10px]">No Hidden Fees &bull; Cancel Anytime</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {plans.filter(p => !p.assignedTo).map(plan => {
              const IconComp = ICON_MAP[plan.icon || 'Package'] || Package;
              const isPopular = plan.name.toLowerCase().includes('pro');
              
              return (
                <div key={plan.id} className={`bg-[#111b21]/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border ${isPopular ? 'border-[#25D366] shadow-[#25D366]/10' : 'border-gray-800'} p-8 sm:p-12 flex flex-col relative group transition-all hover:translate-y-[-8px] shadow-2xl`}>
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#25D366] text-[#0b141a] px-4 sm:px-6 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">Most Popular</div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-6 sm:mb-8">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${isPopular ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-gray-800/50 text-gray-400'}`}>
                      <IconComp size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">{plan.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">{plan.interval} billing</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mb-8 sm:mb-10">
                    <span className="text-xl sm:text-2xl font-black text-[#25D366]">₹</span>
                    <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">{plan.price}</span>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-5 flex-1 mb-10 sm:mb-12">
                    <PlanDetailFeature label={plan.dailyLimit === 0 ? 'Unlimited Messages' : `${plan.dailyLimit} Daily messages`} />
                    <PlanDetailFeature label={`${plan.maxInstances} Native instances`} />
                    <PlanDetailFeature label="REST API Access" />
                    <PlanDetailFeature label="Webhooks support" />
                    <PlanDetailFeature label="Standard support" />
                  </div>

                  <button 
                    onClick={onSignupClick}
                    className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-[1.25rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 text-xs sm:text-sm ${
                        isPopular 
                        ? 'bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] shadow-[#25D366]/20' 
                        : 'bg-white hover:bg-gray-200 text-[#0b141a]'
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 sm:pt-32 pb-12 sm:pb-16 bg-[#0b141a] border-t border-gray-800/50 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16 mb-16 sm:mb-24">
          <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" className="origin-left scale-90 sm:scale-100" />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed font-medium pr-4 mt-2">
              Authorized infrastructure for modern WhatsApp engagement. Secure, resilient, and enterprise-ready.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#0668E1] text-[10px] font-black uppercase tracking-widest">
                <Infinity size={14} /> Official Meta Business Partner
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                <SocialLink icon={<Instagram size={18} />} href="https://www.instagram.com/ifastx.in" />
                <SocialLink icon={<Facebook size={18} />} href="https://www.facebook.com/ifastx.in" />
                <SocialLink icon={<Linkedin size={18} />} href="https://www.linkedin.com/company/ifastdotit" />
              </div>
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Platform</h4>
             <ul className="space-y-3 sm:space-y-4 text-sm text-gray-500 font-bold">
                <li><a href="#" onClick={onLoginClick} className="hover:text-blue-400 transition-colors">Developer Portal</a></li>
                <li><a href="#" onClick={onLoginClick} className="hover:text-blue-400 transition-colors">API References</a></li>
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Bulk Campaigner</a></li>
                <li><a href="https://ifastx.in/#contact" className="hover:text-blue-400 transition-colors">Enquiry & Contact</a></li>
             </ul>
          </div>

          <div className="space-y-6 sm:space-y-8">
             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Company</h4>
             <ul className="space-y-3 sm:space-y-4 text-sm text-gray-500 font-bold">
                <li><a href="https://ifastx.in/#about" className="hover:text-blue-400 transition-colors">About Us</a></li>
                <li><a href="https://ifastx.in/#privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Shield</a></li>
                <li><a href="https://ifastx.in/#terms-conditions" className="hover:text-blue-400 transition-colors">Merchant Terms</a></li>
                <li><a href="https://ifastx.in/#refunds" className="hover:text-blue-400 transition-colors">Refunds Policy</a></li>
             </ul>
          </div>

          <div className="space-y-6 sm:space-y-8">
             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Support & Visit</h4>
             <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-blue-400 shrink-0">
                      <MessageSquare size={16} />
                   </div>
                   <span className="text-xs sm:text-sm">+91 9028114392</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-blue-400 shrink-0">
                      <Mail size={16} />
                   </div>
                   <span className="text-xs sm:text-sm truncate">support@ifastx.in</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-500 font-bold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <MapPin size={16} />
                   </div>
                   <span className="text-[10px] sm:text-[11px] leading-relaxed">
                     3rd Floor, V S Reddy Colony, Bengaluru - 560067
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 sm:pt-12 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
             <p className="text-[9px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">
               &copy; 2024 iFastX Technologies Pvt Ltd.
             </p>
             <div className="flex items-center gap-6 text-[8px] sm:text-[9px] font-black text-gray-700 uppercase tracking-widest">
                <a href="https://ifastx.in/#privacy-policy" className="hover:text-white transition-colors">Privacy</a>
                <a href="https://ifastx.in/#terms-conditions" className="hover:text-white transition-colors">Compliance</a>
             </div>
           </div>
           <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-1.5 text-blue-500/60 text-[9px] font-black uppercase tracking-widest">
                <Infinity size={14} /> Meta Business Partner
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black text-gray-700 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-[#25D366]" />
                  ISO 27001 SECURE
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

const StatItem = ({ label, value, suffix }: { label: string, value: string, suffix: string }) => (
  <div className="text-center group">
    <div className="flex items-baseline justify-center gap-1">
      <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white group-hover:text-[#25D366] transition-colors">{value}</p>
      <span className="text-[10px] sm:text-xs font-black text-gray-600 uppercase tracking-tighter">{suffix}</span>
    </div>
    <p className="text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-2 sm:mt-3">{label}</p>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-[#111b21]/50 backdrop-blur-sm p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-800 transition-all hover:border-[#25D366]/30 hover:bg-[#111b21] group">
    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#25D366]/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#25D366] mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#25D366]/10 transition-all duration-300">
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
    </div>
    <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4 tracking-tight group-hover:text-[#25D366] transition-colors">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed font-medium">{desc}</p>
  </div>
);

const PlanDetailFeature = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-gray-400">
     <div className="w-4 h-4 sm:w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
        <CheckCircle2 size={12} className="text-[#25D366]" />
     </div>
     <span className="truncate">{label}</span>
  </div>
);

const SocialLink = ({ icon, href }: { icon: React.ReactNode, href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-500 hover:text-[#0b141a] hover:bg-[#25D366] transition-all border border-gray-700/50 hover:border-[#25D366]/50">
    {icon}
  </a>
);

export default LandingPage;