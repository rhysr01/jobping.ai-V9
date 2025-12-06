'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { BrandIcons } from '@/components/ui/BrandIcons';
import { useStats } from '@/hooks/useStats';
import {
  PREMIUM_ROLES_PER_MONTH,
  PREMIUM_ROLES_PER_WEEK,
  FREE_ROLES_PER_SEND,
} from '@/lib/productMetrics';

export default function SocialProofRow() {
  const { stats, isLoading } = useStats();
  const [weeklyNewJobs, setWeeklyNewJobs] = useState('287');
  const [totalUsers, setTotalUsers] = useState('3,400');
  const [statsStale, setStatsStale] = useState(true);

  useEffect(() => {
    if (stats) {
      const hasFreshStats = stats.weeklyNewJobs > 0 && stats.totalUsers > 0;
      setWeeklyNewJobs(stats.weeklyNewJobs.toLocaleString('en-US'));
      setTotalUsers(stats.totalUsers.toLocaleString('en-US'));
      setStatsStale(!hasFreshStats);
    }
  }, [stats]);

  const items = [
    {
      icon: <BrandIcons.Users className="h-5 w-5" />,
      eyebrow: 'Students across Europe',
      title: statsStale ? 'Thousands of students rely on JobPing' : `Join ${totalUsers}+ students`,
      description: 'Early-career candidates rely on JobPing each week.',
    },
    {
      icon: <BrandIcons.Mail className="h-5 w-5" />,
      eyebrow: 'Every email',
      title: `Your ${FREE_ROLES_PER_SEND} best-fit roles (no time-wasters)`,
      description: 'Filtered by city, visa status, and experience to fit real applicants.',
    },
    {
      icon: <BrandIcons.Target className="h-5 w-5" />,
      eyebrow: 'New roles this week',
      title: isLoading ? '...' : `${weeklyNewJobs} new early-career roles added this week`,
      description: 'Fresh opportunities added daily. Fresh matches every Thursday.',
    },
  ];

  return (
    <section className="pt-8 pb-12 md:pt-12 md:pb-16 lg:pt-16 lg:pb-20 scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />
      <div className="container-page relative z-10">
        <div className="mt-8 md:mt-10">
            <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl relative shadow-feature">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="grid gap-4 md:grid-cols-3"
              >
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                y: -4,
                transition: { type: 'spring', stiffness: 300, damping: 20 }
              }}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl px-6 py-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-hover md:px-7 md:py-7"
            >
              {index < items.length - 1 && (
                <span className="hidden md:inline absolute right-0 top-1/2 h-4 w-px bg-white/10 -translate-y-1/2" />
              )}
              <motion.span 
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/12 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/20 group-hover:scale-110"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {item.icon}
              </motion.span>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-300 mb-2">
                  {isLoading && (index === 0 || index === 2) ? 'Loading…' : item.eyebrow}
                </p>
                {isLoading && (index === 0 || index === 2) ? (
                  <div className="space-y-2 mb-2">
                    <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-zinc-300 transition-colors duration-300 group-hover:text-zinc-200">
                      {typeof item.description === 'string' ? item.description : item.description}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ))}
              </motion.div>
            </div>
          </div>
      </div>
    </section>
  );
}

