"use client";

import { motion, animate } from "framer-motion";
import { Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SparklesCore } from "@/components/ui/sparkles";

const trustSignals = [
  { label: "Reed.co.uk feeds", Icon: BrandIcons.Briefcase },
  { label: "Adzuna data", Icon: BrandIcons.TrendingUp },
  { label: "Company career pages", Icon: BrandIcons.Target },
];

const numberFormatter = new Intl.NumberFormat("en-US");

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-brand-500/[0.15]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
            <div
              className={cn(
                "absolute inset-0 rounded-full",
                "bg-gradient-to-r to-transparent",
                gradient,
                "backdrop-blur-[1px] border border-cyan-400/20",
                "shadow-[0_4px_16px_0_rgba(34,211,238,0.15)]",
                "after:absolute after:inset-0 after:rounded-full",
                "after:bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]"
              )}
            />
      </motion.div>
    </motion.div>
  );
}

export function HeroGeometric() {
  const [activeJobsTarget, setActiveJobsTarget] = useState(12748);
  const [internshipsTarget, setInternshipsTarget] = useState(0);
  const [graduatesTarget, setGraduatesTarget] = useState(0);
  const [totalUsersTarget, setTotalUsersTarget] = useState(0);
  const [displayActiveJobs, setDisplayActiveJobs] = useState(0);
  const [displayInternships, setDisplayInternships] = useState(0);
  const [displayGraduates, setDisplayGraduates] = useState(0);
  const [displayTotalUsers, setDisplayTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statsStale, setStatsStale] = useState(false);
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
          const activeJobs = parseStat(data.activeJobs ?? data.activeJobsFormatted, 0);
          const internships = parseStat(data.internships, 0);
          const graduates = parseStat(data.graduates, 0);
          const totalUsers = parseStat(data.totalUsers ?? data.totalUsersFormatted, 0);

          const hasFreshStats = activeJobs > 0 && totalUsers > 0;

          setActiveJobsTarget(hasFreshStats && activeJobs > 0 ? activeJobs : 12748);
          setInternshipsTarget(hasFreshStats && internships > 0 ? internships : 4997);
          setGraduatesTarget(hasFreshStats && graduates > 0 ? graduates : 3953);
          setTotalUsersTarget(hasFreshStats && totalUsers > 0 ? totalUsers : 3400);
          setStatsStale(!hasFreshStats);
        } else {
          setStatsStale(true);
          setActiveJobsTarget(12748);
          setInternshipsTarget(4997);
          setGraduatesTarget(3953);
          setTotalUsersTarget(3400);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStatsStale(true);
        setActiveJobsTarget(12748);
        setInternshipsTarget(4997);
        setGraduatesTarget(3953);
        setTotalUsersTarget(3400);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
      },
    }),
  };

  // Debug: Log when component renders
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('✅ HeroGeometric component rendering', {
        prefersReduced,
        willShowSparkles: !prefersReduced
      });
    }
  }, [prefersReduced]);

  return (
    <section
      data-testid="hero-section"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#05010f] via-[#090018] to-[#11002c]"
      style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}
    >
      {/* Background gradient - brighter with cyan accents */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.12] via-cyan-500/[0.08] to-purple-600/[0.10] blur-3xl" />


      {/* Animated geometric shapes */}
      <div className="absolute inset-0 overflow-hidden z-[1]">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-cyan-400/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-sky-400/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-cyan-300/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-sky-300/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
          >
            <Circle className="h-2 w-2 fill-brand-500/80" />
            <span className="text-sm text-white/80 tracking-wide">
              {Copy.HERO_PILL}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-white to-purple-300">
                JobPing
              </span>
            </h1>
            
            {/* Sparkles particles effect - positioned directly below JobPing title */}
            {!prefersReduced && (
              <div className="relative w-full h-40 -mt-4 mb-4">
                {/* Gradient lines like original demo */}
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent h-[2px] w-3/4 blur-sm" />
                <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent h-px w-3/4" />
                <div className="absolute inset-x-60 top-10 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent h-[5px] w-1/4 blur-sm" />
                <div className="absolute inset-x-60 top-10 bg-gradient-to-r from-transparent via-sky-400/80 to-transparent h-px w-1/4" />
                
                <SparklesCore
                  id="hero-sparkles"
                  background="transparent"
                  minSize={0.8}
                  maxSize={2}
                  particleDensity={60}
                  className="w-full h-full"
                  particleColor="#FFFFFF"
                  speed={3}
                />
              </div>
            )}
          </motion.div>

          {/* Subtitle */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="text-base sm:text-lg md:text-xl text-white/70 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4">
              {Copy.HERO_SUBLINE}
            </p>
          </motion.div>

          {/* Features */}
          <motion.ul
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="grid w-full gap-4 text-left sm:grid-cols-3 mb-8"
          >
            {Copy.HERO_FEATURES.map((feature, index) => {
              const Icon = [BrandIcons.Zap, BrandIcons.Target, BrandIcons.Sparkles][index] ?? BrandIcons.Target;
              return (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 text-sm text-zinc-100 backdrop-blur-sm transition-all duration-300 sm:text-base hover:-translate-y-[3px] hover:border-brand-500/40 hover:bg-white/15"
                >
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/12 text-brand-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-snug">{feature}</span>
                </li>
              );
            })}
          </motion.ul>

          {/* CTA Button */}
          <motion.div
            custom={4}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-6 mb-8"
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

          {/* Stats */}
          <motion.div
            custom={5}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-4 text-sm text-zinc-300 sm:flex-row justify-center"
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

          {/* Trust Signals */}
          <motion.div
            custom={6}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
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
      </div>

      {/* Bottom gradient overlay - lighter */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05010f] via-transparent to-[#05010f]/60 pointer-events-none" />
    </section>
  );
}

