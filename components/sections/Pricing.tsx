'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import SectionHeader from '@/components/ui/SectionHeader';
import * as Copy from '@/lib/copy';
import { BrandIcons } from '@/components/ui/BrandIcons';

export default function Pricing() {
  return (
    <section data-testid="pricing" className="section-padding bg-black relative overflow-hidden">
      {/* Background gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent pointer-events-none" />
      
      <div className="container-page container-rhythm relative z-10">
        <SectionHeader
          title={Copy.PRICING_TITLE}
          description={Copy.PRICING_SUBTITLE}
          badge={
            <Badge variant="brand" size="lg" className="font-bold">
              <BrandIcons.Star className="w-4 h-4" />
              {Copy.PRICING_BADGE}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {/* Free Plan */}
          <motion.div 
            data-testid="free-plan"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/20 via-white/10 to-transparent overflow-visible"
            >
              <div className="bg-glass-subtle border border-border-subtle rounded-3xl p-8 md:p-10 flex flex-col h-full hover:border-brand-500/40 transition-all duration-300 shadow-lg backdrop-blur-sm hover:shadow-xl hover:glow-brand-subtle">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-small uppercase tracking-wider text-zinc-400 font-bold mb-4">
                    <BrandIcons.Star className="w-3.5 h-3.5 text-zinc-300" />
                    Free Plan
                </div>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-white leading-tight">10 jobs on signup</div>
                  <div className="text-base font-semibold text-brand-400 mt-3 flex items-center gap-2">
                    <span className="text-zinc-400 font-normal">= </span>
                    <span className="text-xl">5 jobs/week (~20/month)</span>
                  </div>
              </div>

                <ul className="text-body text-zinc-300 space-y-4 mb-8 flex-1">
                  <Feature>
                    <BrandIcons.Mail className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    Weekly email with 5 hand-picked jobs
                  </Feature>
                  <Feature>
                    <BrandIcons.Shield className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    Quality-screened, early-career friendly
                  </Feature>
                  <Feature>
                    <BrandIcons.CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    No dashboards, zero spam
                  </Feature>
              </ul>

              <div className="mt-auto">
                <Link 
                  href="/signup?tier=free" 
                    className="btn-secondary inline-block w-full text-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black text-base font-semibold py-4"
                  role="button"
                  aria-label="Start free plan - navigate to signup"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center justify-center gap-2">
                      Start free
                      <BrandIcons.ArrowRight className="w-5 h-5" />
                    </span>
                </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            data-testid="premium-plan"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Enhanced Best Value Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              viewport={{ once: true }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 text-sm font-black rounded-full bg-gradient-to-r from-brand-500 to-purple-600 border-2 border-brand-400/50 text-white shadow-[0_4px_20px_rgba(99,102,241,0.5)] backdrop-blur-sm flex items-center gap-2"
            >
              <BrandIcons.Star className="w-4 h-4 fill-current" />
              Most Popular
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-3xl p-[2px] bg-gradient-to-b from-brand-500/60 via-purple-600/40 to-brand-500/30 overflow-visible shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:shadow-[0_0_60px_rgba(139,92,246,0.35)] transition-all duration-300"
            >
              <div className="relative bg-glass-subtle border border-brand-500/40 rounded-3xl p-8 md:p-10 flex flex-col h-full overflow-hidden shadow-xl backdrop-blur-sm glow-brand-subtle">
                {/* Subtle animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-600/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="mb-6 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-small uppercase tracking-wider text-brand-300 font-bold mb-4">
                    <BrandIcons.Star className="w-3.5 h-3.5 text-brand-400 fill-current" />
                    Premium Plan
                </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-black text-white leading-tight">10 jobs on signup</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl md:text-3xl font-black text-brand-400">{Copy.PREMIUM_PLAN_PRICE}</span>
                    <span className="text-base font-semibold text-zinc-300">{Copy.PREMIUM_PLAN_PRICE_UNIT}</span>
                  </div>
                  <div className="text-base font-semibold text-brand-400 mt-3 flex items-center gap-2">
                    <span className="text-zinc-400 font-normal">= </span>
                    <span className="text-xl">15 jobs/week (~60/month)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                    <BrandIcons.TrendingUp className="w-3.5 h-3.5" />
                    3× more than free
                  </div>
              </div>

                <ul className="text-body text-zinc-200 space-y-4 mb-8 flex-1 relative z-10">
                  <Feature strong>
                    <BrandIcons.Zap className="w-5 h-5 text-brand-300 flex-shrink-0" />
                    New matches every 48 hours (Mon/Wed/Fri)
                  </Feature>
                  <Feature strong>
                    <BrandIcons.Clock className="w-5 h-5 text-brand-300 flex-shrink-0" />
                    24-hour early access to fresh roles
                  </Feature>
                  <Feature strong>
                    <BrandIcons.Target className="w-5 h-5 text-brand-300 flex-shrink-0" />
                    Priority curation for your preferences
                  </Feature>
              </ul>

                <div className="mt-auto relative z-10">
                <Link 
                  href="/billing" 
                    className="btn-primary inline-block w-full text-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300 text-base font-bold py-4"
                  role="button"
                  aria-label="Go Premium - navigate to billing"
                >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center justify-center gap-2">
                      Go Premium
                      <BrandIcons.ArrowRight className="w-5 h-5" />
                    </span>
                </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center text-small text-zinc-400 mt-10 flex items-center justify-center gap-2"
        >
          <BrandIcons.Shield className="w-4 h-4" />
          Cancel anytime · GDPR compliant
        </motion.p>
      </div>
    </section>
  );
}

function Feature({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {typeof children === 'string' ? (
        <>
          <BrandIcons.CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${strong ? 'text-brand-300' : 'text-brand-400'}`} />
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
