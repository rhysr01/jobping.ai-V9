'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { BrandIcons } from '@/components/ui/BrandIcons';

export default function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleScroll = () => {
      if (!isMobile) return;
      
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Show CTA after scrolling past hero section (80vh) and hide when near top
      if (scrollY > windowHeight * 0.8 && scrollY < windowHeight * 3) {
        setIsVisible(true);
      } else if (scrollY < windowHeight * 0.5) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black to-transparent pointer-events-none md:hidden"
        >
          <Link
            href="/signup"
            className="pointer-events-auto w-full block"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-brand-500 to-purple-600 text-white py-4 px-6 rounded-2xl font-bold text-lg text-center shadow-[0_8px_24px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
            >
              <span>Get EU jobs in my inbox</span>
              <BrandIcons.ArrowRight className="w-5 h-5" />
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

