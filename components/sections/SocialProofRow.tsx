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
    <section className="section-padding">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="grid gap-6 rounded-3xl border-default bg-white/[0.08] p-8 elevation-1 backdrop-blur-md sm:grid-cols-3 sm:gap-8 sm:p-10"
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
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-subtle bg-black/15 p-6 transition-all duration-300 hover:border-default hover:elevation-1 sm:p-7"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <motion.span 
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-105"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {item.icon}
              </motion.span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-300">
                  {isLoading && index === 0 ? 'Loading…' : item.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-bold text-white sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-100 transition-colors duration-300 group-hover:text-white">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

