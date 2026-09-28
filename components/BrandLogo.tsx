import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMeta?: boolean;
  textColor?: string;
  iFontSize?: string;
  textFontSize?: string;
  subFontSize?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md', 
  isMeta = false, 
  textColor,
  iFontSize,
  textFontSize,
  subFontSize
}) => {
  const sizes = {
    xs: { text: 'text-lg', sub: 'text-[6px]', icon: 14 },
    sm: { text: 'text-xl', sub: 'text-[8px]', icon: 16 },
    md: { text: 'text-3xl', sub: 'text-[10px]', icon: 24 },
    lg: { text: 'text-4xl', sub: 'text-xs', icon: 32 },
    xl: { text: 'text-6xl', sub: 'text-sm', icon: 48 },
  };
  const s = sizes[size];
  const color = isMeta ? '#1877F2' : '#25D366'; // Meta blue or WhatsApp green
  
  return (
    <div className={`flex flex-col items-start justify-center ${className}`}>
      <div className="flex items-end leading-none">
        <span 
          className={`${s.text} font-black ${textColor ? '' : 'text-white'} leading-none tracking-tighter`}
          style={{
            ...(textColor ? { color: textColor } : {}),
            ...(iFontSize ? { fontSize: iFontSize } : {})
          }}
        >
          i
        </span>
        <span 
          className={`${s.text} font-black ${textColor ? '' : 'text-white'} leading-none tracking-tighter`}
          style={{
            ...(textColor ? { color: textColor } : {}),
            ...(textFontSize ? { fontSize: textFontSize } : {})
          }}
        >
          FastX
        </span>
        
        {isMeta ? (
          <svg xmlns="http://www.w3.org/2000/svg" width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-[#1877F2] ml-2 drop-shadow-[0_0_10px_rgba(24,119,242,0.3)]`}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-[#25D366] ml-2 drop-shadow-[0_0_10px_rgba(37,211,102,0.3)]`}>
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0v.1a4.9 4.9 0 0 0 4.9 4.9h.1a.5.5 0 0 0 0-1" />
            <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z" className="fill-[#25D366]/10" stroke="none" />
          </svg>
        )}
      </div>
      <span 
        className={`${s.sub} font-black uppercase tracking-widest ${textColor ? 'text-slate-500' : 'text-white text-opacity-90'} mt-1`}
        style={subFontSize ? { fontSize: subFontSize } : undefined}
      >
        {isMeta ? 'Meta Verified Partner' : 'Whatsapp Business API Gateway'}
      </span>
    </div>
  );
};
export default BrandLogo;
