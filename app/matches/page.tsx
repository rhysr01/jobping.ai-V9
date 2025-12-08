'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { getCompanyLogo } from '@/lib/companyLogos';
import { FREE_ROLES_PER_SEND, PREMIUM_ROLES_PER_WEEK } from '@/lib/productMetrics';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  city: string;
  country: string;
  description: string;
  url: string;
  work_environment: string;
  match_score?: number;
  match_reason?: string;
}

export default function MatchesPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [jobsViewed, setJobsViewed] = useState(0);
  const jobsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch('/api/matches/free');
        
        if (response.status === 401) {
          setError('Please sign up to see your matches.');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load matches');
        }

        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError('Failed to load matches. Please try signing up again.');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  // Track job views and show upgrade banner after engagement
  useEffect(() => {
    if (jobs.length === 0) return;

    // Show banner after 3 seconds OR after viewing 2+ jobs
    const timer = setTimeout(() => {
      setShowUpgradeBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [jobs.length]);

  // Track scroll to show banner after user scrolls past first job
  useEffect(() => {
    if (!jobsContainerRef.current || jobs.length === 0) return;

    const handleScroll = () => {
      const container = jobsContainerRef.current;
      if (!container) return;
      
      const scrollPosition = window.scrollY + window.innerHeight;
      const containerBottom = container.offsetTop + container.offsetHeight;
      
      // Show banner after scrolling past first job
      if (scrollPosition > container.offsetTop + 200) {
        setShowUpgradeBanner(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [jobs.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-zinc-400 text-lg mb-2"
          >
            Finding your perfect matches...
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-sm"
          >
            This usually takes 10-15 seconds
          </motion.p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card elevation-2 p-12 max-w-md text-center"
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-white mb-2">Oops!</h3>
          <p className="text-red-400 mb-6">{error}</p>
          <Link href="/signup/free">
            <Button variant="primary">Try Again</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card elevation-2 p-12 max-w-md text-center"
        >
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-white mb-2">No matches yet</h3>
          <p className="text-zinc-400 mb-6">
            We couldn't find jobs matching your preferences. Try adjusting your cities or career path.
          </p>
          <Link href="/signup/free">
            <Button variant="primary">Try Different Preferences</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Tier Indicator */}
        <div className="text-center mb-6">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200"
          >
            <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
            Free Plan · Viewing {jobs.length}/{FREE_ROLES_PER_SEND} matches
          </motion.span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Your {jobs.length} Matched Jobs</h1>
          <p className="text-zinc-400">
            Hand-picked by our AI based on your preferences
          </p>
        </div>

        {/* Sticky Upgrade Banner - Shown after engagement */}
        {showUpgradeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-0 z-10 bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl p-5 mb-8 shadow-xl border border-brand-400/30"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-white text-lg mb-1">
                  🚀 Want {PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} more jobs this week?
                </p>
                <p className="text-sm text-white/90">
                  Premium: {PREMIUM_ROLES_PER_WEEK} jobs/week (3x more) · 5 fresh jobs Mon/Wed/Fri
                </p>
              </div>
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="shadow-lg">
                  Start Premium - €5/month
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Job Cards */}
        <div ref={jobsContainerRef} className="space-y-6 mb-12">
          {jobs.map((job, index) => {
            const companyLogo = getCompanyLogo(job.company);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card elevation-2 p-6 hover:elevation-3 transition-all"
              >
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="flex-1 flex items-start gap-4">
                    {/* Company Logo */}
                    {companyLogo && (
                      <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        <Image
                          src={companyLogo.logoPath}
                          alt={job.company}
                          width={80}
                          height={80}
                          className="object-contain w-full h-full p-2"
                          onError={(e) => {
                            // Hide broken logos
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) parent.style.display = 'none';
                          }}
                          loading="lazy"
                          unoptimized={true}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold text-brand-400 bg-brand-500/20 px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        {job.match_score && (
                          <span className="text-xs font-semibold text-green-400">
                            {Math.round(job.match_score * 100)}% Match
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-1 text-white break-words">{job.title}</h3>
                      <p className="text-brand-300 font-medium break-words">{job.company}</p>
                    </div>
                  </div>
                </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-800 text-sm">
                  📍 {job.city}, {job.country?.toUpperCase()}
                </span>
                {job.work_environment && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-800 text-sm capitalize">
                    {job.work_environment === 'remote' && '🌍'}
                    {job.work_environment === 'hybrid' && '🏢'}
                    {job.work_environment === 'office' && '🏛️'}
                    {' '}{job.work_environment}
                  </span>
                )}
              </div>

              <p className="text-zinc-400 text-sm mb-4 line-clamp-3">
                {job.description?.replace(/<[^>]*>/g, '').substring(0, 200)}...
              </p>

              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Track job view
                  setJobsViewed(prev => {
                    const newCount = prev + 1;
                    // Show upgrade banner after viewing 2 jobs
                    if (newCount >= 2) {
                      setShowUpgradeBanner(true);
                    }
                    return newCount;
                  });
                  
                  // Track click
                  fetch('/api/analytics/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event: 'free_job_clicked',
                      properties: { job_id: job.id, company: job.company, position: index + 1 },
                    }),
                  });
                }}
              >
                <Button variant="primary" size="lg" className="w-full">
                  Apply Now →
                </Button>
              </a>
            </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA - Only show after viewing jobs */}
        {showUpgradeBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card elevation-3 p-8 text-center bg-gradient-to-br from-brand-500/10 to-purple-600/10 border-2 border-brand-500/20"
          >
            <h2 className="text-3xl font-bold mb-3">
              Want {PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} More Jobs This Week?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
              <div className="text-center p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <p className="text-2xl font-bold text-white mb-1">{FREE_ROLES_PER_SEND}</p>
                <p className="text-sm text-zinc-400">Free (one-time)</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-brand-500/20 border border-brand-500/30">
                <p className="text-2xl font-bold text-brand-200 mb-1">{PREMIUM_ROLES_PER_WEEK}</p>
                <p className="text-sm text-zinc-300">Premium (per week)</p>
              </div>
            </div>
            <p className="text-lg text-zinc-400 mb-6">
              Premium members get 5 fresh jobs delivered Mon/Wed/Fri (3x more than free)
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button variant="gradient" size="lg">
                  Start Premium - €5/month
                </Button>
              </Link>
              <p className="text-sm text-zinc-500">
                Cancel anytime
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

