"use client";

import { useEffect, useRef, useState } from "react";

interface HeroBackgroundAuraProps {
  offset?: number;
}

export default function HeroBackgroundAura({ offset = 0 }: HeroBackgroundAuraProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
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
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[820px] w-[820px] md:h-[900px] md:w-[900px] blur-md-hero opacity-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.32),_rgba(15,23,42,0.2)_60%)] animate-[hero-blob_9s_ease-in-out_infinite_alternate]"
        style={{
          willChange: 'transform, opacity',
          transform: 'translate(-50%, -50%)',
        }}
      />
      
      {/* Spotlight glow behind hero card - positioned to shine through glass */}
      <div
        className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[580px] w-[580px] md:h-[640px] md:w-[640px] blur-md-hero opacity-90 rounded-full bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.45),_transparent_55%)] mix-blend-screen"
        style={{
          willChange: 'transform, opacity',
          transform: `translate(calc(-42% + ${pos.x}px), calc(-28% + ${offset}px + ${pos.y}px)) rotate(-6deg)`,
        }}
        onMouseMove={(e) => {
          const x = (e.clientX / window.innerWidth) * 6;
          const y = (e.clientY / window.innerHeight) * 6;
          setPos({ x, y });
        }}
      />

      {/* Vertical light shaft */}
      <div className="absolute inset-x-0 top-[-25%] h-[300px] bg-gradient-to-b from-violet-500/15 to-transparent blur-md-hero" />
      
      {/* Side ambient glow */}
      <div className="absolute left-[-12%] top-[12%] h-[520px] w-[520px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.28),transparent_70%)] blur-lg-hero opacity-80" />
      
      {/* Glass haze */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-[1px] pointer-events-none" />

      {/* Grid pattern - behind all content for depth */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-50 mix-blend-soft-light bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] animate-[hero-grid-fade_14s_ease-in-out_infinite_alternate]"
        style={{
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Fallback: CSS grid if SVG pattern fails */}
      <div
        ref={fallbackRef}
        className="absolute inset-0 opacity-50 mix-blend-soft-light animate-[hero-grid-fade_14s_ease-in-out_infinite_alternate]"
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


