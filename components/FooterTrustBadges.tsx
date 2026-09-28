import React from 'react';

// Official Meta Business Technical Certified Badge (Matching meta-badge-icon1.webp)
export const MetaBusinessPartnerBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex flex-col w-[138px] sm:w-[148px] rounded-xl border-2 border-[#D45B13] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all group shrink-0 ${className}`}>
    {/* Top White Section with Meta Infinity Logo */}
    <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white">
      <svg viewBox="0 0 36 24" className="w-7 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M17.8 8.8C15.4 5.3 12.8 3 10.3 3 5.4 3 2 6.7 2 11.2c0 5.8 5.7 11.5 12.4 17.5 1.5 1.3 3.1 2.6 4.7 3.8.4-.3.9-.7 1.4-1.1 3.2-2.6 6.3-5.5 8.4-8.4 2.1-2.9 3.1-5.6 3.1-7.8 0-4.5-3.4-8.2-8.3-8.2-2.5 0-5.1 2.3-7.7 5.8l-1.1 1.5-1.1-1.5zm-1.8 12.5C11.8 17.5 8 13.3 8 10.6c0-2.4 1.7-4.1 3.9-4.1 2.2 0 4.4 2.3 6.6 5.8l-2.5 9zm7.8 0l-2.5-9c2.2-3.5 4.4-5.8 6.6-5.8 2.2 0 3.9 1.7 3.9 4.1 0 2.7-3.8 6.9-8 10.7z" 
          fill="#0668E1" 
          transform="scale(0.85) translate(2, -2)"
        />
      </svg>
      <span className="text-base font-black text-[#111827] tracking-tight">Meta</span>
    </div>
    {/* Bottom Orange Section with Certified Text */}
    <div className="bg-[#D45B13] py-2 px-1.5 flex flex-col items-center justify-center text-center leading-tight">
      <span className="text-[7.5px] font-bold text-white tracking-wider uppercase">WHATSAPP FOR</span>
      <span className="text-[7.5px] font-bold text-white tracking-wider uppercase">BUSINESS TECHNICAL</span>
      <span className="text-[9px] font-black text-white tracking-wider uppercase mt-0.5">CERTIFIED COMPANY</span>
    </div>
  </div>
);

// Meta Business Messaging Strategy Certified Badge (Matching meta-badge-icon2.webp)
export const WhatsAppProviderBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex flex-col w-[138px] sm:w-[148px] rounded-xl border-2 border-[#EAB308] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all group shrink-0 ${className}`}>
    {/* Top White Section with Meta Infinity Logo */}
    <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white">
      <svg viewBox="0 0 36 24" className="w-7 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M17.8 8.8C15.4 5.3 12.8 3 10.3 3 5.4 3 2 6.7 2 11.2c0 5.8 5.7 11.5 12.4 17.5 1.5 1.3 3.1 2.6 4.7 3.8.4-.3.9-.7 1.4-1.1 3.2-2.6 6.3-5.5 8.4-8.4 2.1-2.9 3.1-5.6 3.1-7.8 0-4.5-3.4-8.2-8.3-8.2-2.5 0-5.1 2.3-7.7 5.8l-1.1 1.5-1.1-1.5zm-1.8 12.5C11.8 17.5 8 13.3 8 10.6c0-2.4 1.7-4.1 3.9-4.1 2.2 0 4.4 2.3 6.6 5.8l-2.5 9zm7.8 0l-2.5-9c2.2-3.5 4.4-5.8 6.6-5.8 2.2 0 3.9 1.7 3.9 4.1 0 2.7-3.8 6.9-8 10.7z" 
          fill="#0668E1" 
          transform="scale(0.85) translate(2, -2)"
        />
      </svg>
      <span className="text-base font-black text-[#111827] tracking-tight">Meta</span>
    </div>
    {/* Bottom Warm Yellow Section */}
    <div className="bg-[#FDE047] py-2 px-1.5 flex flex-col items-center justify-center text-center leading-tight">
      <span className="text-[7.5px] font-bold text-[#111827] tracking-wider uppercase">BUSINESS MESSAGING</span>
      <span className="text-[7.5px] font-bold text-[#111827] tracking-wider uppercase">STRATEGY</span>
      <span className="text-[9px] font-black text-[#111827] tracking-wider uppercase mt-0.5">CERTIFIED COMPANY</span>
    </div>
  </div>
);

