"use client";

import { Zap } from "lucide-react";

/**
 * HotMatchBadge - Premium "Ping" indicator for high-quality matches (92%+)
 * Positioned in top-right corner of match cards to break the grid feel
 */
export function HotMatchBadge() {
  return (
    <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-700/50 to-brand-700/50 border border-brand-600/70 backdrop-blur-sm shadow-lg">
      {/* The "Ping" Pulse */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-700 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-700"></span>
      </span>

      <Zap className="w-3 h-3 text-brand-500" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
        Hot
      </span>
    </div>
  );
}
