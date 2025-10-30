'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import SectionHeader from '@/components/ui/SectionHeader';
import * as Copy from '@/lib/copy';
import { BrandIcons } from '@/components/ui/BrandIcons';

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
                  <BrandIcons.Star className="w-3 h-3 text-zinc-400" />
                  Free
                </div>
                <div className="mt-3 text-heading font-black text-white leading-tight">5 roles on signup</div>
                <div className="text-small font-medium text-brand-400 mt-2 flex items-center gap-1">
                  <span className="text-zinc-500">= </span>
                  <span className="font-semibold">25 jobs/month</span>
                </div>
              </div>

              <ul className="text-body text-zinc-300 space-y-3 mb-6">
                <Feature>
                  <BrandIcons.Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  Weekly email with 5 hand‑picked roles
                </Feature>
                <Feature>
                  <BrandIcons.Shield className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  Quality‑screened, early‑career friendly
                </Feature>
                <Feature>
                  <BrandIcons.CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  No dashboards, zero spam
                </Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/signup?tier=free" 
                  className="btn-secondary inline-block w-full text-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  role="button"
                  aria-label="Start free plan - navigate to signup"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    Start free
                    <BrandIcons.ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
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
            <div className="absolute -top-3 left-5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-200 shadow-[0_2px_8px_rgba(154,106,255,0.15)] backdrop-blur-sm flex items-center gap-1">
              <BrandIcons.Star className="w-3 h-3" />
              Best Value
            </div>
            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3 }}
              className="relative bg-glass-subtle border border-border-subtle rounded-2xl p-6 md:p-8 flex flex-col h-full overflow-hidden shadow-base backdrop-blur-sm hover:shadow-[0_4px_12px_rgba(255,255,255,0.04)] transition-all duration-300"
            >

              <div className="mb-5">
                <div className="inline-flex items-center gap-2 text-small uppercase tracking-wider text-brand-300 font-semibold">
                  <BrandIcons.Star className="w-3 h-3 text-brand-400" />
                  Premium
                </div>
                <div className="mt-3 text-heading font-black text-white leading-tight">10 roles on signup</div>
                <div className="text-small font-medium text-brand-400 mt-2 flex items-center gap-1">
                  <span className="text-zinc-500">= </span>
                  <span className="font-semibold">70+ jobs/month</span>
                </div>
                <div className="text-zinc-400 text-xs mt-2">vs 25 on free tier</div>
              </div>

              <ul className="text-body text-zinc-200 space-y-3 mb-6">
                <Feature strong>
                  <BrandIcons.Zap className="w-4 h-4 text-brand-300 flex-shrink-0" />
                  New matches every 48 hours (Mon/Wed/Fri)
                </Feature>
                <Feature strong>
                  <BrandIcons.Clock className="w-4 h-4 text-brand-300 flex-shrink-0" />
                  24‑hour early access to fresh roles
                </Feature>
                <Feature strong>
                  <BrandIcons.Target className="w-4 h-4 text-brand-300 flex-shrink-0" />
                  Priority curation for your preferences
                </Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/billing" 
                  className="btn-primary inline-block w-full text-center rounded-xl shadow-[0_4px_12px_rgba(106,75,255,0.40)] hover:shadow-[0_6px_20px_rgba(106,75,255,0.50)] hover:brightness-105 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300"
                  role="button"
                  aria-label="Go Premium - navigate to billing"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    Go Premium
                    <BrandIcons.ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <p className="text-center text-small text-zinc-500 mt-6">
          <BrandIcons.Shield className="w-4 h-4 inline mr-1" />
          Cancel anytime · GDPR compliant
        </p>
      </div>
    </section>
  );
}

function Feature({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {typeof children === 'string' ? (
        <>
          <BrandIcons.CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${strong ? 'text-brand-300' : 'text-brand-400'}`} />
          <span className={strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}>{children}</span>
        </>
      ) : (
        <span className={`flex items-start gap-3 ${strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>
          {children}
        </span>
      )}
    </li>
  );
}
