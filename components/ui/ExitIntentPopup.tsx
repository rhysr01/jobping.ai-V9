'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export default function ExitIntentPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const containerRef = useFocusTrap(showPopup);

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
      {showPopup && (
        <motion.div
          key="exit-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowPopup(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-popup-title"
          aria-describedby="exit-popup-description"
        >
          <motion.div
            ref={containerRef as React.RefObject<HTMLDivElement>}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-zinc-900 to-black border-2 border-brand-500/30 rounded-2xl p-8 max-w-md w-full shadow-glow-strong"
          >
          <button
            onClick={() => setShowPopup(false)}
            className="absolute top-4 right-4 text-zinc-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close popup"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <BrandIcons.GraduationCap className="w-16 h-16 mx-auto mb-4 text-brand-400" aria-hidden="true" />
            <h3 id="exit-popup-title" className="text-2xl font-black text-white mb-2">Wait! Get EU jobs free</h3>
            <p id="exit-popup-description" className="text-zinc-200 mb-6">
              Join thousands finding early-career roles across Europe. 5 hand-picked matches weekly.
            </p>
            <Link
              href="/signup"
              onClick={() => setShowPopup(false)}
              className="block w-full bg-brand-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg text-center hover:bg-brand-600 hover:-translate-y-0.5 transition-all min-h-[48px] flex items-center justify-center"
            >
              Claim my first drop →
            </Link>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-4 text-sm text-zinc-200 hover:text-white min-h-[44px] min-w-[44px] px-4"
            >
              No thanks
            </button>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

