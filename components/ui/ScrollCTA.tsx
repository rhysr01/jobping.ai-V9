'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { trackEvent } from '@/lib/analytics';
import { CTA_GET_MY_5_FREE_MATCHES, TRUST_TEXT_NO_CARD_SETUP } from '@/lib/copy';

export default function ScrollCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Don't show on mobile - let sticky mobile CTA handle it
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = (scrollY / (documentHeight - windowHeight)) * 100;

      // Show after scrolling 50% of page
      if (scrollPercentage >= 50 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
      } else if (scrollPercentage < 50) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasShown]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden lg:block"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white/[0.08] border border-white/20 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-lg shadow-black/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">{CTA_GET_MY_5_FREE_MATCHES}</p>
                <p className="text-xs text-zinc-400">{TRUST_TEXT_NO_CARD_SETUP}</p>
              </div>
              <Link
                href="/signup/free"
                onClick={() => {
                  trackEvent('cta_clicked', { type: 'free', location: 'scroll_cta' });
                  setIsVisible(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-full text-sm font-semibold hover:bg-brand-500/90 transition-colors min-h-[44px]"
              >
                {CTA_GET_MY_5_FREE_MATCHES}
                <BrandIcons.ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <BrandIcons.X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

