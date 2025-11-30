import Image from "next/image";
import React from "react";

export default function SampleInterviewEmail() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-2 text-[14px] leading-[1.5] text-zinc-100 font-sans">
      {/* From + Subject block */}
      <div className="mt-2 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/branding/jobping-logo.svg" alt="JobPing logo" width={24} height={24} className="rounded" />
          <div className="font-semibold text-white">JobPing</div>
          <div className="text-zinc-400 text-[12px]">hello@getjobping.com</div>
        </div>
        <div className="mt-3 text-[17px] font-bold text-white leading-tight">
          Your 5 new matches are ready ✨
        </div>
        <div className="mt-2 text-[13px] text-zinc-400 font-medium">
          Every role below cleared your filters — location, career path, visa, and early-career fit.
        </div>
      </div>

      {/* Email card container */}
      <div className="rounded-xl border border-border-subtle bg-glass-subtle p-5 shadow-base backdrop-blur-sm">
        <p className="text-[14px] text-zinc-200 leading-relaxed mb-4">
          Hi <span className="font-semibold text-white">Alex</span>, here's what our matcher surfaced for you today. Every role below cleared the filters you set — location, career path, visa, and early-career fit.
        </p>
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
          Review the highlights, tap through to apply, and let us know if anything feels off — your feedback powers the next batch.
        </p>

        {/* Job 1 */}
        <div className="mt-5 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">85% Match</span>
          </div>
          <div className="font-bold text-[15px] text-white mb-1">Product Analyst</div>
          <div className="text-[14px] text-zinc-300 font-medium mb-2">Monzo</div>
          <div className="text-[13px] text-zinc-400 mb-3">📍 London</div>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Strategy & Business</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Hybrid</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">via Adzuna</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Product Analyst at Monzo"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Apply now →
          </a>
        </div>

        {/* Job 2 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-semibold text-orange-300 border border-orange-400/30">🔥 Hot Match 92%</span>
          </div>
          <div className="font-bold text-[15px] text-white mb-1">Data Associate</div>
          <div className="text-[14px] text-zinc-300 font-medium mb-2">N26</div>
          <div className="text-[13px] text-zinc-400 mb-3">📍 Berlin</div>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Tech & Engineering</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Remote</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">via Reed</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Data Associate at N26"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Apply now →
          </a>
        </div>

        {/* Job 3 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-300 border border-sky-400/30">88% Match</span>
          </div>
          <div className="font-bold text-[15px] text-white mb-1">Operations Intern</div>
          <div className="text-[14px] text-zinc-300 font-medium mb-2">Revolut</div>
          <div className="text-[13px] text-zinc-400 mb-3">📍 Dublin</div>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Operations</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Internship</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Operations Intern at Revolut"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Apply now →
          </a>
        </div>

        {/* Job 4 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-200 border border-brand-400/30">86% Match</span>
          </div>
          <div className="font-bold text-[15px] text-white mb-1">Marketing Intern</div>
          <div className="text-[14px] text-zinc-300 font-medium mb-2">Spotify</div>
          <div className="text-[13px] text-zinc-400 mb-3">📍 Stockholm</div>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Marketing</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Hybrid</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Marketing Intern at Spotify"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Apply now →
          </a>
        </div>

        {/* Job 5 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 border border-indigo-400/30">90% Match</span>
          </div>
          <div className="font-bold text-[15px] text-white mb-1">Strategy Analyst</div>
          <div className="text-[14px] text-zinc-300 font-medium mb-2">McKinsey</div>
          <div className="text-[13px] text-zinc-400 mb-3">📍 Paris</div>
          <div className="mt-2 mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Consulting</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">Office</span>
            <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 border border-brand-400/30">via Greenhouse</span>
          </div>
          <a
            href="#"
            aria-label="Apply now: Strategy Analyst at McKinsey"
            className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Apply now →
          </a>
        </div>

        {/* Upgrade CTA for free users */}
        <div className="mt-6 rounded-xl border-2 border-brand-500/30 bg-white/[0.06] p-5">
          <h3 className="text-[18px] font-bold text-white mb-2">Get More Matches for €5 Now</h3>
          <p className="text-[14px] text-zinc-300 mb-4 leading-relaxed">
            Upgrade to Premium and get <span className="font-semibold text-brand-200">15 jobs per week (~60 per month)</span> instead of 5. Cancel anytime.
          </p>
          <a
            href="#"
            aria-label="Upgrade to Premium"
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_2px_10px_rgba(126,97,255,0.25)] hover:bg-brand-600 hover:shadow-[0_4px_14px_rgba(110,87,245,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          >
            Upgrade to Premium - €5/month
          </a>
          <p className="text-[11px] text-zinc-500 mt-3 text-center">No commitment · Cancel anytime</p>
        </div>

        {/* Feedback section */}
        <div className="mt-6 rounded-xl border border-brand-500/20 bg-white/[0.06] p-5">
          <h3 className="text-[16px] font-semibold text-white mb-2">💬 How were these matches?</h3>
          <p className="text-[13px] text-zinc-300 mb-4 leading-relaxed">
            Help us improve! Rate these roles to get better matches next time.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="rounded-lg bg-brand-500/20 hover:bg-brand-500/30 px-3 py-2 text-[12px] font-semibold text-brand-200 border border-brand-400/30 transition-all">
              😍 Loved it
            </button>
            <button className="rounded-lg bg-brand-500/20 hover:bg-brand-500/30 px-3 py-2 text-[12px] font-semibold text-brand-200 border border-brand-400/30 transition-all">
              😊 Good
            </button>
            <button className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-2 text-[12px] font-semibold text-indigo-200 border border-indigo-400/30 transition-all">
              😐 It's fine
            </button>
            <button className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-2 text-[12px] font-semibold text-indigo-200 border border-indigo-400/30 transition-all">
              😕 Not great
            </button>
          </div>
          <button className="w-full rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-2 text-[12px] font-semibold text-indigo-200 border border-indigo-400/30 transition-all">
            😞 Not relevant
          </button>
          <p className="text-[11px] text-zinc-500 mt-3 text-center">Takes 2 seconds • Helps us send better matches</p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-zinc-800/50 text-[12px] text-zinc-400 leading-relaxed">
          You're receiving these recommendations based on your profile.<br />
          <a href="#" className="underline text-zinc-400 hover:text-brand-400 transition-colors">Unsubscribe</a> → <a href="#" className="underline text-zinc-400 hover:text-brand-400 transition-colors">Manage preferences</a>
        </div>
      </div>
    </div>
  );
}
