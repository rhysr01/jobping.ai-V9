"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { trackEvent } from "@/lib/analytics";
import {
  CTA_GET_MY_5_FREE_MATCHES,
  TRUST_TEXT_NO_CARD_SETUP,
} from "@/lib/copy";

export default function ScrollCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Don't show on mobile - let sticky mobile CTA handle it
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage =
        (scrollY / (documentHeight - windowHeight)) * 100;

      // Check if Pricing section is within 200px of viewport bottom
      const pricingSection =
        document.getElementById("pricing") ||
        document.querySelector('[data-section="pricing"]');
      let shouldHide = false;

      if (pricingSection) {
        const rect = pricingSection.getBoundingClientRect();
        // Hide if Pricing section top is within 200px of viewport bottom
        const distanceFromBottom = windowHeight - rect.top;
        shouldHide = distanceFromBottom < 200 && rect.top < windowHeight;
      }

      // Show after scrolling 50% of page
      if (scrollPercentage >= 50 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
        setOpacity(shouldHide ? 0 : 1);
      } else if (scrollPercentage < 50) {
        setIsVisible(false);
        setOpacity(0);
        setHasShown(false);
      } else if (shouldHide) {
        // Smooth fade out when near pricing section
        setOpacity(0);
      } else if (isVisible && !shouldHide) {
        // Fade back in if moved away from pricing section
        setOpacity(1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasShown, isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity }}
          exit={{ y: 16, opacity: 0 }}
          transition={{
            opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            y: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
          }}
          style={{
            pointerEvents: opacity === 0 ? "none" : "auto",
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 hidden lg:block lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-surface-elevated/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">
                  {CTA_GET_MY_5_FREE_MATCHES}
                </p>
                <p className="text-xs text-content-muted hidden md:flex">
                  {TRUST_TEXT_NO_CARD_SETUP}
                </p>
              </div>
              <Link
                href="/signup/free"
                onClick={() => {
                  trackEvent("cta_clicked", {
                    type: "free",
                    location: "scroll_cta",
                  });
                  setIsVisible(false);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-full text-sm font-semibold hover:bg-brand-500/90 transition-colors min-h-[44px]"
              >
                {CTA_GET_MY_5_FREE_MATCHES}
                <BrandIcons.ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="p-2 text-content-muted hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
