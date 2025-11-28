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
    cta: { label: 'Start free', href: '/signup?tier=free' },
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
    <section data-testid="pricing" className="section-padding relative overflow-hidden bg-[#05010f]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#05000d] via-[#09011a] to-[#170043] opacity-90" />

      <div className="container-page container-rhythm relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
            <BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {Copy.PRICING_TITLE}
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-zinc-100 sm:text-lg">{Copy.PRICING_SUBTITLE}</p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 overflow-hidden rounded-3xl border-2 border-brand-500/40 bg-gradient-to-r from-[#0b031d] via-[#120033] to-[#1f0546] px-8 py-12 text-center shadow-[0_30px_100px_rgba(17,0,45,0.5)] backdrop-blur-sm sm:px-12"
        >
          <div className="flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
              🚀 Over 12 000 jobs matched this month
            </span>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              Start free today—see your first five matches before the weekend.
            </h3>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-zinc-100 sm:text-base">
              We refresh the pipeline every morning and route hot roles instantly. If we miss the mark, reply to any email and we retune within 24 hours.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 hover:text-brand-100 sm:text-base"
            >
              Start free
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
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border-2 ${
        isPremium ? 'border-brand-500/60 bg-gradient-to-br from-brand-500/15 via-brand-500/10 to-purple-500/10 shadow-[0_20px_60px_rgba(99,102,241,0.3)]' : 'border-white/20 bg-white/[0.08]'
      } p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/60 hover:shadow-[0_24px_60px_rgba(99,102,241,0.35)] sm:p-10`}
    >
      {isPremium && (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      {plan.badge && (
        <motion.span 
          className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(99,102,241,0.45)]"
          animate={{ 
            boxShadow: [
              '0_8px_24px_rgba(99,102,241,0.45)',
              '0_8px_32px_rgba(139,92,246,0.6)',
              '0_8px_24px_rgba(99,102,241,0.45)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {plan.badge}
        </motion.span>
      )}

      <div className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white sm:text-5xl">{plan.price}</span>
          {plan.suffix && <span className="text-base font-medium text-zinc-300">{plan.suffix}</span>}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-300">{plan.name}</p>
        <h3 className="text-xl font-bold text-white sm:text-2xl">{plan.headline}</h3>
        <p className="text-sm font-medium leading-relaxed text-zinc-100 sm:text-base">{plan.description}</p>

        <ul className="mt-6 space-y-4">
          {plan.features.map(feature => (
            <li key={feature} className="flex items-start gap-3 text-sm font-medium text-zinc-100 sm:text-base">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
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
            className={`group relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300 sm:text-base ${
              isPremium
                ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-[0_12px_32px_rgba(99,102,241,0.35)] hover:shadow-[0_16px_40px_rgba(99,102,241,0.5)]'
                : 'border border-white/15 bg-white/5 text-white hover:border-brand-500/40 hover:bg-brand-500/10'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
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
