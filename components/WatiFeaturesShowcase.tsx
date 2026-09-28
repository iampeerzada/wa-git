import React, { useState } from 'react';
import { 
  ArrowRight, ExternalLink, Check, ShoppingBag, 
  Sparkles, MousePointerClick, MessageSquare, 
  Send, Layers, Bot, Zap, CheckCircle2, ChevronRight,
  ShieldCheck, HelpCircle, PhoneCall, Sliders
} from 'lucide-react';

export const WatiFeaturesShowcase: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  // Interactive state for Flow demo checkboxes
  const [selectedFlows, setSelectedFlows] = useState<string[]>(['Home Audio', 'Cameras']);
  // Interactive state for Chatbot message simulation
  const [activeTab, setActiveTab] = useState<'all' | 'ads' | 'broadcast' | 'flows' | 'catalog' | 'bot'>('all');

  const toggleFlow = (item: string) => {
    setSelectedFlows(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  return (
    <section className="py-20 sm:py-28 bg-[#edf5fc] text-slate-800 relative overflow-hidden font-sans border-y border-blue-100">
      {/* Decorative background grid and soft radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#c7e0f8_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Main Section Header (Matches Wati Screenshot: "All the features you need, all in one place") */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-[#0668E1] text-xs font-extrabold uppercase tracking-widest mb-4 shadow-xs">
            <Sparkles size={14} className="text-[#0668E1]" />
            Enterprise WhatsApp Suite
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            All the features you need, <br className="hidden sm:inline" />
            <span className="text-[#0668E1]">all in one place</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
            Drive higher revenue, automate 24/7 customer interactions, and turn WhatsApp into your #1 growth channel with Meta-verified technology.
          </p>

          {/* Quick Jump Feature Navigation Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { id: 'ads', label: 'Click to WhatsApp Ads' },
              { id: 'broadcast', label: 'Broadcast & Bulk Messages' },
              { id: 'flows', label: 'WhatsApp Flows' },
              { id: 'catalog', label: 'WhatsApp Catalog' },
              { id: 'bot', label: 'No-code Chatbot' },
            ].map(tab => (
              <a
                key={tab.id}
                href={`#feature-${tab.id}`}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white/80 hover:bg-white hover:text-[#0668E1] border border-blue-200/70 shadow-xs transition-all hover:scale-105 active:scale-95"
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE 1: Click to WhatsApp Ads (CTWA) */}
        {/* ========================================================================= */}
        <div id="feature-ads" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-24 sm:mb-32">
          
          {/* Visual Showcase (Left) */}
          <div className="lg:col-span-7 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 bg-gradient-to-tr from-white to-blue-50/70 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5">
            {/* Meta Ad Card Preview */}
            <div className="w-[240px] sm:w-[260px] bg-white rounded-2xl border border-slate-200 shadow-md p-3 shrink-0 transform -rotate-1 hover:rotate-0 transition-transform">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                  A
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 leading-none">Arabicana</span>
                    <span className="text-[10px] text-slate-400">&bull; Sponsored</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Instagram &bull; Facebook</span>
                </div>
              </div>

              {/* Coffee Ad Photo */}
              <div className="relative rounded-xl overflow-hidden mb-2.5 aspect-4/3 bg-amber-900/10">
                <img 
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80" 
                  alt="Arabicana Coffee" 
                  className="w-full h-full object-cover"
                />
                <button className="absolute bottom-2.5 right-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1.5 transition-all">
                  <MessageSquare size={13} className="fill-white" />
                  Send Message
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">www.arabicana.com</span>
                <p className="text-xs font-extrabold text-slate-800">Ultimate Artisan Roasted Coffee</p>
              </div>
            </div>

            {/* Connecting Directional Arrow */}
            <div className="hidden sm:flex flex-col items-center justify-center text-[#0668E1]">
              <svg viewBox="0 0 60 40" className="w-14 h-10 stroke-current fill-none stroke-[2.5]" strokeLinecap="round">
                <path d="M5 25 C 25 5, 35 35, 55 15" />
                <path d="M45 13 L 55 15 L 53 25" />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#0668E1] mt-1">Direct Lead</span>
            </div>

            {/* WhatsApp Smartphone Mockup */}
            <div className="w-[270px] sm:w-[290px] bg-[#0b141a] rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl shrink-0">
              {/* Phone Screen Container */}
              <div className="bg-[#efeae2] rounded-[24px] overflow-hidden flex flex-col h-[380px] relative font-sans text-xs">
                {/* Chat Top Bar */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs">Arabicana</span>
                        <CheckCircle2 size={12} className="text-blue-300 fill-blue-500" />
                      </div>
                      <span className="text-[9px] text-emerald-100">Official Business</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {/* Message Thread */}
                <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                  {/* Incoming user query from CTWA ad */}
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] text-slate-800 p-2.5 rounded-2xl rounded-tr-none shadow-xs max-w-[85%] text-[11px] leading-relaxed">
                      I saw your ad and I'm interested in buying your product. Can you tell me more?
                      <div className="text-[9px] text-slate-400 text-right mt-1">10:42 AM ✔✔</div>
                    </div>
                  </div>

                  {/* Automated Instant Response */}
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-800 p-2.5 rounded-2xl rounded-tl-none shadow-xs max-w-[90%] text-[11px] leading-relaxed space-y-2">
                      <p>
                        Hi, Welcome to Arabicana! That's great to hear! I'd be happy to provide more details.
                      </p>
                      <p className="text-slate-600 text-[10px]">
                        Browse through our wide variety of products available for you, delivered at your doorstep!
                      </p>
                      <button className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#008069] font-bold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors">
                        <span>☰</span> Browse Products
                      </button>
                      <div className="text-[9px] text-slate-400 text-right">10:42 AM</div>
                    </div>
                  </div>
                </div>

                {/* Simulated Chat Input Bar */}
                <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-slate-200">
                  <div className="flex-1 bg-white rounded-full px-3 py-1 text-[10px] text-slate-400">
                    Type a message...
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#008069] text-white flex items-center justify-center text-[10px]">
                    ➤
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Text Content (Right) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0668E1] text-xs font-bold uppercase tracking-wider">
              <MousePointerClick size={14} />
              Meta Lead Generation
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Click to WhatsApp Ads
            </h3>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Turn ad clicks into revenue-driving conversations by capturing verified leads from Meta and Google, engaging them instantly, and sending conversion signals back to improve ad targeting and ROAS.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Zero drop-off from external web landing pages</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Pre-filled customizable conversation starters</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Automated Meta Conversions API (CAPI) feedback loops</span>
              </li>
            </ul>
            <div className="pt-2">
              <button 
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 text-[#0668E1] font-bold text-sm hover:gap-3 transition-all"
              >
                Learn more about Click to WhatsApp Ads <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* FEATURE 2: Broadcast & Bulk Messages (Alternating: Text Left, Graphic Right) */}
        {/* ========================================================================= */}
        <div id="feature-broadcast" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-24 sm:mb-32">
          
          {/* Feature Text Content (Left) */}
          <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#008069] text-xs font-bold uppercase tracking-wider">
              <Send size={14} />
              High Engagement Campaigns
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Broadcast &amp; Bulk Messages
            </h3>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Drive higher engagement than email &amp; SMS. Reach thousands instantly with ready-to-use message templates across different languages.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>98% open rates with personalized customer variables</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Send media templates with high-res photos, videos &amp; PDFs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Full compliance with opt-in permissions &amp; anti-ban pacing</span>
              </li>
            </ul>
            <div className="pt-2">
              <button 
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 text-[#008069] font-bold text-sm hover:gap-3 transition-all"
              >
                Explore WhatsApp Broadcast Capabilities <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Visual Showcase: Desktop Dashboard + Phone (Right) */}
          <div className="lg:col-span-7 order-1 lg:order-2 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 bg-gradient-to-tr from-white to-emerald-50/70 rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-500/5">
            {/* Dashboard UI Card */}
            <div className="w-full sm:w-[320px] bg-white rounded-2xl border border-slate-200 shadow-md p-4 shrink-0 font-sans">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                <div className="w-5 h-5 rounded bg-[#25D366] flex items-center justify-center text-white text-[10px] font-black">
                  W
                </div>
                <span className="font-extrabold text-xs text-slate-900">Campaign Manager</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Broadcast Name
                  </label>
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[11px]">
                    Winter Warmers - Campaign
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Select Template Message
                  </label>
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-between">
                    <span>winter_warmers_launch</span>
                    <span className="text-[#25D366] text-[9px] font-bold">APPROVED</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Target Audience (Contacts)
                    </span>
                    <span className="text-[10px] font-bold text-[#0668E1]">12,450 Selected</span>
                  </div>
                  
                  {/* Table snippet */}
                  <div className="border border-slate-100 rounded-lg overflow-hidden text-[10px]">
                    <div className="bg-slate-50 px-2 py-1 font-bold text-slate-500 grid grid-cols-12">
                      <span className="col-span-5">Name</span>
                      <span className="col-span-4">Phone</span>
                      <span className="col-span-3 text-right">Status</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="px-2 py-1.5 grid grid-cols-12 items-center bg-white">
                        <span className="col-span-5 font-semibold text-slate-800 flex items-center gap-1">
                          <Check size={10} className="text-[#25D366]" /> John Doe
                        </span>
                        <span className="col-span-4 text-slate-500">+351234567890</span>
                        <span className="col-span-3 text-right text-[#25D366] font-bold">TRUE ✔</span>
                      </div>
                      <div className="px-2 py-1.5 grid grid-cols-12 items-center bg-white">
                        <span className="col-span-5 font-semibold text-slate-800 flex items-center gap-1">
                          <Check size={10} className="text-[#25D366]" /> Jane Doe
                        </span>
                        <span className="col-span-4 text-slate-500">+1234567890</span>
                        <span className="col-span-3 text-right text-[#25D366] font-bold">TRUE ✔</span>
                      </div>
                      <div className="px-2 py-1.5 grid grid-cols-12 items-center bg-white">
                        <span className="col-span-5 font-semibold text-slate-800 flex items-center gap-1">
                          <Check size={10} className="text-[#25D366]" /> Thomas Shelby
                        </span>
                        <span className="col-span-4 text-slate-500">+911234567890</span>
                        <span className="col-span-3 text-right text-[#25D366] font-bold">TRUE ✔</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] font-bold text-xs uppercase tracking-wider transition-colors shadow-xs">
                  Schedule &amp; Launch
                </button>
              </div>
            </div>

            {/* Smartphone with template message */}
            <div className="w-[260px] sm:w-[280px] bg-[#0b141a] rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl shrink-0">
              <div className="bg-[#efeae2] rounded-[24px] overflow-hidden flex flex-col h-[380px] relative font-sans text-xs">
                {/* Header */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center gap-2 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    W
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">Winter Apparel</span>
                      <CheckCircle2 size={12} className="text-blue-300 fill-blue-500" />
                    </div>
                    <span className="text-[9px] text-emerald-100">Verified Business</span>
                  </div>
                </div>

                {/* Message Area */}
                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                  <div className="bg-white rounded-2xl shadow-xs overflow-hidden max-w-[95%]">
                    {/* Template Image (Dog in warm jacket like wati screenshot) */}
                    <div className="h-32 bg-slate-200 overflow-hidden relative">
                      <img 
                        src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80" 
                        alt="Winter Dog Collection" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-[11px] text-slate-800 leading-snug">
                        Hey Molly, we just launched the winter warmers collection for your furry friend. Check it out!
                      </p>
                      <button className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0668E1] font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-colors">
                        <ExternalLink size={12} /> Visit Website
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* FEATURE 3: WhatsApp Flows (Surveys, Forms & Frictionless Checkout) */}
        {/* ========================================================================= */}
        <div id="feature-flows" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-24 sm:mb-32">
          
          {/* Visual Showcase: Promotion card + In-chat native Flow Form (Left) */}
          <div className="lg:col-span-7 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 bg-gradient-to-tr from-white to-purple-50/70 rounded-3xl border border-purple-100 shadow-xl shadow-purple-500/5">
            {/* Sale Teaser Card */}
            <div className="w-[220px] sm:w-[240px] bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 shrink-0">
              <div className="h-24 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 font-black text-3xl tracking-tighter mb-3 shadow-inner">
                SALE
              </div>
              <h4 className="text-xs font-black text-slate-900 leading-tight mb-1">
                Want to be the first to know about our Black Friday deals?
              </h4>
              <p className="text-[10px] text-slate-500 mb-3">
                Sign up for our exclusive pre-sale notification service and get 24-hour advance notice.
              </p>
              <button className="w-full py-1.5 rounded-lg bg-blue-50 text-[#0668E1] font-bold text-[11px] border border-blue-200">
                Register now
              </button>
            </div>

            {/* Smartphone with Native Flow Form Sheet */}
            <div className="w-[270px] sm:w-[290px] bg-[#0b141a] rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl shrink-0">
              <div className="bg-[#efeae2] rounded-[24px] overflow-hidden flex flex-col h-[400px] relative font-sans text-xs">
                {/* Header */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">VIP Offers</span>
                    <CheckCircle2 size={12} className="text-blue-300 fill-blue-500" />
                  </div>
                  <span className="text-[10px] text-emerald-100">Flow v3</span>
                </div>

                {/* Flow Sheet Modal Overlay (Native WhatsApp Sheet Look) */}
                <div className="flex-1 bg-white m-2 rounded-xl p-3 flex flex-col justify-between shadow-lg border border-slate-200">
                  <div className="space-y-2">
                    <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-1" />
                    <h5 className="font-black text-slate-900 text-sm">Register now</h5>
                    <p className="text-[10px] text-slate-500">
                      Let us know which category you're interested in?
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Categories
                      </span>
                      {[
                        'Mobile Phones',
                        'Televisions',
                        'Home Audio',
                        'Headphones & Earphones',
                        'Cameras'
                      ].map(cat => {
                        const isChecked = selectedFlows.includes(cat);
                        return (
                          <div 
                            key={cat}
                            onClick={() => toggleFlow(cat)}
                            className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-[11px] text-slate-800 transition-colors"
                          >
                            <span>{cat}</span>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isChecked ? 'bg-[#25D366] border-[#25D366] text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={() => alert('WhatsApp Flow Submitted! Conversion recorded.')}
                    className="w-full py-2 bg-[#25D366] hover:bg-[#128C7E] text-[#0b141a] font-bold text-xs rounded-xl shadow-xs transition-colors mt-2"
                  >
                    Confirm &amp; Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Text Content (Right) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
              <Sliders size={14} />
              Interactive In-App Forms
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              WhatsApp Flows
            </h3>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Effortlessly capture customer interests with WhatsApp flows. Create frictionless surveys, interactive experiences, and registrations to collect customer preferences, enabling targeted promotions and personalized engagement.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Native forms built directly into the WhatsApp conversation UI</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Instant lead segmentation without redirecting customers outside</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Syncs directly to your database and CRM webhooks in real time</span>
              </li>
            </ul>
            <div className="pt-2">
              <button 
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 text-purple-700 font-bold text-sm hover:gap-3 transition-all"
              >
                Learn more about WhatsApp Flows <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* FEATURE 4: WhatsApp Catalog (Alternating: Text Left, Graphic Right) */}
        {/* ========================================================================= */}
        <div id="feature-catalog" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-24 sm:mb-32">
          
          {/* Feature Text Content (Left) */}
          <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#008069] text-xs font-bold uppercase tracking-wider">
              <ShoppingBag size={14} />
              Conversational Commerce
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              WhatsApp Catalog
            </h3>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Let people browse, ask and buy, right inside WhatsApp. Use your catalog to highlight offers, share updates and keep customers coming back.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Showcase thousands of products with photos, prices &amp; descriptions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Direct Shopify, WooCommerce, and ERP catalog synchronization</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>In-chat cart review, instant checkout, and payment links</span>
              </li>
            </ul>
            <div className="pt-2">
              <button 
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 text-[#008069] font-bold text-sm hover:gap-3 transition-all"
              >
                Start In-Chat Shopping with WhatsApp Catalog <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Visual Showcase: Catalog setup + In-chat checkout (Right) */}
          <div className="lg:col-span-7 order-1 lg:order-2 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 bg-gradient-to-tr from-white to-blue-50/70 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5">
            {/* Setup Progress Card */}
            <div className="w-full sm:w-[280px] bg-white rounded-2xl border border-slate-200 shadow-md p-4 shrink-0">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
                <div className="w-5 h-5 rounded bg-[#0668E1] flex items-center justify-center text-white text-[10px] font-black">
                  C
                </div>
                <span className="font-extrabold text-xs text-slate-900">Catalog Integration</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#25D366] font-semibold text-[11px]">
                  <CheckCircle2 size={14} /> 1. Create Catalog
                </div>
                <div className="flex items-center gap-2 text-[#25D366] font-semibold text-[11px]">
                  <CheckCircle2 size={14} /> 2. Connect to WhatsApp
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-[11px]">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0668E1] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0668E1]" />
                  </div>
                  3. Assign Partner Access
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                  4. Connect Catalog
                </div>

                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 mt-3">
                  <span className="text-[10px] text-slate-600 block mb-2">
                    Sync catalog automatically from Shopify or upload CSV:
                  </span>
                  <button className="w-full py-1.5 rounded-lg bg-[#0668E1] text-white font-bold text-xs shadow-xs">
                    Connect Shopify Store ↗
                  </button>
                </div>
              </div>
            </div>

            {/* Smartphone with Catalog Card & Checkout */}
            <div className="w-[260px] sm:w-[280px] bg-[#0b141a] rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl shrink-0">
              <div className="bg-[#efeae2] rounded-[24px] overflow-hidden flex flex-col h-[380px] relative font-sans text-xs">
                {/* Header */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <span className="font-bold text-xs">StyleBoutique</span>
                    <span className="text-[9px] text-emerald-100 block">Catalog Store</span>
                  </div>
                </div>

                {/* Message stream */}
                <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                  <div className="bg-white rounded-2xl p-2.5 shadow-xs space-y-2">
                    <img 
                      src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80" 
                      alt="Store Catalog" 
                      className="w-full h-24 object-cover rounded-xl"
                    />
                    <p className="text-[11px] font-semibold text-slate-800">
                      Welcome to our quick shopping experience. Get started by browsing our catalog here:
                    </p>
                    <button className="w-full py-1.5 rounded-lg bg-slate-100 text-[#008069] font-bold text-xs flex items-center justify-center gap-1.5">
                      <span>☰</span> Browse Store
                    </button>
                  </div>

                  {/* Order Card */}
                  <div className="bg-[#d9fdd3] rounded-2xl p-2.5 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">Order #123456789</span>
                      <span className="font-extrabold text-[#008069]">₹1,899</span>
                    </div>
                    <p className="text-[10px] text-slate-600">Quantity: 1 &bull; Tailored Linen Shirt</p>
                    <button className="w-full py-1.5 rounded-lg bg-[#25D366] text-[#0b141a] font-bold text-xs uppercase tracking-wider shadow-xs">
                      Review &amp; Pay
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* FEATURE 5: No-code Chatbot (Visual Flow Automation Builder) */}
        {/* ========================================================================= */}
        <div id="feature-bot" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Visual Showcase: Workflow Automation Builder Canvas (Left) */}
          <div className="lg:col-span-7 relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 bg-gradient-to-tr from-white to-amber-50/70 rounded-3xl border border-amber-100 shadow-xl shadow-amber-500/5">
            {/* Visual Node Diagram (Matches Screenshot with colorful nodes) */}
            <div className="w-full sm:w-[320px] bg-slate-50/80 rounded-2xl border border-slate-200 shadow-md p-4 shrink-0 font-sans relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-extrabold text-xs text-slate-900">Automation Builder</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>
              </div>

              {/* Node diagram representation */}
              <div className="space-y-3 relative">
                {/* Node 1: Send a message */}
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={13} /> Send a message
                  </span>
                  <span className="text-[9px] bg-emerald-200 px-1.5 py-0.5 rounded">Trigger</span>
                </div>

                <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

                {/* Node 2: Ask a question */}
                <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between shadow-xs">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={13} /> Ask a question
                  </span>
                  <span className="text-[9px] bg-amber-200 px-1.5 py-0.5 rounded">Input</span>
                </div>

                <div className="w-0.5 h-3 bg-slate-300 mx-auto" />

                {/* Node 3: Webhook & Condition Branches */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-900 text-[10px] font-bold flex items-center gap-1">
                    <Zap size={12} /> Webhook API
                  </div>
                  <div className="p-2 rounded-xl bg-blue-100 border border-blue-300 text-blue-900 text-[10px] font-bold flex items-center gap-1">
                    <Sliders size={12} /> Set condition
                  </div>
                </div>
              </div>
            </div>

            {/* Smartphone with 24/7 Chatbot Conversation */}
            <div className="w-[260px] sm:w-[280px] bg-[#0b141a] rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl shrink-0">
              <div className="bg-[#efeae2] rounded-[24px] overflow-hidden flex flex-col h-[380px] relative font-sans text-xs">
                {/* Header */}
                <div className="bg-[#008069] text-white px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    L
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">Learniverse</span>
                      <CheckCircle2 size={12} className="text-blue-300 fill-blue-500" />
                    </div>
                    <span className="text-[9px] text-emerald-100">@learniverse_edu</span>
                  </div>
                </div>

                {/* Chat dialog */}
                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] text-slate-800 p-2.5 rounded-2xl rounded-tr-none shadow-xs text-[11px] max-w-[85%]">
                      Hi, I wanted to know more about your mathematics course for Grade 10.
                      <div className="text-[9px] text-slate-400 text-right mt-0.5">11:15 AM</div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-white text-slate-800 p-2.5 rounded-2xl rounded-tl-none shadow-xs text-[11px] max-w-[90%] space-y-1.5">
                      <p>Hi there! We're not available right now.</p>
                      <p className="text-slate-600 text-[10px]">
                        But you can leave your phone number &amp; we'll call you in the next 24 hours?
                      </p>
                      <div className="text-[9px] text-slate-400 text-right">11:15 AM</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="bg-[#d9fdd3] text-slate-800 p-2.5 rounded-2xl rounded-tr-none shadow-xs text-[11px] max-w-[85%]">
                      Sure, call me on +44 987-4870-9896
                      <div className="text-[9px] text-slate-400 text-right mt-0.5">11:16 AM ✔✔</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Feature Text Content (Right) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Bot size={14} />
              Automated 24/7 Support
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              No-code Chatbot
            </h3>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Build flows in minutes, not hours. Answer FAQs, guide purchases, or route chats, all while staying available 24/7 across marketing, support, and sales.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Visual drag-and-drop workflow canvas with zero code required</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Smart keyword triggers, buttons, and conditional branching</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#25D366] shrink-0" />
                <span>Human agent handover when complex queries arise</span>
              </li>
            </ul>
            <div className="pt-2">
              <button 
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 text-amber-800 font-bold text-sm hover:gap-3 transition-all"
              >
                Build Your First No-code Chatbot <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
