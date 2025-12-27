"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";
import HeroBackgroundAura from "@/components/ui/HeroBackgroundAura";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import SampleJobMatches from "@/components/marketing/SampleJobMatches";
import { trackEvent } from "@/lib/analytics";
import TrustBadges from "@/components/sections/TrustBadges";
import { useStats } from "@/hooks/useStats";

export default function Hero() {
  const [offset, setOffset] = useState(0);
  const [enableMotion, setEnableMotion] = useState(true);
  const [shouldLoadAnimations, setShouldLoadAnimations] = useState(false);
  const prefersReduced = useReducedMotion();
  const shouldThrottle = shouldThrottleAnimations();
  const { stats } = useStats();

  // Lazy load animations after initial paint
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadAnimations(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setEnableMotion(false);
  }, []);

  // Scroll parallax for aura
  useEffect(() => {
    if (!enableMotion || prefersReduced || shouldThrottle) return;
    const onScroll = () => setOffset(window.scrollY * 0.03);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [enableMotion, prefersReduced, shouldThrottle]);

  return (
    <section
      data-testid="hero-section"
      className="section-padding-hero pt-16 pb-20 md:pt-20 md:pb-24 relative overflow-hidden min-h-[60vh] md:min-h-[65vh] flex items-center"
    >
      {/* Enhanced cinematic background with richer gradients */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500/3 via-transparent to-brand-600/3" />
      
      {/* Background animations */}
      <HeroBackgroundAura offset={enableMotion ? offset : 0} enableMotion={enableMotion} />
      
      {/* Additional depth layers */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-600/5 rounded-full blur-3xl opacity-40" />
      </div>

      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      
      {/* Main container - Split Layout */}
      <div className="container-page relative z-10 mx-auto max-w-7xl">
        {/* Split Grid Layout: Content Left, Mockup Right */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 md:mt-8">
          
          {/* LEFT SIDE - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left space-y-6"
          >
            {/* Headline - STRONGER TYPOGRAPHY */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-extrabold leading-[1.1] text-white mb-3"
            >
              {Copy.HERO_HEADLINE}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-xl mb-4"
            >
              {Copy.HERO_SUBLINE}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col gap-3 pt-2"
            >
              <Button
                href="/signup/free"
                onClick={() => {
                  trackEvent('cta_clicked', { type: 'free', location: 'hero' });
                }}
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[240px] px-8 py-4 md:py-5 text-base md:text-lg shadow-[0_4px_20px_rgba(109,40,217,0.3)] hover:shadow-[0_6px_30px_rgba(109,40,217,0.4)] transition-shadow"
                aria-label="Show Me My Matches"
              >
                <span className="flex items-center justify-center gap-2">
                  Show Me My Matches →
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="text-sm text-zinc-400 mt-3"
              >
                Free • No credit card • 2-minute setup
              </motion.p>
              <TrustBadges />
              
              {/* Onboarding Preview - What we'll ask */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.6 }}
                className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 backdrop-blur-sm"
              >
                <p className="text-xs font-semibold text-zinc-300 mb-2.5">Here's what we'll ask:</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    <BrandIcons.Target className="h-3 w-3" />
                    Cities
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    <BrandIcons.Briefcase className="h-3 w-3" />
                    Career path
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    <BrandIcons.Shield className="h-3 w-3" />
                    Visa status
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                    <BrandIcons.Star className="h-3 w-3" />
                    Experience
                  </span>
                </div>
              </motion.div>
              
              {/* Social Proof Stats */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-sm text-zinc-400 pt-2"
              >
                Join {stats && stats.totalUsers > 0 ? `${stats.totalUsers.toLocaleString('en-US')}+` : '1,500+'} job seekers finding roles
              </motion.p>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE - iPhone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Background glow behind phone */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-brand-600/10 to-brand-500/10 rounded-full blur-3xl -z-10 opacity-50" />
            
            {/* iPhone Mockup - Responsive scaling with shadow */}
            <div className="scale-75 md:scale-90 lg:scale-100 origin-center drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <DeviceFrame>
                <SampleJobMatches />
              </DeviceFrame>
            </div>
          </motion.div>
        </div>

      </div>

    </section>
  );
}
