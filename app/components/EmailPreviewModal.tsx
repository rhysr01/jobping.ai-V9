'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function EmailPreviewModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-zinc-300 hover:text-zinc-200 font-medium underline decoration-white/20 hover:decoration-white/60 transition-colors"
      >
        See sample email
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-black border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium text-sm">JobPing — Your Matches</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1 -m-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Content */}
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                  <p className="text-white font-medium text-xs leading-tight">Graduate Product Analyst — Dublin</p>
                  <span className="text-zinc-400 text-xs">Stripe</span>
                </div>
                <p className="text-zinc-400 text-xs">Direct link · Posted recently</p>
              </div>

              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                  <p className="text-white font-medium text-xs leading-tight">Junior Strategy Associate — Paris</p>
                  <span className="text-zinc-400 text-xs">Qonto</span>
                </div>
                <p className="text-zinc-400 text-xs">Direct link · Early-career</p>
              </div>

              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
                  <p className="text-white font-medium text-xs leading-tight">Software Engineer Intern — Berlin</p>
                  <span className="text-zinc-400 text-xs">N26</span>
                </div>
                <p className="text-zinc-400 text-xs">Direct link · Graduate program</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-zinc-400 text-xs text-center">
                Delivered every 48 hours • Unsubscribe anytime
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
