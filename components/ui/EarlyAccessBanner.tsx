'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiCallJson } from '@/lib/api-client';

const EARLY_ACCESS_LIMIT = 300;

export function EarlyAccessBanner() {
  const [signupCount, setSignupCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiCallJson('/api/stats/signups')
      .then(data => {
        if (data.success && typeof data.data?.count === 'number') {
          setSignupCount(data.data.count);
        }
      })
      .catch(err => {
        console.error('Failed to fetch signup count:', err);
        // Don't show banner if fetch fails
        setSignupCount(EARLY_ACCESS_LIMIT);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || signupCount === null) return null;
  if (signupCount >= EARLY_ACCESS_LIMIT) return null;

  const remaining = EARLY_ACCESS_LIMIT - signupCount;
  const percentage = (signupCount / EARLY_ACCESS_LIMIT) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-2xl mx-auto mb-8"
    >
      {/* Glassmorphism container matching Hero card design */}
      <div className="relative rounded-xl bg-white/[0.08] border border-white/10 backdrop-blur-md px-5 py-4 md:px-6 md:py-5 shadow-hero overflow-hidden">
        {/* Top highlight line for glass effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-3 md:gap-4">
          {/* Header with icon and text */}
          <div className="flex items-center justify-center gap-2.5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <span className="text-2xl md:text-3xl">⚡</span>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 text-2xl md:text-3xl blur-md opacity-50 text-brand-400">⚡</div>
            </motion.div>
            <p className="text-sm md:text-base font-semibold text-white">
              Early Access: First 300 users get <span className="text-brand-200">Premium free</span> for 1 month
            </p>
          </div>
          
          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-brand-200 to-brand-300 bg-clip-text text-transparent">
                {signupCount}
              </span>
              <span className="text-zinc-400">/300 spots claimed</span>
            </div>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">
              <span className="font-medium text-brand-200">{remaining}</span> spots left
            </span>
          </div>

          {/* Enhanced progress bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="relative h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-brand-500 via-brand-400 to-purple-500 rounded-full relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </motion.div>
              {/* Progress percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-medium text-zinc-500">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
