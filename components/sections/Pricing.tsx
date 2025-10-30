'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import SectionHeader from '@/components/ui/SectionHeader';
import * as Copy from '@/lib/copy';

export default function Pricing() {
  return (
    <section className="section-padding bg-black">
      <div className="container-page container-rhythm">
        <SectionHeader
          title={Copy.PRICING_TITLE}
          description={Copy.PRICING_SUBTITLE}
          badge={<Badge variant="default">{Copy.PRICING_BADGE}</Badge>}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Free Plan */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/15 to-transparent"
          >
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
              className="bg-glass-subtle border border-border-subtle rounded-2xl p-6 md:p-8 flex flex-col h-full hover:border-border-default transition-all duration-300 shadow-base backdrop-blur-sm hover:shadow-[0_4px_12px_rgba(255,255,255,0.04)]"
            >
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-small uppercase tracking-wider text-zinc-400 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-400" aria-hidden="true" /> Free
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white">5 roles on signup</div>
                <div className="text-small font-bold text-brand-400 mt-1">= 25 jobs/month</div>
              </div>

              <ul className="text-sm text-zinc-300 space-y-3 mb-6">
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
            </motion.div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-b from-brand-500/45 to-purple-600/30 shadow-[0_0_28px_rgba(139,92,246,0.18)] hover:shadow-[0_0_40px_rgba(139,92,246,0.208)] transition-all duration-300"
          >
            <div className="absolute -top-3 left-5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-200 shadow-[0_2px_8px_rgba(154,106,255,0.15)] backdrop-blur-sm">
              Best Value
            </div>
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
              className="relative bg-glass-subtle border border-border-subtle rounded-2xl p-6 md:p-8 flex flex-col h-full overflow-hidden shadow-base backdrop-blur-sm hover:shadow-[0_4px_12px_rgba(255,255,255,0.04)] transition-all duration-300"
            >

              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-small uppercase tracking-wider text-brand-300 font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-400" aria-hidden="true" /> Premium
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white">10 roles on signup</div>
                <div className="text-small font-bold text-brand-400 mt-1">= 70+ jobs/month</div>
                <div className="text-zinc-400 text-xs mt-1">vs 25 on free tier</div>
              </div>

              <ul className="text-sm text-zinc-200 space-y-3 mb-6">
                <Feature strong>New matches every 48 hours (Mon/Wed/Fri)</Feature>
                <Feature>24‑hour early access to fresh roles</Feature>
                <Feature>Priority curation for your preferences</Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/billing" 
                  className="btn-primary inline-block w-full text-center rounded-xl shadow-[0_4px_12px_rgba(106,75,255,0.40)] hover:shadow-[0_6px_20px_rgba(106,75,255,0.50)] hover:brightness-105 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300"
                  role="button"
                  aria-label="Go Premium - navigate to billing"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">Go Premium</span>
                </Link>
                <p className="mt-2 text-[11px] text-zinc-500 text-center">Cancel anytime no commitment</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Cancel anytime → No hidden fees → GDPR compliant
        </p>
      </div>
    </section>
  );
}

function Feature({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${strong ? 'text-brand-300' : 'text-green-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className={strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}>{children}</span>
    </li>
  );
}



