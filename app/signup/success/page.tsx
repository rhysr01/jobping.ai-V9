'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignupSuccess() {
  return (
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
            Your AI career assistant is now active
          </p>

          <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg mb-8 shadow-[0_8px_24px_rgba(16,185,129,0.4)]">
            10 Perfect Matches Found
          </div>

          <div className="glass-card rounded-2xl p-8 sm:p-10 mb-8 text-left">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">What Happens Next?</h2>
            
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white mb-1">Check Your Email (48 hours)</div>
                  <div className="text-zinc-400 text-sm">You'll receive 10 hand-picked roles that match your profile</div>
                  <div className="mt-2 text-xs text-yellow-400 font-semibold">
                    ⚠️ Check your spam/junk folder if you don't see it in your inbox
                  </div>
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
                  <div className="font-semibold text-white mb-1">Weekly Updates</div>
                  <div className="text-zinc-400 text-sm">Fresh roles every week, matched to your preferences</div>
                </div>
              </div>
            </div>
          </div>

          <Link href="/" className="btn-outline inline-block">
            Back to Home
          </Link>

          <p className="mt-8 text-sm text-zinc-500">
            Didn't receive an email? Check your spam folder or contact us.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

