"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FREE_ROLES_PER_SEND,
  FREE_SEND_DAY_LABEL,
  PREMIUM_ROLES_PER_WEEK,
  PREMIUM_SENDS_PER_WEEK,
  PREMIUM_SEND_DAYS_LABEL,
  PREMIUM_ROLES_PER_MONTH,
} from '@/lib/productMetrics';

function SignupSuccessContent() {
  const [showSuccess, setShowSuccess] = useState(true);
  const [emailSentAt, setEmailSentAt] = useState<string>('');
  const [resending, setResending] = useState(false);
  const searchParams = useSearchParams();
  const tier = searchParams?.get('tier') === 'premium' ? 'premium' : 'free';
  const email = searchParams?.get('email') || '';

  useEffect(() => {
    setEmailSentAt(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    const timer = setTimeout(() => setShowSuccess(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleResendEmail = async () => {
    if (!email) {
      alert('Email address not found. Please contact support.');
      return;
    }

    setResending(true);
    try {
      const response = await fetch('/api/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (response.ok) {
        alert('Email resent successfully! Check your inbox.');
      } else {
        alert(result.error || 'Failed to resend email. Please try again later.');
      }
    } catch (error) {
      alert('Failed to resend email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <SuccessAnimation
            message="Signup complete! Your first matches are on the way."
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
            You're in.
          </h1>

          <p className="mx-auto mb-6 max-w-xl text-base text-zinc-300 sm:text-lg">
            We’ve queued your welcome email and job matches. They usually arrive within a few minutes (or within 48 hours at the latest).
          </p>

          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
            <BrandIcons.Mail className="h-4 w-4 text-brand-200" />
            hello@getjobping.com · add us to contacts
          </div>

          <div className="glass-card rounded-2xl p-8 sm:p-10 mb-8 text-left">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">What Happens Next?</h2>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Check your inbox</div>
                  <div className="text-zinc-400 text-sm">
                    Your first drop includes {tier === 'premium' ? '10 jobs plus your premium welcome email.' : 'up to 10 jobs and your welcome email.'}
                    {' '}If you don’t see it after a few minutes, peek at spam.
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    We retry delivery automatically. Add <strong className="text-white">hello@getjobping.com</strong> to stay out of spam.
                  </div>
                  <motion.button
                    onClick={handleResendEmail}
                    disabled={resending || !email}
                    className="mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    {resending ? 'Sending...' : 'Resend Email'}
                  </motion.button>
                  {emailSentAt && (
                    <p className="mt-2 text-xs text-zinc-400">
                      Email sent at {emailSentAt}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  2
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Review & apply</div>
                  <div className="text-zinc-400 text-sm">Each email takes under a minute to scan and links straight to the application.</div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  3
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Stay in sync</div>
                  <div className="text-zinc-400 text-sm">
                    {`Free: ${FREE_ROLES_PER_SEND} jobs every ${FREE_SEND_DAY_LABEL} · Premium: ${PREMIUM_ROLES_PER_WEEK} jobs each week (${PREMIUM_SENDS_PER_WEEK} drops: ${PREMIUM_SEND_DAYS_LABEL}).`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {tier === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-8 sm:p-10 mb-8 bg-gradient-to-br from-brand-500/10 to-purple-600/10 border-2 border-brand-500/30"
            >
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-3">
                  Need more roles each week?
                </h3>
                <p className="text-zinc-300 text-lg mb-6">
                  Premium sends <span className="text-brand-300 font-semibold">{`${PREMIUM_ROLES_PER_WEEK} jobs per week (~${PREMIUM_ROLES_PER_MONTH} per month)`}</span> with early access and hot match alerts.
                </p>
                <Link 
                  href="/billing" 
                  className="btn-primary inline-block px-8 py-4 text-lg font-bold"
                >
                  Upgrade for €5/month
                </Link>
                <p className="text-zinc-400 text-sm mt-4">
                  Cancel anytime · No commitment
                </p>
              </div>
            </motion.div>
          )}

          <Link href="/" className="btn-outline inline-block">
            Back to Home
          </Link>

          <p className="mt-8 text-sm text-zinc-400">
            Still nothing? Tap resend above or email <a href="mailto:hello@getjobping.com" className="text-brand-200 hover:text-brand-100">hello@getjobping.com</a>.
          </p>
        </motion.div>
      </div>
    </div>
    </>
  );
}

export default function SignupSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <SignupSuccessContent />
    </Suspense>
  );
}

