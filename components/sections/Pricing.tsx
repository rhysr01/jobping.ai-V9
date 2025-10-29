'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';

export default function Pricing() {
  return (
    <section className="section-padding bg-black">
      <div className="container-page container-rhythm">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4">
            Simple pricing • Cancel anytime
          </Badge>
          <h2 className="text-heading text-white text-balance">
            From student to hired: discover roles made for you
          </h2>
          <p className="text-body text-neutral-400 mt-6">
            Get curated roles in your inbox. Zero scrolling, just apply.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Free Plan */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/15 to-transparent"
          >
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 flex flex-col h-full hover:border-white/20 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-400" /> Free
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white">5 roles on signup</div>
                <div className="text-zinc-400 text-sm">= 25 jobs/month</div>
              </div>

              <ul className="text-sm text-zinc-300 space-y-2.5 mb-6">
                <Feature>Weekly email with 5 hand‑picked roles</Feature>
                <Feature>Quality‑screened, early‑career friendly</Feature>
                <Feature>No dashboards, zero spam</Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/signup?tier=free" 
                  className="btn-secondary inline-block w-full text-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  role="button"
                  aria-label="Start free plan - navigate to signup"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">Start free</span>
                </Link>
                <p className="mt-2 text-[11px] text-zinc-500 text-center">Cancel anytime no commitment</p>
              </div>
            </div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-b from-brand-500/60 to-purple-600/40 shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:shadow-[0_0_60px_rgba(139,92,246,0.35)] transition-shadow"
          >
            <div className="absolute -top-2 left-6 w-[70%] px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-purple-500/20 to-purple-400/20 border border-purple-400/30 text-purple-300">
              Best Value
            </div>
            <div className="relative bg-gradient-to-b from-[#9F6BFF]/10 to-[#6B4EFF]/5 border border-white/20 rounded-2xl p-6 md:p-8 flex flex-col h-full overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
              <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" aria-hidden />

              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-sm uppercase tracking-wider text-brand-300 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-400" /> Premium
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white">10 roles on signup</div>
                <div className="text-xl sm:text-2xl font-black text-brand-300 mb-1">= 70+ jobs/month</div>
                <div className="text-zinc-400 text-xs">vs 25 on free tier</div>
              </div>

              <ul className="text-sm text-zinc-200 space-y-2.5 mb-6">
                <Feature strong>New matches every 48 hours (Mon/Wed/Fri)</Feature>
                <Feature>24‑hour early access to fresh roles</Feature>
                <Feature>Priority curation for your preferences</Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/billing" 
                  className="btn-primary inline-block w-full text-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  role="button"
                  aria-label="Go Premium - navigate to billing"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 delay-100" />
                  <span className="relative">Go Premium</span>
                </Link>
                <p className="mt-2 text-[11px] text-zinc-500 text-center">Cancel anytime no commitment</p>
              </div>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Cancel anytime • No hidden fees • GDPR compliant
        </p>
      </div>
    </section>
  );
}

function Feature({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <svg className={`w-4 h-4 mt-0.5 ${strong ? 'text-brand-300' : 'text-green-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className={strong ? 'font-semibold' : ''}>{children}</span>
    </li>
  );
}



