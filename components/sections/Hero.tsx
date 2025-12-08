"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";
import HeroBackgroundAura from "@/components/ui/HeroBackgroundAura";
import { EarlyAccessBanner } from "@/components/ui/EarlyAccessBanner";
import DeviceFrame from "@/components/marketing/DeviceFrame";
import SampleJobMatches from "@/components/marketing/SampleJobMatches";
import ExampleMatchesModal from "@/components/ui/ExampleMatchesModal";
import LogoWordmark from "@/components/LogoWordmark";

export default function Hero() {
  const [offset, setOffset] = useState(0);
  const [enableMotion, setEnableMotion] = useState(true);
  const [shouldLoadAnimations, setShouldLoadAnimations] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const prefersReduced = useReducedMotion();
  const shouldThrottle = shouldThrottleAnimations();

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
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-600/5" />
      
      {/* Background animations */}
      <HeroBackgroundAura offset={enableMotion ? offset : 0} enableMotion={enableMotion} />
      
      {/* Additional depth layers */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      
      {/* Main container - Split Layout */}
      <div className="container-page relative z-10 mx-auto max-w-7xl">
        {/* Early Access Banner */}
        <EarlyAccessBanner />
        
        {/* JobPing Logo with Gradient Hat */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex justify-center mt-6 mb-8"
        >
          <LogoWordmark />
        </motion.div>
        
        {/* Split Grid Layout: Content Left, Mockup Right */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 md:mt-8">
          
          {/* LEFT SIDE - Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left space-y-5"
          >
            {/* Badge */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500/50 bg-gradient-to-r from-brand-500/15 to-purple-600/10 px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200 shadow-[0_0_20px_rgba(126,97,255,0.2)] mb-2"
            >
              <BrandIcons.Mail className="h-3.5 w-3.5 text-brand-300" />
              {Copy.HERO_PILL}
            </motion.p>

            {/* Headline - STRONGER TYPOGRAPHY */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] text-white mb-3"
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

            {/* Mini Benefits Row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-wrap items-center gap-4 pt-1"
            >
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <BrandIcons.Zap className="h-4 w-4 text-brand-400" />
                <span>AI-powered matching</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <BrandIcons.Target className="h-4 w-4 text-brand-400" />
                <span>Relevant roles only</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <BrandIcons.Mail className="h-4 w-4 text-brand-400" />
                <span>Weekly job drops</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <Button
                href="/signup/free"
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[240px] px-8 py-4 md:py-5 text-base md:text-lg shadow-[0_4px_20px_rgba(126,97,255,0.4)] hover:shadow-[0_6px_30px_rgba(126,97,255,0.5)] transition-shadow"
                aria-label="Try for free now"
              >
                <span className="flex items-center justify-center gap-2">
                  Try for free now
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <Button
                onClick={() => setShowExampleModal(true)}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[240px] px-8 py-4 md:py-5 text-base md:text-lg border-white/30 hover:border-white/50 bg-white/[0.12] hover:bg-white/[0.18] transition-all"
                aria-label="View Example Matches"
              >
                {Copy.HERO_SECONDARY_CTA}
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-sm text-zinc-400 pt-1"
            >
              {Copy.HERO_SOCIAL_PROOF}
            </motion.p>
          </motion.div>

          {/* RIGHT SIDE - iPhone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Background glow behind phone */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-purple-600/20 to-brand-500/20 rounded-full blur-3xl -z-10 opacity-60" />
            
            {/* iPhone Mockup - Responsive scaling with shadow */}
            <div className="scale-75 md:scale-90 lg:scale-100 origin-center drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <DeviceFrame>
                <SampleJobMatches />
              </DeviceFrame>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator - Desktop Only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-zinc-400"
          >
            <span className="text-xs uppercase tracking-wider">Scroll</span>
            <BrandIcons.ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </div>

      {/* Example Matches Modal */}
      <ExampleMatchesModal 
        isOpen={showExampleModal} 
        onClose={() => setShowExampleModal(false)} 
      />
    </section>
  );
}
