"use client";

import { useEffect, useRef } from "react";

export default function HeroBackgroundAura() {
  const gridRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if SVG grid pattern loaded successfully
    const checkGridPattern = () => {
      if (!gridRef.current || !fallbackRef.current) return;
      
      // Test if SVG pattern is rendering
      const testImg = new Image();
      testImg.onload = () => {
        // SVG loaded successfully
        if (fallbackRef.current) {
          fallbackRef.current.style.display = 'none';
        }
      };
      testImg.onerror = () => {
        // SVG failed, show CSS fallback
        if (fallbackRef.current) {
          fallbackRef.current.style.display = 'block';
        }
        if (gridRef.current) {
          gridRef.current.style.display = 'none';
        }
      };
      testImg.src = '/grid.svg';
    };

    // Check after a short delay to allow SVG to load
    const timeout = setTimeout(checkGridPattern, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden"
    >
      {/* Large ambient glow behind everything */}
      <div
        className="absolute left-1/2 top-[20%] h-[800px] w-[2000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#a855f7]/40 via-[#6366f1]/30 to-transparent blur-[180px] animate-slow-spotlight"
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Spotlight glow behind hero card - positioned to shine through glass */}
      <div
        className="absolute left-1/2 top-[35%] h-[600px] w-[1600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#a855f7]/70 via-[#6366f1]/50 to-transparent blur-[140px] animate-slow-spotlight"
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          animationDelay: '2s',
        }}
      />

      {/* Grid pattern - behind all content for depth */}
      <div
        ref={gridRef}
        className="absolute inset-[-300px] bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] opacity-[0.3] animate-grid-fade"
        style={{
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Fallback: CSS grid if SVG pattern fails */}
      <div
        ref={fallbackRef}
        className="absolute inset-[-300px] opacity-[0.25] animate-grid-fade"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          display: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}


