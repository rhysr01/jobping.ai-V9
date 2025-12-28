"use client";

import React, { useEffect, useState } from "react";

interface Job {
  title: string;
  company: string;
  location: string;
  description?: string;
  jobUrl: string;
  jobHash?: string;
  categories: string[];
  workEnvironment: string;
  isInternship: boolean;
  isGraduate: boolean;
  matchScore?: number; // Match score from API (0-1, e.g., 0.92 for 92%)
  matchReason?: string; // Real match reason from database
}

// Fallback fictional jobs matching a specific user profile: Finance roles in London
const FALLBACK_FINANCE_JOBS: Job[] = [
  {
    title: "Graduate Analyst",
    company: "Goldman Sachs",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["finance-investment"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: true,
    matchScore: 0.92, // 92% - Hot Match
  },
  {
    title: "Junior Financial Analyst",
    company: "JPMorgan Chase",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["finance-investment"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.88, // 88%
  },
  {
    title: "Finance Intern",
    company: "Morgan Stanley",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["finance-investment"],
    workEnvironment: "Hybrid",
    isInternship: true,
    isGraduate: false,
    matchScore: 0.85, // 85%
  },
  {
    title: "Investment Banking Analyst",
    company: "Barclays",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["finance-investment"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.87, // 87%
  },
  {
    title: "Graduate Trainee - Finance",
    company: "Deutsche Bank",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["finance-investment"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: true,
    matchScore: 0.89, // 89%
  },
];

// Fallback jobs for other career paths (Tech roles in London)
const FALLBACK_TECH_JOBS: Job[] = [
  {
    title: "Graduate Software Engineer",
    company: "Google",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["tech-transformation"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: true,
    matchScore: 0.92, // 92% - Hot Match
  },
  {
    title: "Junior Frontend Developer",
    company: "Meta",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["tech-transformation"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.88, // 88%
  },
  {
    title: "Software Engineer Intern",
    company: "Amazon",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["tech-transformation"],
    workEnvironment: "Hybrid",
    isInternship: true,
    isGraduate: false,
    matchScore: 0.85, // 85%
  },
  {
    title: "React Developer",
    company: "Microsoft",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["tech-transformation"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.87, // 87%
  },
  {
    title: "Junior Software Engineer",
    company: "Apple",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["tech-transformation"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.89, // 89%
  },
];

// Strategy fallback jobs (London)
const FALLBACK_STRATEGY_JOBS: Job[] = [
  {
    title: "Business Analyst",
    company: "Deloitte",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.87, // 87%
  },
  {
    title: "Junior Consultant",
    company: "Accenture",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: true,
    matchScore: 0.94, // 94% - Hot Match
  },
  {
    title: "Strategy Analyst",
    company: "EY",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Office",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.89, // 89%
  },
  {
    title: "Associate Consultant",
    company: "KPMG",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.85, // 85%
  },
  {
    title: "Junior Business Analyst",
    company: "PwC",
    location: "London, UK",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
    matchScore: 0.88, // 88%
  },
];

// Get fallback jobs based on career path
function getFallbackJobs(careerPath: string): Job[] {
  if (careerPath === 'finance') {
    return FALLBACK_FINANCE_JOBS;
  } else if (careerPath === 'tech') {
    return FALLBACK_TECH_JOBS;
  } else {
    return FALLBACK_STRATEGY_JOBS; // Default to strategy
  }
}

function formatDescription(description: string): string {
  if (!description) return "";
  // Show up to 300 characters (increased from 200) for better context
  // Still truncate very long descriptions to prevent layout issues
  if (description.length > 300) {
    return description.slice(0, 300) + "...";
  }
  return description;
}

function getMatchScore(index: number): number {
  // Vary match scores for realism
  const scores = [87, 94, 89, 85, 88];
  return scores[index] || 85;
}

function isHotMatch(score: number): boolean {
  return score >= 92; // Raised from 90 to 92 for rarer hot matches
}

function getUniqueMatchReason(job: Job, score: number, index: number, careerPath: string = 'finance'): string {
  const city = job.location.split(',')[0];
  const workEnv = job.workEnvironment.toLowerCase();
  
  if (careerPath === 'finance') {
    const reasons = [
      `Hot match! ${job.company}'s Graduate Programme is specifically designed for recent graduates like you. Based on your preference for Finance roles in London, this role offers visa sponsorship and requires no prior experience - perfect entry point into investment banking.`,
      `Perfect for your Finance career path in London. ${job.company}'s finance team works on strategic transactions that align with your interests. Located in ${city}, offers visa sponsorship, and entry-level friendly with comprehensive training.`,
      `Great match for Finance development. ${job.company}'s internship program offers hands-on experience with financial modeling and analysis. The role is in ${city} with visa support, and the ${workEnv} setup aligns with your preferences. Perfect for entry-level candidates.`,
      `Strong alignment with your Finance goals in London. ${job.company} specializes in investment banking that matches your career path. Located in ${city} with visa sponsorship, ${workEnv} work style, and entry-level friendly with excellent mentorship.`,
      `Excellent match for Finance roles. ${job.company}'s finance team offers clear progression paths for ambitious graduates. Based in ${city} with visa sponsorship, focuses on financial analysis and strategic transactions, and entry-level friendly with comprehensive support.`
    ];
    return reasons[index] || `Matches your preferences: ${city}, Finance career path, visa sponsorship available, and entry-level friendly.`;
  } else if (careerPath === 'tech') {
    const reasons = [
      `Hot match! ${job.company}'s Graduate Programme is specifically designed for recent graduates like you. Based on your preference for Tech roles in London, this role offers visa sponsorship and requires no prior experience - perfect entry point into software engineering.`,
      `Perfect for your Tech career path in London. ${job.company}'s engineering team works with modern technologies that align with your interests. Located in ${city}, offers visa sponsorship, and entry-level friendly with comprehensive training.`,
      `Great match for Tech development. ${job.company}'s internship program offers hands-on experience with software development. The role is in ${city} with visa support, and the ${workEnv} setup aligns with your preferences. Perfect for entry-level candidates.`,
      `Strong alignment with your Tech goals in London. ${job.company} specializes in software engineering that matches your career path. Located in ${city} with visa sponsorship, ${workEnv} work style, and entry-level friendly with excellent mentorship.`,
      `Excellent match for Tech roles. ${job.company}'s engineering team offers clear progression paths for ambitious graduates. Based in ${city} with visa sponsorship, focuses on modern technologies, and entry-level friendly with comprehensive support.`
    ];
    return reasons[index] || `Matches your preferences: ${city}, Tech career path, visa sponsorship available, and entry-level friendly.`;
  } else {
    // Strategy (default)
    const reasons = [
      `Hot match! ${job.company}'s Graduate Programme is specifically designed for recent graduates like you. Based on your preference for Strategy roles in London, this role offers visa sponsorship and requires no prior experience - perfect entry point into consulting.`,
      `Perfect for your Strategy career path in London. ${job.company}'s consulting practice works on strategic projects that align with your interests. Located in ${city}, offers visa sponsorship, and entry-level friendly with comprehensive training.`,
      `Great match for Strategy consulting. ${job.company}'s internship program offers hands-on experience with business analysis and strategy. The role is in ${city} with visa support, and the ${workEnv} setup aligns with your preferences. Perfect for entry-level candidates.`,
      `Strong alignment with your Strategy goals in London. ${job.company} specializes in consulting that matches your career path. Located in ${city} with visa sponsorship, ${workEnv} work style, and entry-level friendly with excellent mentorship.`,
      `Excellent match for Strategy roles. ${job.company}'s consulting team offers clear progression paths for ambitious graduates. Based in ${city} with visa sponsorship, focuses on strategic analysis, and entry-level friendly with comprehensive support.`
    ];
    return reasons[index] || `Matches your preferences: ${city}, Strategy career path, visa sponsorship available, and entry-level friendly.`;
  }
}

async function submitFeedback(jobHash: string, feedbackType: 'thumbs_up' | 'thumbs_down', email: string = 'sample@example.com'): Promise<void> {
  if (!jobHash) {
    console.warn('Cannot submit feedback: missing job_hash');
    return;
  }

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://getjobping.com';
    const response = await fetch(`${baseUrl}/api/feedback/enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'jobping-request',
      },
      body: JSON.stringify({
        jobHash,
        email,
        feedbackType,
        source: 'email',
      }),
    });

    if (!response.ok) {
      console.error('Failed to submit feedback:', await response.text());
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

interface SampleInterviewEmailProps {
  day?: 'monday' | 'wednesday';
  careerPath?: string; // e.g., 'finance', 'tech', 'strategy'
  preloadedJobs?: any[]; // Pre-loaded jobs from EmailPhoneShowcase
}

export default function SampleInterviewEmail({ day = 'monday', careerPath = 'finance', preloadedJobs }: SampleInterviewEmailProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<{ name?: string; cities?: string[]; careerPath?: string } | null>(null);

  useEffect(() => {
    // If pre-loaded jobs provided, use them immediately (NO loading state)
    if (preloadedJobs && preloadedJobs.length > 0) {
      const realJobs = preloadedJobs
        .filter((job: any) => job.jobUrl && job.jobUrl.trim() !== '')
        .slice(0, 5)
        .map((job: any) => ({
          ...job,
          jobUrl: job.jobUrl,
        }));
      setJobs(realJobs);
      
      // Extract user profile from first job if available
      if (preloadedJobs[0]?.userProfile) {
        setUserProfile(preloadedJobs[0].userProfile);
      }
      return; // Don't fetch if pre-loaded
    }

    // Fallback: fetch if no pre-loaded jobs
    async function fetchJobs() {
      try {
        const response = await fetch(`/api/sample-jobs?day=${day}&tier=premium`);
        const data = await response.json();
        
        if (data.jobs && data.jobs.length > 0) {
          const jobsWithUrls = data.jobs.filter((job: any) => job.jobUrl && job.jobUrl.trim() !== '');
          
          if (jobsWithUrls.length > 0) {
            const realJobs = jobsWithUrls.slice(0, 5).map((job: any) => ({
              ...job,
              jobUrl: job.jobUrl,
            }));
            setJobs(realJobs);
          }
          
          if (data.userProfile) {
            setUserProfile(data.userProfile);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sample jobs:', error);
      }
    }

    fetchJobs();
  }, [day, preloadedJobs]);

  // Always show exactly 5 jobs
  const displayJobs = jobs.slice(0, 5);
  
  // NO loading state - show empty if no jobs (shouldn't happen with pre-loaded)
  if (displayJobs.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[360px] px-2 text-[14px] leading-[1.5] text-zinc-100 font-sans">
        <div className="mb-6 rounded-t-lg bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 text-center">
          <div className="text-[32px] font-bold text-white tracking-tight mb-2">JobPing</div>
          <div className="text-[11px] text-white/95 uppercase tracking-wider font-medium">AI Powered Job Matching for Europe</div>
        </div>
        <div className="rounded-lg border border-zinc-800/50 bg-white/[0.03] p-5 text-center">
          <div className="text-zinc-400 text-sm">No jobs available</div>
        </div>
      </div>
    );
  }

  const handleFeedback = async (jobHash: string, feedbackType: 'thumbs_up' | 'thumbs_down') => {
    if (!jobHash || feedbackSubmitted.has(jobHash)) return;
    
    setFeedbackSubmitted(prev => new Set(prev).add(jobHash));
    await submitFeedback(jobHash, feedbackType);
  };

  return (
    <div className="mx-auto w-full max-w-[360px] px-2 text-[14px] leading-[1.5] text-zinc-100 font-sans">
      {/* Email header - matches production gradient header */}
      <div className="mb-6 rounded-t-lg bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 text-center">
        <div className="text-[32px] font-bold text-white tracking-tight mb-2">JobPing</div>
        <div className="text-[11px] text-white/95 uppercase tracking-wider font-medium">AI Powered Job Matching for Europe</div>
      </div>

      {/* Email content container */}
      <div className="rounded-lg border border-zinc-800/50 bg-white/[0.03] p-5 shadow-[0_4px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm">
        {/* Title and intro - matches production exactly */}
        {/* Premium Feature Badge - BIG and CLEAR */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-brand-500/20 to-purple-600/20 border-2 border-brand-500/40">
          <p className="text-[14px] text-brand-200 font-bold mb-1 uppercase tracking-wide">💎 Premium Feature Preview</p>
          <p className="text-[13px] text-zinc-300 leading-relaxed">Example: Your Monday email (Premium only). Free users see matches instantly, no emails.</p>
        </div>

        <h1 className="text-[22px] font-bold text-white mb-4 leading-tight">
          Your 5 matches are ready ✨
        </h1>
        <p className="text-[15px] text-zinc-300 leading-relaxed mb-4">
          Here are 5 example matches for {day === 'wednesday' ? 'Wednesday' : 'Monday'}. All roles below match filters: {userProfile?.cities?.join(', ') || 'Multiple cities'}, {userProfile?.careerPath ? `${userProfile.careerPath} roles` : 'entry-level roles'}.
        </p>
        <p className="text-[15px] text-zinc-400 leading-relaxed mb-4">
          See one you like? Apply now. Not a fit? Let us know and we'll adjust.
        </p>

        {displayJobs.map((job, index) => {
            // Use REAL match_score from database (calculated with real matching engine)
            const baseScore = job.matchScore ? Math.round(job.matchScore * 100) : 85;
            // Ensure unique scores per job (slight variation)
            const uniqueScore = Math.min(92, baseScore + (index % 3));
            const hot = uniqueScore >= 92; // Hot match is 92%+ (excellent tier)
            
            // Use REAL match reason from database (already personalized by matching engine)
            const uniqueMatchReason = job.matchReason || getUniqueMatchReason(job, uniqueScore, index, userProfile?.careerPath || careerPath);
            const experienceText = job.isGraduate 
              ? "Entry-level graduate role" 
              : job.isInternship 
              ? "Internship (fits your profile)"
              : "Entry-level (fits your profile)";
            const hasJobHash = !!job.jobHash;
            const isFeedbackSubmitted = job.jobHash ? feedbackSubmitted.has(job.jobHash) : false;
            
            return (
              <div
                key={`${job.company}-${job.title}-${index}`}
                className={`${index === 0 ? 'mt-5' : 'mt-4'} rounded-2xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                  uniqueScore >= 92
                    ? 'border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-500/15 to-emerald-600/8 shadow-[0_8px_40px_rgba(16,185,129,0.35)] hover:shadow-[0_12px_50px_rgba(16,185,129,0.45)]' 
                    : uniqueScore >= 85
                    ? 'border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_6px_30px_rgba(139,92,246,0.35)]'
                    : 'border border-zinc-500/30 bg-black shadow-sm hover:shadow-md'
                } p-5`}
              >
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2">
                    <span 
                      aria-label={`${uniqueScore} percent job match score${hot ? ', hot match' : ''}`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-semibold text-white border ${
                        uniqueScore >= 92
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-400/60 text-[12px] shadow-[0_4px_12px_rgba(16,185,129,0.4)]' 
                          : uniqueScore >= 85
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-400/60 text-[11px] shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                          : 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40 text-[11px]'
                      }`}
                    >
                      {hot ? `🔥 Hot Match ${uniqueScore}%` : `✓ ${uniqueScore}% Match`}
                    </span>
                    <button
                      className="text-[10px] text-zinc-400 hover:text-zinc-300 underline decoration-dotted underline-offset-2 transition-colors"
                      title={`${uniqueScore}% Match: ${uniqueMatchReason}`}
                      aria-label={`Why this score? ${uniqueMatchReason}`}
                    >
                      Why this score?
                    </button>
                  </div>
                </div>
                <div className="font-bold text-[20px] text-white mb-2 leading-tight">{job.title}</div>
                <div className="text-[17px] text-zinc-200 font-bold mb-2">{job.company}</div>
                <div className="text-[15px] text-zinc-200 mb-4">📍 {job.location}</div>
                
                {/* Short Description */}
                {job.description && (
                  <div className="text-[14px] text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                    {job.description.length > 120 ? job.description.slice(0, 120) + '...' : job.description}
                </div>
                )}
                
                <div className="mb-4 flex flex-wrap gap-2">
                  {job.categories && job.categories.length > 0 && (
                    <span className="inline-block rounded-full bg-purple-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">
                      {job.categories[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  )}
                  <span className="inline-block rounded-full bg-purple-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">{job.workEnvironment}</span>
                  {job.isInternship && (
                    <span className="inline-block rounded-full bg-purple-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Internship</span>
                  )}
                  {job.isGraduate && (
                    <span className="inline-block rounded-full bg-purple-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Graduate Programme</span>
                  )}
                </div>
                
                {/* Thumbs up/down feedback buttons */}
                {hasJobHash && (
                  <div className="mb-4 flex items-center gap-3">
                    <button
                      onClick={() => handleFeedback(job.jobHash!, 'thumbs_up')}
                      disabled={isFeedbackSubmitted}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-opacity ${
                        isFeedbackSubmitted
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                      title="This looks good!"
                      aria-label="Thumbs up: This job looks good"
                    >
                      👍 Good match
                    </button>
                    <button
                      onClick={() => handleFeedback(job.jobHash!, 'thumbs_down')}
                      disabled={isFeedbackSubmitted}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-opacity ${
                        isFeedbackSubmitted
                          ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                      title="Not for me"
                      aria-label="Thumbs down: Not interested"
                    >
                      👎 Not for me
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    if (job.jobUrl && job.jobUrl.trim() !== '' && job.jobUrl !== '#') {
                      window.open(job.jobUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  disabled={!job.jobUrl || job.jobUrl.trim() === '' || job.jobUrl === '#'}
                  aria-label={`Apply now: ${job.title} at ${job.company}`}
                  className={`w-full inline-flex items-center justify-center rounded-lg px-8 py-4 text-[16px] font-bold text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
                    job.jobUrl && job.jobUrl.trim() !== '' && job.jobUrl !== '#'
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_30px_rgba(139,92,246,0.6)]'
                      : 'bg-gradient-to-r from-brand-500/50 to-brand-600/50 text-white/70 cursor-not-allowed border border-brand-500/30'
                  }`}
                >
                  {job.jobUrl && job.jobUrl.trim() !== '' && job.jobUrl !== '#' ? 'Apply now →' : 'No URL available'}
                </button>
              </div>
            );
          })}


        {/* Footer - Sample Preview */}
        <div className="mt-6 pt-5 border-t border-purple-500/12 text-center">
          <div className="text-purple-400 font-semibold text-[14px] mb-2">JobPing</div>
          <div className="text-[11px] text-zinc-500">
            This is a sample email preview showing real matches from a real user. Sign up to get your own personalized matches.
          </div>
        </div>
      </div>
    </div>
  );
}
