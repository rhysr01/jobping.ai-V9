'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Copy from '@/lib/copy';
import { BrandIcons } from '@/components/ui/BrandIcons';

type PlanConfig = {
  id: 'free' | 'premium';
  name: string;
  headline: string;
  description: string;
  price: string;
  suffix?: string;
  badge?: string;
  cta: { label: string; href: string };
  features: string[];
  footnote?: string;
};

const plans: PlanConfig[] = [
  {
    id: 'free',
    name: Copy.FREE_PLAN_TITLE,
    headline: 'Kickstart in under 2 minutes',
    description: Copy.FREE_PLAN_DESCRIPTION,
    price: '€0',
    suffix: 'forever',
    cta: { label: 'Get your first 5 roles', href: '/signup?tier=free' },
    features: Copy.FREE_PLAN_FEATURES,
    footnote: Copy.PRICING_BADGE,
  },
  {
    id: 'premium',
    name: Copy.PREMIUM_PLAN_TITLE,
    headline: 'Stay ahead of every opening',
    description: Copy.PREMIUM_PLAN_DESCRIPTION,
    price: Copy.PREMIUM_PLAN_PRICE,
    suffix: Copy.PREMIUM_PLAN_PRICE_UNIT,
    badge: 'Most popular',
    cta: { label: 'Upgrade for €5/mo', href: '/billing' },
    features: Copy.PREMIUM_PLAN_FEATURES,
    footnote: Copy.PREMIUM_PLAN_ANNUAL,
  },
];

export default function Pricing() {
  return (
    <section data-testid="pricing" className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 relative overflow-hidden bg-[#05010f] scroll-snap-section">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      <div className="absolute inset-0 bg-black" />

      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
            Pricing
          </span>
          <h2 className="section-title mt-4">
            {Copy.PRICING_TITLE}
          </h2>
          <p className="mt-4 mb-10 text-base font-medium leading-relaxed text-zinc-100 sm:text-lg">{Copy.PRICING_SUBTITLE}</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 overflow-hidden rounded-xl bg-white/[0.06] border border-white/10 shadow-[0_4px_18px_rgba(0,0,0,0.35)] backdrop-blur-xl px-6 py-6 text-center hover:-translate-y-1 transition-all duration-200 sm:px-8 sm:py-8 md:px-12 md:py-12"
        >
          <div className="flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
              🚀 Over 12,000 jobs matched this month
            </span>
            <h3 className="text-5xl font-semibold tracking-[-0.02em] text-white md:text-6xl mb-2">
              See your first 5 matches before the weekend
            </h3>
            <p className="max-w-2xl text-xl text-zinc-300 md:text-2xl mb-4">
              Sign up in under two minutes—your first curated set arrives within 48 hours.
            </p>
            <p className="max-w-2xl text-base text-zinc-400 mb-6">
              If we miss the mark, reply to any email and we retune within 24 hours.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 hover:text-brand-100 sm:text-base"
            >
              See my first matches
              <BrandIcons.ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PricingCard({ plan, index }: { plan: PlanConfig; index: number }) {
  const isPremium = plan.id === 'premium';

  return (
    <motion.article
      data-testid={`${plan.id}-plan`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: index * 0.1 }}
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl backdrop-blur-xl px-6 py-6 transition-all duration-200 hover:-translate-y-1 md:px-7 md:py-7 ${
        isPremium 
          ? 'bg-zinc-900 border border-purple-500/60 shadow-[0_24px_60px_rgba(129,140,248,0.35)]' 
          : 'bg-white/[0.06] border border-white/10 shadow-pricing'
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/40 text-purple-200">
          Most popular
        </span>
      )}

      <div className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-white sm:text-5xl leading-[1.05]">{plan.price}</span>
          {plan.suffix && <span className="text-base font-medium text-zinc-300 leading-[1.05]">{plan.suffix}</span>}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-400">{plan.name}</p>
        <h3 className="text-xl font-semibold text-white sm:text-2xl mb-2">{plan.headline}</h3>
        <p className="text-base text-zinc-300/90 leading-relaxed">{plan.description}</p>

        <ul className="mt-6 space-y-4">
          {plan.features.map(feature => (
            <li key={feature} className="flex items-start gap-3 text-sm font-medium text-zinc-100 sm:text-base">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                <BrandIcons.Check className="h-3.5 w-3.5" />
              </span>
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href={plan.cta.href}
            className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 sm:text-base ${
              isPremium
                ? 'bg-brand-500 text-white shadow-glow-subtle hover:bg-brand-600 hover:shadow-[0_16px_40px_rgba(126,97,255,0.5)]'
                : 'border border-white/15 bg-white/5 text-white hover:border-brand-500/40 hover:bg-brand-500/10'
            }`}
          >
            <span className="relative flex items-center gap-2">
              {plan.cta.label}
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <BrandIcons.ArrowRight className="h-4 w-4" />
              </motion.span>
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.article>
  );
}
