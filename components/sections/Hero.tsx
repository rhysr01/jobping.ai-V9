"use client";
import { motion, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
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
  const prefersReduced = useReducedMotion();

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
    if (prefersReduced) return [];
    return Array.from({ length: 26 }).map((_, index) => ({
      id: index,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 2 + Math.random() * 2,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
      drift: 8 + Math.random() * 6,
      opacity: 0.25 + Math.random() * 0.35,
    }));
  }, [prefersReduced]);

  return (
    <section
      data-testid="hero-section"
      className="section-padding-hero relative flex flex-col items-center justify-center overflow-hidden text-center"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#05010f] via-[#090018] to-[#11002c]">
        <div className="absolute inset-0 bg-[radial-gradient(72%_60%_at_50%_0%,rgba(124,58,237,0.28),transparent_65%)] blur-3xl" />
      </div>
      {!prefersReduced && (
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
                opacity,
                boxShadow: `0 0 ${size * 4}px rgba(167, 139, 250, 0.35)`,
              }}
              initial={{ y: 0, scale: 0.6 }}
              animate={{
                y: [-drift, drift, -drift],
                opacity: [opacity * 0.5, opacity, opacity * 0.4],
                scale: [0.6, 1, 0.6],
              }}
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
            {!prefersReduced && (
              <>
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-16 rounded-[48px]"
                  style={{
                    background: 'radial-gradient(60% 80% at 30% 20%, rgba(164,91,255,0.18), transparent 60%)'
                  }}
                  animate={{ x: [0, 10, 0], y: [0, -6, 0] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-24 rounded-[64px]"
                  style={{
                    background: 'radial-gradient(40% 60% at 70% 60%, rgba(102,126,234,0.16), transparent 70%)'
                  }}
                  animate={{ x: [0, -12, 0], y: [0, 8, 0] }}
                  transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                />
              </>
            )}
            <motion.div
              className="hero-logo-capsule will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
              animate={
                prefersReduced
                  ? {}
                  : {
                      scale: [1, 1.02, 1],
                      rotateX: [0, 4, 0],
                      rotateY: [0, -3, 0],
                      y: [0, -3, 0],
                    }
              }
              transition={{ duration: 9, ease: "easeInOut", repeat: prefersReduced ? 0 : Infinity }}
              whileHover={
                prefersReduced
                  ? {}
                  : {
                      rotateX: -2,
                      rotateY: 3,
                      transition: { type: 'spring', stiffness: 120, damping: 14 }
                    }
              }
              whileTap={prefersReduced ? {} : { scale: 0.99 }}
            >
              {!prefersReduced && (
                <motion.span
                  aria-hidden
                  className="hero-logo-glow"
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                />
              )}
              {!prefersReduced && <span className="logoSheen" aria-hidden />} 
              {!prefersReduced && (
                <motion.div
                  className="pointer-events-none absolute -inset-12 -z-20 rounded-full border border-white/10"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 16, ease: "easeInOut", repeat: Infinity }}
                />
              )}
              <BrandIcons.GraduationCap className="hidden h-16 w-16 text-white sm:block sm:h-[4.5rem] sm:w-[4.5rem] md:h-20 md:w-20" />
              <motion.span
                className="hero-logo-text hero-text-gradient text-[4.4rem] sm:text-[5.2rem] md:text-[6rem] font-black tracking-tight"
                style={{ backgroundSize: "240% 240%" }}
                animate={
                  prefersReduced
                    ? {}
                    : {
                        letterSpacing: ["-0.02em", "0em", "-0.02em"],
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }
                }
                transition={{
                  duration: 10,
                  repeat: prefersReduced ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                JobPing
              </motion.span>
            </motion.div>
          </div>
          {!prefersReduced && (
            <motion.div
              className="h-px w-44 rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
              aria-hidden
            />
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/12 px-4 py-2 text-sm font-semibold text-brand-200/95 backdrop-blur-md"
        >
          <BrandIcons.Mail className="h-4 w-4 text-brand-300" />
          {Copy.HERO_PILL}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          className="text-balance text-4xl leading-tight text-white sm:text-6xl sm:leading-[1.05] md:text-7xl"
        >
          {Copy.HERO_HEADLINE}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="max-w-2xl text-balance text-lg text-zinc-300 sm:text-xl"
        >
          {Copy.HERO_SUBLINE}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid w-full gap-4 text-left sm:grid-cols-3"
        >
          {Copy.HERO_FEATURES.map((feature, index) => {
            const Icon = featureIcons[index] ?? BrandIcons.Target;
            return (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-200 backdrop-blur-sm transition-all duration-300 sm:text-base hover:-translate-y-[3px] hover:border-brand-500/25 hover:bg-white/10"
              >
                <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/12 text-brand-200">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="leading-snug">{feature}</span>
              </li>
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
            className="min-w-[220px]"
            aria-label={Copy.HERO_CTA}
          >
            <span className="flex items-center gap-2">
              {Copy.HERO_CTA}
              <BrandIcons.ArrowRight className="h-5 w-5" />
            </span>
          </Button>
          <p className="text-sm text-zinc-400">{Copy.HERO_FINE_PRINT}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="flex flex-col items-center gap-4 text-sm text-zinc-300 sm:flex-row"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-200">
            <BrandIcons.Users className="h-4 w-4 text-brand-300" />
            {Copy.HERO_SOCIAL_PROOF}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200">
              <BrandIcons.Target className="h-4 w-4 text-brand-300" />
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span>{`${formatNumber(displayActiveJobs)} active jobs this week`}</span>
              )}
            </div>
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

      {!prefersReduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(164,91,255,0.18), transparent 60%), radial-gradient(circle at 70% 70%, rgba(99,102,241,0.16), transparent 65%)",
            backgroundSize: "140% 140%",
          }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        />
      )}

      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: prefersReduced ? 0 : [0, 0.6, -0.6, 0],
        }}
        transition={{
          duration: 14,
          ease: "easeInOut",
          repeat: prefersReduced ? 0 : Infinity,
          repeatType: "reverse",
        }}
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.18),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.16),transparent_60%)]"
      />
    </section>
  );
}
