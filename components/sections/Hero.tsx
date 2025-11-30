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
      {/* Cinematic dark background */}
      <div className="absolute inset-0 -z-10 bg-black" />
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
                className="hero-logo-text text-[4.4rem] sm:text-[5.2rem] md:text-[6rem] lg:text-[7rem] font-semibold tracking-[-0.02em] relative inline-block text-white"
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-wider text-zinc-400"
                    whileHover={{ scale: 1.05, y: -1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <BrandIcons.Target className="h-3.5 w-3.5 text-brand-300" />
                    <span className="font-semibold text-white">{formatNumber(displayActiveJobs)}</span>
                    <span className="text-zinc-200">jobs this week</span>
                  </motion.div>
                  {hasTotalUsers && (
                    <motion.div
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-wider text-zinc-400"
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
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-wider text-zinc-400"
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
          className="relative w-full max-w-3xl rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl px-8 md:p-12 shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
        >
          
          {/* Content inside card */}
          <div className="relative z-10 flex flex-col text-left">
            {/* Badge */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="inline-flex items-center gap-2 self-start mb-6 rounded-full border border-brand-400/30 bg-brand-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-200 backdrop-blur-sm"
            >
              <BrandIcons.Mail className="h-3.5 w-3.5 text-brand-300" />
              {Copy.HERO_PILL}
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-balance text-5xl font-semibold tracking-[-0.02em] text-white md:text-6xl mb-2"
            >
              {Copy.HERO_HEADLINE}
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-balance text-xl text-zinc-300 md:text-2xl mb-5"
            >
              5 curated matches weekly
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="flex flex-col gap-3 mt-5"
            >
              <Button
                href="/signup"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto sm:min-w-[280px]"
                aria-label="Get my first drop"
              >
                <span className="flex items-center justify-center gap-2">
                  Get my first drop
                  <BrandIcons.ArrowRight className="h-5 w-5" />
                </span>
              </Button>
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Join thousands of early-career jobseekers across Europe.
              </p>
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

        {/* Powered by section */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <span className="text-xs uppercase tracking-wider text-zinc-400">Trusted feeds from</span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {trustSignals.map(({ label, logo, description }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + index * 0.06, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                className="group relative flex items-center justify-center transition-opacity duration-300 hover:opacity-100"
              >
                <div className="relative h-5 w-auto text-white">
                  <Image
                    src={logo}
                    alt={description}
                    width={120}
                    height={40}
                    className="h-full w-auto object-contain transition-all duration-300"
                    loading="lazy"
                    unoptimized
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