// ISO 27001 Security Certification Badge (Matching iso-27001.webp)
export const ISO27001Badge: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex items-center justify-center w-[90px] h-[90px] sm:w-[98px] sm:h-[98px] shrink-0 group ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="iso-curve-top" d="M 14,50 A 36,36 0 0,1 86,50" fill="none" />
        <path id="iso-curve-bottom" d="M 86,54 A 36,36 0 0,1 14,54" fill="none" />
      </defs>
      {/* Outer Blue Rings */}
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#007298" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#007298" strokeWidth="1" />
      <circle cx="50" cy="50" r="34" fill="#F1F5F9" stroke="#007298" strokeWidth="1.5" />
      {/* Globe Meridian Lines in Center */}
      <circle cx="50" cy="50" r="32" fill="#E2E8F0" />
      <ellipse cx="50" cy="50" rx="16" ry="32" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
      <ellipse cx="50" cy="50" rx="26" ry="32" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
      <line x1="18" y1="50" x2="82" y2="50" stroke="#CBD5E1" strokeWidth="0.8" />
      <line x1="22" y1="36" x2="78" y2="36" stroke="#CBD5E1" strokeWidth="0.6" />
      <line x1="22" y1="64" x2="78" y2="64" stroke="#CBD5E1" strokeWidth="0.6" />
      {/* Top Arc Text */}
      <text fontSize="5.5" fontWeight="800" fill="#007298" fontFamily="system-ui, sans-serif" letterSpacing="0.2">
        <textPath href="#iso-curve-top" startOffset="50%" textAnchor="middle">
          Information Security Management System
        </textPath>
      </text>
      {/* Center ISO & 27001 */}
      <text x="50" y="47" textAnchor="middle" fill="#FFFFFF" stroke="#007298" strokeWidth="1.2" strokeLinejoin="round" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="19" letterSpacing="0.5">
        ISO
      </text>
      <text x="50" y="47" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="19" letterSpacing="0.5">
        ISO
      </text>
      <text x="50" y="60" textAnchor="middle" fill="#0F172A" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" letterSpacing="0.5">
        27001
      </text>
      {/* Bottom Arc Text */}
      <text fontSize="7" fontWeight="900" fill="#007298" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
        <textPath href="#iso-curve-bottom" startOffset="50%" textAnchor="middle">
          Certified
        </textPath>
      </text>
    </svg>
  </div>
);

// GDPR Blue Compliant Badge (Matching GDPR_Blue.webp)
export const GDPRCompliantBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative flex items-center justify-center w-[90px] h-[90px] sm:w-[98px] sm:h-[98px] shrink-0 group ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
      {/* Blue Circle matching GDPR_Blue.webp */}
      <circle cx="50" cy="50" r="49" fill="#1D70B8" />
      {/* 12 EU Stars */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + 38 * Math.sin(rad);
        const y = 50 - 38 * Math.cos(rad);
        return (
          <polygon 
            key={i} 
            points={`${x},${y-3.2} ${x+1},${y-1} ${x+3.2},${y-1} ${x+1.5},${y+1} ${x+2.2},${y+3.2} ${x},${y+1.6} ${x-2.2},${y+3.2} ${x-1.5},${y+1} ${x-3.2},${y-1} ${x-1},${y-1}`} 
            fill="#0F172A" 
          />
        );
      })}
      {/* Bold White GDPR text */}
      <text x="50" y="58" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="21" letterSpacing="0.5">
        GDPR
      </text>
    </svg>
  </div>
);

