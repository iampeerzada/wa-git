import React from 'react';
import { Wifi } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Added 'xs' for very small size
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  // Maine wifi ki position (wifiPos) ko size ke hisaab se dynamic kar diya hai
  const sizes = {
    xs: { text: 'text-lg', sub: 'text-[6px]', icon: 14, wifi: 16, wifiPos: '-top-3 -left-1' },
    sm: { text: 'text-xl', sub: 'text-[8px]', icon: 16, wifi: 18, wifiPos: '-top-4 -left-1' },
    md: { text: 'text-3xl', sub: 'text-[10px]', icon: 24, wifi: 24, wifiPos: '-top-5 -left-1.5' },
    lg: { text: 'text-4xl', sub: 'text-xs', icon: 32, wifi: 32, wifiPos: '-top-6 -left-2' },
    xl: { text: 'text-6xl', sub: 'text-sm', icon: 48, wifi: 44, wifiPos: '-top-8 -left-3' },
  };

  const s = sizes[size];

  return (
    // 'pt-8' (padding-top) add kiya hai taki Wifi frame ke bahar na kate
    <div className={`flex flex-col items-start justify-center pt-8 ${className}`}>
      <div className="flex items-end leading-none">
        {/* 'i' with Wifi on top */}
        <div className="relative flex flex-col items-center mr-[1px]">
          <Wifi 
            className={`text-[#F5A10F] absolute ${s.wifiPos}`} 
            size={s.wifi} 
            strokeWidth={3} 
          />
          <span className={`${s.text} font-black text-white leading-none tracking-tighter mt-1`}>i</span>
        </div>
        <span className={`${s.text} font-black text-white leading-none tracking-tighter`}>FastX</span>
        
        <svg xmlns="http://www.w3.org/2000/svg" width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-[#25D366] ml-2 drop-shadow-[0_0_10px_rgba(37,211,102,0.3)]`}>
          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
          <path d="M9 10a.5.5 0 0 0 1 0v.1a4.9 4.9 0 0 0 4.9 4.9h.1a.5.5 0 0 0 0-1" />
          <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z" className="fill-[#25D366]/10" stroke="none" />
        </svg>
      </div>
      <span className={`${s.sub} font-black uppercase tracking-widest text-white mt-1 ml-6 text-opacity-90`}>Whatsapp API Gateway</span>
    </div>
  );
};

export default BrandLogo;