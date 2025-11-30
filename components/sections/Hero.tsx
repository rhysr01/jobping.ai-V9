"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SIGNUP_INITIAL_ROLES, FREE_ROLES_PER_SEND, PREMIUM_ROLES_PER_WEEK } from "@/lib/productMetrics";
import { useStats } from "@/hooks/useStats";

const trustSignals = [
  { 
    label: "Reed.co.uk", 
    logo: "/logos/reed.svg",
    description: "UK's largest job board"
  },
  { 
    label: "Adzuna", 
    logo: "/logos/adzuna.svg",
    description: "Global job aggregator"
  },
  { 
    label: "Greenhouse", 
    logo: "/logos/greenhouse.svg",
    description: "Company career pages"
  },
  { 
    label: "Indeed", 
    logo: "/logos/indeed.svg",
    description: "Job board via JobSpy"
  },
  { 
    label: "Glassdoor", 
    logo: "/logos/glassdoor.svg",
    description: "Job board via JobSpy"
  },
  { 
    label: "Google Jobs", 
    logo: "/logos/google-jobs.svg",
    description: "Job aggregator via JobSpy"
  },
  { 
    label: "ZipRecruiter", 
    logo: "/logos/ziprecruiter.svg",
    description: "Job board via JobSpy"
  },
];

const numberFormatter = new Intl.NumberFormat("en-US");