// Official G2 Recognition Badge (Exact match to footer-g2-badge1.svg through footer-g2-badge8.svg)
interface OfficialG2BadgeProps {
  season?: string;
  region?: string;
  titleLines: string[];
  subtitle?: string;
  chevron: 'stripes' | 'pink' | 'yellow' | 'blue';
  className?: string;
}

export const OfficialG2Badge: React.FC<OfficialG2BadgeProps> = ({
  season = "SUMMER 2026",
  region,
  titleLines,
  subtitle,
  chevron,
  className = "",
}) => {
  return (
    <div className={`relative flex flex-col items-center w-full max-w-[116px] hover:-translate-y-1 transition-transform duration-200 group select-none shrink-0 ${className}`}>
      <svg viewBox="0 0 100 125" className="w-full h-auto drop-shadow-sm filter" xmlns="http://www.w3.org/2000/svg">
        {/* White Shield Body */}
        <path d="M 2 2 H 98 V 98 L 50 123 L 2 98 Z" fill="#FFFFFF" />
        
        {/* Top Right G2 Red Corner Badge */}
        <rect x="76" y="2" width="22" height="20" fill="#E03622" />
        <text x="81" y="16" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="12" letterSpacing="-0.5">G</text>
        <text x="90" y="12" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="8">2</text>

        {/* Top Header Divider Line */}
        <line x1="2" y1="22" x2="98" y2="22" stroke="#1E1E1E" strokeWidth="1.5" />

        {/* Header Season / Region Text */}
        {region ? (
          <>
            <text x="39" y="11" textAnchor="middle" fill="#1E1E1E" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="6.2" letterSpacing="0.4">
              {season}
            </text>
            <text x="39" y="18" textAnchor="middle" fill="#1E1E1E" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="6" letterSpacing="0.4">
              {region}
            </text>
          </>
        ) : (
          <text x="39" y="14" textAnchor="middle" fill="#1E1E1E" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="6.8" letterSpacing="0.4">
            {season}
          </text>
        )}

        {/* Center Title */}
        {titleLines.length === 1 ? (
          <text 
            x="50" 
            y={subtitle ? 55 : 59} 
            textAnchor="middle" 
            fill="#000000" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="900" 
            fontSize={titleLines[0].length > 12 ? 11 : 14.5} 
            letterSpacing="-0.3"
          >
            {titleLines[0]}
          </text>
        ) : (
          <>
            <text 
              x="50" 
              y={subtitle ? 48 : 52} 
              textAnchor="middle" 
              fill="#000000" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize={titleLines[0].length > 10 ? 10 : 12} 
              letterSpacing="-0.3"
            >
              {titleLines[0]}
            </text>
            <text 
              x="50" 
              y={subtitle ? 62 : 66} 
              textAnchor="middle" 
              fill="#000000" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize={titleLines[1].length > 10 ? 9.5 : 12} 
              letterSpacing="-0.3"
            >
              {titleLines[1]}
            </text>
          </>
        )}

        {/* Subtitle (e.g. MID-MARKET, SMALL BUSINESS) */}
        {subtitle && (
          <text 
            x="50" 
            y="76" 
            textAnchor="middle" 
            fill="#000000" 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="800" 
            fontSize="6.2" 
            letterSpacing="0.4"
          >
            {subtitle}
          </text>
        )}

        {/* Bottom Chevron Accents */}
        {chevron === 'stripes' && (
          <>
            <polygon points="2,98 50,123 98,98 98,92 50,117 2,92" fill="#F59E0B" />
            <polygon points="2,92 50,117 98,92 98,86 50,111 2,86" fill="#EA580C" />
            <polygon points="2,86 50,111 98,86 98,80 50,105 2,80" fill="#E03622" />
          </>
        )}
        {chevron === 'pink' && (
          <polygon points="2,98 50,123 98,98 98,87 50,112 2,87" fill="#E11D48" />
        )}
        {chevron === 'yellow' && (
          <polygon points="2,98 50,123 98,98 98,87 50,112 2,87" fill="#F59E0B" />
        )}
        {chevron === 'blue' && (
          <polygon points="2,98 50,123 98,98 98,87 50,112 2,87" fill="#2563EB" />
        )}

        {/* Outer Shield Outline */}
        <path d="M 2 2 H 98 V 98 L 50 123 L 2 98 Z" fill="none" stroke="#1E1E1E" strokeWidth="2" strokeLinejoin="miter" />
      </svg>
    </div>
  );
};

