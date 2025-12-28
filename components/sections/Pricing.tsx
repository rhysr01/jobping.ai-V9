'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import * as Copy from '@/lib/copy';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { trackEvent } from '@/lib/analytics';
import { useStats } from '@/hooks/useStats';
import SocialProofTicker from '@/components/ui/SocialProofTicker';
import ErrorBoundary from '@/components/ErrorBoundary';

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
    headline: 'Try JobPing Free',
    description: Copy.FREE_PLAN_DESCRIPTION,
    price: '€0',
    suffix: 'one-time',
    cta: { label: 'See My Matches →', href: '/signup/free' },
    features: Copy.FREE_PLAN_FEATURES,
    footnote: Copy.PRICING_BADGE,
  },
  {
    id: 'premium',
    name: Copy.PREMIUM_PLAN_TITLE,
    headline: 'Get 15 Curated Matches Per Week',
    description: Copy.PREMIUM_PLAN_DESCRIPTION,
    price: Copy.PREMIUM_PLAN_PRICE,
    suffix: Copy.PREMIUM_PLAN_PRICE_UNIT,
    badge: 'Most popular',
    cta: { label: 'Start Premium →', href: '/signup' },
    features: Copy.PREMIUM_PLAN_FEATURES,
    footnote: Copy.PREMIUM_PLAN_ANNUAL,
  },
];

