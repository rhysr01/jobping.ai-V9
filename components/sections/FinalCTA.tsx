'use client';

import { useEffect, useState } from 'react';

interface FeaturedJob {
  title: string;
  company: string;
  location: string;
  job_url: string;
  description: string;
  match_score: number;
  is_internship?: boolean;
  is_graduate?: boolean;
}

export default function FinalCTA() {
  const tallyUrl = 'https://tally.so/r/mJEqx4?tier=free&source=finalcta';
  const [jobs, setJobs] = useState<FeaturedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/featured-jobs')
      .then(res => res.json())
      .then(data => {
        if (data.jobs && data.jobs.length >= 2) {
          setJobs(data.jobs);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch featured jobs:', err);
        setLoading(false);
      });
  }, []);

  // Fallback jobs if API fails or is loading
  const displayJobs: FeaturedJob[] = jobs.length >= 2 ? jobs : [
    {
      title: "Investment Banking Analyst Intern – Financial Sponsors Group",
      company: "Guggenheim Partners",
      location: "London, England",
      job_url: "https://uk.indeed.com/viewjob?jk=e35ae28b179f6b06",
      description: "Guggenheim Partners is a global investment and advisory firm with a track record of delivering results through innovative solutions. Join our Financial Sponsors Group for a 6-month internship starting January 2026.",
      is_internship: true,
      match_score: 92
    },
    {
      title: "Graduate Trainee - Finance",
      company: "NatWest Group",
      location: "London, England",
      job_url: "https://www.linkedin.com/jobs/view/4313740922",
      description: "Join NatWest Group's Finance Graduate Programme. Gain hands-on experience across financial planning, analysis, and reporting while building your career at one of the UK's leading banks.",
      is_graduate: true,
      match_score: 88
    }
  ];

  const hotJob = displayJobs[0];
  const regularJob = displayJobs[1];

  return (
    <section className="py-20 sm:py-24 md:py-32 lg:py-40">
      <div className="container-page">
        <div className="text-center mb-12 sm:mb-16 px-4">
          <h2 className="h2-section leading-tight">Personalised for you in your inbox weekly</h2>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-zinc-300 leading-relaxed">Here's exactly what you'll receive:</p>
        </div>

        {/* Real email preview with actual jobs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-black border-2 border-zinc-800/50 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(99,102,241,0.25),0_20px_60px_rgba(0,0,0,0.4)]">
            
            {/* Purple gradient header - REFINED */}
            <div className="relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)',
              padding: '40px 24px'
            }}>
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 60%)',
                pointerEvents: 'none'
              }}></div>
              <div className="relative z-10 text-center">
                <div className="text-4xl sm:text-5xl font-black text-white mb-2" style={{
                  letterSpacing: '-1.5px',
                  textShadow: '0 4px 20px rgba(0,0,0,0.4)'
                }}>
                  JobPing
                </div>
                <div className="text-xs sm:text-sm text-white/95 font-bold uppercase tracking-widest">
                  AI-Powered Job Matching
                </div>
              </div>
            </div>

            {/* Email content */}
            <div className="p-6 sm:p-8 md:p-10 bg-black">
              {/* Greeting */}
              <div className="text-center mb-8 sm:mb-10">
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight">5 perfect matches just dropped</h3>
                <p className="text-zinc-400 text-sm sm:text-base">We found roles that actually match you—no generic spam, just quality.</p>
              </div>

              {/* Hot Match Job Card - DYNAMIC */}
              <div className="mb-6 sm:mb-7 p-5 sm:p-7 md:p-8 rounded-2xl border-2 border-purple-500/70 bg-gradient-to-br from-brand-500/12 to-purple-600/8 shadow-[0_12px_40px_rgba(99,102,241,0.35)]">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-[10px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg mb-3 sm:mb-4 shadow-[0_4px_12px_rgba(139,92,246,0.4)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></span>
                  Hot Match • {hotJob.match_score}% Match
                </div>
                <div className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">{hotJob.title}</div>
                <div className="text-zinc-300 font-semibold text-sm sm:text-base mb-1 sm:mb-2">{hotJob.company}</div>
                <div className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">{hotJob.location}</div>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                  {hotJob.description}
                </p>
                <p className="text-zinc-600 text-[10px] sm:text-xs italic mb-3 sm:mb-4">Based on your preference for Finance roles in London</p>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Application Link</p>
                  <p className="text-[10px] sm:text-xs text-brand-400 font-mono break-all bg-black/40 p-2 sm:p-2.5 rounded-lg border border-brand-500/15">
                    {hotJob.job_url}
                  </p>
                  <p className="mt-2 text-[10px] text-zinc-500">Copy and paste this link into your browser to apply</p>
                </div>
              </div>

              {/* Regular Job Card - DYNAMIC */}
              <div className="mb-6 sm:mb-7 p-5 sm:p-7 md:p-8 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-zinc-900/90 to-black shadow-[0_8px_30px_rgba(99,102,241,0.2)]">
                <div className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">{regularJob.title}</div>
                <div className="text-zinc-300 font-semibold text-sm sm:text-base mb-1 sm:mb-2">{regularJob.company}</div>
                <div className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">{regularJob.location}</div>
                <div className="mb-3 sm:mb-4">
                  <span className="inline-block bg-gradient-to-r from-brand-500 to-purple-600 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                    {regularJob.match_score}% Match
                  </span>
                </div>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                  {regularJob.description}
                </p>
                <p className="text-zinc-600 text-[10px] sm:text-xs italic mb-3 sm:mb-4">Based on your preference for Finance roles in London</p>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Application Link</p>
                  <p className="text-[10px] sm:text-xs text-brand-400 font-mono break-all bg-black/40 p-2 sm:p-2.5 rounded-lg border border-brand-500/15">
                    {regularJob.job_url}
                  </p>
                  <p className="mt-2 text-[10px] text-zinc-500">Copy and paste this link into your browser to apply</p>
                </div>
              </div>

              {/* CTA at bottom */}
              <div className="text-center pt-4 sm:pt-6 border-t border-zinc-800">
                <p className="text-zinc-500 text-[10px] sm:text-xs mb-3 sm:mb-4">+ 3 more matches in your weekly email</p>
                <a 
                  href={tallyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary inline-block touch-manipulation"
                >
                  Get my first 5 personalised roles
                </a>
                <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-zinc-500">No CV required. Unsubscribe anytime. GDPR friendly.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#0a0a0a]/80 border-t-2 border-brand-500/20 p-5 sm:p-7 text-center">
              <div className="text-2xl sm:text-3xl font-black text-purple-400 mb-2">JobPing</div>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">AI-powered job matching for Europe</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
