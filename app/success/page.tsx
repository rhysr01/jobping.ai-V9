"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const [showSuccess, setShowSuccess] = useState(true);
  const searchParams = useSearchParams();
  const checkoutId = searchParams?.get('checkout_id') || '';

  useEffect(() => {
    const timer = setTimeout(() => setShowSuccess(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <SuccessAnimation
            message="Payment successful! Welcome to Premium."
            onComplete={() => setShowSuccess(false)}
          />
        )}
      </AnimatePresence>
      <div className="min-h-screen bg-black text-white flex items-center justify-center py-20">
        <div className="container-page max-w-2xl text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Success Icon */}
            <div className="mx-auto w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.5)]">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Main Message */}
            <h1 className="mb-4 text-4xl font-semibold text-white sm:text-5xl">
              Payment Successful!
            </h1>

            <p className="mx-auto mb-6 max-w-xl text-base text-zinc-300 sm:text-lg">
              Your premium subscription is now active. You'll receive enhanced job matches starting with your next email.
            </p>

            {checkoutId && (
              <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                <BrandIcons.Mail className="h-4 w-4 text-brand-200" />
                Order ID: {checkoutId}
              </div>
            )}

            <div className="glass-card rounded-2xl p-8 sm:p-10 mb-8 text-left">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">What's Next?</h2>
              
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">Premium activated</div>
                    <div className="text-zinc-400 text-sm">
                      Your subscription is active and you'll receive premium job matches in your next email.
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">Enhanced matches</div>
                    <div className="text-zinc-400 text-sm">
                      You'll get more jobs per week, early access to new listings, and hot match alerts.
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-white mb-1">Manage your subscription</div>
                    <div className="text-zinc-400 text-sm">
                      You can update your payment method or cancel anytime from your billing page.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href="/billing" className="btn-primary inline-block px-8 py-4 text-lg font-bold">
                Manage Subscription
              </Link>
              <Link href="/" className="btn-outline inline-block px-8 py-4 text-lg font-bold">
                Back to Home
              </Link>
            </div>

            <p className="mt-8 text-sm text-zinc-400">
              Questions? Email <a href="mailto:hello@getjobping.com" className="text-brand-200 hover:text-brand-100">hello@getjobping.com</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

