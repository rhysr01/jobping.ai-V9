'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { BrandIcons } from '@/components/ui/BrandIcons';
import {
  PREMIUM_ROLES_PER_MONTH,
  PREMIUM_ROLES_PER_WEEK,
  FREE_ROLES_PER_SEND,
} from '@/lib/productMetrics';

interface StatsResponse {
  totalUsersFormatted?: string;
  activeJobsFormatted?: string;
}

export default function SocialProofRow() {
  const [stats, setStats] = useState<StatsResponse>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StatsResponse | null) => {
        if (isSubscribed && data) {
          setStats({
            totalUsersFormatted: data.totalUsersFormatted,
            activeJobsFormatted: data.activeJobsFormatted,
          });
        }
      })
      .catch(() => {
        // swallow errors gracefully; we'll use defaults below
      })
      .finally(() => isSubscribed && setLoading(false));

    return () => {
      isSubscribed = false;
    };
  }, []);

  const activeJobs = stats.activeJobsFormatted ?? '12,000';
  const totalUsers = stats.totalUsersFormatted ?? '3,400';

  const items = [
    {
      icon: <BrandIcons.Users className="h-5 w-5" />,
      title: `Join ${totalUsers}+ students`,
      description: 'Early-career candidates across Europe rely on JobPing each week.',
    },
    {
      icon: <BrandIcons.Mail className="h-5 w-5" />,
      title: `${FREE_ROLES_PER_SEND} curated roles per drop`,
      description: `${PREMIUM_ROLES_PER_WEEK} premium roles weekly (~${PREMIUM_ROLES_PER_MONTH} every month).`,
    },
    {
      icon: <BrandIcons.Target className="h-5 w-5" />,
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
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 shadow-[0_0_18px_rgba(99,102,241,0.25)]">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                  {loading && index === 0 ? 'Loading…' : 'Trusted across Europe'}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

