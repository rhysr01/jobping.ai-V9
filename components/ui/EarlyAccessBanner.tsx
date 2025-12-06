'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const EARLY_ACCESS_LIMIT = 300;

export function EarlyAccessBanner() {
  const [signupCount, setSignupCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/signups')
      .then(res => res.json())
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
      className="bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-5 mb-8 text-center backdrop-blur-sm max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-2xl">⚡</span>
        <p className="text-base font-semibold text-white">
          Early Access: First 300 users get Premium free for 1 month
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 text-sm mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-purple-400">
            {signupCount}
          </span>
          <span className="text-zinc-400">/300 spots claimed</span>
        </div>
        <span className="text-zinc-500">•</span>
        <span className="text-zinc-400">
          {remaining} spots left
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mx-auto h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
        />
      </div>
    </motion.div>
  );
}
