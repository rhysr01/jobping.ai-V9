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
    cta: { label: 'Get my first 5 matches', href: '/signup/free' },
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
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-indigo-900/40 to-transparent" />
      {/* Overhead spotlight crown */}
      <div className="absolute inset-x-0 -top-36 h-44 bg-gradient-to-b from-violet-600/15 to-transparent blur-lg-hero pointer-events-none" />
      <div className="absolute inset-0 bg-black" />

      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200">
            <BrandIcons.GraduationCap className="h-[5.2px] w-[5.2px] text-brand-300" />
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

        <div className="relative">
          {/* Focus window - top */}
          <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-gradient-to-b from-white/[0.06] to-transparent blur-md-hero" />
          {/* Focus window - bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-[-60px] h-40 bg-gradient-to-t from-white/[0.03] to-transparent blur-md-hero" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 max-w-3xl mx-auto rounded-2xl bg-white/[0.04] border border-white/10 p-10 backdrop-blur-xl shadow-hero ring-1 ring-white/5 text-center hover:-translate-y-1 hover:shadow-feature transition-all duration-200 relative z-10"
          >
          <div className="flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
              🚀 Over 12,000 jobs matched this month
            </span>
            <h3 className="text-5xl font-semibold tracking-[-0.02em] text-white md:text-6xl mb-2">
              See your first 5 matches before the weekend
            </h3>
            <p className="max-w-2xl text-xl text-zinc-300 md:text-2xl mb-6">
              Sign up in under two minutes—your first 5 matches arrive within 48 hours.
            </p>
            <Link
              href="/signup"
              aria-label="Get my first 5 matches"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand-500 px-6 text-sm font-medium text-white shadow-md shadow-brand-500/40 transition-all duration-200 hover:bg-brand-500/90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-base"
            >
              <BrandIcons.Mail className="h-4 w-4" />
              Get my first 5 matches
              <BrandIcons.ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ plan, index }: { plan: PlanConfig; index: number }) {
  const isPremium = plan.id === 'premium';

  return (
    <div className="relative">
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-xs font-semibold px-4 py-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-200 shadow-md shadow-yellow-400/20 whitespace-nowrap">
          Most popular
        </span>
      )}
      <motion.article
        data-testid={`${plan.id}-plan`}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: index * 0.1 }}
        className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl backdrop-blur-xl px-6 py-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-hover md:px-7 md:py-7 md:scale-[1.02] md:-translate-y-1 ${
          isPremium 
            ? 'bg-zinc-900 border border-brand-500/60 shadow-pricing' 
            : 'bg-white/[0.06] border border-white/10 shadow-pricing md:scale-100 md:translate-y-0'
        }`}
      >
        {isPremium && (
          <>
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[1.75rem] bg-[radial-gradient(circle_at_center,theme(colors.brand.500/0.35),_transparent_70%)] blur-sm-hero" />
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[1.75rem] ring-1 ring-violet-500/30" />
          </>
        )}

        <div className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-white sm:text-5xl leading-[1.05]">{plan.price}</span>
          {plan.suffix && <span className="text-base font-medium text-zinc-300 leading-[1.05]">{plan.suffix}</span>}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-300">{plan.name}</p>
        <h3 className="text-xl font-semibold text-white sm:text-2xl mb-2">{plan.headline}</h3>
        <p className="text-base text-zinc-300/90 leading-relaxed">{plan.description}</p>
        
        {/* Progress indicator for Premium */}
        {isPremium && (
          <div className="mt-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-zinc-300">Free:</span>
              <span className="flex items-center gap-1 text-brand-300">
                <span className="text-lg">●</span>
                <span className="text-zinc-400">○○</span>
              </span>
              <span className="text-zinc-400 mx-1">→</span>
              <span className="text-zinc-300">Premium:</span>
              <span className="flex items-center gap-1 text-brand-300">
                <span className="text-lg">●●●</span>
              </span>
            </div>
            <p className="text-xs text-center text-zinc-400 mt-1">Free: 5 (one-time) → Premium: 15 per week (3x more)</p>
          </div>
        )}

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

        {/* Time-to-apply callout for Premium */}
        {isPremium && (
          <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-zinc-300 leading-relaxed">
              💡 <strong className="text-white">More matches = more shots at landing your role.</strong> Premium users get 3x the opportunities and apply faster.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href={plan.cta.href}
            aria-label={isPremium ? "Upgrade to Premium plan" : "Sign up for free matches"}
            className={`group relative inline-flex items-center justify-center overflow-hidden h-11 rounded-full px-6 text-sm font-medium transition-all duration-300 sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              isPremium
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/40 hover:bg-brand-500/90 hover:-translate-y-0.5 hover:shadow-feature'
                : 'border border-white/15 bg-white/5 text-white hover:border-brand-500/40 hover:bg-brand-500/10'
            }`}
          >
            <span className="relative flex items-center gap-2">
              {!isPremium && <BrandIcons.Mail className="h-4 w-4" />}
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
    </div>
  );
}
