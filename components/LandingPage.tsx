import React, { useEffect, useState } from 'react';
import { 
  Zap, MessageSquare, Send, Layout, ShieldCheck, 
  Users, Layers, ArrowRight, IndianRupee, Package, 
  Rocket, Crown, Star, Shield, Globe, Cpu, CheckCircle2,
  Home, Github, Twitter, Facebook, Mail, Smartphone,
  BarChart3, ShieldAlert, Workflow, Instagram, Linkedin, MapPin, Phone,
  Infinity, Bot, MessageSquareQuote, FolderGit2, Terminal, Menu, X, LogIn,
  Info, Sparkles, Check, Calendar, Clock, Sliders, Database, FileSpreadsheet,
  Image, FileText, Wallet, Lock, Headphones, Search, Filter, RefreshCw,
  ChevronDown, ChevronUp, SlidersHorizontal, Share2, PlayCircle, Eye,
  HelpCircle, ChevronRight
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
  const [selectedComponentCat, setSelectedComponentCat] = useState<'all' | 'campaigns' | 'inbox' | 'automation' | 'meta' | 'crm' | 'dev' | 'security'>('all');
  const [faqCategory, setFaqCategory] = useState<'all' | 'scheduler' | 'antiban' | 'inbox' | 'meta' | 'bot' | 'api' | 'billing'>('all');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  
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
          
          <div className="hidden md:flex items-center gap-5 lg:gap-8">
            <a href="#features" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors">Features</a>
            <a href="#components" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-[#0668E1] transition-colors flex items-center gap-1">
              <span>Components</span>
              <span className="text-[8px] bg-blue-100 text-[#0668E1] px-1.5 py-0.2 rounded-full font-extrabold">ALL</span>
            </a>
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
              href="#components" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-[#0668E1] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              Components & All Modules
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

      {/* Comprehensive Software Components & Architecture Ecosystem (#components) */}
      <section id="components" className="py-20 sm:py-28 bg-white border-b border-sky-100 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0668E1] text-xs font-bold uppercase tracking-wider shadow-xs">
              <Layers size={14} /> Full Software Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              All Available Software Components <br />
              <span className="text-[#0668E1]">&amp; Enterprise Capabilities</span>
            </h2>
            <p className="text-slate-600 font-medium text-xs sm:text-sm md:text-base leading-relaxed">
              Explore the complete suite of modular components built into iFastX — from high-throughput scheduled broadcasting and multi-agent live chat to Meta-approved templates, 24/7 chatbots, and developer APIs.
            </p>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {[
                { id: 'all', label: 'All Modules' },
                { id: 'campaigns', label: 'Campaigns & Scheduler' },
                { id: 'inbox', label: 'Team Shared Inbox' },
                { id: 'automation', label: '24/7 Chatbots' },
                { id: 'meta', label: 'Meta Templates & WABA' },
                { id: 'crm', label: 'Audience CRM' },
                { id: 'dev', label: 'Developer API & Gateway' },
                { id: 'security', label: 'Security & Wallet' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedComponentCat(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedComponentCat === cat.id
                      ? 'bg-[#0668E1] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Highlight Banner: Bulk Sender with Campaign Scheduler */}
          <div className="mb-14 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-blue-800/50">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-extrabold uppercase tracking-widest">
                  <Calendar size={13} className="text-blue-400" />
                  Featured Component &bull; Bulk Campaign Scheduler
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  Automated Bulk Sender with Time Scheduler &amp; Anti-Ban Engine
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
                  Plan, schedule, and broadcast WhatsApp marketing blasts in advance. Pick your target dispatch date &amp; time or use instant 1-click presets (<code className="text-blue-300 font-mono">+1 Hour</code>, <code className="text-blue-300 font-mono">Tomorrow 9 AM</code>, <code className="text-blue-300 font-mono">Tomorrow 6 PM</code>, <code className="text-blue-300 font-mono">In 2 Days</code>). Our persistent background scheduler executes dispatches seamlessly without requiring your browser tab to stay open.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200 pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Schedule for Later with Custom Date/Time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Dynamic Spintax Text Variations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Humanized 5-15s Anti-Ban Pacing Delays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>Live Queue Telemetry &amp; CSV Export</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-blue-200 pb-2 border-b border-white/10">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Scheduler Queue Live Status</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Worker Active</span>
                </div>
                <div className="bg-slate-900/80 rounded-xl p-3 text-[11px] font-mono text-slate-300 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Campaign Name:</span>
                    <span className="text-white font-semibold">Diwali_Offer_VIP_Segment</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Scheduled Target:</span>
                    <span className="text-blue-300 font-bold">Tomorrow @ 09:00 AM IST</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Recipients:</span>
                    <span className="text-emerald-300">4,280 Verified Contacts</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Human Pacing Delay:</span>
                    <span className="text-amber-300">6 - 12 sec / message</span>
                  </div>
                  <div className="pt-2">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#0668E1] h-2 rounded-full w-3/4 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Background Runner: Running</span>
                      <span className="text-blue-400">Execute Now &bull; Cancel</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onDemoClick}
                  className="w-full bg-[#0668E1] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Terminal size={14} /> Test Bulk Scheduler in Live Demo
                </button>
              </div>
            </div>
          </div>

          {/* Software Components Detailed Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Component 1: Bulk Sender & Campaign Scheduler */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'campaigns') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-blue-200 hover:border-[#0668E1] p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0668E1] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Send size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-[#0668E1] border border-blue-200">
                      BulkSender.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0668E1] transition-colors mb-1">
                    Bulk Sender &amp; Campaign Scheduler
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Mass Broadcasting &bull; Deferred Schedule Engine
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Send personalized WhatsApp messages to thousands of contacts with real-time broadcasting or schedule campaigns for future dispatch with humanized anti-ban delays.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Schedule for Later:</strong> Date/time picker + shortcuts (+1h, Tomorrow 9 AM, Tomorrow 6 PM, 2 Days)</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Dynamic Spintax:</strong> &#123;Hello|Hi|Greetings&#125; prevents pattern recognition bans</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Humanized Pacing Delay:</strong> Configurable min/max seconds interval between messages</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Excel/CSV Mapping:</strong> Dynamic attributes (&#123;name&#125;, &#123;order_id&#125;) for personalized outreach</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Multi-Number Rotation:</strong> Split massive lists across multiple active WhatsApp lines</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Live Telemetry:</strong> Real-time progress bar &amp; downloadable CSV delivery reports</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-[#0668E1] text-[#0668E1] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 2: Multi-Agent Shared Team Inbox */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'inbox') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-emerald-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#008069] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-[#008069] border border-emerald-200">
                      ChatInterface.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#008069] transition-colors mb-1">
                    Multi-Agent Shared Team Inbox
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Unified Live Chat &bull; Multi-User Collaboration
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Empower your entire sales and support department to reply to incoming customer chats simultaneously from one or more WhatsApp business numbers.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Simultaneous Multi-Agent:</strong> Multiple agents chatting together with zero collisions</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Conversation Status Workflow:</strong> Tag conversations as Open, Pending, Resolved, or Spam</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Internal Private Notes:</strong> Yellow-tagged team notes hidden from customers for handoffs</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Canned Quick Replies:</strong> Slash command (/) shortcuts for instant support replies</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Omnichannel Rich Media:</strong> Exchange photos, PDFs, voice recordings, video clips &amp; files</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Live Read Receipts:</strong> Real-time double blue ticks and typing status indicators</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-[#008069] text-[#008069] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 3: 24/7 Intelligent Auto-Responder & Chatbot */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'automation') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-purple-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bot size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      AutoResponderManager.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors mb-1">
                    24/7 Auto-Responder &amp; Chatbot
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Keyword Automation &bull; Out-of-Office Logic
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Deploy intelligent auto-reply rules and interactive button menus to engage leads, answer FAQs, and qualify customers round-the-clock.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Multi-Condition Matching:</strong> Exact match, contains phrase, starts-with, and regex patterns</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Working Hours Engine:</strong> Set custom business hours with automated out-of-office notices</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Interactive Menu Menus:</strong> Quick-reply options and buttons for seamless lead routing</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Dynamic Variables:</strong> Personalize bot replies with &#123;name&#125;, &#123;phone&#125;, and current time</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Default Fallback Handler:</strong> Warm automated fallback for unhandled customer inquiries</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Rich Media Responses:</strong> Attach catalog PDFs and images directly to bot replies</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 4: Official Meta Cloud API Template Studio */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'meta') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-[#0668E1] p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0668E1] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Globe size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-[#0668E1] border border-blue-200">
                      MessageTemplates.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0668E1] transition-colors mb-1">
                    Meta Cloud API Template Studio
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Pre-Approved WABA &bull; Interactive CTA Buttons
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Create, preview, submit, and manage official Meta pre-approved message templates with 100% zero-ban guarantee directly on Meta Cloud.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Official Categories:</strong> Marketing promotions, Utility order alerts, and Authentication OTPs</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Interactive CTA Buttons:</strong> Direct Click-to-Call, Visit Website URL links, and Quick Replies</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Dynamic Parameter Tokens:</strong> Personalize messages with &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; variables</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Real-Time Meta Sync:</strong> Live sync with Meta Business Manager (Approved, Pending, Rejected)</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>100% Zero Ban Guarantee:</strong> Official Cloud API compliance eliminating phone number risks</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Multi-Language Support:</strong> Submit templates in English, Hindi, Spanish, Arabic &amp; more</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-[#0668E1] text-[#0668E1] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 5: Audience CRM & Contact Manager */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'crm') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-amber-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      ContactManager.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors mb-1">
                    Audience CRM &amp; Contact Manager
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Segmentation &bull; Opt-Out Suppression Engine
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Organize customer lists, build dynamic demographic tags, import Excel sheets, and automatically enforce anti-spam suppression.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>1-Click Excel/CSV Import:</strong> Upload XLSX and CSV files with auto column detection</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Dynamic Tag Segmentation:</strong> Group users by VIP tier, location, product interest, or status</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Automated Opt-Out Blacklist:</strong> Automatically skips unsubscribed contacts during bulk sends</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Phone Number Sanitizer:</strong> Cleans formats and auto-appends country dial codes (+91, +1)</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Customer Engagement Log:</strong> View timeline of previous broadcasts and chats per contact</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Instant CSV Export:</strong> Download sanitized and segmented audience lists anytime</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 6: Multi-Session WhatsApp Gateway & Instance Manager */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'dev') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-[#008069] p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#008069] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Smartphone size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-[#008069] border border-emerald-200">
                      ProvisionInstanceModal.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#008069] transition-colors mb-1">
                    Multi-Session WhatsApp Gateway
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Dual Engine: Meta Cloud + Baileys QR
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Connect and orchestrate multiple WhatsApp phone numbers with isolated session sandboxes and instant QR code linking.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>5-Second QR Pairing:</strong> Scan QR code with any WhatsApp personal or business app</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Dual-Engine Architecture:</strong> Switch between Official Meta Cloud API and Baileys Web QR</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Automated Reconnect &amp; Heartbeat:</strong> Background daemon automatically restores severed sessions</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Instance Sandboxing:</strong> Complete process and data isolation across accounts</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Outbound Load Balancing:</strong> Distribute outbound dispatches across connected instances</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Live Socket Telemetry:</strong> Real-time connection states (Connected, QR Ready, Syncing)</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-[#008069] text-[#008069] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 7: Developer REST API, Webhooks & SDKs */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'dev') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-indigo-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Terminal size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      ApiDocumentation.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                    Developer REST API &amp; Webhooks
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Multi-Language SDKs &bull; High Concurrency
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Integrate WhatsApp automated messaging into your custom website, CRM, Shopify, or ERP via high-throughput REST endpoints.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>High-Throughput Endpoints:</strong> /api/send, /api/send-media, /api/campaigns/schedule</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Real-Time Webhooks:</strong> Immediate HTTP callbacks for inbound chats and delivery receipts</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Multi-Language Code:</strong> Ready-to-use snippets in Node.js, Python, PHP, cURL, Go &amp; Java</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Queue-Backed Architecture:</strong> Zero message drop rate with 99.9% uptime SLA guarantee</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>HMAC &amp; API Key Security:</strong> Revocable API keys with granular IP rate limiting</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Automated OTPs &amp; Alerts:</strong> Deliver transactional 2FA OTPs in under 2 seconds</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 8: Real-Time Analytics & Business Telemetry */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'campaigns') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-cyan-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart3 size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                      Dashboard.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-cyan-600 transition-colors mb-1">
                    Real-Time Analytics &amp; Telemetry
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Delivery Telemetry &bull; Conversion Tracking
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Track live message volumes, delivery rates, double blue tick reads, failure diagnostics, and campaign ROI with real-time graphs.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Live Message Counters:</strong> Real-time tallies for Sent, Delivered, Read, and Failed dispatches</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Delivery Health Scores:</strong> Percentage completion and latency metrics for every broadcast</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Instance Throughput Stats:</strong> Messages-per-second monitoring across all active nodes</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Peak Activity Heatmaps:</strong> Identify optimal customer engagement hours</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Error Diagnostics:</strong> Detailed error codes (invalid number, blocked, network failure)</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Automated PDF/CSV Export:</strong> Generate management reports in 1-click</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-600 text-cyan-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 9: Cloud Media Library & Asset CDN */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'campaigns') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-pink-500 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Image size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                      MediaLibrary.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-pink-600 transition-colors mb-1">
                    Cloud Media Library &amp; CDN
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Fast Asset Storage &bull; Global CDN Delivery
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Upload and manage marketing graphics, PDF catalogs, brochures, and promo videos with high-speed CDN delivery on WhatsApp.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Universal Media Formats:</strong> PNG, JPG, WebP, PDF catalogs, MP4 video promos, audio notes</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Ultra-Fast CDN Delivery:</strong> Global caching ensures zero buffering for recipients</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>1-Click Broadcast Attachment:</strong> Select saved assets directly in the Bulk Broadcaster</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Auto-Optimization:</strong> Smart compression maintains high visual fidelity with small payload</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Asset Categorization:</strong> Filter media by tag, campaign, upload date, or file size</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Permanent URLs:</strong> Embed CDN assets in API payloads with zero expiration worries</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 10: Role-Based Team Access Control (RBAC) */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'security') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-emerald-700 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldCheck size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      TeamManager.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors mb-1">
                    Team Management &amp; RBAC Security
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Enterprise Permissions &bull; Audit Trails
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Control team access with hierarchical roles, granular permission matrices, and complete compliance audit logging.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Hierarchical Roles:</strong> Super Admin, Admin, Manager, Support Agent, and Auditor profiles</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Granular Toggles:</strong> Restrict wallet balance visibility, contact exports, or campaign rights</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Compliance Audit Logs:</strong> Timestamped record of user logins, dispatches, and config changes</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Department Queuing:</strong> Route chats specifically to billing, technical, or sales reps</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Contact Protection:</strong> Protect customer phone numbers from unauthorized employee exports</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Multi-Tenant Isolation:</strong> Full database separation between departments and workspaces</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-800 text-emerald-800 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Component 11: Prepaid Wallet & Meta Billing Insights */}
            {(selectedComponentCat === 'all' || selectedComponentCat === 'security') && (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-blue-600 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wallet size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      BillingManager.tsx
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                    Prepaid Wallet &amp; Meta Billing Insights
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
                    Transparent Balance &bull; Zero Hidden Markups
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Monitor usage in real-time with flexible top-up methods, official Meta conversation fee tracking, and automated GST tax invoices.
                  </p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Prepaid Balance Wallet:</strong> Instant recharges via UPI, Credit/Debit Cards, Net Banking &amp; Razorpay</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Zero Per-Message Markups:</strong> Flat monthly plans for connected Baileys QR instances</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Official Meta Conversation Breakdown:</strong> Live analytics on Marketing, Utility &amp; OTP costs</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Automated GST Invoices:</strong> Instant official tax invoices with downloadable PDF format</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Low Balance Alerts:</strong> Configurable balance threshold alerts via WhatsApp and email</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-[#008069] shrink-0 mt-0.5" />
                      <span><strong>Complete Ledger Audit:</strong> Transparent timestamped debit and credit ledger statements</span>
                    </div>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    onClick={onDemoClick}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch in Live Demo</span> <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
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
          <div className="text-center mb-10 sm:mb-14 space-y-3">
             <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0668E1] text-xs font-bold uppercase tracking-wider shadow-xs">
               <HelpCircle size={14} /> Comprehensive Knowledge Base
             </div>
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
               Frequently Asked Questions
             </h2>
             <p className="text-slate-600 text-xs sm:text-sm font-medium max-w-2xl mx-auto">
               Everything you need to know about our software modules: Bulk Campaign Scheduler, Anti-Ban Engine, Multi-Agent Team Inbox, Meta Templates, Chatbots &amp; REST APIs.
             </p>

             {/* Search input for FAQs */}
             <div className="pt-4 max-w-lg mx-auto">
               <div className="relative">
                 <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input
                   type="text"
                   value={faqSearchQuery}
                   onChange={e => setFaqSearchQuery(e.target.value)}
                   placeholder="Search questions (e.g. scheduler, anti-ban, excel, api, team inbox...)"
                   className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#f8fafc] text-xs sm:text-sm focus:outline-none focus:border-[#0668E1] focus:bg-white shadow-xs transition-all"
                 />
                 {faqSearchQuery && (
                   <button
                     onClick={() => setFaqSearchQuery('')}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                   >
                     ✕
                   </button>
                 )}
               </div>
             </div>

             {/* FAQ Category Filter Pills */}
             <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
               {[
                 { id: 'all', label: 'All Questions' },
                 { id: 'scheduler', label: 'Campaigns & Scheduler' },
                 { id: 'antiban', label: 'Anti-Ban Protection' },
                 { id: 'inbox', label: 'Shared Team Inbox' },
                 { id: 'meta', label: 'Meta Cloud vs. QR' },
                 { id: 'bot', label: '24/7 Chatbots' },
                 { id: 'api', label: 'API & Developers' },
                 { id: 'billing', label: 'Pricing & Wallet' },
               ].map(cat => (
                 <button
                   key={cat.id}
                   onClick={() => setFaqCategory(cat.id as any)}
                   className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                     faqCategory === cat.id
                       ? 'bg-[#0668E1] text-white shadow-xs'
                       : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                   }`}
                 >
                   {cat.label}
                 </button>
               ))}
             </div>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3.5">
            {[
              {
                id: 'faq-antiban',
                cat: 'antiban',
                catLabel: 'Anti-Ban & Deliverability',
                q: 'What makes iFastX the best WhatsApp bulk sender without ban? How does Anti-Ban work?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      iFastX utilizes a proprietary <strong>Multi-Layered Anti-Ban Engine</strong> engineered to keep WhatsApp broadcast accounts healthy:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Dynamic Spintax Randomization:</strong> Syntax such as <code className="text-[#0668E1] bg-blue-50 px-1 rounded">&#123;Hello|Hi|Dear&#125; &#123;customer|friend&#125;</code> generates distinct variations for each recipient so messages never trigger duplicate content spam filters.</li>
                      <li><strong>Humanized Random Delays:</strong> Every dispatched message pauses with a randomized interval (e.g. between 6 to 14 seconds), simulating natural manual typing behavior.</li>
                      <li><strong>Multi-Session Rotation:</strong> Spread high-volume broadcasts across 2, 5, or 10 connected WhatsApp numbers automatically.</li>
                      <li><strong>Official Meta Cloud API Alternative:</strong> For 100% zero-ban assurance, businesses can broadcast via Meta Official Cloud API with pre-approved templates and zero risk to phone numbers.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-scheduler',
                cat: 'scheduler',
                catLabel: 'Campaigns & Scheduler',
                q: 'How does the Bulk Campaign Scheduler work? Can I schedule messages in advance?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Yes! With the <strong>Bulk Campaign Scheduler</strong> built into <code className="text-[#0668E1] bg-blue-50 px-1 rounded">BulkSender.tsx</code>, you can plan marketing broadcasts ahead of time:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Date &amp; Time Selection:</strong> Pick your exact target broadcast date and time with our interactive calendar picker.</li>
                      <li><strong>1-Click Quick Presets:</strong> Choose instant scheduling shortcuts: <code className="bg-slate-100 px-1 rounded">+1 Hour</code>, <code className="bg-slate-100 px-1 rounded">Tomorrow 9:00 AM</code>, <code className="bg-slate-100 px-1 rounded">Tomorrow 6:00 PM</code>, or <code className="bg-slate-100 px-1 rounded">In 2 Days</code>.</li>
                      <li><strong>24/7 Background Scheduler Engine:</strong> Campaigns execute reliably on the server even if you close your browser or turn off your computer.</li>
                      <li><strong>Schedule Management:</strong> View all pending scheduled campaigns, cancel before they fire, or click <em>Execute Now</em> to immediately dispatch.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-excel',
                cat: 'scheduler',
                catLabel: 'Excel Broadcaster',
                q: 'How can I send bulk WhatsApp messages from Excel sheets (.xlsx / .csv) with personalized variables?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Broadcasting from Excel or CSV files is completely seamless in iFastX:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Upload your spreadsheet in <strong>.xlsx, .xls, or .csv</strong> format directly into Bulk Sender.</li>
                      <li>The system automatically detects columns such as <em>Name, Phone Number, Order ID, Due Date, and Amount</em>.</li>
                      <li>Insert dynamic placeholder tags like <code className="text-[#0668E1] bg-blue-50 px-1 rounded">&#123;name&#125;</code>, <code className="text-[#0668E1] bg-blue-50 px-1 rounded">&#123;order_id&#125;</code>, or <code className="text-[#0668E1] bg-blue-50 px-1 rounded">&#123;due_date&#125;</code> anywhere in your message body.</li>
                      <li>The software automatically validates phone numbers, prepends country dial codes (e.g. +91), and generates individual personalized messages for each customer.</li>
                    </ol>
                  </div>
                )
              },
              {
                id: 'faq-inbox',
                cat: 'inbox',
                catLabel: 'Shared Team Inbox',
                q: 'How does the Multi-Agent Shared Team Inbox work? Can multiple team members use one WhatsApp number?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      The <strong>Multi-Agent Shared Team Inbox</strong> (<code className="text-[#0668E1] bg-blue-50 px-1 rounded">ChatInterface.tsx</code>) enables multiple customer service reps, sales executives, and managers to log in simultaneously from different devices:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Collision-Free Chat:</strong> Multiple agents can view and respond to different customer threads at the exact same moment without getting logged out.</li>
                      <li><strong>Ticket Lifecycle Statuses:</strong> Tag conversations as <em>Open, Pending, Resolved</em>, or <em>Spam</em> to maintain an organized workflow.</li>
                      <li><strong>Internal Private Staff Notes:</strong> Add private notes visible only to teammates to discuss cases before replying to the customer.</li>
                      <li><strong>Canned Quick Replies:</strong> Type <code className="bg-slate-100 px-1 rounded">/</code> to trigger saved quick-reply templates for shipping updates, bank details, and FAQs.</li>
                      <li><strong>Real-Time Read Receipts:</strong> View double blue ticks and delivery confirmations live.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-meta-vs-qr',
                cat: 'meta',
                catLabel: 'Architecture & Engine',
                q: 'What is the difference between Official Meta Cloud API and Baileys Web QR instances? Which should I choose?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      iFastX provides a unique <strong>Dual-Engine Architecture</strong> giving you the freedom to choose what fits your business:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl">
                        <p className="font-bold text-[#0668E1] mb-1">Official Meta Cloud API:</p>
                        <p className="text-[11px] leading-relaxed">
                          Direct enterprise access via Meta. 100% zero-ban guarantee, verified WhatsApp Business Account (green tick eligible), and interactive CTA buttons. Messages deduct directly from your prepaid wallet at standard Meta conversation rates.
                        </p>
                      </div>
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                        <p className="font-bold text-[#008069] mb-1">Baileys Web QR API:</p>
                        <p className="text-[11px] leading-relaxed">
                          Link existing personal or business numbers in 5 seconds via QR code. No Meta Business verification needed. Flat subscription fee with zero per-message charges. Includes our Anti-Ban Spintax Delay Engine.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: 'faq-bot',
                cat: 'bot',
                catLabel: '24/7 Chatbots',
                q: 'How do the 24/7 Intelligent Auto-Responders and Chatbot rules work?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      The <strong>Auto-Responder Manager</strong> (<code className="text-[#0668E1] bg-blue-50 px-1 rounded">AutoResponderManager.tsx</code>) automates customer replies around the clock without requiring coding:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Multi-Condition Matching:</strong> Set triggers for <em>Exact Match</em>, <em>Contains Phrase</em>, <em>Starts-With</em>, or advanced <em>Regex Patterns</em>.</li>
                      <li><strong>Business Hours Engine:</strong> Set active hours (e.g. 9 AM - 6 PM); queries received outside operating hours receive an automated out-of-office response.</li>
                      <li><strong>Interactive Menus:</strong> Present customers with numbered options (e.g. "1. View Pricing, 2. Track Order, 3. Talk to Agent") to route inquiries automatically.</li>
                      <li><strong>Dynamic Variable Injection:</strong> Auto-insert recipient details into bot replies to deliver a personal customer touch.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-templates',
                cat: 'meta',
                catLabel: 'Meta Message Templates',
                q: 'How do Official Meta Cloud Message Templates work, and what are the categories?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Under Meta's WhatsApp Business API guidelines, outbound messages to users outside the 24-hour service window must use pre-approved <strong>Message Templates</strong> (<code className="text-[#0668E1] bg-blue-50 px-1 rounded">MessageTemplates.tsx</code>):
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Marketing:</strong> Promotional offers, seasonal announcements, discounts, and product launches.</li>
                      <li><strong>Utility:</strong> Order confirmations, shipment delivery tracking, invoices, and billing reminders.</li>
                      <li><strong>Authentication (OTP):</strong> One-time passwords and two-factor verification codes for secure account logins.</li>
                      <li><strong>Interactive Elements:</strong> Templates support Quick Reply buttons and Call-to-Action buttons (Call Phone Number, Open URL link). Approval takes from a few minutes to 24 hours directly via Meta.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-api',
                cat: 'api',
                catLabel: 'Developer REST API',
                q: 'How can developers integrate iFastX WhatsApp REST API with websites, CRMs, or ERPs?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Developers can integrate iFastX in minutes with our clean, developer-first RESTful architecture:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Simple Endpoints:</strong> Send single messages via <code className="bg-slate-100 text-[#0668E1] px-1 rounded">POST /api/send</code>, media via <code className="bg-slate-100 text-[#0668E1] px-1 rounded">/api/send-media</code>, or schedule campaigns via <code className="bg-slate-100 text-[#0668E1] px-1 rounded">/api/campaigns/schedule</code>.</li>
                      <li><strong>Real-Time Webhooks:</strong> Configure a webhook URL to receive instant JSON payloads for incoming customer messages, delivery timestamps, and read receipts.</li>
                      <li><strong>SDK Code Samples:</strong> We provide ready-to-copy code snippets in <strong>Node.js, PHP, Python, cURL, Go, and Java</strong> in our Developer Portal.</li>
                      <li><strong>High Throughput:</strong> Built on queue workers with 99.9% uptime and enterprise concurrency.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-crm',
                cat: 'inbox',
                catLabel: 'Audience CRM & Opt-Out',
                q: 'How does contact opt-out and blacklist suppression work in the CRM?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Maintaining high sender reputation requires honoring customer preferences. iFastX includes an automated <strong>Blacklist &amp; Opt-Out Engine</strong> in <code className="text-[#0668E1] bg-blue-50 px-1 rounded">ContactManager.tsx</code>:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>If a customer replies "STOP", "UNSUBSCRIBE", or asks to opt out, they can be added to the Blacklist in 1 click (or via automated bot keyword).</li>
                      <li>Once blacklisted, all subsequent bulk broadcasts automatically suppress and skip that phone number, ensuring 100% compliance with WhatsApp anti-spam policies.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-media',
                cat: 'scheduler',
                catLabel: 'Cloud Media Library',
                q: 'What types of media can I store in the Media Library and send in bulk campaigns?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      The <strong>Cloud Media Library</strong> (<code className="text-[#0668E1] bg-blue-50 px-1 rounded">MediaLibrary.tsx</code>) supports:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Images:</strong> JPG, JPEG, PNG, and WebP graphics and promotional flyers.</li>
                      <li><strong>Documents:</strong> PDF product catalogs, brochures, invoices, spreadsheets, and Word documents.</li>
                      <li><strong>Videos &amp; Audio:</strong> MP4 video teasers and audio voice notes.</li>
                      <li>All assets are served through a global high-speed CDN to guarantee instant, high-speed downloading for end recipients on WhatsApp.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-rbac',
                cat: 'inbox',
                catLabel: 'Team RBAC Security',
                q: 'What Role-Based Access Controls (RBAC) are available for teams? Can I restrict contact exports?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      Enterprise security is built directly into <code className="text-[#0668E1] bg-blue-50 px-1 rounded">TeamManager.tsx</code> and <code className="text-[#0668E1] bg-blue-50 px-1 rounded">UserManagement.tsx</code>:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Predefined Roles:</strong> Super Admin, Admin, Manager, Support Agent, and Auditor.</li>
                      <li><strong>Permission Matrices:</strong> You can explicitly prevent agents from viewing prepaid wallet balances, exporting customer phone numbers to CSV, or launching unapproved mass campaigns.</li>
                      <li><strong>Audit Trail:</strong> Full administrative log records every action taken for compliance and organizational security.</li>
                    </ul>
                  </div>
                )
              },
              {
                id: 'faq-billing',
                cat: 'billing',
                catLabel: 'Prepaid Wallet & Invoicing',
                q: 'How does wallet billing and pricing work? Are there any hidden per-message markups?',
                a: (
                  <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p>
                      iFastX operates on <strong>100% transparent pricing</strong> with zero hidden surprises:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Baileys Web QR Plans:</strong> Flat monthly subscription with <em>zero per-message surcharges</em>. Broadcast within your quota without extra per-message fees.</li>
                      <li><strong>Meta Cloud API Plans:</strong> Flat platform subscription covers instance infrastructure; conversation fees deduct directly from your prepaid wallet at official Meta conversation rates.</li>
                      <li><strong>Instant Top-Up &amp; GST Invoicing:</strong> Recharge instantly via UPI, Credit/Debit Cards, Net Banking, or Razorpay, and download official GST tax invoices instantly.</li>
                    </ul>
                  </div>
                )
              }
            ]
              .filter(item => {
                if (faqCategory !== 'all' && item.cat !== faqCategory) return false;
                if (!faqSearchQuery) return true;
                const query = faqSearchQuery.toLowerCase();
                return (
                  item.q.toLowerCase().includes(query) ||
                  item.catLabel.toLowerCase().includes(query)
                );
              })
              .map((item, idx) => {
                const isOpen = expandedFaqIndex === idx;
                return (
                  <div 
                    key={item.id}
                    className="bg-[#f8fafc] border border-slate-200 rounded-2xl overflow-hidden transition-all hover:border-blue-300 hover:shadow-xs"
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#0668E1] w-fit">
                          {item.catLabel}
                        </span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm">
                          {item.q}
                        </span>
                      </div>
                      <span className={`text-[#0668E1] text-xs transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 border-t border-slate-100 animate-in fade-in duration-200">
                        <div className="pt-3">
                          {item.a}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* FAQ Bottom Support Help Card */}
          <div className="mt-10 bg-blue-50/80 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Have More Questions or Need a Custom Enterprise Solution?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Our engineering team is ready to guide your team through Meta Business verification, bulk sender setup, and CRM webhook integrations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onDemoClick}
                className="bg-white border border-slate-300 hover:border-[#0668E1] text-slate-800 hover:text-[#0668E1] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Terminal size={14} /> Try Live Demo Dashboard
              </button>
              <button
                onClick={onSignupClick}
                className="bg-[#0668E1] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Get Started Now</span> <ArrowRight size={14} />
              </button>
            </div>
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