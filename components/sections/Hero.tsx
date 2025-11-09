"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";

export default function Hero() {
  const [activeJobs, setActiveJobs] = useState("12,748");
  const [internships, setInternships] = useState("");
  const [graduates, setGraduates] = useState("");
  const [totalUsers, setTotalUsers] = useState("");
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
        if (data.activeJobsFormatted) {
          setActiveJobs(data.activeJobsFormatted);
        }
        if (data.internships) {
          setInternships(data.internships.toLocaleString('en-US'));
        }
        if (data.graduates) {
          setGraduates(data.graduates.toLocaleString('en-US'));
        }
        if (data.totalUsersFormatted) {
          setTotalUsers(data.totalUsersFormatted);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        // Keep the default value "12,748" if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const featureIcons = [BrandIcons.Zap, BrandIcons.Target, BrandIcons.Sparkles];

  return (
    <section
      data-testid="hero-section"
      className="relative flex flex-col items-center justify-center overflow-hidden pb-24 pt-20 text-center sm:pt-24"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#05010f] via-[#090018] to-[#11002c]">
        <div className="absolute inset-0 bg-[radial-gradient(72%_60%_at_50%_0%,rgba(124,58,237,0.28),transparent_65%)] blur-3xl" />
      </div>

      <div className="container-page container-rhythm relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-10">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-200 backdrop-blur-md"
        >
          <BrandIcons.Mail className="h-4 w-4 text-brand-300" />
          {Copy.HERO_PILL}
        </motion.span>

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
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-200 shadow-[0_12px_40px_rgba(18,0,42,0.28)] backdrop-blur-sm sm:text-base"
              >
                <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-brand-200">
                  <Icon className="h-4 w-4" />
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
                <span>{`${activeJobs} active jobs this week`}</span>
              )}
            </div>
            {!isLoading && (internships || graduates) && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                {internships && <span>{internships} internships</span>}
                {internships && graduates && <span className="text-zinc-600">•</span>}
                {graduates && <span>{graduates} graduate programmes</span>}
              </div>
            )}
            {!isLoading && totalUsers && parseInt(totalUsers.replace(/,/g, '')) > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                <BrandIcons.Star className="h-4 w-4 text-brand-300" />
                <span>{`Join ${totalUsers}+ students`}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

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
