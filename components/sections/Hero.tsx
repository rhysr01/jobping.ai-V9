"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { shouldThrottleAnimations } from "@/lib/performance";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";

const trustSignals = [
  { label: "Reed.co.uk feeds", Icon: BrandIcons.Briefcase },
  { label: "Adzuna data", Icon: BrandIcons.TrendingUp },
  { label: "Company career pages", Icon: BrandIcons.Target },
];

const numberFormatter = new Intl.NumberFormat("en-US");

export default function Hero() {
  const [activeJobsTarget, setActiveJobsTarget] = useState(12748);
  const [internshipsTarget, setInternshipsTarget] = useState(0);
  const [graduatesTarget, setGraduatesTarget] = useState(0);
  const [totalUsersTarget, setTotalUsersTarget] = useState(0);
  const [displayActiveJobs, setDisplayActiveJobs] = useState(0);
  const [displayInternships, setDisplayInternships] = useState(0);
  const [displayGraduates, setDisplayGraduates] = useState(0);
  const [displayTotalUsers, setDisplayTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoadAnimations, setShouldLoadAnimations] = useState(false);
  const prefersReduced = useReducedMotion();
  const shouldThrottle = shouldThrottleAnimations();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const parseStat = (value: unknown, fallback = 0) => {
          if (typeof value === "number" && !Number.isNaN(value)) return value;
          if (typeof value === "string") {
            const numeric = Number(value.replace(/,/g, ""));
            if (!Number.isNaN(numeric)) return numeric;
          }
          return fallback;
        };

        if (data) {
          setActiveJobsTarget(parseStat(data.activeJobs ?? data.activeJobsFormatted, 12748));
          setInternshipsTarget(parseStat(data.internships, 4997));
          setGraduatesTarget(parseStat(data.graduates, 3953));
          setTotalUsersTarget(parseStat(data.totalUsers ?? data.totalUsersFormatted, 3400));
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        // Keep defaults when the stats API is unreachable
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

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
  const hasInternships = !isLoading && displayInternships > 0;
  const hasGraduates = !isLoading && displayGraduates > 0;
  const hasTotalUsers = !isLoading && displayTotalUsers > 0;

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
    // REDUCED: From 26 to 8 particles (70% reduction)
    return Array.from({ length: 8 }).map((_, index) => ({
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
      className="section-padding-hero relative flex flex-col items-center justify-center overflow-hidden text-center"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#05010f] via-[#090018] to-[#11002c]">
        <div className="absolute inset-0 bg-[radial-gradient(72%_60%_at_50%_0%,rgba(99,102,241,0.12),transparent_65%)] blur-3xl" />
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

      <div className="container-page container-rhythm relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="hero-logo-wrapper relative w-full max-w-4xl px-4">
            {/* REDUCED: From 3 gradient overlays to 1 */}
            {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -inset-24 rounded-[64px]"
                style={{
                  background: 'radial-gradient(50% 50% at 50% 50%, rgba(139,92,246,0.15), transparent 70%)',
                  willChange: shouldLoadAnimations ? 'transform, opacity' : 'auto',
                }}
                animate={shouldLoadAnimations ? { 
                  scale: [1, 1.1, 1],
                  opacity: [0.15, 0.2, 0.15]
                } : {}}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <motion.div
              className="hero-logo-capsule"
              style={{ 
                transformStyle: "preserve-3d",
                willChange: shouldLoadAnimations && !prefersReduced && !shouldThrottle ? 'transform' : 'auto'
              }}
              animate={
                prefersReduced || shouldThrottle || !shouldLoadAnimations
                  ? {}
                  : {
                      scale: [1, 1.02, 1],
                      y: [0, -3, 0],
                    }
              }
              transition={{ duration: 6, ease: "easeInOut", repeat: prefersReduced ? 0 : Infinity }}
              whileHover={
                prefersReduced || shouldThrottle || !shouldLoadAnimations
                  ? {}
                  : {
                      scale: 1.05,
                      transition: { type: 'spring', stiffness: 200, damping: 15 }
                    }
              }
            >
              {!prefersReduced && !shouldThrottle && shouldLoadAnimations && <span className="logoSheen" aria-hidden />}
              {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
                <motion.div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent, rgba(139, 92, 246, 0.4), transparent)',
                    willChange: shouldLoadAnimations ? 'transform' : 'auto',
                  }}
                  animate={shouldLoadAnimations ? { rotate: 360 } : {}}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  aria-hidden
                />
              )}
              <motion.div
                className="relative flex items-center gap-4 sm:gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <motion.div
                  className="relative"
                  style={{
                    willChange: shouldLoadAnimations && !prefersReduced && !shouldThrottle ? 'transform' : 'auto'
                  }}
                  animate={
                    prefersReduced || shouldThrottle || !shouldLoadAnimations
                      ? {}
                      : {
                          y: [0, -4, 0],
                          rotate: [0, -2, 0],
                        }
                  }
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute inset-0 blur-xl opacity-50">
                    <BrandIcons.GraduationCap className="h-12 w-12 text-brand-400 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem] lg:h-20 lg:w-20" />
                  </div>
                  <BrandIcons.GraduationCap className="relative h-12 w-12 text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.6)] sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem] lg:h-20 lg:w-20" />
                </motion.div>
                <motion.span
                  className="hero-logo-text hero-text-gradient text-[4.4rem] sm:text-[5.2rem] md:text-[6rem] font-black tracking-tight relative"
                  style={{ 
                    backgroundSize: "200% 200%",
                    willChange: shouldLoadAnimations && !prefersReduced && !shouldThrottle ? 'background-position' : 'auto'
                  }}
                  animate={
                    prefersReduced || shouldThrottle || !shouldLoadAnimations
                      ? {}
                      : {
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }
                  }
                  transition={{
                    duration: 6,
                    repeat: prefersReduced ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                >
                  JobPing
                </motion.span>
              </motion.div>
            </motion.div>
          </div>
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

        <motion.p
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/50 bg-brand-500/15 px-5 py-2.5 text-sm font-bold text-brand-100 backdrop-blur-md transition-all duration-300 hover:border-brand-500/70 hover:bg-brand-500/25 hover:shadow-[0_8px_24px_rgba(99,102,241,0.4)]"
        >
          <motion.span
            animate={{ 
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
          >
            <BrandIcons.Mail className="h-4 w-4 text-brand-300" />
          </motion.span>
          {Copy.HERO_PILL}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          className="text-balance text-4xl font-black leading-[1.05] text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.3)] sm:text-6xl md:text-7xl"
        >
          {Copy.HERO_HEADLINE}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="max-w-2xl text-balance text-lg font-medium leading-relaxed text-zinc-100 sm:text-xl"
        >
          {Copy.HERO_SUBLINE}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid w-full gap-4 text-left sm:grid-cols-2"
        >
          {Copy.HERO_FEATURES.map((feature, index) => {
            const Icon = featureIcons[index] ?? BrandIcons.Target;
            return (
              <motion.li
                key={feature}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                whileHover={{ 
                  y: -4,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06] px-6 py-5 text-sm font-medium text-zinc-100 backdrop-blur-md transition-all duration-300 sm:text-base hover:border-brand-500/50 hover:bg-white/12 hover:shadow-[0_12px_32px_rgba(99,102,241,0.25)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <motion.span 
                  className="relative mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/12 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/20 group-hover:scale-110"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
                <span className="relative leading-snug transition-colors duration-300 group-hover:text-white">{feature}</span>
              </motion.li>
            );
          })}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          <Button
            href="/signup"
            variant="primary"
            size="lg"
            className="min-w-[240px] text-base font-semibold shadow-[0_20px_50px_rgba(99,102,241,0.4)]"
            aria-label={Copy.HERO_CTA}
          >
            <span className="flex items-center gap-2">
              {Copy.HERO_CTA}
              <BrandIcons.ArrowRight className="h-5 w-5" />
            </span>
          </Button>
          <p className="text-sm font-medium text-zinc-300">{Copy.HERO_FINE_PRINT}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="flex flex-col items-center gap-4 text-sm text-zinc-300 sm:flex-row"
        >
          <motion.div 
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-200 transition-all duration-300 hover:border-brand-500/30 hover:bg-brand-500/10 hover:shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
            whileHover={{ scale: 1.05 }}
          >
            <BrandIcons.Users className="h-4 w-4 text-brand-300" />
            {Copy.HERO_SOCIAL_PROOF}
          </motion.div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
            <motion.div 
              className="group inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200 transition-all duration-300 hover:border-brand-500/60 hover:bg-brand-500/15 hover:shadow-[0_4px_12px_rgba(99,102,241,0.25)]"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <motion.span
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut"
                }}
              >
                <BrandIcons.Target className="h-4 w-4 text-brand-300" />
              </motion.span>
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="font-medium">{`${formatNumber(displayActiveJobs)} active jobs this week`}</span>
              )}
            </motion.div>
            {(hasInternships || hasGraduates) && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                {hasInternships && <span>{`${formatNumber(displayInternships)} internships`}</span>}
                {hasInternships && hasGraduates && <span className="text-zinc-600">•</span>}
                {hasGraduates && <span>{`${formatNumber(displayGraduates)} graduate programmes`}</span>}
              </div>
            )}
            {hasTotalUsers && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                <BrandIcons.Star className="h-4 w-4 text-brand-300" />
                <span>{`Join ${formatNumber(displayTotalUsers)}+ students`}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.32em] text-zinc-500/80"
        >
          <span>Powered by live feeds from</span>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[0.82rem] tracking-[0.12em] text-zinc-200/90 sm:gap-4">
            {trustSignals.map(({ label, Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.82rem] font-semibold normal-case tracking-[0.04em]"
              >
                <Icon className="h-3.5 w-3.5 text-brand-200" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

      </div>

      {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.08), transparent 60%), radial-gradient(circle at 70% 70%, rgba(99,102,241,0.06), transparent 65%)",
            backgroundSize: "140% 140%",
            willChange: shouldLoadAnimations ? 'background-position' : 'auto',
          }}
          animate={shouldLoadAnimations ? { backgroundPosition: ["0% 0%", "100% 100%"] } : {}}
          transition={{ duration: 25, ease: "linear", repeat: Infinity }}
        />
      )}

      {!prefersReduced && !shouldThrottle && shouldLoadAnimations && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.8 }}
          animate={shouldLoadAnimations ? {
            opacity: 1,
            scale: 1,
          } : {}}
          transition={{
            duration: 14,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.06),transparent_60%)]"
        />
      )}
    </section>
  );
}