export default function Hero() {
  const { stats, isLoading: statsLoading } = useStats();
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
      className="section-padding-hero relative flex flex-col items-center justify-start overflow-hidden text-center min-h-screen"
    >
      {/* Unified warm background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0a0018] via-[#0f0020] to-[#150028]">
        <div className="absolute inset-0 bg-[radial-gradient(72%_60%_at_50%_0%,rgba(124,58,237,0.1),transparent_65%)] blur-3xl" />
      </div>
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
                boxShadow: `0 0 ${size * 3}px rgba(99, 102, 241, 0.2)`,
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
            className="flex flex-col items-center gap-6"
          >
            {/* Clean wordmark - no icon, pure typography */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <motion.span
                className="hero-logo-text hero-text-gradient text-[4.4rem] sm:text-[5.2rem] md:text-[6rem] lg:text-[7rem] font-black tracking-[-0.02em] relative text-depth-2 inline-block"
                style={{ 
                  backgroundSize: "200% 200%",
                  willChange: 'auto'
                }}
                animate={
                  prefersReduced || shouldThrottle || !shouldLoadAnimations
                    ? {}
                    : {
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }
                }
                transition={{
                  duration: 8,
                  repeat: prefersReduced ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                JobPing
              </motion.span>
            </motion.div>

            {/* Live stats integrated into hero - adds real value */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 text-sm"
            >
              {statsLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <>
                  <motion.div
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 elevation-1"
                    whileHover={{ scale: 1.05, y: -1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <BrandIcons.Target className="h-3.5 w-3.5 text-brand-300" />
                    <span className="font-bold text-white">{formatNumber(displayActiveJobs)}</span>
                    <span className="text-zinc-200">jobs this week</span>
                  </motion.div>
                  {hasTotalUsers && (
                    <motion.div
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 elevation-1"
                      whileHover={{ scale: 1.05, y: -1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <BrandIcons.Users className="h-3.5 w-3.5 text-brand-300" />
                      <span className="font-bold text-white">{formatNumber(displayTotalUsers)}+</span>
                      <span className="text-zinc-200">users</span>
                    </motion.div>
                  )}
                  {(hasInternships || hasGraduates || hasEarlyCareer) && (
                    <motion.div
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 elevation-1"
                      whileHover={{ scale: 1.05, y: -1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {hasInternships && <span className="font-bold text-white">{formatNumber(displayInternships)}</span>}
                      {hasInternships && <span className="text-zinc-200">internships</span>}
                      {(hasInternships && (hasGraduates || hasEarlyCareer)) && <span className="text-zinc-300 mx-1">•</span>}
                      {hasGraduates && <span className="font-bold text-white">{formatNumber(displayGraduates)}</span>}
                      {hasGraduates && <span className="text-zinc-200">grad roles</span>}
                      {(hasGraduates && hasEarlyCareer) && <span className="text-zinc-300 mx-1">•</span>}
                      {hasEarlyCareer && <span className="font-bold text-white">{formatNumber(displayEarlyCareer)}</span>}
                      {hasEarlyCareer && <span className="text-zinc-200">early-career</span>}
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
          {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
            <motion.div
              className="h-px w-44 rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={shouldLoadAnimations ? { opacity: 1, scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
              aria-hidden
            />
          )}
        </motion.div>

        {/* Hero card container - glassmorphism with unified warm gradient */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-gradient-to-b from-purple-900/80 to-purple-950/90 backdrop-blur-xl px-6 py-6 shadow-lg shadow-purple-900/40 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-12"
        >
          {/* Subtle directional gradient overlay (left to right) */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
          
          {/* Content inside card */}
          <div className="relative z-10 flex flex-col gap-3">
            {/* Badge - improved visibility */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="inline-flex items-center gap-2 self-start rounded-full border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-purple-200 backdrop-blur-sm shadow-[0_0_12px_rgba(124,58,237,0.2)]"
            >
              <BrandIcons.Mail className="h-3.5 w-3.5 text-purple-300" />
              {Copy.HERO_PILL}
            </motion.p>

            {/* Headline - increased contrast */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-balance text-4xl font-black leading-[1.1] text-white sm:text-5xl md:text-6xl"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              {Copy.HERO_HEADLINE}
            </motion.h1>

            {/* Subheading - increased size and spacing */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-balance text-lg md:text-xl font-medium leading-relaxed text-zinc-200 sm:text-xl"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            >
              5 curated matches weekly
            </motion.p>

            {/* Features - increased spacing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="flex flex-col gap-4 text-left mt-2"
            >
              <div className="flex items-start gap-3 text-lg font-medium text-zinc-100 sm:text-xl">
                <span className="text-2xl">🎯</span>
                <span>{SIGNUP_INITIAL_ROLES} jobs in your welcome email</span>
              </div>
              <div className="flex items-start gap-3 text-lg font-medium text-zinc-100 sm:text-xl">
                <span className="text-2xl">📬</span>
                <span>{FREE_ROLES_PER_SEND} roles per weekly drop (free)</span>
              </div>
              <div className="flex items-start gap-3 text-lg font-medium text-zinc-100 sm:text-xl">
                <span className="text-2xl">⭐</span>
                <span>{PREMIUM_ROLES_PER_WEEK} roles per weekly drop (Premium)</span>
              </div>
            </motion.div>

            {/* CTA - moved closer, grouped with content, increased dominance */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col gap-3 mt-6 md:mt-4"
            >
              <Button
                href="/signup"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[280px] scale-[1.08] font-semibold shadow-glow-strong"
                aria-label="Get my first drop"
              >
                <span className="flex items-center justify-center gap-2">
                  Get my first drop
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <p className="mt-2 text-sm text-zinc-400 text-center sm:text-left">
                Join thousands of early-career jobseekers across Europe.
              </p>
              <p className="text-base font-medium text-zinc-200 text-center sm:text-left">{Copy.HERO_FINE_PRINT}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Trust signal - moved below card, tightened spacing */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col items-center gap-3 text-sm w-full mt-4"
        >
          <motion.div 
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-all duration-300 hover:border-brand-500/40 hover:bg-brand-500/15"
            whileHover={{ scale: 1.05 }}
          >
            <BrandIcons.Shield className="h-4 w-4 text-brand-300" />
            <span>{Copy.HERO_SOCIAL_PROOF}</span>
          </motion.div>
        </motion.div>

        {/* Powered by section - closer to card, improved contrast, subtle anchor */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-4 flex flex-col items-center gap-3 relative pb-0"
        >
          {/* Subtle glow anchor behind logos */}
          <div className="absolute inset-x-0 top-1/2 h-20 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent blur-xl -z-10" />
          
          <span className="text-zinc-200 font-medium text-sm">Trusted feeds from</span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {trustSignals.map(({ label, logo, description }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + index * 0.06, duration: 0.4 }}
                whileHover={{ scale: 1.08 }}
                className="group relative flex items-center justify-center opacity-70 transition-opacity duration-300 hover:opacity-100"
              >
                <div className="relative h-5 w-auto opacity-70">
                  <Image
                    src={logo}
                    alt={description}
                    width={120}
                    height={40}
                    className="h-full w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0"
                    loading="lazy"
                  />
                </div>
                <span className="sr-only">{description}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Simplified background - removed excessive gradients */}
    </section>
  );
}
