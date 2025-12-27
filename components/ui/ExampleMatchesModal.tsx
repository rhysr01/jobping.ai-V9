"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { BrandIcons } from "@/components/ui/BrandIcons";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import SampleJobMatches from "@/components/marketing/SampleJobMatches";
import Button from "./Button";

interface ExampleMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExampleMatchesModal({ isOpen, onClose }: ExampleMatchesModalProps) {
  const containerRef = useFocusTrap(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="example-matches-title"
        >
          <motion.div
            ref={containerRef as React.RefObject<HTMLDivElement>}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 z-10"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
              <h2 id="example-matches-title" className="text-2xl md:text-3xl font-bold text-white mb-2">
                See What You'll Get
              </h2>
              <p className="text-sm md:text-base text-zinc-400">
                Here's what your job matches look like - personalized to your preferences
              </p>
            </div>

            {/* iPhone Mockup - Centered */}
            <div className="flex justify-center mb-6">
              <div className="scale-90 md:scale-100 origin-center">
                <DeviceFrame>
                  <SampleJobMatches />
                </DeviceFrame>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                href="/signup/free"
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto px-8"
                onClick={onClose}
              >
                <span className="flex items-center justify-center gap-2">
                  Start Free - See Your 5 Matches
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-8"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

