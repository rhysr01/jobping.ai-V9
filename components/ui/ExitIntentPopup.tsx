'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BrandIcons } from '@/components/ui/BrandIcons';

export default function ExitIntentPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('exit_intent_shown');
      if (shown === 'true') {
        setHasShown(true);
        return;
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is moving upward (leaving top of page)
      if (e.clientY <= 0 && !hasShown) {
        setShowPopup(true);
        setHasShown(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('exit_intent_shown', 'true');
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShown]);

  if (!showPopup) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="exit-popup"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowPopup(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-zinc-900 to-black border-2 border-brand-500/30 rounded-2xl p-8 max-w-md w-full shadow-glow-strong"
        >
          <button
            onClick={() => setShowPopup(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close popup"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <BrandIcons.GraduationCap className="w-16 h-16 mx-auto mb-4 text-brand-400" />
            <h3 className="text-2xl font-black text-white mb-2">Wait! Get EU jobs free</h3>
            <p className="text-zinc-400 mb-6">
              Join thousands finding early-career roles across Europe. 5 hand-picked matches weekly.
            </p>
            <Link
              href="/signup"
              onClick={() => setShowPopup(false)}
              className="block w-full bg-gradient-to-r from-brand-500 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg text-center hover:scale-105 transition-transform"
            >
              Get Started Free →
            </Link>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-4 text-sm text-zinc-400 hover:text-zinc-300"
            >
              No thanks
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

