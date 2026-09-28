import React, { useEffect, useState } from 'react';
import { 
  Zap, MessageSquare, Send, Layout, ShieldCheck, 
  Users, Layers, ArrowRight, IndianRupee, Package, 
  Rocket, Crown, Star, Shield, Globe, Cpu, CheckCircle2,
  Home, Github, Twitter, Facebook, Mail, Smartphone,
  BarChart3, ShieldAlert, Workflow, Instagram, Linkedin, MapPin, Phone,
  Infinity, Bot, MessageSquareQuote, FolderGit2, Terminal, Menu, X, LogIn,
  Info, Sparkles, Check
} from 'lucide-react';
import { Plan } from '../types';

import BrandLogo from './BrandLogo';
import { FooterTrustBadgesSection, MetaBusinessPartnerBadge, ISO27001Badge, GDPRCompliantBadge } from './FooterTrustBadges';
import { WatiFeaturesShowcase } from './WatiFeaturesShowcase';
import { BrandScrollMarquee } from './BrandScrollMarquee';

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
  const [planCategoryTab, setPlanCategoryTab] = useState<'all' | 'meta' | 'baileys'>('all');
  
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 overflow-x-hidden selection:bg-[#0668E1] selection:text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => window.location.href = 'https://ifastx.in'}>
              <BrandLogo size="md" textColor="#000000" subFontSize="8px" className="group-hover:scale-105 transition-transform duration-300 origin-left scale-75 sm:scale-100" />
            </div>
            
            <div className="hidden xs:flex items-center gap-2 bg-blue-50 border border-blue-200/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <Infinity size={13} className="text-[#0668E1]" />
              <span className="text-[8px] sm:text-[10px] font-black text-[#0668E1] uppercase tracking-widest">Official Meta Partner</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            <a href="#features" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors">Features</a>
            <a href="#developers" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors">Developers</a>
            <a href="#pricing" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors">Pricing</a>
            <a href="#faq" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors">FAQ</a>
            <a href="https://ifastx.in" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#0668E1] hover:text-blue-700 transition-colors">
              <Home size={14} /> Home
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onDemoClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-[#0668E1] hover:border-blue-300 transition-colors text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <Terminal size={12} />
              Live Demo
            </button>
            <button 
              onClick={onLoginClick}
              className="hidden sm:block text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 hover:text-[#0668E1] transition-colors ml-2 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={onSignupClick}
              className="bg-[#0668E1] hover:bg-blue-700 text-white px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wide shadow-lg shadow-blue-500/20 transition-all hover:translate-y-[-1px] active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
            
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 ml-1 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={20} className="text-[#0668E1]" /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-sky-100 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <a 
              href="https://ifastx.in" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#0668E1] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Home size={16} /> Home (iFastX)
            </a>
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0668E1] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              Features & Services
            </a>
            <a 
              href="#developers" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0668E1] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              API & Developers
            </a>
            <a 
              href="#pricing" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0668E1] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              Pricing Plans
            </a>
            <a 
              href="#faq" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0668E1] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              FAQ
            </a>
            
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onDemoClick(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold uppercase tracking-wider"
              >
                <Terminal size={15} />
                Live Demo
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onLoginClick(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 transition-colors text-xs font-bold uppercase tracking-wider"
              >
                <LogIn size={15} />
                Sign In
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onSignupClick(); }}
                className="w-full bg-[#0668E1] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg shadow-blue-500/20 transition-all text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-[#eaf4fe] via-[#f3f8fd] to-white border-b border-sky-100">
        <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-[5%] -left-[10%] w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-blue-300/30 rounded-full blur-[100px] sm:blur-[180px] pointer-events-none" />
             <div className="absolute bottom-[10%] -right-[10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-emerald-200/40 rounded-full blur-[80px] sm:blur-[140px] pointer-events-none" />
             <div className="absolute top-0 left-0 w-full h-full opacity-40 bg-[radial-gradient(#c7e0f8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/90 border border-blue-200 shadow-sm rounded-full backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-blue-300">
              <Infinity size={16} className="text-[#0668E1]" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#0668E1]">
                Official Meta Business Partner
              </span>
            </div>
            
            <div className="hidden xs:inline-flex items-center gap-2.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 rounded-full shadow-xs">
              <CheckCircle2 size={14} className="text-[#008069]" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#008069]">Direct API Access</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4 sm:mb-6 px-2">
            WhatsApp Business API Gateway <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0668E1] via-blue-600 to-[#008069]">&amp; Bulk Sender Software</span>
          </h1>
          
          <h2 className="text-[11px] sm:text-xs md:text-sm text-[#0668E1] max-w-3xl mx-auto font-bold uppercase tracking-wider mb-3">
            Official Meta WhatsApp Business API Partner &bull; Multi-Session WhatsApp API Provider
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed mb-6 sm:mb-8 px-4">
            iFastX is the best WhatsApp bulk sender software without ban in India &amp; globally. Send bulk WhatsApp messages from Excel, integrate WhatsApp REST API for CRM automation, and deploy 24/7 auto-reply bots.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 px-4">
            <button 
              onClick={onSignupClick}
              className="group w-full sm:w-auto bg-[#0668E1] hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Building <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                const pricing = document.getElementById('pricing');
                pricing?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto bg-white border border-slate-300 text-slate-800 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              View Plans
            </button>
          </div>

          {/* Hero Trust Micro-Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-700 font-semibold mb-6 px-4">
            <span className="flex items-center gap-1.5 text-slate-800">
              <span className="px-1.5 py-0.5 rounded bg-[#FA4616] text-white text-[9px] font-black">g2</span>
              4.8 / 5 Rating on G2
            </span>
            <span className="hidden sm:inline text-slate-300">&bull;</span>
            <span className="flex items-center gap-1.5 text-[#008069]">
              <CheckCircle2 size={14} className="text-[#008069]" /> Official Meta Tech Partner
            </span>
            <span className="hidden sm:inline text-slate-300">&bull;</span>
            <span className="flex items-center gap-1.5 text-[#0668E1]">
              <ShieldCheck size={14} className="text-[#0668E1]" /> ISO 27001 &amp; GDPR Compliant
            </span>
          </div>
          
          <div className="flex justify-center mb-16 sm:mb-20">
             <button onClick={onDemoClick} className="text-slate-600 hover:text-[#0668E1] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border border-slate-300 hover:border-blue-300 bg-white hover:bg-blue-50 px-4 py-2 rounded-xl shadow-xs cursor-pointer">
               <span>Play with Live Demo Dashboard</span>
               <ArrowRight size={14} />
             </button>
          </div>

          <BrandScrollMarquee />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white border-b border-sky-100 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
             <StatItem label="Daily Volume" value="5M+" suffix="Msgs" />
             <StatItem label="Global Nodes" value="12" suffix="Regions" />
             <StatItem label="Average Latency" value="65" suffix="ms" />
             <StatItem label="API Uptime" value="99.9" suffix="%" />
          </div>
      </section>

      {/* Modern Wati-Style Interactive Feature Deep-Dive Suite (Matches user reference screenshots) */}
      <div id="features">
        <WatiFeaturesShowcase onGetStarted={onSignupClick} />
      </div>

      {/* Enterprise Platform Architecture & Scalability Grid */}
      <section className="py-16 sm:py-24 relative px-4 bg-[#f0f7ff] border-b border-sky-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-2 sm:space-y-3">
             <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-[#0668E1] text-xs font-bold uppercase tracking-wider shadow-xs">
               <Zap size={14} /> High-Throughput Infrastructure
             </div>
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
               Built for Enterprise Scale &amp; Reliability
             </h2>
             <p className="text-slate-600 font-medium text-xs sm:text-sm max-w-2xl mx-auto">
               Engineered with dual-engine flexibility: Official Meta Cloud API for 100% zero-ban security, and Multi-Session Baileys Web API for versatile outreach.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <FeatureCard 
              icon={<ShieldAlert />} 
              title="Anti-Ban Delivery Engine" 
              desc="Intelligent spintax text variation, staggered dynamic delay algorithms, human typing simulation, and warm-up cycles to protect sender reputation." 
            />
            <FeatureCard 
              icon={<Send />} 
              title="Excel & CSV Mass Campaigner" 
              desc="Upload XLSX sheets directly, map custom attributes like customer names and order IDs, and trigger targeted bulk WhatsApp campaigns with zero manual hassle." 
            />
            <FeatureCard 
              icon={<Bot />} 
              title="Automated Keyword Responders" 
              desc="Deploy intelligent auto-responder rules to reply to customer inquiries 24/7. Supports regex matching, button menus, and rich media assets." 
            />
            <FeatureCard 
              icon={<Users />} 
              title="CRM & ERP Webhooks" 
              desc="Connect Shopify, WooCommerce, Zoho, HubSpot, or custom portals. Trigger instant order alerts, delivery updates, and 2FA OTPs via REST endpoints." 
            />
            <FeatureCard 
              icon={<Layers />} 
              title="Multi-Session Instance Gateway" 
              desc="Run multiple WhatsApp numbers simultaneously in isolated sandboxes with automated load balancing and intelligent failover routing." 
            />
            <FeatureCard 
              icon={<BarChart3 />} 
              title="Real-Time Analytics & Telemetry" 
              desc="Live delivery status callbacks (sent, delivered, read, failed), conversion tracking, latency metrics, and instance health monitoring." 
            />
          </div>
        </div>
      </section>

      {/* Developer API & Integration Section (#developers) */}
      <section id="developers" className="py-16 sm:py-24 bg-white border-b border-sky-100 px-4">
         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="space-y-4 sm:space-y-6">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0668E1] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Terminal size={14} /> Developer Portal &amp; Documentation
               </div>
               <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  WhatsApp REST API <br/><span className="text-[#0668E1]">Documentation &amp; SDKs.</span>
               </h2>
               <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
                  Looking for a reliable <strong className="text-slate-800">WhatsApp Cloud API alternative</strong>? iFastX provides developer-first RESTful endpoints, real-time webhook callbacks, and SDK examples in <strong className="text-slate-800">Node.js, PHP, Python, and cURL</strong>.
               </p>
               <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#008069] shrink-0" />
                     How to send WhatsApp messages using API in 3 lines of code
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#008069] shrink-0" />
                     WhatsApp webhook integration for instant incoming message delivery
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#008069] shrink-0" />
                     Send template message WhatsApp API with interactive CTA buttons
                  </li>
                  <li className="flex items-center gap-2.5">
                     <CheckCircle2 size={16} className="text-[#008069] shrink-0" />
                     Instant JSON responses with high throughput &amp; 99.9% uptime SLA
                  </li>
               </ul>
               <button 
                onClick={onLoginClick}
                className="inline-flex items-center gap-2 text-[#0668E1] hover:text-blue-700 font-bold uppercase tracking-wider text-xs hover:gap-3 transition-all mt-2 cursor-pointer"
               >
                 View Complete WhatsApp API Documentation <ArrowRight size={14} />
               </button>
            </div>

            <div className="bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl font-mono text-[11px] sm:text-xs overflow-hidden">
               {/* Language selector tabs */}
               <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6 overflow-x-auto gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <button
                       onClick={() => setActiveCodeLang('nodejs')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                         activeCodeLang === 'nodejs' ? 'bg-[#0668E1] text-white shadow-xs' : 'text-slate-400 hover:text-white bg-slate-800/80'
                       }`}
                     >
                       Node.js
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('php')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                         activeCodeLang === 'php' ? 'bg-[#0668E1] text-white shadow-xs' : 'text-slate-400 hover:text-white bg-slate-800/80'
                       }`}
                     >
                       PHP
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('python')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                         activeCodeLang === 'python' ? 'bg-[#0668E1] text-white shadow-xs' : 'text-slate-400 hover:text-white bg-slate-800/80'
                       }`}
                     >
                       Python
                     </button>
                     <button
                       onClick={() => setActiveCodeLang('curl')}
                       className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                         activeCodeLang === 'curl' ? 'bg-[#0668E1] text-white shadow-xs' : 'text-slate-400 hover:text-white bg-slate-800/80'
                       }`}
                     >
                       cURL
                     </button>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">iFastX REST API</span>
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
      <section id="pricing" className="py-16 sm:py-24 relative px-4 bg-[#f0f7ff] border-b border-sky-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 space-y-2.5">
             <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-[#0668E1] border border-blue-200 mb-1 shadow-xs">
                <Sparkles size={13} />
                <span>Transparent Business Pricing • No Per-Message Markups</span>
             </div>
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
               WhatsApp API Pricing in India &amp; Global
             </h2>
             <p className="text-slate-600 font-medium text-xs sm:text-sm max-w-2xl mx-auto">
               Choose between <span className="text-[#0668E1] font-bold">Official Meta Cloud API</span> (100% zero ban risk, pre-approved templates) or <span className="text-[#008069] font-bold">Baileys Web API</span> (instant QR code linking, anti-ban engine, bulk broadcasting).
             </p>

             {/* Category Selector Tabs */}
             <div className="flex items-center justify-center pt-4">
                <div className="inline-flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-md gap-1 flex-wrap justify-center">
                   <button
                     onClick={() => setPlanCategoryTab('all')}
                     className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                       planCategoryTab === 'all'
                         ? 'bg-slate-900 text-white shadow-xs'
                         : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                     }`}
                   >
                     <span>All Plans</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full ${planCategoryTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                       {plans.filter(p => !p.assignedTo).length}
                     </span>
                   </button>

                   <button
                     onClick={() => setPlanCategoryTab('meta')}
                     className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                       planCategoryTab === 'meta'
                         ? 'bg-[#0668E1] text-white shadow-md shadow-blue-500/20'
                         : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                     }`}
                   >
                     <Globe size={14} className={planCategoryTab === 'meta' ? 'text-white' : 'text-[#0668E1]'} />
                     <span>Official Meta Cloud API</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full ${planCategoryTab === 'meta' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-[#0668E1]'}`}>
                       {plans.filter(p => !p.assignedTo && (p.allowedProviders === 'meta' || p.allowedProviders === 'both')).length}
                     </span>
                   </button>

                   <button
                     onClick={() => setPlanCategoryTab('baileys')}
                     className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                       planCategoryTab === 'baileys'
                         ? 'bg-[#008069] text-white shadow-md shadow-emerald-500/20'
                         : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                     }`}
                   >
                     <Smartphone size={14} className={planCategoryTab === 'baileys' ? 'text-white' : 'text-[#008069]'} />
                     <span>Baileys Web API (QR)</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full ${planCategoryTab === 'baileys' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-[#008069]'}`}>
                       {plans.filter(p => !p.assignedTo && ((p.allowedProviders || 'baileys') === 'baileys' || p.allowedProviders === 'both')).length}
                     </span>
                   </button>
                </div>
             </div>

             {/* Dynamic Explanatory Banner based on selection */}
             <div className="max-w-3xl mx-auto pt-3">
               {planCategoryTab === 'meta' ? (
                 <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-slate-700 shadow-xs">
                    <Info size={18} className="text-[#0668E1] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0668E1]">Meta Cloud API Architecture: </span>
                      Runs directly on Meta's official WhatsApp Cloud infrastructure. Guarantees 0% ban risk, pre-approved rich media templates (interactive buttons, CTAs, OTPs), and high throughput. Platform subscription covers your cloud instance; conversation template charges deduct directly from your Wallet at official Meta rates.
                    </div>
                 </div>
               ) : planCategoryTab === 'baileys' ? (
                 <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-slate-700 shadow-xs">
                    <Info size={18} className="text-[#008069] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#008069]">Baileys Web QR Architecture: </span>
                      Link your existing WhatsApp personal or business number in seconds via QR scan. No waiting for Meta Business Manager verification or template approvals. Includes our proprietary Anti-Ban Spintax Delay Engine and 1-click Excel bulk broadcaster with flat subscription pricing.
                    </div>
                 </div>
               ) : (
                 <div className="bg-white border border-slate-200 rounded-2xl p-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 shadow-xs">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-[#0668E1] shrink-0"></span>
                       <span><strong className="text-slate-900">Meta Cloud API:</strong> Official partner, 0% ban risk, rich templates</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-[#008069] shrink-0"></span>
                       <span><strong className="text-slate-900">Baileys Web API:</strong> Instant QR login, bulk broadcasts, flat subscription</span>
                    </div>
                 </div>
               )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {plans
              .filter(p => !p.assignedTo)
              .filter(p => {
                const prov = p.allowedProviders || 'baileys';
                if (planCategoryTab === 'meta') return prov === 'meta' || prov === 'both';
                if (planCategoryTab === 'baileys') return prov === 'baileys' || prov === 'both';
                return true;
              })
              .map(plan => {
                const IconComp = ICON_MAP[plan.icon || 'Package'] || Package;
                const isPopular = plan.name.toLowerCase().includes('pro');
                const prov = plan.allowedProviders || 'baileys';
                const isMeta = prov === 'meta';
                const isBoth = prov === 'both';

                // Robust feature derivation: use plan.features if present, else comprehensive fallback
                const displayFeatures: string[] = (plan.features && plan.features.length > 0)
                  ? plan.features
                  : isMeta
                    ? [
                        'Official Meta Cloud API (100% Zero Ban Risk)',
                        'Meta Verified Business Account (WABA)',
                        'Pre-Approved Rich Media Templates (Buttons & Media)',
                        `${plan.maxInstances} Registered WhatsApp Phone Numbers`,
                        'Instant Cloud Webhooks & Real-time Delivery Receipts',
                        'Direct Wallet Billing at Official Meta Conversation Rates',
                        'Interactive Quick Replies & Call-to-Action Buttons',
                        '24/7 Priority Support in India & Global'
                      ]
                    : isBoth
                      ? [
                          'Dual Engine: Official Meta Cloud + Baileys Web QR',
                          'Unlimited WhatsApp Multi-Session Messaging',
                          `${plan.maxInstances} Total Connected Instances / Numbers`,
                          'Anti-Ban Rotation & Smart Fallback Routing',
                          'Excel (.xlsx / .csv) 1-Click Bulk Broadcast',
                          'High-Throughput Webhooks & Unified REST API',
                          'VIP Dedicated Support & Account Manager'
                        ]
                      : [
                          plan.dailyLimit === 0 ? 'Unlimited Daily Messages' : `${plan.dailyLimit.toLocaleString()} Daily Messages Quota`,
                          `${plan.maxInstances} Multi-Session WhatsApp Web QR Instances`,
                          'Smart Anti-Ban Engine with Spintax Delay',
                          'Excel (.xlsx / .csv) 1-Click Bulk Dispatcher',
                          'Auto-Responder Keyword Bot & Rule Builder',
                          'WhatsApp REST API & Real-time Webhooks',
                          '24/7 Priority Support in India & Global'
                        ];

                const cardBorderClass = isPopular
                  ? 'border-[#0668E1] shadow-xl shadow-blue-500/10 ring-2 ring-[#0668E1]/20'
                  : isMeta
                    ? 'border-blue-200 hover:border-[#0668E1] shadow-md hover:shadow-xl'
                    : isBoth
                      ? 'border-purple-200 hover:border-purple-400 shadow-md hover:shadow-xl'
                      : 'border-slate-200 hover:border-slate-300 shadow-md hover:shadow-xl';

                return (
                  <div 
                    key={plan.id} 
                    className={`bg-white rounded-2xl sm:rounded-3xl border ${cardBorderClass} p-5 sm:p-6 flex flex-col justify-between relative group transition-all`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0668E1] text-white px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                        Most Popular
                      </div>
                    )}
                    
                    <div>
                      {/* Category Engine Badge */}
                      <div className="mb-3">
                        {isMeta ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0668E1] border border-blue-200">
                            <Globe size={12} className="text-[#0668E1]" />
                            Official Meta Cloud API
                          </span>
                        ) : isBoth ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            <Layers size={12} className="text-purple-600" />
                            Hybrid (Meta + Baileys)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-[#008069] border border-emerald-200">
                            <Smartphone size={12} className="text-[#008069]" />
                            Baileys Web API (QR Link)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          isMeta 
                            ? 'bg-blue-50 text-[#0668E1]' 
                            : isBoth 
                              ? 'bg-purple-50 text-purple-600'
                              : isPopular 
                                ? 'bg-blue-50 text-[#0668E1]' 
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{plan.name}</h3>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{plan.interval} billing</p>
                        </div>
                      </div>

                      {plan.description && (
                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                          {plan.description}
                        </p>
                      )}

                      <div className="my-3 pb-3 border-b border-slate-200">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-lg sm:text-xl font-bold ${isMeta ? 'text-[#0668E1]' : isBoth ? 'text-purple-600' : 'text-[#008069]'}`}>₹</span>
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{plan.price}</span>
                          <span className="text-xs text-slate-500 font-medium ml-1">/{plan.interval || 'mo'} platform</span>
                        </div>

                        {plan.metaSetupFee && plan.metaSetupFee > 0 ? (
                          <div className="text-[11px] font-bold text-[#0668E1] mt-1 flex items-center gap-1">
                            <span>+ ₹{plan.metaSetupFee.toLocaleString()} One-Time Meta Cloud Setup Fee</span>
                          </div>
                        ) : null}

                        {isMeta ? (
                          <p className="text-[10px] text-slate-500 mt-1">
                            • Messages billed from Wallet at standard Meta conversation rates
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-500 mt-1">
                            • Flat platform rate • Zero per-message platform surcharge
                          </p>
                        )}
                      </div>
                      
                      {/* Dynamically Rendered Features List */}
                      <div className="space-y-2 my-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Features Included:</p>
                        {displayFeatures.map((feat, fIndex) => (
                          <PlanDetailFeature 
                            key={fIndex} 
                            label={feat} 
                            variant={isMeta ? 'blue' : isBoth ? 'purple' : 'emerald'} 
                          />
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={onSignupClick}
                      className={`w-full py-2.5 sm:py-3 rounded-xl font-bold uppercase tracking-wider transition-all text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer mt-4 ${
                          isMeta
                          ? 'bg-[#0668E1] hover:bg-blue-700 text-white shadow-blue-500/20'
                          : isBoth
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                            : isPopular 
                              ? 'bg-[#0668E1] hover:bg-blue-700 text-white shadow-blue-500/20' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isMeta ? 'Get Started with Meta Cloud' : isBoth ? 'Get Started with Hybrid' : 'Get Started with Baileys'}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section (#faq) */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-b border-sky-100 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 space-y-2">
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
               Frequently Asked Questions
             </h2>
             <p className="text-slate-500 font-semibold uppercase tracking-wider text-xs">
               Everything You Need to Know About iFastX WhatsApp API Gateway
             </p>
          </div>

          <div className="space-y-3.5">
            <details className="group bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-xs">
              <summary className="flex items-center justify-between text-slate-900 font-bold text-sm sm:text-base">
                <span>What makes iFastX the best WhatsApp bulk sender without ban?</span>
                <span className="ml-4 text-[#0668E1] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                iFastX incorporates an advanced Anti-Ban Engine featuring dynamic spintax variations, customizable dispatch delays between messages, simulated human typing intervals, and multi-session account rotation. This ensures your bulk broadcasting complies with WhatsApp safety thresholds while achieving maximum delivery rates.
              </p>
            </details>

            <details className="group bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-xs">
              <summary className="flex items-center justify-between text-slate-900 font-bold text-sm sm:text-base">
                <span>How can I send bulk WhatsApp messages from Excel sheets?</span>
                <span className="ml-4 text-[#0668E1] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                With iFastX, simply log into your dashboard, navigate to Contact Manager or Campaigns, and upload your .xlsx or .csv Excel contact list. You can map dynamic placeholder fields like <code className="text-[#0668E1] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">&#123;name&#125;</code>, <code className="text-[#0668E1] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">&#123;order_id&#125;</code>, or custom variables to send personalized messages to thousands of contacts in one click.
              </p>
            </details>

            <details className="group bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-xs">
              <summary className="flex items-center justify-between text-slate-900 font-bold text-sm sm:text-base">
                <span>How do I integrate WhatsApp REST API in Node.js, PHP, or Python?</span>
                <span className="ml-4 text-[#0668E1] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                iFastX provides simple REST API endpoints. You send a standard POST request to <code className="text-[#0668E1] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">https://ifastx.in/wa/api/send</code> with your API key, instance ID, phone number, and message text. You can copy ready-to-run code snippets directly from our Developer Documentation section.
              </p>
            </details>

            <details className="group bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-xs">
              <summary className="flex items-center justify-between text-slate-900 font-bold text-sm sm:text-base">
                <span>Is iFastX an official Meta WhatsApp Business API partner in India?</span>
                <span className="ml-4 text-[#0668E1] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                Yes! iFastX is a verified Meta Business Partner supporting both official Meta Cloud API templates and multi-session WhatsApp Web instance connections. We provide compliant enterprise infrastructure for businesses in India and across the globe.
              </p>
            </details>

            <details className="group bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-xs">
              <summary className="flex items-center justify-between text-slate-900 font-bold text-sm sm:text-base">
                <span>What is the WhatsApp Business API pricing in India?</span>
                <span className="ml-4 text-[#0668E1] group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-slate-600 text-xs sm:text-sm leading-relaxed">
                iFastX offers transparent flat-rate subscription plans starting from affordable monthly fees with zero per-message surcharges for connected instances. Check out our Pricing section above for detailed plan options tailored for small businesses and large enterprises.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Crawlable SEO Keyword Hub Section */}
      <section className="py-12 bg-[#f0f7ff] border-b border-sky-100 px-4 text-slate-600 text-xs leading-relaxed">
        <div className="max-w-7xl mx-auto space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            WhatsApp API Provider in India &amp; Global Marketing Automation Gateway
          </h2>
          <p>
            iFastX is India's leading <strong>WhatsApp API Gateway</strong> and <strong>WhatsApp Bulk Sender Software</strong> designed for businesses seeking an anti-ban WhatsApp marketing software solution. As an official <strong>Meta Official WhatsApp Partner</strong>, iFastX empowers brands to send bulk WhatsApp messages from Excel sheets, automate customer support via <strong>WhatsApp auto-reply bot API</strong>, and seamlessly integrate messaging into CRMs, web apps, and ERPs.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp API Gateway</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp Bulk Sender Software</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">Best WhatsApp bulk sender without ban</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp marketing automation tool</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">Send bulk WhatsApp messages from Excel</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp REST API documentation</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp API provider in India</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">Cheap WhatsApp API for small business</span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-200/70 text-[10px] text-slate-700 font-medium shadow-2xs">WhatsApp Cloud API alternative</span>
          </div>
        </div>
      </section>

      {/* Trust & Accreditations Section (Wati.io style badges: Meta, ISO 27001, GDPR, and 8 G2 Badges) */}
      <FooterTrustBadgesSection />

      {/* Footer */}
      <footer className="pt-16 sm:pt-20 pb-12 sm:pb-16 bg-white border-t border-sky-100 text-slate-600 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-14 mb-12 sm:mb-16">
          <div className="space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" textColor="#000000" className="origin-left scale-90 sm:scale-100" />
            </div>
            <p className="text-slate-600 text-sm leading-relaxed font-normal pr-2 mt-2">
              Authorized infrastructure for modern WhatsApp engagement. Secure, resilient, and enterprise-ready.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#0668E1] text-xs font-bold uppercase tracking-wider">
                <Infinity size={14} /> Official Meta Business Partner
              </div>
              <div className="flex items-center gap-3">
                <SocialLink icon={<Instagram size={18} />} href="https://www.instagram.com/ifastx.in" />
                <SocialLink icon={<Facebook size={18} />} href="https://www.facebook.com/ifastx.in" />
                <SocialLink icon={<Linkedin size={18} />} href="https://www.linkedin.com/company/ifastdotit" />
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#0668E1]">Platform</h4>
             <ul className="space-y-3 text-sm text-slate-700 font-medium">
                <li><a href="#" onClick={onLoginClick} className="hover:text-[#0668E1] transition-colors">Developer Portal</a></li>
                <li><a href="#" onClick={onLoginClick} className="hover:text-[#0668E1] transition-colors">API References</a></li>
                <li><a href="#features" className="hover:text-[#0668E1] transition-colors">Bulk Campaigner</a></li>
                <li><a href="https://ifastx.in/#contact" className="hover:text-[#0668E1] transition-colors">Enquiry &amp; Contact</a></li>
             </ul>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#0668E1]">Company</h4>
             <ul className="space-y-3 text-sm text-slate-700 font-medium">
                <li><a href="https://ifastx.in/#about" className="hover:text-[#0668E1] transition-colors">About Us</a></li>
                <li><a href="https://ifastx.in/#privacy-policy" className="hover:text-[#0668E1] transition-colors">Privacy Shield</a></li>
                <li><a href="https://ifastx.in/#terms-conditions" className="hover:text-[#0668E1] transition-colors">Merchant Terms</a></li>
                <li><a href="https://ifastx.in/#refunds" className="hover:text-[#0668E1] transition-colors">Refunds Policy</a></li>
             </ul>
          </div>

          <div className="space-y-4 sm:space-y-6">
             <h4 className="text-xs font-black uppercase tracking-widest text-[#0668E1]">Support &amp; Visit</h4>
             <div className="space-y-3.5">
                <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                   <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0668E1] shrink-0">
                      <MessageSquare size={16} />
                   </div>
                   <span className="text-xs sm:text-sm">+91 9028114392</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                   <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0668E1] shrink-0">
                      <Mail size={16} />
                   </div>
                   <span className="text-xs sm:text-sm truncate">support@ifastx.in</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                   <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0668E1] shrink-0 mt-0.5">
                      <MapPin size={16} />
                   </div>
                   <span className="text-xs leading-relaxed text-slate-600">
                     3rd Floor, V S Reddy Colony, Bengaluru - 560067
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
             <p className="text-xs font-medium text-slate-500 text-center">
               &copy; {new Date().getFullYear()} iFastX Technologies Pvt Ltd. All rights reserved.
             </p>
             <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
                <a href="https://ifastx.in/#privacy-policy" className="hover:text-[#0668E1] transition-colors">Privacy</a>
                <a href="https://ifastx.in/#terms-conditions" className="hover:text-[#0668E1] transition-colors">Compliance</a>
                <a href="https://ifastx.in/#refunds" className="hover:text-[#0668E1] transition-colors">Security</a>
             </div>
           </div>
           <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <div className="flex items-center gap-1.5 text-[#0668E1] text-xs font-bold uppercase tracking-wider">
                <Infinity size={14} /> Meta Business Partner
              </div>
              <div className="flex items-center gap-1.5 text-cyan-700 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={14} className="text-cyan-600" /> ISO 27001 Certified
              </div>
              <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold uppercase tracking-wider">
                <span className="text-[12px] font-black text-amber-500">★</span> GDPR Compliant
              </div>
              <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold uppercase tracking-wider">
                <span className="px-1.5 py-0.5 rounded bg-[#FA4616] text-white text-[9px] font-black">g2</span> 4.8 / 5 Rating
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
      <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 group-hover:text-[#0668E1] transition-colors">{value}</p>
      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tighter">{suffix}</span>
    </div>
    <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1.5">{label}</p>
  </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-sky-100 shadow-md shadow-blue-500/5 transition-all hover:border-[#0668E1]/40 hover:shadow-xl hover:-translate-y-1 group">
    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0668E1] mb-4 group-hover:scale-105 group-hover:bg-blue-100 transition-all duration-300">
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 tracking-tight group-hover:text-[#0668E1] transition-colors">{title}</h3>
    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">{desc}</p>
  </div>
);

const PlanDetailFeature = ({ label, variant = 'emerald' }: { label: string; variant?: 'emerald' | 'blue' | 'purple' }) => {
  const isBlue = variant === 'blue';
  const isPurple = variant === 'purple';
  return (
    <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
       <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
         isBlue ? 'bg-blue-100 text-[#0668E1]' : isPurple ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-[#008069]'
       }`}>
          <CheckCircle2 size={12} />
       </div>
       <span className="leading-snug text-slate-700 text-[11px] sm:text-xs">{label}</span>
    </div>
  );
};

const SocialLink = ({ icon, href }: { icon: React.ReactNode, href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#0668E1] transition-all border border-slate-200 hover:border-[#0668E1] shadow-2xs">
    {icon}
  </a>
);

export default LandingPage;