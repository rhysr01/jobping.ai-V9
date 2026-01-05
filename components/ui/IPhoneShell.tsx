"use client";

import { cn } from "@/lib/utils";

interface IPhoneShellProps {
  children: React.ReactNode;
  showMailHeader?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function IPhoneShell({
  children,
  showMailHeader = false,
  className,
  "aria-label": ariaLabel,
}: IPhoneShellProps) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19] w-full max-w-[320px] mx-auto overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {/* 1. Hardware Details (Notch & Home Bar) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-black rounded-b-[18px] z-50"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[110px] h-[4px] bg-white/20 rounded-full z-50"
        aria-hidden="true"
      />

      {/* 2. Status Bar */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-end justify-between px-7 pb-1 z-40 pointer-events-none">
        <span className="text-[11px] font-bold text-white tracking-tight">
          9:41
        </span>
        <div className="flex items-center gap-1.5">
          {/* Signal bars */}
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M2 10h1v4H2v-4zm2-2h1v6H4V8zm2-2h1v8H6V6zm2-2h1v10H8V4zm2-2h1v12h-1V2z" />
          </svg>
          {/* Battery */}
          <div className="w-5 h-2.5 border border-white/40 rounded-[2px] relative">
            <div className="absolute top-0.5 left-0.5 bottom-0.5 right-0.5 bg-white rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* 3. Screen Content Safe Area */}
      <div className="h-full pt-10 pb-6 overflow-hidden relative flex flex-col">
        {showMailHeader && (
          <div className="h-12 border-b border-white/10 flex items-center px-6 bg-zinc-900/50 backdrop-blur-md shrink-0">
            <span className="text-blue-400 text-sm font-medium">‹ Inbox</span>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                JOBPING MATCH
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {children}
        </div>
      </div>

      {/* 4. Glass Reflection Overlay - Allow clicks through */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-30 rounded-[2.2rem] iphone-reflection"
        aria-hidden="true"
      />
    </div>
  );
}
