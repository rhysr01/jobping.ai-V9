'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { BrandIcons } from '@/components/ui/BrandIcons';
import {
  PREMIUM_ROLES_PER_MONTH,
  PREMIUM_ROLES_PER_WEEK,
  FREE_ROLES_PER_SEND,
} from '@/lib/productMetrics';

export default function SocialProofRow() {
  const [activeJobs, setActiveJobs] = useState('12,000');
  const [totalUsers, setTotalUsers] = useState('3,400');
  const [loading, setLoading] = useState(true);
  const [statsStale, setStatsStale] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    const normalize = (value: unknown): number => {
      if (typeof value === 'number' && !Number.isNaN(value)) return value;
      if (typeof value === 'string') {
        const numeric = Number(value.replace(/,/g, ''));
        if (!Number.isNaN(numeric)) return numeric;
      }
      return 0;
    };

    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!isSubscribed) return;

        if (data) {
          const activeValue = normalize(data.activeJobs ?? data.activeJobsFormatted);
          const totalValue = normalize(data.totalUsers ?? data.totalUsersFormatted);
          const hasFreshStats = activeValue > 0 && totalValue > 0;

          setActiveJobs(
            hasFreshStats ? activeValue.toLocaleString('en-US') : '12,000'
          );
          setTotalUsers(
            hasFreshStats ? totalValue.toLocaleString('en-US') : '3,400'
          );
          setStatsStale(!hasFreshStats);
        } else {
          setActiveJobs('12,000');
          setTotalUsers('3,400');
          setStatsStale(true);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setActiveJobs('12,000');
        setTotalUsers('3,400');
        setStatsStale(true);
      })
      .finally(() => isSubscribed && setLoading(false));

    return () => {
      isSubscribed = false;
    };
  }, []);

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
      description: `${PREMIUM_ROLES_PER_WEEK} premium roles weekly (~${PREMIUM_ROLES_PER_MONTH} every month).`,
    },
    {
      icon: <BrandIcons.Target className="h-5 w-5" />,
      eyebrow: 'Opportunities live now',
      title: `${activeJobs} active opportunities`,
      description: 'Filtered by city, visa status, and experience to fit real applicants.',
    },
  ];

  return (
    <section className="section-padding pt-10 pb-6 lg:pt-12 lg:pb-8">
      <div className="container-page container-rhythm">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_70px_rgba(10,0,40,0.28)] backdrop-blur-md sm:grid-cols-3 sm:gap-6 sm:p-8"
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
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/10 p-4 transition-all duration-300 hover:border-brand-500/30 hover:bg-black/20 hover:shadow-[0_8px_24px_rgba(99,102,241,0.15)] sm:p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <motion.span 
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 shadow-[0_0_18px_rgba(99,102,241,0.25)] transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {item.icon}
              </motion.span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                  {loading && index === 0 ? 'Loading…' : item.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300 transition-colors duration-300 group-hover:text-zinc-200">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

