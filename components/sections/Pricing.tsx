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
    description: '10 jobs on signup, then 5 curated roles every Thursday.',
    price: '€0',
    suffix: 'forever',
    cta: { label: 'Start free', href: '/signup?tier=free' },
    features: Copy.FREE_PLAN_FEATURES,
    footnote: Copy.PRICING_BADGE,
  },
  {
    id: 'premium',
    name: Copy.PREMIUM_PLAN_TITLE,
    headline: 'Stay ahead of every opening',
    description: '10 jobs on signup plus 15 new roles each week (Mon / Wed / Fri).',
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
    <section data-testid="pricing" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#05010f] via-[#090018] to-[#130033] opacity-90" />

      <div className="container-page container-rhythm relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{Copy.PRICING_TITLE}</h2>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">{Copy.PRICING_SUBTITLE}</p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>
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
      className={`relative flex h-full flex-col justify-between rounded-3xl border ${
        isPremium ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-white/5'
      } p-8 shadow-[0_22px_60px_rgba(10,0,42,0.25)] backdrop-blur-sm sm:p-9`}
    >
      {plan.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(99,102,241,0.45)]">
          {plan.badge}
        </span>
      )}

      <div className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-white sm:text-4xl">{plan.price}</span>
          {plan.suffix && <span className="text-sm font-medium text-zinc-400">{plan.suffix}</span>}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-200">{plan.name}</p>
        <h3 className="text-xl font-semibold text-white sm:text-2xl">{plan.headline}</h3>
        <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{plan.description}</p>

        <ul className="mt-6 space-y-3">
          {plan.features.map(feature => (
            <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300 sm:text-base">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/15 text-brand-200">
                <BrandIcons.Check className="h-3.5 w-3.5" />
              </span>
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={plan.cta.href}
          className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 sm:text-base ${
            isPremium
              ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-[0_12px_32px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_40px_rgba(99,102,241,0.45)]'
              : 'border border-white/15 bg-white/5 text-white hover:border-brand-500/40 hover:bg-brand-500/10'
          }`}
        >
          {plan.cta.label}
          <BrandIcons.ArrowRight className="ml-2 h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <BrandIcons.Shield className="h-4 w-4" />
          <span>Cancel anytime · GDPR compliant</span>
        </div>

        {plan.footnote && (
          <p className="text-xs text-zinc-500">
            {plan.footnote}
          </p>
        )}
      </div>
    </motion.article>
  );
}
