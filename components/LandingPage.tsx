import React, { useEffect, useState } from 'react';
import { 
  Zap, MessageSquare, Send, Layout, ShieldCheck, 
  Users, Layers, ArrowRight, IndianRupee, Package, 
  Rocket, Crown, Star, Shield, Globe, Cpu, CheckCircle2,
  Home, Github, Twitter, Facebook, Mail, Smartphone,
  BarChart3, ShieldAlert, Workflow, Instagram, Linkedin, MapPin, Phone,
  Infinity, Bot, MessageSquareQuote, FolderGit2, Terminal, Menu, X, LogIn
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCodeLang, setActiveCodeLang] = useState<'nodejs' | 'php' | 'python' | 'curl'>('nodejs');
  
  // Handle smooth scrolling for internal links
  useEffect(() => {
    const handleScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const href = target.closest('a')?.getAttribute('href');
      if (href?.startsWith('#') && href.length > 1 && !href.includes('ifastx.in')) {
        e.preventDefault();
        try {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (err) {
          // ignore invalid selector
        }
      }
    };

    document.addEventListener('click', handleScroll);
    return () => document.removeEventListener('click', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b141a] text-gray-200 overflow-x-hidden selection:bg-[#25D366] selection:text-[#0b141a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#0b141a]/90 backdrop-blur-xl border-b border-gray-800/50">
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
          
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            <a href="#features" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Features</a>
            <a href="#developers" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Developers</a>
            <a href="#pricing" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">Pricing</a>
            <a href="#faq" className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#25D366] transition-colors">FAQ</a>
            <a href="https://ifastx.in" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#0668E1] hover:text-blue-400 transition-colors">
              <Home size={14} /> Home
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
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
              className="bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wide shadow-lg shadow-[#25D366]/20 transition-all hover:translate-y-[-1px] active:scale-95"
            >
              Get Started
            </button>
            
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800/80 transition-colors border border-gray-800 ml-1 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={20} className="text-[#25D366]" /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#111b21] border-b border-gray-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <a 
              href="https://ifastx.in" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <Home size={16} /> Home (iFastX)
            </a>
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#25D366] hover:bg-[#202c33] transition-colors border border-transparent hover:border-gray-800"
            >
              Features & Services
            </a>
            <a 
              href="#developers" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#25D366] hover:bg-[#202c33] transition-colors border border-transparent hover:border-gray-800"
            >
              API & Developers
            </a>
            <a 
              href="#pricing" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#25D366] hover:bg-[#202c33] transition-colors border border-transparent hover:border-gray-800"
            >
              Pricing Plans
            </a>
            <a 
              href="#faq" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[#25D366] hover:bg-[#202c33] transition-colors border border-transparent hover:border-gray-800"
            >
              FAQ
            </a>
            
            <div className="pt-3 border-t border-gray-800/80 flex flex-col gap-2.5">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onDemoClick(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-[#25D366] bg-[#25D366]/5 hover:bg-[#25D366]/15 transition-colors text-xs font-bold uppercase tracking-wider"
              >
                <Terminal size={15} />
                Live Demo
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onLoginClick(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 text-white bg-[#202c33] hover:bg-[#2a3942] transition-colors text-xs font-bold uppercase tracking-wider"
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onSignupClick(); }}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg shadow-[#25D366]/20 transition-all text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
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
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-3 sm:mb-5 px-2">
            WhatsApp API Gateway <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#25D366] via-[#128C7E] to-[#0668E1]">&amp; Bulk Sender Software</span>
          </h1>
          
          <h2 className="text-[11px] sm:text-xs md:text-sm text-[#25D366] max-w-3xl mx-auto font-bold uppercase tracking-wider mb-3">
            Official Meta WhatsApp Business API Partner &bull; Multi-Session WhatsApp API Provider
          </h2>

          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed mb-6 sm:mb-8 px-4">
            iFastX is the best WhatsApp bulk sender software without ban in India &amp; globally. Send bulk WhatsApp messages from Excel, integrate WhatsApp REST API for CRM automation, and deploy 24/7 auto-reply bots.
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

      {/* Features & Services Grid (Optimized for High-Conversion Keywords) */}
      <section id="features" className="py-12 sm:py-20 relative px-4 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16 space-y-2 sm:space-y-3">
             <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
               Meta Official WhatsApp Business API Provider &amp; <br/>
               <span className="text-[#25D366]">Bulk Sender Software</span>
             </h2>
             <p className="text-gray-400 font-semibold uppercase tracking-wider text-[11px] sm:text-xs max-w-2xl mx-auto">
               The Complete Anti-Ban WhatsApp Marketing Automation Tool for Businesses in India &amp; Worldwide
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            <FeatureCard 
              icon={<ShieldAlert />} 
              title="Best WhatsApp Bulk Sender Without Ban" 
              desc="Anti-ban WhatsApp marketing software equipped with dynamic spintax formatting, staggered delay algorithms, typing indicators, and human behavior simulation to safeguard your numbers." 
            />
            <FeatureCard 
              icon={<Send />} 
              title="Send Bulk WhatsApp Messages from Excel" 
              desc="Upload XLSX / CSV contact sheets directly, map custom attributes like customer names and order IDs, and trigger targeted bulk WhatsApp campaigns with zero manual hassle." 
            />
            <FeatureCard 
              icon={<Bot />} 
              title="WhatsApp Auto-Reply Bot API" 
              desc="Deploy intelligent auto-responder rules to reply to customer inquiries 24/7. Supports keyword triggers, regex matching, interactive button menus, and rich media." 
            />
            <FeatureCard 
              icon={<Users />} 
              title="WhatsApp API for CRM Integration" 
              desc="Connect your CRM, e-commerce storefront, or custom ERP portal effortlessly. Trigger instant order receipts, shipping tracking, and 2FA authentication alerts via REST endpoints." 
            />
            <FeatureCard 
              icon={<Layers />} 
              title="Multi-Session WhatsApp API Gateway" 
              desc="Scale horizontally across multiple WhatsApp Business instances simultaneously with isolated session sandboxes, load balancing, and anti-ban account rotation." 
            />
            <FeatureCard 
              icon={<MessageSquareQuote />} 
              title="Send Template Message WhatsApp API" 
              desc="Official Meta Cloud API template synchronization. Create pre-approved interactive template layouts with call-to-action buttons, header media, and dynamic placeholders." 
            />
            <FeatureCard 
              icon={<Workflow />} 
              title="WhatsApp Marketing Automation Tool" 
              desc="Design complex messaging workflows, automated drip campaigns, follow-up sequences, and customer re-engagement pipelines with second-by-second delivery tracking." 
            />
            <FeatureCard 
              icon={<BarChart3 />} 
              title="Real-Time Analytics & Logs" 
              desc="Granular delivery reporting, message status telemetry (sent, delivered, read, failed), and instance health monitoring to maximize campaign ROI." 
            />
            <FeatureCard 
              icon={<FolderGit2 />} 
              title="Global Media Storage & Library" 
              desc="High-speed media asset hosting. Upload promotional images, PDF catalogs, and audio notes once, and dispatch them across millions of contacts seamlessly." 
            />
          </div>
        </div>
      </section>

      {/* Developer API & Integration Section (#developers) */}
      <section id="developers" className="py-12 sm:py-20 bg-[#111b21]/40 border-b border-gray-800/50 px-4">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="space-y-4 sm:space-y-6">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0668E1]/10 border border-[#0668E1]/30 text-[#60A5FA] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Terminal size={14} /> Developer Portal &amp; Documentation
               </div>
               <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  WhatsApp REST API <br/><span className="text-[#0668E1]">Documentation &amp; SDKs.</span>
               </h2>
               <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-medium">
                  Looking for a reliable <strong className="text-gray-100">WhatsApp Cloud API alternative</strong>? iFastX provides developer-first RESTful endpoints, real-time webhook callbacks, and SDK examples in <strong className="text-gray-100">Node.js, PHP, Python, and cURL</strong>.
               </p>
               <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-gray-300">
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#25D366] shrink-0" />
                     How to send WhatsApp messages using API in 3 lines of code
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#25D366] shrink-0" />
                     WhatsApp webhook integration for instant incoming message delivery
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#25D366] shrink-0" />
                     Send template message WhatsApp API with interactive CTA buttons
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#25D366] shrink-0" />
                     Instant JSON responses with high throughput &amp; 99.9% uptime SLA
                  </li>
               </ul>
               <button 
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 text-[#0668E1] hover:text-blue-400 font-bold uppercase tracking-wider text-xs hover:gap-3 transition-all mt-2"
               >
                 View Complete WhatsApp API Documentation <ArrowRight size={14} />
               </button>
            </div>

            <div className="bg-[#0b141a] rounded-2xl sm:rounded-3xl border border-gray-800 p-6 sm:p-8 shadow-3xl font-mono text-[11px] sm:text-xs overflow-hidden">
               {/* Language selector tabs */}
               <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6 overflow-x-auto gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <button
                       onClick={() => setActiveCodeLang('nodejs')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${
                         activeCodeLang === 'nodejs' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white bg-gray-800/50'
                       }`}
                     >
                       Node.js
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('php')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${
                         activeCodeLang === 'php' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white bg-gray-800/50'
                       }`}
                     >
                       PHP
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('python')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${
                         activeCodeLang === 'python' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white bg-gray-800/50'
                       }`}
                     >
                       Python
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('curl')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors ${
                         activeCodeLang === 'curl' ? 'bg-[#25D366] text-[#0b141a]' : 'text-gray-400 hover:text-white bg-gray-800/50'
                       }`}
                     >
                       cURL
                     </button>
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider hidden sm:inline">iFastX REST API</span>
               </div>

               {/* Code display based on selected language */}
               <div className="space-y-2 overflow-x-auto pb-2 text-gray-300">
                  {activeCodeLang === 'nodejs' && (
                    <>
                      <p className="text-gray-500">// WhatsApp API integration in Node.js</p>
                      <p className="text-purple-400">const <span className="text-white">axios</span> = <span className="text-blue-400">require</span>(<span className="text-green-400">'axios'</span>);</p>
                      <p className="text-[#25D366]">const <span className="text-white">res</span> = await <span className="text-white">axios.post</span>(<span className="text-green-400">'https://ifastx.in/wa/api/send'</span>, {'{'}</p>
                      <p className="pl-4 text-white">number: <span className="text-green-400">'919876543210'</span>,</p>
                      <p className="pl-4 text-white">message: <span className="text-green-400">'Hello! Order #1029 confirmed 🎉'</span>,</p>
                      <p className="pl-4 text-white">instanceId: <span className="text-green-400">'inst_prod_99'</span></p>
                      <p className="text-[#25D366]">{'}'}, {'{'}</p>
                      <p className="pl-4 text-white">headers: {'{'}</p>
                      <p className="pl-8 text-white"><span className="text-green-400">'X-API-Key'</span>: <span className="text-green-400">'YOUR_IFASTX_API_KEY'</span></p>
                      <p className="pl-4 text-white">{'}'}</p>
                      <p className="text-[#25D366]">{'}'});</p>
                    </>
                  )}

                  {activeCodeLang === 'php' && (
                    <>
                      <p className="text-gray-500">// WhatsApp API integration in PHP</p>
                      <p className="text-purple-400">&lt;?php</p>
                      <p className="text-white">$ch = curl_init(<span className="text-green-400">'https://ifastx.in/wa/api/send'</span>);</p>
                      <p className="text-white">$payload = json_encode([</p>
                      <p className="pl-4 text-green-400">'number' =&gt; '919876543210',</p>
                      <p className="pl-4 text-green-400">'message' =&gt; 'Hello! Order #1029 confirmed 🎉',</p>
                      <p className="pl-4 text-green-400">'instanceId' =&gt; 'inst_prod_99'</p>
                      <p className="text-white">]);</p>
                      <p className="text-white">curl_setopt_array($ch, [</p>
                      <p className="pl-4 text-white">CURLOPT_POST =&gt; true,</p>
                      <p className="pl-4 text-white">CURLOPT_POSTFIELDS =&gt; $payload,</p>
                      <p className="pl-4 text-white">CURLOPT_HTTPHEADER =&gt; ['Content-Type: application/json', 'X-API-Key: YOUR_IFASTX_KEY']</p>
                      <p className="text-white">]);</p>
                      <p className="text-white">$response = curl_exec($ch);</p>
                    </>
                  )}

                  {activeCodeLang === 'python' && (
                    <>
                      <p className="text-gray-500"># WhatsApp API integration in Python</p>
                      <p className="text-purple-400">import <span className="text-white">requests</span></p>
                      <p className="text-white">url = <span className="text-green-400">"https://ifastx.in/wa/api/send"</span></p>
                      <p className="text-white">headers = {'{'}<span className="text-green-400">"X-API-Key"</span>: <span className="text-green-400">"YOUR_IFASTX_KEY"</span>{'}'}</p>
                      <p className="text-white">payload = {'{'}</p>
                      <p className="pl-4 text-[#25D366]">"number": <span className="text-green-400">"919876543210"</span>,</p>
                      <p className="pl-4 text-[#25D366]">"message": <span className="text-green-400">"Order #1029 confirmed 🎉"</span>,</p>
                      <p className="pl-4 text-[#25D366]">"instanceId": <span className="text-green-400">"inst_prod_99"</span></p>
                      <p className="text-white">{'}'}</p>
                      <p className="text-blue-400">res = requests.post(url, json=payload, headers=headers)</p>
                    </>
                  )}

                  {activeCodeLang === 'curl' && (
                    <>
                      <p className="text-gray-500"># How to send WhatsApp messages using API via cURL</p>
                      <p className="text-blue-400">curl -X POST https://ifastx.in/wa/api/send \</p>
                      <p className="pl-4 text-gray-300">-H <span className="text-green-400">"Content-Type: application/json"</span> \</p>
                      <p className="pl-4 text-gray-300">-H <span className="text-green-400">"X-API-Key: YOUR_IFASTX_KEY"</span> \</p>
                      <p className="pl-4 text-gray-300">-d <span className="text-green-400">{'\'{"number":"919876543210","message":"Hello from iFastX API","instanceId":"inst_prod_99"}\''}</span></p>
                    </>
                  )}
               </div>
            </div>
         </div>
      </section>

      {/* Pricing Section (#pricing) */}
      <section id="pricing" className="py-12 sm:py-20 relative px-4 bg-[#0b141a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 space-y-2">
             <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
               WhatsApp Business API Pricing in India &amp; Global
             </h2>
             <p className="text-[#25D366] font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
               Cheap WhatsApp API for Small Businesses &amp; Scale Enterprise &bull; Zero Hidden Platform Fees
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {plans.filter(p => !p.assignedTo).map(plan => {
              const IconComp = ICON_MAP[plan.icon || 'Package'] || Package;
              const isPopular = plan.name.toLowerCase().includes('pro');
              
              return (
                <div 
                  key={plan.id} 
                  className={`bg-[#111b21] backdrop-blur-xl rounded-2xl sm:rounded-3xl border ${
                    isPopular ? 'border-[#25D366] shadow-lg shadow-[#25D366]/10' : 'border-gray-800'
                  } p-5 sm:p-6 flex flex-col justify-between relative group transition-all hover:border-gray-700 hover:shadow-xl`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#25D366] text-[#0b141a] px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                      Most Popular
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isPopular ? 'bg-[#25D366]/15 text-[#25D366]' : 'bg-gray-800/80 text-gray-300'}`}>
                        <IconComp size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">{plan.name}</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{plan.interval} billing</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 my-3 pb-3 border-b border-gray-800/80">
                      <span className="text-lg sm:text-xl font-bold text-[#25D366]">₹</span>
                      <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                      <span className="text-xs text-gray-400 font-medium ml-1">/{plan.interval || 'mo'}</span>
                    </div>
                    
                    <div className="space-y-2.5 my-4">
                      <PlanDetailFeature label={plan.dailyLimit === 0 ? 'Unlimited Bulk Messages' : `${plan.dailyLimit.toLocaleString()} Daily Messages`} />
                      <PlanDetailFeature label={`${plan.maxInstances} Multi-Session WhatsApp Instances`} />
                      <PlanDetailFeature label="WhatsApp REST API & Webhooks Access" />
                      <PlanDetailFeature label="Auto-Responder Bot & Excel Bulk Sender" />
                      <PlanDetailFeature label="24/7 Priority Support in India & Global" />
                    </div>
                  </div>

                  <button 
                    onClick={onSignupClick}
                    className={`w-full py-2.5 sm:py-3 rounded-xl font-bold uppercase tracking-wider transition-all text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer mt-3 ${
                        isPopular 
                        ? 'bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] shadow-[#25D366]/20' 
                        : 'bg-[#202c33] hover:bg-[#2a3942] text-white border border-gray-700'
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

      {/* Frequently Asked Questions Section (#faq) */}
      <section id="faq" className="py-12 sm:py-20 bg-[#111b21]/30 border-y border-gray-800/50 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 space-y-2">
             <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
               Frequently Asked Questions
             </h2>
             <p className="text-gray-400 font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
               Everything You Need to Know About iFastX WhatsApp API Gateway
             </p>
          </div>

          <div className="space-y-3.5">
            <details className="group bg-[#0b141a] border border-gray-800 rounded-xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-gray-700">
              <summary className="flex items-center justify-between text-white font-semibold text-sm sm:text-base">
                <span>What makes iFastX the best WhatsApp bulk sender without ban?</span>
                <span className="ml-4 text-[#25D366] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
                iFastX incorporates an advanced Anti-Ban Engine featuring dynamic spintax variations, customizable dispatch delays between messages, simulated human typing intervals, and multi-session account rotation. This ensures your bulk broadcasting complies with WhatsApp safety thresholds while achieving maximum delivery rates.
              </p>
            </details>

            <details className="group bg-[#0b141a] border border-gray-800 rounded-xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-gray-700">
              <summary className="flex items-center justify-between text-white font-semibold text-sm sm:text-base">
                <span>How can I send bulk WhatsApp messages from Excel sheets?</span>
                <span className="ml-4 text-[#25D366] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
                With iFastX, simply log into your dashboard, navigate to Contact Manager or Campaigns, and upload your .xlsx or .csv Excel contact list. You can map dynamic placeholder fields like <code className="text-[#25D366] bg-black/40 px-1.5 py-0.5 rounded">&#123;name&#125;</code>, <code className="text-[#25D366] bg-black/40 px-1.5 py-0.5 rounded">&#123;order_id&#125;</code>, or custom variables to send personalized messages to thousands of contacts in one click.
              </p>
            </details>

            <details className="group bg-[#0b141a] border border-gray-800 rounded-xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-gray-700">
              <summary className="flex items-center justify-between text-white font-semibold text-sm sm:text-base">
                <span>How do I integrate WhatsApp REST API in Node.js, PHP, or Python?</span>
                <span className="ml-4 text-[#25D366] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
                iFastX provides simple REST API endpoints. You send a standard POST request to <code className="text-[#25D366] bg-black/40 px-1.5 py-0.5 rounded">https://ifastx.in/wa/api/send</code> with your API key, instance ID, phone number, and message text. You can copy ready-to-run code snippets directly from our Developer Documentation section.
              </p>
            </details>

            <details className="group bg-[#0b141a] border border-gray-800 rounded-xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-gray-700">
              <summary className="flex items-center justify-between text-white font-semibold text-sm sm:text-base">
                <span>Is iFastX an official Meta WhatsApp Business API partner in India?</span>
                <span className="ml-4 text-[#25D366] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
                Yes! iFastX is a verified Meta Business Partner supporting both official Meta Cloud API templates and multi-session WhatsApp Web instance connections. We provide compliant enterprise infrastructure for businesses in India and across the globe.
              </p>
            </details>

            <details className="group bg-[#0b141a] border border-gray-800 rounded-xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-gray-700">
              <summary className="flex items-center justify-between text-white font-semibold text-sm sm:text-base">
                <span>What is the WhatsApp Business API pricing in India?</span>
                <span className="ml-4 text-[#25D366] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
                iFastX offers transparent flat-rate subscription plans starting from affordable monthly fees with zero per-message surcharges for connected instances. Check out our Pricing section above for detailed plan options tailored for small businesses and large enterprises.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Crawlable SEO Keyword Hub Section */}
      <section className="py-12 bg-[#0b141a] border-b border-gray-800/50 px-4 text-gray-400 text-xs leading-relaxed">
        <div className="max-w-7xl mx-auto space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            WhatsApp API Provider in India &amp; Global Marketing Automation Gateway
          </h2>
          <p>
            iFastX is India's leading <strong>WhatsApp API Gateway</strong> and <strong>WhatsApp Bulk Sender Software</strong> designed for businesses seeking an anti-ban WhatsApp marketing software solution. As an official <strong>Meta Official WhatsApp Partner</strong>, iFastX empowers brands to send bulk WhatsApp messages from Excel sheets, automate customer support via <strong>WhatsApp auto-reply bot API</strong>, and seamlessly integrate messaging into CRMs, web apps, and ERPs.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp API Gateway</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp Bulk Sender Software</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">Best WhatsApp bulk sender without ban</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp marketing automation tool</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">Send bulk WhatsApp messages from Excel</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp REST API documentation</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp API provider in India</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">Cheap WhatsApp API for small business</span>
            <span className="bg-[#111b21] px-2.5 py-1 rounded border border-gray-800 text-[10px] text-gray-400">WhatsApp Cloud API alternative</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-16 sm:pt-24 pb-12 sm:pb-16 bg-[#0b141a] border-t border-gray-800 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-14 mb-12 sm:mb-20">
          <div className="space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" className="origin-left scale-90 sm:scale-100" />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-medium pr-2 mt-2">
              Authorized infrastructure for modern WhatsApp engagement. Secure, resilient, and enterprise-ready.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#60A5FA] text-xs font-bold uppercase tracking-wider">
                <Infinity size={14} /> Official Meta Business Partner
              </div>
              <div className="flex items-center gap-4">
                <SocialLink icon={<Instagram size={18} />} href="https://www.instagram.com/ifastx.in" />
                <SocialLink icon={<Facebook size={18} />} href="https://www.facebook.com/ifastx.in" />
                <SocialLink icon={<Linkedin size={18} />} href="https://www.linkedin.com/company/ifastdotit" />
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#25D366]">Platform</h4>
             <ul className="space-y-3 text-sm text-gray-200 font-semibold">
                <li><a href="#" onClick={onLoginClick} className="hover:text-[#25D366] transition-colors">Developer Portal</a></li>
                <li><a href="#" onClick={onLoginClick} className="hover:text-[#25D366] transition-colors">API References</a></li>
                <li><a href="#features" className="hover:text-[#25D366] transition-colors">Bulk Campaigner</a></li>
                <li><a href="https://ifastx.in/#contact" className="hover:text-[#25D366] transition-colors">Enquiry &amp; Contact</a></li>
             </ul>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#25D366]">Company</h4>
             <ul className="space-y-3 text-sm text-gray-200 font-semibold">
                <li><a href="https://ifastx.in/#about" className="hover:text-[#25D366] transition-colors">About Us</a></li>
                <li><a href="https://ifastx.in/#privacy-policy" className="hover:text-[#25D366] transition-colors">Privacy Shield</a></li>
                <li><a href="https://ifastx.in/#terms-conditions" className="hover:text-[#25D366] transition-colors">Merchant Terms</a></li>
                <li><a href="https://ifastx.in/#refunds" className="hover:text-[#25D366] transition-colors">Refunds Policy</a></li>
             </ul>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#25D366]">Support &amp; Visit</h4>
             <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-sm text-gray-200 font-semibold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[#25D366] shrink-0">
                      <MessageSquare size={16} />
                   </div>
                   <span className="text-xs sm:text-sm">+91 9028114392</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-200 font-semibold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[#25D366] shrink-0">
                      <Mail size={16} />
                   </div>
                   <span className="text-xs sm:text-sm truncate">support@ifastx.in</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-200 font-semibold">
                   <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[#25D366] shrink-0 mt-0.5">
                      <MapPin size={16} />
                   </div>
                   <span className="text-xs leading-relaxed text-gray-300">
                     3rd Floor, V S Reddy Colony, Bengaluru - 560067
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-gray-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
             <p className="text-xs font-medium text-gray-400 text-center">
               &copy; 2024 iFastX Technologies Pvt Ltd. All rights reserved.
             </p>
             <div className="flex items-center gap-6 text-xs font-semibold text-gray-300">
                <a href="https://ifastx.in/#privacy-policy" className="hover:text-[#25D366] transition-colors">Privacy</a>
                <a href="https://ifastx.in/#terms-conditions" className="hover:text-[#25D366] transition-colors">Compliance</a>
             </div>
           </div>
           <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Infinity size={14} /> Meta Business Partner
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-wider">
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
      <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white group-hover:text-[#25D366] transition-colors">{value}</p>
      <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-tighter">{suffix}</span>
    </div>
    <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5">{label}</p>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-[#111b21]/50 backdrop-blur-sm p-5 sm:p-6 rounded-xl border border-gray-800 transition-all hover:border-[#25D366]/40 hover:bg-[#111b21] group">
    <div className="w-10 h-10 bg-[#25D366]/10 rounded-lg flex items-center justify-center text-[#25D366] mb-4 group-hover:scale-105 group-hover:bg-[#25D366]/20 transition-all duration-300">
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
    <h3 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight group-hover:text-[#25D366] transition-colors">{title}</h3>
    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-normal">{desc}</p>
  </div>
);

const PlanDetailFeature = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-gray-200">
     <div className="w-4 h-4 sm:w-5 h-5 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
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