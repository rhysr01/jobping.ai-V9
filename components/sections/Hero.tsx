"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SIGNUP_INITIAL_ROLES, FREE_ROLES_PER_SEND, PREMIUM_ROLES_PER_WEEK } from "@/lib/productMetrics";
import { useStats } from "@/hooks/useStats";
import HeroBackgroundAura from "@/components/ui/HeroBackgroundAura";
import { EarlyAccessBanner } from "@/components/ui/EarlyAccessBanner";

const numberFormatter = new Intl.NumberFormat("en-US");

export default function Hero() {
  const { stats, isLoading: statsLoading } = useStats();
  const [offset, setOffset] = useState(0);
  const [enableMotion, setEnableMotion] = useState(true);
  const [activeJobsTarget, setActiveJobsTarget] = useState(12748);
  const [internshipsTarget, setInternshipsTarget] = useState(0);
  const [graduatesTarget, setGraduatesTarget] = useState(0);
  const [earlyCareerTarget, setEarlyCareerTarget] = useState(0);
  const [totalUsersTarget, setTotalUsersTarget] = useState(0);
  const [displayActiveJobs, setDisplayActiveJobs] = useState(0);
  const [displayInternships, setDisplayInternships] = useState(0);
  const [displayGraduates, setDisplayGraduates] = useState(0);
  const [displayEarlyCareer, setDisplayEarlyCareer] = useState(0);
  const [displayTotalUsers, setDisplayTotalUsers] = useState(0);
  const [shouldLoadAnimations, setShouldLoadAnimations] = useState(false);
  const prefersReduced = useReducedMotion();
  const shouldThrottle = shouldThrottleAnimations();

  // Update targets when stats change
  useEffect(() => {
    if (stats) {
      setActiveJobsTarget(stats.activeJobs);
      setInternshipsTarget(stats.internships);
      setGraduatesTarget(stats.graduates);
      setEarlyCareerTarget(stats.earlyCareer);
      setTotalUsersTarget(stats.totalUsers);
    }
  }, [stats]);

  // Lazy load animations after initial paint
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadAnimations(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const featureIcons = [BrandIcons.Zap, BrandIcons.Target, BrandIcons.Sparkles];
  const formatNumber = (value: number) =>
    numberFormatter.format(Math.round(Math.max(0, value)));
  const hasInternships = !statsLoading && displayInternships > 0;
  const hasGraduates = !statsLoading && displayGraduates > 0;
  const hasEarlyCareer = !statsLoading && displayEarlyCareer > 0;
  const hasTotalUsers = !statsLoading && displayTotalUsers > 0;

  useEffect(() => {
    if (prefersReduced) {
      setDisplayActiveJobs(activeJobsTarget);
      return;
    }
    const controls = animate(0, activeJobsTarget, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: setDisplayActiveJobs,
    });
    return () => controls.stop();
  }, [activeJobsTarget, prefersReduced]);

  useEffect(() => {
    if (internshipsTarget <= 0) {
      setDisplayInternships(0);
      return;
    }
    if (prefersReduced) {
      setDisplayInternships(internshipsTarget);
      return;
    }
    const controls = animate(0, internshipsTarget, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: setDisplayInternships,
    });
    return () => controls.stop();
  }, [internshipsTarget, prefersReduced]);

  useEffect(() => {
    if (graduatesTarget <= 0) {
      setDisplayGraduates(0);
      return;
    }
    if (prefersReduced) {
      setDisplayGraduates(graduatesTarget);
      return;
    }
    const controls = animate(0, graduatesTarget, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: setDisplayGraduates,
    });
    return () => controls.stop();
  }, [graduatesTarget, prefersReduced]);

  useEffect(() => {
    if (earlyCareerTarget <= 0) {
      setDisplayEarlyCareer(0);
      return;
    }
    if (prefersReduced) {
      setDisplayEarlyCareer(earlyCareerTarget);
      return;
    }
    const controls = animate(0, earlyCareerTarget, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: setDisplayEarlyCareer,
    });
    return () => controls.stop();
  }, [earlyCareerTarget, prefersReduced]);

  useEffect(() => {
    if (totalUsersTarget <= 0) {
      setDisplayTotalUsers(0);
      return;
    }
    if (prefersReduced) {
      setDisplayTotalUsers(totalUsersTarget);
      return;
    }
    const controls = animate(0, totalUsersTarget, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: setDisplayTotalUsers,
    });
    return () => controls.stop();
  }, [totalUsersTarget, prefersReduced]);

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

  const particles = useMemo(() => {
    if (prefersReduced || shouldThrottle) return [];
    // Professional: Minimal particles for subtle depth
    return Array.from({ length: 4 }).map((_, index) => ({
      id: index,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 2 + Math.random() * 2,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
      drift: 8 + Math.random() * 6,
      opacity: 0.25 + Math.random() * 0.35,
    }));
  }, [prefersReduced, shouldThrottle]);

  return (
    <section
      data-testid="hero-section"
      className="section-padding-hero pt-16 pb-16 md:pt-20 md:pb-20 relative overflow-hidden flex flex-col items-center justify-start text-center"
    >
      {/* Cinematic dark background with subtle gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-900 via-black to-black" />
      {/* Background animations - contained inside hero section */}
      <HeroBackgroundAura offset={enableMotion ? offset : 0} enableMotion={enableMotion} />
      {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
        <div className="pointer-events-none absolute inset-0 -z-10">
          {particles.map(({ id, top, left, size, duration, delay, drift, opacity }) => (
            <motion.span
              key={`particle-${id}`}
              className="absolute rounded-full bg-white"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: size,
                height: size,
                opacity: opacity * 0.6,
                boxShadow: `0 0 ${size * 3}px rgb(99 102 241 / 0.2)`,
                willChange: shouldLoadAnimations ? 'transform, opacity' : 'auto',
              }}
              initial={{ y: 0, scale: 0.6 }}
              animate={shouldLoadAnimations ? {
                y: [-drift, drift, -drift],
                opacity: [opacity * 0.5, opacity, opacity * 0.4],
                scale: [0.6, 1, 0.6],
              } : {}}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              }}
              aria-hidden
            />
          ))}
        </div>
      )}

      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      
      {/* Main hero card container - reduced width, better grouping */}
      <div className="container-page relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-6 scroll-snap-section">
        {/* Early Access Banner */}
        <EarlyAccessBanner />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Modern minimal wordmark with integrated live stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col items-center gap-3 mb-6 md:mb-8"
            aria-hidden="true"
          >
            {/* Larger wordmark with grad hat */}
            <div className="flex items-center justify-center gap-4">
              <svg
                className="h-[64px] w-[64px] sm:h-[80px] sm:w-[80px] md:h-[96px] md:w-[96px] text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3l10 5-10 5L2 8l10-5z" />
                <path d="M22 10v4" />
                <path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
              </svg>
              <span className="relative text-[5rem] sm:text-[6rem] md:text-[7rem] font-semibold tracking-tight bg-gradient-to-r from-white via-white to-zinc-200 bg-clip-text text-transparent">
                JobPing
              </span>
            </div>
          </motion.div>
          {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
            <motion.div
              className="h-px w-40 mx-auto bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent my-6"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={shouldLoadAnimations ? { opacity: 1, scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
              aria-hidden
            />
          )}
        </motion.div>

        {/* Hero card container - glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-3xl mt-8 md:mt-10 rounded-xl bg-white/[0.08] border border-white/10 backdrop-blur-md px-4 py-5 md:px-8 md:py-10 lg:px-12 lg:py-12 shadow-hero"
        >
          {/* Top highlight line for glass effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
          
          {/* Ground shadow below card */}
          <div className="absolute -bottom-14 left-1/2 w-[70%] h-28 bg-black/40 blur-lg-hero rounded-full -translate-x-1/2 opacity-40"></div>
          
          {/* Content inside card */}
          <div className="relative z-10 flex flex-col text-left">
            {/* Badge */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="inline-flex items-center gap-2 self-start mb-3 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200"
            >
              <BrandIcons.Mail className="h-3.5 w-3.5 text-brand-300" />
              {Copy.HERO_PILL}
            </motion.p>

            {/* Headline + Subheadline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mb-5"
            >
              <h1 className="text-balance text-5xl md:text-6xl leading-[1.06] font-semibold mb-3 text-white">
                {Copy.HERO_HEADLINE}
              </h1>
              <div className="max-w-xl">
                <p className="text-balance text-base md:text-[15px] text-zinc-300/90 font-normal">
                  {Copy.HERO_SUBLINE}
                </p>
              </div>
            </motion.div>

            {/* CTA + Microtrust */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  href="/signup"
                  variant="gradient"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[220px] px-8 py-4 md:py-5 text-base md:text-lg shadow-hero"
                  aria-label="Go Premium - Get Emailed 3x/Week"
                >
                  <span className="flex items-center justify-center gap-2">
                    Go Premium - Get Emailed 3x/Week
                    <BrandIcons.ArrowRight className="h-5 w-5" />
                  </span>
                </Button>
                <Button
                  href="/signup/free"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[220px] px-8 py-4 md:py-5 text-base md:text-lg"
                  aria-label="Try Free - See 5 Matches"
                >
                  <span className="flex items-center justify-center gap-2">
                    Try Free - See 5 Matches
                  </span>
                </Button>
              </div>
              <p className="text-xs text-zinc-400 text-center sm:text-left">
                Free: 5 instant matches, zero emails · Premium: 15 jobs/week (3x more) via email
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Simplified background - removed excessive gradients */}
    </section>
  );
}
