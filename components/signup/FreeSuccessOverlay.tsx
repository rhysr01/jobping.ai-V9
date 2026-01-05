"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";

interface FreeSuccessOverlayProps {
  matchCount: number;
  onDismiss?: () => void;
}

export function FreeSuccessOverlay({
  matchCount,
  onDismiss,
}: FreeSuccessOverlayProps) {
  const [countdown, setCountdown] = useState(3);
  const [_showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Trigger confetti on mount
    const triggerConfetti = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
      };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      // Brand colors: Purple (brand), Emerald Green (matches), Zinc White (grounded)
      const colors = ["#8b5cf6", "#10b981", "#ffffff"];

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          setShowConfetti(false);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left burst - Purple and Emerald
        confetti({
          ...defaults,
          particleCount,
          colors: [colors[0], colors[1]],
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });

        // Right burst - Emerald and White
        confetti({
          ...defaults,
          particleCount,
          colors: [colors[1], colors[2]],
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });

        // Center burst - All brand colors
        confetti({
          ...defaults,
          particleCount: particleCount * 0.5,
          colors: colors,
          origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 },
        });
      }, 250);
    };

    triggerConfetti();
  }, []);

  useEffect(() => {
    // Robust safety redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-dismiss after countdown
          if (onDismiss) {
            setTimeout(() => onDismiss(), 500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center p-8 bg-zinc-900 border-2 border-brand-500/30 rounded-2xl max-w-md mx-4 shadow-[0_0_60px_rgba(99,102,241,0.4)]"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.6)] border-4 border-emerald-500/30 mb-6"
          >
            <BrandIcons.Check className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </motion.div>

          <h2
            id="success-title"
            className="text-2xl sm:text-3xl font-bold text-white mb-2"
          >
            Success!
          </h2>
          <p className="text-zinc-400 mb-6 text-base sm:text-lg">
            Found{" "}
            <span className="text-brand-400 font-semibold">{matchCount}</span>{" "}
            {matchCount === 1 ? "match" : "matches"} for you.
          </p>

          {countdown > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm sm:text-base text-brand-400 animate-pulse"
            >
              Entering your dashboard in {countdown}
              {countdown === 1 ? " second" : " seconds"}...
            </motion.div>
          )}

          {countdown === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-zinc-500"
            >
              Loading your matches...
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
