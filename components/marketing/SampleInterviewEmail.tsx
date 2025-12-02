import Image from "next/image";
import React from "react";

export default function SampleInterviewEmail() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-2 text-[14px] leading-[1.5] text-zinc-100 font-sans">
      {/* Email header - matches production gradient header */}
      <div className="mb-6 rounded-t-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 p-6 text-center">
        <div className="text-[32px] font-bold text-white tracking-tight mb-2">JobPing</div>
        <div className="text-[11px] text-white/95 uppercase tracking-wider font-medium">AI Powered Job Matching for Europe</div>
      </div>

      {/* Email content container */}
      <div className="rounded-lg border border-zinc-800/50 bg-white/[0.03] p-5 shadow-[0_4px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm">
        {/* Title and intro - matches production exactly */}
        <h1 className="text-[22px] font-bold text-white mb-4 leading-tight">
          Your 5 new matches are ready ✨
        </h1>
        <p className="text-[15px] text-zinc-300 leading-relaxed mb-4">
          Alex, here's what our matcher surfaced for you today. Every role below cleared the filters you set — location, career path, visa, and early-career fit.
        </p>
        <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
          Review the highlights, tap through to apply, and let us know if anything feels off — your feedback powers the next batch.
        </p>

        {/* Job 1 */}
        <div className="mt-5 rounded-2xl border border-indigo-500/15 bg-[#0f0f0f] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <span className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-[11px] font-semibold text-white">85% Match</span>
          </div>
          <div className="font-bold text-[18px] text-white mb-2 leading-tight">Product Analyst</div>
          <div className="text-[15px] text-zinc-300 font-medium mb-2">Monzo</div>
          <div className="text-[13px] text-zinc-500 mb-4">📍 London</div>
          <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
            Join Monzo's product team to help shape the future of banking. You'll work on features that millions of customers use daily, collaborating with designers, engineers, and data scientists...
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Strategy & Business</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Hybrid</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">via Adzuna</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Product Analyst at Monzo"
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Apply now →
          </a>
        </div>

        {/* Job 2 - Hot Match */}
        <div className="mt-4 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-5 shadow-[0_8px_40px_rgba(99,102,241,0.3)]">
          <div className="mb-4">
            <span className="inline-block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-[11px] font-semibold text-white">🔥 Hot Match 92%</span>
          </div>
          <div className="font-bold text-[18px] text-white mb-2 leading-tight">Data Associate</div>
          <div className="text-[15px] text-zinc-300 font-medium mb-2">N26</div>
          <div className="text-[13px] text-zinc-500 mb-4">📍 Berlin</div>
          <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
            Work with N26's data team to analyze user behavior and drive product decisions. You'll use SQL, Python, and modern analytics tools to uncover insights that shape the banking experience...
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Tech & Engineering</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Remote</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">via Reed</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Data Associate at N26"
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Apply now →
          </a>
        </div>

        {/* Job 3 */}
        <div className="mt-4 rounded-2xl border border-indigo-500/15 bg-[#0f0f0f] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <span className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-[11px] font-semibold text-white">88% Match</span>
          </div>
          <div className="font-bold text-[18px] text-white mb-2 leading-tight">Operations Intern</div>
          <div className="text-[15px] text-zinc-300 font-medium mb-2">Revolut</div>
          <div className="text-[13px] text-zinc-500 mb-4">📍 Dublin</div>
          <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
            Support Revolut's operations team in scaling our European presence. You'll work on process improvements, customer support initiatives, and cross-functional projects...
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Operations</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Internship</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Operations Intern at Revolut"
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Apply now →
          </a>
        </div>

        {/* Job 4 */}
        <div className="mt-4 rounded-2xl border border-indigo-500/15 bg-[#0f0f0f] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <span className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-[11px] font-semibold text-white">86% Match</span>
          </div>
          <div className="font-bold text-[18px] text-white mb-2 leading-tight">Marketing Intern</div>
          <div className="text-[15px] text-zinc-300 font-medium mb-2">Spotify</div>
          <div className="text-[13px] text-zinc-500 mb-4">📍 Stockholm</div>
          <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
            Join Spotify's marketing team to help promote new features and campaigns. You'll work on social media, content creation, and brand partnerships across European markets...
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Marketing</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Hybrid</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Marketing Intern at Spotify"
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Apply now →
          </a>
        </div>

        {/* Job 5 */}
        <div className="mt-4 rounded-2xl border border-indigo-500/15 bg-[#0f0f0f] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <span className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-[11px] font-semibold text-white">90% Match</span>
          </div>
          <div className="font-bold text-[18px] text-white mb-2 leading-tight">Strategy Analyst</div>
          <div className="text-[15px] text-zinc-300 font-medium mb-2">McKinsey</div>
          <div className="text-[13px] text-zinc-500 mb-4">📍 Paris</div>
          <div className="text-[14px] text-zinc-400 leading-relaxed mb-4">
            Work with McKinsey's European strategy practice on high-impact client projects. You'll analyze market trends, develop strategic recommendations, and present findings to senior leadership...
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Consulting</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">Office</span>
            <span className="inline-block rounded-full bg-indigo-500/15 px-3 py-1.5 text-[12px] font-semibold text-zinc-300">via Greenhouse</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Strategy Analyst at McKinsey"
            className="inline-block rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Apply now →
          </a>
        </div>

        {/* Upgrade CTA for free users - matches production */}
        <div className="mt-6 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10 p-6">
          <h3 className="text-[20px] font-bold text-white mb-3 leading-tight">Get More Matches for €5 Now</h3>
          <p className="text-[15px] text-zinc-300 mb-5 leading-relaxed">
            Upgrade to Premium and get <span className="font-semibold text-purple-300">15 jobs per week (~60 per month)</span> instead of 5. Cancel anytime.
          </p>
          <a
            href="#"
            aria-label="Upgrade to Premium"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium - €5/month
          </a>
        </div>

        {/* Feedback section - matches production */}
        <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/6 p-6">
          <h3 className="text-[18px] font-semibold text-white mb-3 leading-tight">💬 How were these matches?</h3>
          <p className="text-[15px] text-zinc-300 mb-5 leading-relaxed">
            Help us improve! Rate these roles to get better matches next time.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <a 
              href="#"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.3)] hover:opacity-90 transition-opacity"
              title="Loved it"
              aria-label="Rate matches: Loved it"
            >
              😍 Loved it
            </a>
            <a 
              href="#"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.3)] hover:opacity-90 transition-opacity"
              title="Good"
              aria-label="Rate matches: Good"
            >
              😊 Good
            </a>
            <a 
              href="#"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.3)] hover:opacity-90 transition-opacity"
              title="It's fine"
              aria-label="Rate matches: It's fine"
            >
              😐 It's fine
            </a>
            <a 
              href="#"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.3)] hover:opacity-90 transition-opacity"
              title="Not great"
              aria-label="Rate matches: Not great"
            >
              😕 Not great
            </a>
          </div>
          <a 
            href="#"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(99,102,241,0.3)] hover:opacity-90 transition-opacity"
            title="Not relevant"
            aria-label="Rate matches: Not relevant"
          >
            😞 Not relevant
          </a>
          <p className="text-[12px] text-zinc-500 mt-5 text-center">
            Takes 2 seconds • Helps us send better matches
          </p>
        </div>

        {/* Footer - matches production */}
        <div className="mt-6 pt-5 border-t border-indigo-500/12 text-center">
          <div className="text-purple-400 font-semibold text-[14px] mb-2">JobPing</div>
          <div className="text-[11px] text-zinc-400 mb-2">
            JobPing Ltd · 77 Camden Street Lower · Dublin D02 XE80 · Ireland
          </div>
          <div className="text-[12px] text-zinc-500 mb-2">
            <a href="#" className="text-indigo-400 hover:text-purple-400 transition-colors font-semibold">Unsubscribe</a> · 
            <a href="#" className="text-purple-400 hover:text-indigo-400 transition-colors font-semibold ml-1">Update Preferences</a>
          </div>
          <div className="text-[11px] text-zinc-500">
            You're receiving this because you created a JobPing account.
          </div>
        </div>
      </div>
    </div>
  );
}
