"use client";

import React from "react";

export default function HeroBackgroundAura() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden"
    >
      {/* Spotlight glow behind hero */}
      <div
        className="absolute left-1/2 top-[12%] h-[380px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#a855f7]/40 via-[#6366f1]/24 to-transparent blur-[130px] animate-slow-spotlight"
      />

      {/* Very faint grid over the whole hero area */}
      <div
        className="absolute inset-[-200px] bg-[url('/grid.svg')] bg-center bg-[length:900px_900px] opacity-[0.08] animate-grid-fade"
      />
    </div>
  );
}

