"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { CTA_GET_MY_5_FREE_MATCHES, CTA_GET_MY_5_FREE_MATCHES_ARIA, TRUST_TEXT_INSTANT_SETUP } from "@/lib/copy";
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
  const [preloadedJobs, setPreloadedJobs] = useState<any[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const prefersReduced = useReducedMotion();
  const shouldThrottle = shouldThrottleAnimations();
  const { stats } = useStats();

  // Pre-fetch jobs immediately on mount (before component renders)
  useEffect(() => {
    async function fetchJobs() {
      try {
        // Calculate week number for rotation
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
        
        const response = await fetch(`/api/sample-jobs?day=monday&tier=free&week=${weekNumber}`);
        const data = await response.json();
        
        if (data.jobs && data.jobs.length > 0) {
          setPreloadedJobs(data.jobs);
        }
      } catch (error) {
        console.error('Failed to pre-fetch jobs:', error);
      }
    }
    
    fetchJobs();
  }, []);

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
      className="section-padding-hero pt-16 pb-20 md:pt-20 md:pb-24 relative overflow-hidden min-h-[60vh] md:min-h-[65vh] flex items-center bg-black"
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
            {/* Headline - Metallic "Silver Silk" with shimmer */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-extrabold tracking-tighter leading-[1.1] mb-3 max-w-[540px] relative"
            >
              {/* Shimmer overlay animation */}
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] pointer-events-none rounded-lg"
                style={{ mixBlendMode: 'overlay' }}
              />
              
              <span className="relative bg-gradient-to-br from-zinc-100 via-white to-zinc-500 bg-clip-text text-transparent">
                Get 5 early-career
              </span>{' '}
              <span className="relative bg-gradient-to-br from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
                job matches
              </span>{' '}
              <span className="text-white whitespace-nowrap">instantly <span className="text-zinc-400">- free</span></span>
            </motion.h1>

            {/* Subheadline - HIGH-STAKES - Clear value prop */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-xl mb-4 mt-6"
            >
              Stop guessing about visa status. Get curated graduate roles matched to your city and career path in under 2 minutes.
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
                className="w-full sm:w-auto sm:max-w-xs px-8 py-4 md:py-5 text-base md:text-lg shadow-lg hover:shadow-xl shadow-[0_4px_20px_rgba(109,40,217,0.4)] hover:shadow-[0_8px_40px_rgba(109,40,217,0.5)] transition-all duration-200"
                aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
              >
                <span className="flex items-center justify-center gap-2">
                  {CTA_GET_MY_5_FREE_MATCHES}
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="space-y-2 mt-3"
              >
                <p className="text-[11px] text-zinc-400">
                  100% free to start • Real entry-level roles • No spam
                </p>
              </motion.div>
              
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="pt-3"
              >
                {stats ? (
                  <>
                    <p className="text-base font-semibold text-zinc-300 mb-1">
                      Join {stats.totalUsers > 0 ? `${stats.totalUsers.toLocaleString('en-US')}+` : '1,500+'} job seekers finding roles
                    </p>
                    <p className="text-xs text-zinc-400">
                      Trusted by students across Europe
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE - iPhone Mockup with Dynamic Backlight */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePosition({
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100,
              });
            }}
            onMouseLeave={() => setMousePosition({ x: 50, y: 50 })}
            className="relative flex justify-center lg:justify-end items-start"
          >
            {/* Dynamic backlight that follows cursor - smooth radial gradient fade */}
            <motion.div
              animate={{
                x: `${mousePosition.x}%`,
                y: `${mousePosition.y}%`,
              }}
              transition={{ type: 'spring', stiffness: 40, damping: 25 }}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0.15) 30%, rgba(139,92,246,0.05) 50%, transparent 70%)',
                filter: 'blur(60px)',
                opacity: 0.7,
              }}
            />
            
            {/* Secondary static glow layers - radial gradients for smooth fade */}
            <div 
              className="absolute -inset-8 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)',
                filter: 'blur(50px)',
                opacity: 0.5,
              }}
            />
            <div 
              className="absolute -inset-6 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)',
                filter: 'blur(40px)',
                opacity: 0.4,
              }}
            />
            
            {/* Floating shadow - smooth radial fade */}
            <div 
              className="absolute inset-0 translate-y-16 pointer-events-none -z-20 scale-110"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, transparent 80%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* iPhone Mockup */}
            <div className="scale-90 md:scale-95 lg:scale-100 origin-top lg:origin-top-left drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative z-10 lg:-mr-8">
              <DeviceFrame priority={true} autoScroll={true} scrollSpeed={1.2}>
                <SampleJobMatches preloadedJobs={preloadedJobs} />
              </DeviceFrame>
            </div>
            {/* Gradient bleed effect - bottom of phone bleeds off */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none -z-0" />
          </motion.div>
        </div>

      </div>

    </section>
  );
}