export default function Pricing() {
  // Add id to section for ScrollCTA detection
  const { stats } = useStats();
  
  return (
    <section id="pricing" data-testid="pricing" className="py-24 md:py-32 relative overflow-hidden bg-black scroll-snap-section">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-indigo-900/40 to-transparent" />
      {/* Overhead spotlight crown */}
      <div className="absolute inset-x-0 -top-36 h-44 bg-gradient-to-b from-violet-600/15 to-transparent blur-lg-hero pointer-events-none" />
      {/* Base background is set on section element */}

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


        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8 space-y-3"
        >
          {stats ? (
            stats.totalUsers > 0 && (
              <p className="text-sm text-zinc-400">
                Join <span className="font-semibold text-white">{stats.totalUsers.toLocaleString('en-US')}+</span> students finding jobs
              </p>
            )
          ) : (
            <div className="h-4 w-56 bg-white/5 rounded animate-pulse mx-auto" />
          )}
          <div className="flex justify-center">
            <ErrorBoundary fallback={null}>
              <SocialProofTicker />
            </ErrorBoundary>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PricingCard({ plan, index }: { plan: PlanConfig; index: number }) {
  const isPremium = plan.id === 'premium';
  const [borderBeamPosition, setBorderBeamPosition] = useState(0);

  // Border beam animation (travels around border - slower for smoother motion)
  useEffect(() => {
    if (!isPremium) return;
    const interval = setInterval(() => {
      setBorderBeamPosition((prev) => (prev + 1) % 100);
    }, 80); // Slower: 80ms for smoother, more premium motion
    return () => clearInterval(interval);
  }, [isPremium]);

  // Extract price number and currency
  const priceMatch = plan.price.match(/€(\d+)/);
  const priceNumber = priceMatch ? priceMatch[1] : plan.price.replace(/[€$]/g, '');
  const currency = plan.price.includes('€') ? '€' : plan.price.includes('$') ? '$' : '';

  const cardContent = (
    <>
      <div className="space-y-5">
        {/* Price with typographic refinement - currency half size, top-aligned */}
        <div className="flex items-baseline gap-2 mb-2">
          {currency && (
            <span className="text-2xl md:text-3xl font-bold text-zinc-400 leading-none self-start mt-1">
              {currency}
            </span>
          )}
          <span className="text-5xl md:text-6xl font-black bg-gradient-to-br from-white via-purple-100 to-white bg-clip-text text-transparent leading-none">
            {priceNumber}
          </span>
          {plan.suffix && (
            <span className="text-lg font-semibold text-zinc-300/80 leading-none self-end mb-1">
              {plan.suffix}
            </span>
          )}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-300">{plan.name}</p>
        <h3 className="text-xl font-semibold text-zinc-100 sm:text-2xl mb-2 tracking-tight">{plan.headline}</h3>
        <p className="text-base text-zinc-400 leading-relaxed">{plan.description}</p>

        <ul className="mt-6 space-y-4 min-h-[260px]">
          {plan.features.map(feature => (
            <li key={feature} className="flex items-start gap-4 text-sm font-medium text-zinc-100 sm:text-base group/item">
              <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/30 text-purple-200 shadow-[0_2px_8px_rgba(139,92,246,0.2)] group-hover/item:shadow-[0_4px_16px_rgba(139,92,246,0.4)] transition-all duration-200">
                <BrandIcons.Check className="h-4 w-4" />
              </span>
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href={plan.cta.href}
            onClick={() => {
              if (isPremium) {
                trackEvent('cta_clicked', { type: 'premium', location: 'pricing' });
              } else {
                trackEvent('cta_clicked', { type: 'free', location: 'pricing' });
              }
            }}
            aria-label={isPremium ? "Start Premium - Weekly emails" : "Try Free Now - Instant matches"}
            className={`group relative inline-flex items-center justify-center overflow-hidden h-11 rounded-full px-6 text-sm font-medium transition-all duration-200 sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              isPremium
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/40 hover:bg-purple-600 hover:-translate-y-0.5 hover:shadow-feature transition-all'
                : 'border border-white/15 bg-white/5 text-white hover:border-brand-500/40 hover:bg-white/5 transition-all'
            }`}
          >
            <span className="relative flex items-center gap-2">
              {!isPremium && <BrandIcons.Mail className="h-4 w-4" />}
              {isPremium && <BrandIcons.Zap className="h-4 w-4" />}
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
    </>
  );

  return (
    <div className="relative">
      {isPremium ? (
        // Premium card with glow and "Most Popular" badge
        <div className="relative md:scale-[1.05] md:-translate-y-2">
          {/* Triple-layer glow */}
          <div className="absolute -inset-6 bg-purple-600/15 blur-3xl rounded-full opacity-60 animate-pulse" />
          <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full opacity-40" />
          <div className="absolute -inset-2 bg-purple-400/10 blur-xl rounded-full opacity-30" />
          
          {/* Most Popular badge */}
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full z-20 shadow-[0_4px_16px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]">
            ⭐ Most Popular
          </span>
          
          {/* Premium card with conic-gradient border */}
          <div className="relative rounded-[2rem] p-[1px] border border-purple-500/30 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(139,92,246,0.5),rgba(168,85,247,0.3),rgba(139,92,246,0.5))]">
            {/* Dual rotating beams for premium effect */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none z-30">
              {/* Primary beam - wider, more prominent */}
              <motion.div
                animate={{
                  background: `conic-gradient(from ${borderBeamPosition * 3.6}deg,
                    transparent 0deg,
                    rgba(139,92,246,0.7) 20deg,
                    rgba(168,85,247,0.9) 30deg,
                    rgba(139,92,246,0.7) 40deg,
                    transparent 60deg)`,
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              />
              {/* Secondary beam - rotating opposite direction */}
              <motion.div
                animate={{
                  background: `conic-gradient(from ${(360 - borderBeamPosition * 3.6)}deg,
                    transparent 0deg,
                    rgba(139,92,246,0.4) 15deg,
                    rgba(139,92,246,0.3) 25deg,
                    transparent 35deg)`,
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
                style={{ opacity: 0.6 }}
              />
            </div>
            
            <motion.article
              data-testid={`${plan.id}-plan`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: index * 0.1 }}
              className="group relative flex flex-col h-full overflow-hidden rounded-[2rem] bg-zinc-900/80 backdrop-blur-xl px-6 py-6 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-hover md:px-7 md:py-7 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] border-2 border-purple-500/30"
            >
              {/* Glass gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[2rem]" />
              <div className="relative z-10">
                {cardContent}
              </div>
            </motion.article>
          </div>
        </div>
      ) : (
        // Free card with light source borders
        <motion.article
          data-testid={`${plan.id}-plan`}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: index * 0.1 }}
          className="group relative flex flex-col h-full overflow-hidden rounded-[2rem] border-light-source bg-zinc-900/30 backdrop-blur-sm px-6 py-6 transition-all duration-200 hover:border-purple-500/20 hover:scale-[1.02] active:scale-[0.98] md:px-7 md:py-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        >
          {/* Glass gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[2rem]" />
          <div className="relative z-10">
            {cardContent}
          </div>
        </motion.article>
      )}
    </div>
  );
}
