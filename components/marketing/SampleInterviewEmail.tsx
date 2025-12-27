"use client";

import React, { useEffect, useState } from "react";

interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  jobUrl: string;
  jobHash?: string; // Add this
  categories: string[];
  workEnvironment: string;
  isInternship: boolean;
  isGraduate: boolean;
}

// Fallback fictional jobs if API fails or no real jobs found
const FALLBACK_JOBS: Job[] = [
  {
    title: "Business Analyst",
    company: "Deloitte",
    location: "London, UK",
    description: "Join Deloitte's consulting practice as a Business Analyst. You'll work on strategic projects for leading clients, analyzing business problems, developing solutions, and presenting recommendations to senior stakeholders. Perfect for graduates interested in consulting and strategy.",
    jobUrl: "",
    jobHash: "", // Add jobHash
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
  },
  {
    title: "Junior Consultant",
    company: "Accenture",
    location: "London, UK",
    description: "Accenture's Consulting Graduate Programme offers hands-on experience in digital transformation and strategy. You'll work with Fortune 500 clients, solve complex business challenges, and develop skills in consulting methodologies. Comprehensive training and mentorship included.",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: true,
  },
  {
    title: "Strategy Analyst",
    company: "EY",
    location: "London, UK",
    description: "EY's Strategy team is looking for a Strategy Analyst to support strategic initiatives for clients across industries. You'll conduct market research, develop business cases, and work on transformation projects. Ideal for analytical thinkers interested in consulting.",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Office",
    isInternship: false,
    isGraduate: false,
  },
  {
    title: "Associate Consultant",
    company: "KPMG",
    location: "London, UK",
    description: "KPMG's Consulting practice seeks an Associate Consultant for their Strategy team. You'll work on client engagements, support business transformation projects, and develop strategic recommendations. Great opportunity for recent graduates to start a consulting career.",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
  },
  {
    title: "Junior Business Analyst",
    company: "PwC",
    location: "London, UK",
    description: "PwC's Consulting practice is hiring a Junior Business Analyst to join their Strategy team. You'll analyze business processes, support client engagements, and help deliver transformation projects. Excellent training programme and clear progression path for ambitious graduates.",
    jobUrl: "",
    jobHash: "",
    categories: ["strategy-business-design"],
    workEnvironment: "Hybrid",
    isInternship: false,
    isGraduate: false,
  },
];

function formatDescription(description: string): string {
  if (!description) return "";
  // Truncate to ~200 characters
  if (description.length > 200) {
    return description.slice(0, 200) + "...";
  }
  return description;
}

function getMatchScore(index: number): number {
  // Vary match scores for realism
  const scores = [87, 94, 89, 85, 88];
  return scores[index] || 85;
}

function isHotMatch(score: number): boolean {
  return score >= 90;
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
}

export default function SampleInterviewEmail({ day = 'monday' }: SampleInterviewEmailProps) {
  const [jobs, setJobs] = useState<Job[]>(FALLBACK_JOBS); // Start with fallback - no loading state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Silently fetch real jobs in background, but show fallback immediately
    async function fetchJobs() {
      try {
        const response = await fetch(`/api/sample-jobs?day=${day}`);
        const data = await response.json();
        
        if (data.jobs && data.jobs.length > 0) {
          // Update with real jobs if available (smooth transition)
          setJobs(data.jobs.slice(0, 5));
        }
      } catch (error) {
        // Silently fail - fallback jobs already showing
        console.error('Failed to fetch sample jobs:', error);
      }
    }

    fetchJobs();
  }, [day]);

  // Always show jobs (no loading state in preview)
  const displayJobs = jobs;

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
        <h1 className="text-[22px] font-bold text-white mb-4 leading-tight">
          Your 5 new matches are ready
        </h1>
        <p className="text-[15px] text-zinc-300 leading-relaxed mb-4">
          Alex, here are your 5 new matches for {day === 'wednesday' ? 'Wednesday' : 'Monday'}. All roles below match your filters: London, visa sponsorship, entry-level Strategy roles.
        </p>
        <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
          See one you like? Apply now. Not a fit? Let us know and we'll adjust.
        </p>

        {displayJobs.map((job, index) => {
            const score = getMatchScore(index);
            const hot = isHotMatch(score);
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
                className={`${index === 0 ? 'mt-5' : 'mt-4'} rounded-2xl ${
                  hot 
                    ? 'border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/8 to-brand-600/5 shadow-[0_8px_40px_rgba(109,90,143,0.2)]' 
                    : 'border border-indigo-500/15 bg-[#0f0f0f] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
                } p-5`}
              >
                <div className="mb-4">
                  <span className={`inline-block rounded-lg bg-gradient-to-r ${
                    hot 
                      ? 'from-brand-600 to-brand-500' 
                      : 'from-brand-500 to-brand-600'
                  } px-4 py-1.5 text-[11px] font-semibold text-white`}>
                    {hot ? `🔥 Hot Match ${score}%` : `${score}% Match`}
                  </span>
                </div>
                <div className="font-bold text-[18px] text-white mb-2 leading-tight">{job.title}</div>
                <div className="text-[15px] text-zinc-300 font-medium mb-2">{job.company}</div>
                <div className="text-[13px] text-zinc-500 mb-4">📍 {job.location}</div>
                
                {/* Why you should apply section */}
                <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="text-[13px] font-semibold text-emerald-400 mb-2.5">Why you should apply:</div>
                  <div className="space-y-1.5 text-[13px] text-zinc-300">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✅</span>
                      <span>London-based (your preference)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✅</span>
                      <span>Entry-level (no experience required)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✅</span>
                      <span>Visa sponsorship available</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✅</span>
                      <span>Strategy role (your career path)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
                  {formatDescription(job.description)}
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Strategy & Business Design</span>
                  <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">{job.workEnvironment}</span>
                  {job.isInternship && (
                    <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Internship</span>
                  )}
                  {job.isGraduate && (
                    <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Graduate Programme</span>
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
                
                <a
                  href={job.jobUrl || "#"}
                  target={job.jobUrl ? "_blank" : undefined}
                  rel={job.jobUrl ? "noopener noreferrer" : undefined}
                  aria-label={`Apply now: ${job.title} at ${job.company}`}
                  className="inline-block rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(109,90,143,0.3)] hover:opacity-90 transition-opacity"
                >
                  Apply now →
                </a>
              </div>
            );
          })}

        {/* Upgrade CTA for free users - matches production */}
        <div className="mt-6 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 p-6">
          <h3 className="text-[20px] font-bold text-white mb-3 leading-tight">Get More Matches for €5 Now</h3>
          <p className="text-[15px] text-zinc-300 mb-5 leading-relaxed">
            Upgrade to Premium and get <span className="font-semibold text-purple-300">15 jobs per week (~60 per month)</span> - that's 10 more than free (3x more). Cancel anytime.
          </p>
          <a
            href="#"
            aria-label="Upgrade to Premium"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(109,90,143,0.3)] hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium - €5/month
          </a>
        </div>

        {/* Footer - matches production */}
        <div className="mt-6 pt-5 border-t border-indigo-500/12 text-center">
          <div className="text-purple-400 font-semibold text-[14px] mb-2">JobPing</div>
          <div className="text-[11px] text-zinc-500">
            You're receiving this because you created a JobPing account.
          </div>
        </div>
      </div>
    </div>
  );
}
