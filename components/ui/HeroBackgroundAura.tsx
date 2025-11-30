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
      className="pointer-events-none absolute inset-0 -z-[8] overflow-hidden"
    >
      {/* Spotlight glow behind hero - Enhanced visibility */}
      <div
        className="absolute left-1/2 top-[12%] h-[380px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#a855f7]/55 via-[#6366f1]/35 to-transparent blur-[100px] animate-slow-spotlight"
        style={{
          // Ensure cross-browser compatibility
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      />

      {/* Grid pattern with fallback - Enhanced visibility */}
      <div
        ref={gridRef}
        className="absolute inset-[-200px] bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] opacity-[0.15] animate-grid-fade"
        style={{
          // Ensure cross-browser compatibility
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Fallback: CSS grid if SVG pattern fails */}
      <div
        ref={fallbackRef}
        className="absolute inset-[-200px] opacity-[0.08] animate-grid-fade"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          display: 'none', // Hidden by default, shown via JS if SVG fails
        }}
        aria-hidden="true"
      />
    </div>
  );
}

