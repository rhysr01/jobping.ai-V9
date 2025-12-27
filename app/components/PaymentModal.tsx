'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string) => Promise<void>;
  onConfirmWithPromo?: (email: string, promoCode?: string) => Promise<void>;
  isLoading: boolean;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, onConfirmWithPromo, isLoading }: PaymentModalProps) {
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    try {
      if (onConfirmWithPromo) {
        await onConfirmWithPromo(email, promoCode.trim() || undefined);
      } else {
        await onConfirm(email);
      }
      setEmail('');
      setPromoCode('');
    } catch (err) {
      setError('Payment setup failed. Please try again.');
    }
  };

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setEmail('');
      setError('');
      setEmailError('');
      onClose();
    }
  }, [isLoading, onClose]);

  // Focus management and body scroll prevention
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus the email input for better UX
      const emailInput = document.getElementById('email') as HTMLInputElement;
      if (emailInput) {
        emailInput.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        tabIndex={-1}
        className="relative surface-overlay rounded-2xl p-8 max-w-md w-full mx-4 focus:outline-none"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="payment-modal-title" className="text-heading text-white">
            Got it - we'll find your next role
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-small font-medium text-neutral-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
              className="w-full px-4 py-3 surface-base rounded-xl text-white placeholder-neutral-400 focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-colors disabled:opacity-50"
            />
            {emailError && (
              <div className="mt-2 p-3 rounded-lg surface-error" role="status" aria-live="polite">
                <p className="text-small">{emailError}</p>
              </div>
            )}
            {error && (
              <div className="mt-2 p-3 rounded-lg surface-error" role="status" aria-live="polite">
                <p className="text-small">{error}</p>
              </div>
            )}
          </div>

          <div className="mt-2">
            {!showPromo ? (
              <button
                type="button"
                onClick={() => setShowPromo(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline-offset-2 hover:underline"
                disabled={isLoading}
              >
                Have a promo code?
              </button>
            ) : (
              <div className="mt-3">
                <label htmlFor="promo" className="block text-xs font-medium text-zinc-300 mb-1">
                  Promo Code <span className="text-zinc-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code e.g. rhys"
                  disabled={isLoading}
                  className="w-full px-3 py-2 surface-base rounded-lg text-white placeholder-neutral-500 focus:border-white/20 focus:ring-2 focus:ring-white/10 transition-colors disabled:opacity-50 text-small"
                />
              </div>
            )}
          </div>

          <div className="surface-raised rounded-xl p-4">
            <h3 className="text-small font-medium text-neutral-300 mb-2">What you'll get:</h3>
            <div className="mb-3 pb-3 border-b border-white/10">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl font-bold text-white">€5</span>
                <span className="text-sm text-neutral-400">/month</span>
              </div>
              <p className="text-xs text-neutral-400">Cancel anytime</p>
            </div>
            <ul className="text-small text-neutral-400 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                5 hand-picked job matches per email
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Priority access to premium job sources
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Cancel anytime
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn-mobile flex-1 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="btn-mobile flex-1 bg-white text-black font-semibold rounded-xl hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 interactive-lift"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Find my matches'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
