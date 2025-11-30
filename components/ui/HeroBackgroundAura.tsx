"use client";

import React from "react";

export default function HeroBackgroundAura() {
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
        className="absolute inset-[-200px] bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] opacity-[0.15] animate-grid-fade"
        style={{
          // Ensure cross-browser compatibility
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />
      
      {/* Fallback: CSS grid if SVG pattern fails */}
      <div
        className="absolute inset-[-200px] opacity-[0.05] animate-grid-fade"
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

