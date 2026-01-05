"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "./Button";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    // Return undefined cleanup function if consent exists
    return undefined;
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);

    // Enable PostHog tracking
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.opt_in_capturing();
      // Enable session recording if user accepted
      (window as any).posthog.startSessionRecording();
    }

    // Enable Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied", // We don't use ads
      });
    }
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setIsVisible(false);

    // Disable PostHog tracking
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.opt_out_capturing();
      (window as any).posthog.stopSessionRecording();
    }

    // Disable Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none"
          role="dialog"
          aria-label="Cookie consent"
          aria-modal="true"
        >
          <div className="max-w-6xl mx-auto pointer-events-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                <div className="flex-1 space-y-3">
                  <p className="text-sm sm:text-base text-white font-medium leading-relaxed">
                    We use cookies to improve your experience and analyze site
                    usage.{" "}
                    <span className="text-content-secondary">
                      Essential cookies are always active.
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-content-muted">
                    Learn more in our{" "}
                    <Link
                      href="/legal/privacy"
                      className="text-brand-400 hover:text-brand-300 underline decoration-brand-400/30 underline-offset-4 hover:decoration-brand-300/50 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleReject}
                    className="w-full sm:w-auto whitespace-nowrap"
                  >
                    Reject Non-Essential
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAccept}
                    className="w-full sm:w-auto whitespace-nowrap"
                  >
                    Accept All Cookies
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
