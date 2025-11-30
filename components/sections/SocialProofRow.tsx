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
  const [activeJobs, setActiveJobs] = useState('12,000');
  const [totalUsers, setTotalUsers] = useState('3,400');
  const [statsStale, setStatsStale] = useState(true);

  useEffect(() => {
    if (stats) {
      const hasFreshStats = stats.activeJobs > 0 && stats.totalUsers > 0;
      setActiveJobs(stats.activeJobs.toLocaleString('en-US'));
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
      eyebrow: 'Every drop',
      title: `${FREE_ROLES_PER_SEND} curated roles per send`,
      description: (
        <>
          <span className="inline-block bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/90 text-xs mr-1">
            {PREMIUM_ROLES_PER_WEEK} premium roles weekly
          </span>
          <span className="inline-block bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/90 text-xs">
            ~{PREMIUM_ROLES_PER_MONTH} every month
          </span>
        </>
      ),
    },
    {
      icon: <BrandIcons.Target className="h-5 w-5" />,
      eyebrow: 'Opportunities live now',
      title: `${activeJobs} active opportunities`,
      description: 'Filtered by city, visa status, and experience to fit real applicants.',
    },
  ];

  return (
    <section className="section-padding scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Guide line behind social proof row */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-xl opacity-30" />
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="grid gap-6 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-[0_4px_18px_rgba(0,0,0,0.35)] px-6 py-6 hover:-translate-y-1 transition-all duration-200 sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-8"
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
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-subtle bg-black/15 px-6 py-6 transition-all duration-200 hover:border-default hover:elevation-1 hover:-translate-y-1 sm:px-8 sm:py-8"
            >
              {index < items.length - 1 && (
                <span className="hidden md:inline absolute right-0 top-1/2 h-4 w-px bg-white/10 -translate-y-1/2" />
              )}
              <motion.span 
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-105"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {item.icon}
              </motion.span>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  {isLoading && index === 0 ? 'Loading…' : item.eyebrow}
                </p>
                <h3 className="text-xl font-semibold text-white sm:text-2xl mb-2">{item.title}</h3>
                <div className="text-base text-zinc-300/90 leading-relaxed transition-colors duration-300 group-hover:text-zinc-200">
                  {typeof item.description === 'string' ? item.description : item.description}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

