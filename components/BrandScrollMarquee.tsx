import React from 'react';

interface BrandItem {
  id: string;
  name: string;
  category: string;
  logo: React.ReactNode;
}

export const BrandScrollMarquee: React.FC = () => {
  // Row 1 Brands
  const row1Brands: BrandItem[] = [
    {
      id: 'amazon',
      name: 'Amazon',
      category: 'Global E-Commerce',
      logo: (
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center text-slate-900 font-extrabold text-xl tracking-tight leading-none">
            amazon
          </div>
          <svg viewBox="0 0 100 24" className="w-16 h-3.5 -mt-1 text-[#FF9900]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M10 8 Q 50 24 90 6" />
            <path d="M84 4 L 92 6 L 88 14" fill="currentColor" strokeWidth="1" />
          </svg>
        </div>
      ),
    },
    {
      id: 'flipkart',
      name: 'Flipkart',
      category: 'Retail & Commerce',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2874F0] flex items-center justify-center text-[#FFE500] font-black text-lg italic shadow-xs">
            f
          </div>
          <div className="flex flex-col text-left">
            <span className="text-slate-900 font-extrabold text-lg leading-tight tracking-tight italic">
              Flipkart
            </span>
            <span className="text-[9px] font-semibold text-[#2874F0] tracking-wider uppercase">Plus Enterprise</span>
          </div>
        </div>
      ),
    },
    {
      id: 'policybazaar',
      name: 'PolicyBazaar',
      category: 'InsurTech & Fintech',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00A389]/15 border border-[#00A389]/30 flex items-center justify-center text-[#00A389]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <div className="flex items-baseline font-black text-lg tracking-tight">
            <span className="text-slate-900">policy</span>
            <span className="text-[#00A389]">bazaar</span>
          </div>
        </div>
      ),
    },
    {
      id: 'swiggy',
      name: 'Swiggy',
      category: 'On-Demand Delivery',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FC8019] flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <span className="font-black text-lg text-slate-900 tracking-wider">SWIGGY</span>
        </div>
      ),
    },
    {
      id: 'zomato',
      name: 'Zomato',
      category: 'Food Tech & Quick Commerce',
      logo: (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E23744] text-white shadow-xs">
          <span className="font-black italic text-xl tracking-tighter lowercase">zomato</span>
        </div>
      ),
    },
    {
      id: 'tatacliq',
      name: 'Tata CLiQ',
      category: 'Lifestyle & Luxury Commerce',
      logo: (
        <div className="flex items-center gap-2">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase">TATA</span>
            <div className="flex items-baseline leading-none">
              <span className="text-slate-900 font-black text-xl tracking-tight">CL</span>
              <span className="text-[#FF007A] font-black text-xl">i</span>
              <span className="text-slate-900 font-black text-xl tracking-tight">Q</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dominos',
      name: "Domino's",
      category: 'Global Food Retail',
      logo: (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-[#0078AE] flex items-center justify-center rotate-45 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div className="w-4 h-4 rounded-sm bg-[#E31837] flex items-center justify-center rotate-45 shadow-2xs">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">Domino's</span>
        </div>
      ),
    },
    {
      id: 'makemytrip',
      name: 'MakeMyTrip',
      category: 'Online Travel Enterprise',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E53935] to-[#FB8C00] flex items-center justify-center text-white font-black text-xs shadow-xs">
            mmt
          </div>
          <div className="flex items-center font-extrabold text-base tracking-tight">
            <span className="text-[#E53935]">make</span>
            <span className="text-slate-900">my</span>
            <span className="text-[#1E88E5]">trip</span>
          </div>
        </div>
      ),
    },
    {
      id: 'myntra',
      name: 'Myntra',
      category: 'Fashion & E-Commerce',
      logo: (
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
            <path d="M4 18L9 6L14 18" stroke="#FF3F6C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 18L15 6L20 18" stroke="#FFA700" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">Myntra</span>
        </div>
      ),
    },
    {
      id: 'magalu',
      name: 'Magalu',
      category: 'Enterprise Marketplace',
      logo: (
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#0086FF] text-white font-black text-lg tracking-tight">
            magalu
          </div>
        </div>
      ),
    },
    {
      id: 'nissan',
      name: 'Nissan',
      category: 'Global Automotive',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-slate-800 flex items-center justify-center">
            <div className="w-full h-0.5 bg-slate-800" />
          </div>
          <span className="font-black text-base text-slate-900 tracking-[0.25em] uppercase">NISSAN</span>
        </div>
      ),
    },
  ];

  // Row 2 Brands
  const row2Brands: BrandItem[] = [
    {
      id: 'mercedes',
      name: 'Mercedes-AMG PETRONAS F1 Team',
      category: 'Motorsport & Engineering',
      logo: (
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2 L12 12 L4 18" />
            <path d="M12 12 L20 18" />
          </svg>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 font-black text-xs tracking-wider text-slate-900 leading-tight">
              <span>MERCEDES-AMG</span>
            </div>
            <span className="text-[10px] font-black text-[#00A19B] tracking-widest uppercase leading-none">
              PETRONAS F1 TEAM
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'hdfc',
      name: 'HDFC Bank',
      category: 'Banking & Financial Services',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[#004C8F] p-1 flex items-center justify-center">
            <div className="w-full h-full bg-[#ED232A] rounded-2xs flex items-center justify-center">
              <div className="w-2 h-2 bg-white" />
            </div>
          </div>
          <div className="flex items-center font-black text-base text-[#004C8F] tracking-tight">
            <span>HDFC BANK</span>
          </div>
        </div>
      ),
    },
    {
      id: 'icici',
      name: 'ICICI Bank',
      category: 'Banking & Financial Services',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#F37021] flex items-center justify-center text-white font-black italic text-sm">
            i
          </div>
          <div className="flex items-baseline font-black text-base tracking-tight text-[#053c6d]">
            <span className="text-[#F37021]">ICICI</span>
            <span className="ml-1">Bank</span>
          </div>
        </div>
      ),
    },
    {
      id: 'axis',
      name: 'Axis Bank',
      category: 'Banking & Financial Services',
      logo: (
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#97144D]" fill="currentColor">
            <polygon points="12,2 22,22 15,22 12,14 9,22 2,22" />
          </svg>
          <span className="font-black text-base text-[#97144D] tracking-tight">AXIS BANK</span>
        </div>
      ),
    },
    {
      id: 'angelone',
      name: 'Angel One',
      category: 'Fintech & Wealth Tech',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#F26522] to-[#FF8A00] flex items-center justify-center text-white shadow-xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
            </svg>
          </div>
          <div className="flex items-center font-extrabold text-base tracking-tight">
            <span className="text-slate-900">Angel</span>
            <span className="text-[#F26522]">One</span>
          </div>
        </div>
      ),
    },
    {
      id: 'bajaj',
      name: 'Bajaj',
      category: 'Automotive & Finance',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#003B70] flex items-center justify-center text-white font-black text-xs">
            B
          </div>
          <span className="font-black text-lg text-[#003B70] tracking-[0.15em] uppercase">BAJAJ</span>
        </div>
      ),
    },
    {
      id: 'airtel',
      name: 'Airtel',
      category: 'Telecom & Digital Services',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#ED1C24] flex items-center justify-center text-white shadow-xs">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
            </svg>
          </div>
          <span className="font-extrabold text-lg text-[#ED1C24] tracking-tight lowercase">airtel</span>
        </div>
      ),
    },
    {
      id: 'jio',
      name: 'Jio',
      category: 'Telecom & Digital Ecosystem',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0F3E99] flex items-center justify-center text-white font-black text-base shadow-xs">
            Jio
          </div>
          <span className="font-bold text-xs uppercase tracking-widest text-[#0F3E99]">Enterprise</span>
        </div>
      ),
    },
    {
      id: 'bsnl',
      name: 'BSNL',
      category: 'National Telecom Network',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#004B87] p-1 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#ED1C24]" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" />
              <path d="M12 4 L12 20" />
              <path d="M4 12 L20 12" />
            </svg>
          </div>
          <span className="font-black text-lg text-[#004B87] tracking-wider uppercase">BSNL</span>
        </div>
      ),
    },
    {
      id: 'nivea',
      name: 'NIVEA',
      category: 'Global Consumer Care',
      logo: (
        <div className="px-3.5 py-1.5 rounded bg-[#003270] text-white font-black text-base tracking-[0.2em] uppercase shadow-xs">
          NIVEA
        </div>
      ),
    },
    {
      id: 'skillcircle',
      name: 'Skill Circle',
      category: 'EdTech & Digital Institute',
      logo: (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-[#FA8C16] flex items-center justify-center text-[#FA8C16]">
            <div className="w-3.5 h-3.5 rounded-full bg-[#FA8C16]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">SkillCircle</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">EdTech Academy</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full pt-8 sm:pt-10 border-t border-sky-100 overflow-hidden relative">
      <style>{`
        @keyframes scroll-marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-track-left {
          display: flex;
          width: max-content;
          animation: scroll-marquee-left 42s linear infinite;
        }
        .marquee-track-right {
          display: flex;
          width: max-content;
          animation: scroll-marquee-right 45s linear infinite;
        }
        .marquee-wrapper:hover .marquee-track-left,
        .marquee-wrapper:hover .marquee-track-right {
          animation-play-state: paused;
        }
      `}</style>

      {/* Header title */}
      <div className="text-center mb-6 sm:mb-8 px-4">
        <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.35em]">
          Trusted by 10,000+ Fast-Growing Global Brands &amp; Enterprises
        </p>
      </div>

      {/* Marquee Container with smooth left & right gradient fade masks */}
      <div className="relative marquee-wrapper">
        {/* Left gradient fade mask */}
        <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#f3f8fd] via-[#f3f8fd]/80 to-transparent z-10 pointer-events-none" />
        
        {/* Right gradient fade mask */}
        <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

        {/* Row 1: Left Scroll */}
        <div className="marquee-track-left flex items-center gap-4 sm:gap-6 pb-4">
          {/* Duplicate row twice for infinite seamless loop */}
          {[...row1Brands, ...row1Brands].map((brand, idx) => (
            <div
              key={`row1-${brand.id}-${idx}`}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shrink-0 cursor-default select-none min-w-[170px] sm:min-w-[190px] justify-center"
            >
              {brand.logo}
            </div>
          ))}
        </div>

        {/* Row 2: Right Scroll */}
        <div className="marquee-track-right flex items-center gap-4 sm:gap-6 pt-1">
          {/* Duplicate row twice for infinite seamless loop */}
          {[...row2Brands, ...row2Brands].map((brand, idx) => (
            <div
              key={`row2-${brand.id}-${idx}`}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shrink-0 cursor-default select-none min-w-[170px] sm:min-w-[190px] justify-center"
            >
              {brand.logo}
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer trust guarantee */}
      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-[#008069]" />
        <span>Enterprise WhatsApp Business API Gateway with 99.99% Guaranteed Delivery</span>
      </div>
    </div>
  );
};
