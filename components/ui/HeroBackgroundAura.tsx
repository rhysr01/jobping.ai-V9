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
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Large ambient glow behind everything */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[700px] w-[900px] blur-[90px] opacity-70 rounded-full bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.35),_transparent_60%)] animate-[hero-blob_9s_ease-in-out_infinite_alternate]"
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Spotlight glow behind hero card - positioned to shine through glass */}
      <div
        className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[500px] w-[700px] blur-[70px] opacity-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.55),_transparent_65%)] mix-blend-screen"
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      />

      {/* Grid pattern - behind all content for depth */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-40 md:opacity-50 mix-blend-soft-light bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] animate-[hero-grid-fade_14s_ease-in-out_infinite_alternate]"
        style={{
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Fallback: CSS grid if SVG pattern fails */}
      <div
        ref={fallbackRef}
        className="absolute inset-0 opacity-40 md:opacity-50 mix-blend-soft-light animate-[hero-grid-fade_14s_ease-in-out_infinite_alternate]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          display: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}


