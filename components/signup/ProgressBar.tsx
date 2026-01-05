"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

interface ProgressBarProps {
  step: number;
}

export function ProgressBar({ step }: ProgressBarProps) {
  return (
    <>
      {/* Sticky Progress Bar - iOS Safari Compatible */}
      <div className="sticky top-[-1px] z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 mb-6">
        <div className="h-1 bg-zinc-800">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 via-brand-700 to-brand-600"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-sm text-zinc-400">
          <span>Step {step} of 4</span>
          <span>{Math.round((step / 4) * 100)}%</span>
        </div>
      </div>

      {/* Desktop Progress Indicator - Hidden on mobile */}
      <div className="mb-10 sm:mb-16 hidden sm:block">
        <div className="flex justify-between mb-3 sm:mb-4 px-1 sm:px-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1 sm:gap-3">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all shadow-lg ${
                  i < step
                    ? "bg-green-500 text-white shadow-green-500/30"
                    : i === step
                      ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                      : "bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400"
                }`}
              >
                {i < step ? <BrandIcons.Check className="h-6 w-6" /> : i}
              </div>
              <span className="hidden sm:inline text-sm font-bold text-zinc-300">
                {i === 1
                  ? "Basics"
                  : i === 2
                    ? "Preferences"
                    : i === 3
                      ? "Career"
                      : "Optional"}
              </span>
              {i === 4 && (
                <span className="hidden sm:inline text-xs text-zinc-500 ml-1">
                  (Optional)
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 via-brand-700 to-brand-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
        <div className="text-xs text-zinc-400 text-center mt-2">
          {Math.round((step / 4) * 100)}% complete
        </div>
      </div>
    </>
  );
}
