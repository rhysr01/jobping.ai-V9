"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
            message="Signup successful!"
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 bg-gradient-to-b from-white via-purple-50 to-purple-200 bg-clip-text text-transparent">
            You're All Set!
          </h1>

          <p className="text-xl sm:text-2xl text-zinc-300 mb-4">
            Your first matches are on their way!
          </p>

          <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg mb-8 shadow-[0_8px_24px_rgba(16,185,129,0.4)]">
            Check Your Inbox Now
          </div>

          <div className="glass-card rounded-2xl p-8 sm:p-10 mb-8 text-left">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">What Happens Next?</h2>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Check Your Inbox Now</div>
                  <div className="text-zinc-400 text-sm">
                    You should receive an email with your first matches within the next few minutes. 
                    {tier === 'premium' 
                      ? ' Premium users get up to 10 jobs on signup.' 
                      : ' Free users get up to 10 jobs on signup.'}
                  </div>
                  <div className="mt-2 text-xs text-yellow-400 font-semibold">
                    💡 Check your spam/junk folder if you don't see it within 5 minutes!
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    📧 Add <strong className="text-white">hello@getjobping.com</strong> to your contacts to ensure delivery
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
                  <div className="font-semibold text-white mb-1">Review & Apply</div>
                  <div className="text-zinc-400 text-sm">Each email takes 60 seconds to read with direct application links</div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  3
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Ongoing Updates</div>
                   <div className="text-zinc-400 text-sm">Free: 5 new jobs every week · Premium: 15 new jobs every week (3× weekly)</div>
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
                <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
                  Get More Matches for €5 Now
                </h3>
                <p className="text-zinc-300 text-lg mb-6">
                  Upgrade to Premium and get <span className="text-brand-400 font-bold">15 jobs per week</span> instead of 5
                </p>
                <Link 
                  href="/billing" 
                  className="btn-primary inline-block px-8 py-4 text-lg font-bold"
                >
                  Upgrade to Premium - €5/month
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
            Didn't receive an email? Check your spam folder or contact us.
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