// Backwards-compatible alias for any code importing G2Badge
export const G2Badge: React.FC<any> = (props) => {
  return (
    <OfficialG2Badge 
      season="SUMMER 2026"
      titleLines={["Leader"]}
      chevron="stripes"
      {...props}
    />
  );
};

// Full Footer Trust & Accreditation Section (Matches wati.io footer showcase with original uploaded logos)
export const FooterTrustBadgesSection: React.FC = () => {
  return (
    <section className="py-12 bg-white text-slate-900 border-t border-b border-slate-200 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Title with G2 rating & Trust indicators */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
              <span className="text-xs font-black text-[#008069] uppercase tracking-widest">
                Accredited &amp; Compliant
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Enterprise Trust, Security &amp; Market Leadership
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Verified Meta Business Partner &bull; Certified for ISO 27001 &amp; GDPR &bull; Rated 4.8/5 on G2 across leading enterprise software categories.
            </p>
          </div>

          {/* Quick G2 Review score pill */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-start md:self-auto shrink-0 shadow-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-extrabold text-sm">4.8 / 5</span>
                <div className="flex text-[#FA4616]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <svg key={n} viewBox="0 0 20 20" className="w-3 h-3 fill-current">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Ranked #1 on G2
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#E03622] flex items-center justify-center text-white font-black text-xs shadow-xs">
              g2
            </div>
          </div>
        </div>

        {/* Row 1: Official Meta Technical, Meta Strategy, ISO 27001 & GDPR Badges */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5">
          <MetaBusinessPartnerBadge />
          <WhatsAppProviderBadge />
          <ISO27001Badge />
          <GDPRCompliantBadge />
        </div>

        {/* Row 2: 8 Official G2 Badges (Matching footer-g2-badge1.svg through footer-g2-badge8.svg) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <span className="text-[#E03622]">★</span> Official G2 Recognition Badges
            </span>
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
              WhatsApp Marketing &amp; Customer Engagement
            </span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4 justify-items-center">
            {/* 1: footer-g2-badge1.svg - Leader */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              titleLines={["Leader"]}
              chevron="stripes"
            />
            {/* 2: footer-g2-badge2.svg - Leader Mid-Market */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              titleLines={["Leader"]}
              subtitle="MID-MARKET"
              chevron="stripes"
            />
            {/* 3: footer-g2-badge3.svg - Momentum Leader */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              titleLines={["Momentum", "Leader"]}
              chevron="stripes"
            />
            {/* 4: footer-g2-badge4.svg - High Performer Mid-Market India */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              region="INDIA"
              titleLines={["High", "Performer"]}
              subtitle="MID-MARKET"
              chevron="pink"
            />
            {/* 5: footer-g2-badge5.svg - High Performer Mid-Market Asia Pacific */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              region="ASIA PACIFIC"
              titleLines={["High", "Performer"]}
              subtitle="MID-MARKET"
              chevron="pink"
            />
            {/* 6: footer-g2-badge6.svg - High Performer Mid-Market Asia */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              region="ASIA"
              titleLines={["High", "Performer"]}
              subtitle="MID-MARKET"
              chevron="pink"
            />
            {/* 7: footer-g2-badge7.svg - Best Usability Small Business */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              titleLines={["Best", "Usability"]}
              subtitle="SMALL BUSINESS"
              chevron="yellow"
            />
            {/* 8: footer-g2-badge8.svg - Most Implementable */}
            <OfficialG2Badge 
              season="SUMMER 2026"
              titleLines={["Most", "Implementable"]}
              chevron="blue"
            />
          </div>
        </div>

      </div>
    </section>
  );
};
