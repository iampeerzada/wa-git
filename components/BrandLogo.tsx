import React from 'react';

/**
 * BrandLogo Component Props
 * Logic: Supports multiple sizes, dynamic Meta/WhatsApp brand switching, custom text colors, and font sizes.
 */
interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMeta?: boolean;
  textColor?: string;
  iColor?: string;
  iFontSize?: string;
  textFontSize?: string;
  subFontSize?: string;
}

/**
 * BrandLogo: Renders the official iFastX brand mark and verified partner subtitle
 * Logic: Aligns brand colors with WhatsApp Emerald (#25D366) and Meta Blue (#1877F2) theme.
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md', 
  isMeta = false, 
  textColor,
  iColor = '#ceae1f',
  iFontSize,
  textFontSize,
  subFontSize
}) => {
  // Instruction: Map responsive scale sizes for typographic hierarchy
  // Logic: Defines font classes and icon sizes for each supported size tier
  const sizes = {
    xs: { text: 'text-lg', sub: 'text-[7px]', icon: 12, badgePadding: 'px-1.5 py-0.5' },
    sm: { text: 'text-xl', sub: 'text-[8px]', icon: 14, badgePadding: 'px-2 py-0.5' },
    md: { text: 'text-2xl sm:text-3xl', sub: 'text-[9px]', icon: 16, badgePadding: 'px-2.5 py-0.5' },
    lg: { text: 'text-3xl sm:text-4xl', sub: 'text-[10px]', icon: 18, badgePadding: 'px-3 py-1' },
    xl: { text: 'text-5xl sm:text-6xl', sub: 'text-xs', icon: 22, badgePadding: 'px-3.5 py-1' },
  };
  const s = sizes[size];

  // Instruction: Determine primary accent color based on provider (WhatsApp green vs Meta blue)
  // Logic: Sets theme-matched brand accents for Meta Cloud API or standard Baileys/WhatsApp
  const accentColor = isMeta ? '#1877F2' : '#25D366';

  return (
    <div className={`flex flex-col items-start justify-center select-none ${className}`}>
      {/* Logic: Top row containing the brand wordmark "iFastX" and official verified symbol */}
      <div className="flex items-center gap-1.5 leading-none">
        <div className="flex items-baseline font-black tracking-tight">
          {/* Instruction: Style logo letter "i" with the selected accent color */}
          {/* Logic: Applies color: #ceae1f to the "i" letter as specified in style selection */}
          <span 
            className={`${s.text} font-black text-[#ceae1f]`}
            style={{
              color: iColor || '#ceae1f',
              ...(iFontSize ? { fontSize: iFontSize } : {})
            }}
          >
            i
          </span>
          
          {/* Logic: Main "Fast" wordmark in high-contrast theme color */}
          <span 
            className={`${s.text} font-black tracking-tight ${textColor ? '' : 'text-white'}`}
            style={{
              ...(textColor ? { color: textColor } : {}),
              ...(textFontSize ? { fontSize: textFontSize } : {})
            }}
          >
            Fast
          </span>

          {/* Logic: Modern tech "X" in matching brand accent */}
          <span 
            className={`${s.text} font-black text-[#25D366]`}
            style={{
              color: isMeta ? '#53bdeb' : '#25D366',
              ...(textFontSize ? { fontSize: textFontSize } : {})
            }}
          >
            X
          </span>
        </div>

        {/* Logic: Verified partner shield icon with soft glow matching the theme */}
        <div className="flex items-center ml-0.5">
          {isMeta ? (
            <span title="Official Meta Business Partner" className="flex items-center text-[#53bdeb]">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width={s.icon} 
                height={s.icon} 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="drop-shadow-[0_0_8px_rgba(24,119,242,0.4)]"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
            </span>
          ) : (
            <span title="Official WhatsApp Business Verified Partner" className="flex items-center text-[#25D366]">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width={s.icon} 
                height={s.icon} 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="drop-shadow-[0_0_8px_rgba(37,211,102,0.4)]"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Logic: Theme-matched partner subtitle badge pill with subtle borders and refined typography */}
      <div className="mt-1">
        <span 
          className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md border transition-colors ${s.badgePadding} ${s.sub} ${
            textColor 
              ? 'bg-slate-100 text-slate-700 border-slate-300' 
              : isMeta
                ? 'bg-[#1877F2]/15 text-[#53bdeb] border-[#1877F2]/30 shadow-xs'
                : 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30 shadow-xs'
          }`}
          style={subFontSize ? { fontSize: subFontSize } : undefined}
        >
          {/* Logic: Small status indicator dot */}
          <span 
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              textColor
                ? 'bg-slate-500'
                : isMeta ? 'bg-[#53bdeb]' : 'bg-[#25D366]'
            }`} 
          />
          <span>{isMeta ? 'Meta Verified Partner' : 'Meta Verified Partner'}</span>
        </span>
      </div>
    </div>
  );
};

export default BrandLogo;
