"use client";

import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

type Props = {
  children: React.ReactNode; // the email preview
  className?: string;
  hideOnMobile?: boolean; // NEW prop: hide device frame on mobile
};

export default function DeviceFrame({ children, className, hideOnMobile = false }: Props) {
  // iPhone 14 logical size used by our SVG: outer 390x844, inner screen 366x820 at (12,12)
  // Visual size reduced via responsive scale to avoid dominating the layout
  
  // If hideOnMobile is true, show content directly on mobile
  if (hideOnMobile) {
    return (
      <>
        {/* Mobile/Tablet: Show content directly */}
        <div className="md:hidden w-full max-w-[360px] mx-auto px-4">
          {children}
        </div>
        
        {/* Desktop: Show with device frame */}
        <div className={`hidden md:inline-block origin-top scale-[0.75] sm:scale-[0.78] md:scale-[0.82] lg:scale-[0.88] xl:scale-95 w-full max-w-[600px] mx-auto ${className ?? ""}`}>
          <div className="relative mx-auto max-w-sm rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_40px_80px_rgba(0,0,0,0.8)] p-1 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-full bg-white/10" />
            <div className="relative w-[390px] h-[844px] drop-shadow-2xl">
            {/* Glow effect around device */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 rounded-[80px] blur-2xl opacity-50" />
            
            {/* Device SVG as background */}
            <Image
              src="/device/iphone-14.svg"
              alt="iPhone displaying JobPing email preview"
              priority={false}
              loading="lazy"
              fill
              sizes="(max-width: 768px) 390px, 440px"
              quality={85}
              className="pointer-events-none select-none relative z-10"
            />
            {/* Screen content: align to the inner screen rect (x:12,y:12,w:366,h:820) */}
            <div
              className="absolute left-[12px] top-[12px] w-[366px] h-[820px] overflow-hidden rounded-[44px] bg-black relative z-10 shadow-2xl"
              aria-label="Email preview content"
            >
              {/* Status bar */}
              <div className="relative z-10 px-4 pt-2 pb-1">
                <Image 
                  src="/device/statusbar-dark.svg" 
                  alt="" 
                  width={366} 
                  height={20} 
                  loading="lazy"
                  aria-hidden="true" 
                />
              </div>
              {/* Scrollable email body */}
              <motion.div 
                className="relative z-10 h-[788px] overflow-y-auto pb-6 px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {children}
              </motion.div>
            </div>
          </div>
          </div>
        </div>
      </>
    );
  }
  
  // Default behavior: show frame on all sizes (for Hero and ExampleMatchesModal)
  return (
    <div className={`inline-block origin-top scale-[0.82] sm:scale-[0.86] md:scale-[0.9] lg:scale-100 w-full max-w-[600px] mx-auto ${className ?? ""}`}>
      <div className="relative mx-auto max-w-sm rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_40px_80px_rgba(0,0,0,0.8)] p-1 ring-1 ring-white/5 backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-full bg-white/10" />
        <div className="relative w-[390px] h-[844px] drop-shadow-2xl">
          {/* Glow effect around device */}
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 rounded-[80px] blur-2xl opacity-50" />
          
          {/* Device SVG as background */}
          <Image
            src="/device/iphone-14.svg"
            alt="iPhone displaying JobPing email preview"
            priority={false}
            loading="lazy"
            fill
            sizes="(max-width: 768px) 390px, 440px"
            quality={85}
            className="pointer-events-none select-none relative z-10"
          />
          {/* Screen content: align to the inner screen rect (x:12,y:12,w:366,h:820) */}
          <div
            className="absolute left-[12px] top-[12px] w-[366px] h-[820px] overflow-hidden rounded-[44px] bg-black relative z-10 shadow-2xl"
            aria-label="Email preview content"
          >
            {/* Status bar */}
            <div className="relative z-10 px-4 pt-2 pb-1">
              <Image 
                src="/device/statusbar-dark.svg" 
                alt="" 
                width={366} 
                height={20} 
                loading="lazy"
                aria-hidden="true" 
              />
            </div>
            {/* Scrollable email body */}
            <motion.div 
              className="relative z-10 h-[788px] overflow-y-auto pb-6 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
