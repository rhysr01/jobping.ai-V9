import Image from "next/image";
import React from "react";

export default function SampleInterviewEmail() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-2 text-[14px] leading-[1.5] text-zinc-100 font-sans">
      {/* From + Subject block */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/branding/jobping-logo.svg" alt="JobPing logo" width={24} height={24} className="rounded" />
          <div className="font-semibold text-white">JobPing</div>
          <div className="text-zinc-500 text-[12px]">hello@getjobping.com</div>
        </div>
        <div className="mt-3 text-[17px] font-bold text-white leading-tight">
          Your matches this week → 3 roles picked for you
        </div>
        <div className="mt-2 text-[13px] text-zinc-400 font-medium">
          London, Berlin, Dublin → early‑career roles based on your profile
        </div>
      </div>

      {/* Email card container */}
      <div className="rounded-xl border border-border-subtle bg-glass-subtle p-5 shadow-base backdrop-blur-sm">
        <p className="text-[14px] text-zinc-200 leading-relaxed mb-6">
          Hi <span className="font-semibold text-white">Alex</span>,<br />
          <span className="mt-2 block">We found three roles that closely match your degree, skills, and location preferences. Reply to this email if you want intros → or apply directly below.</span>
        </p>

        {/* Job 1 */}
        <div className="mt-5 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[15px] text-white">Product Analyst → Monzo</div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">London</span>
          </div>
          <div className="mt-2 text-[13px] text-zinc-400 font-medium">SQL → Python → Experimentation → Early-career</div>
          <a
            href="#"
            aria-label="View role: Product Analyst at Monzo in London"
            className="mt-3 inline-block rounded-lg bg-gradient-to-r from-[#9A6AFF] to-[#6B4EFF] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(154,106,255,0.25)] hover:shadow-[0_4px_14px_rgba(154,106,255,0.35)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          >
            View role
          </a>
        </div>

        {/* Job 2 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[15px] text-white">Data Associate → N26</div>
            <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-300 border border-sky-400/30">Berlin</span>
          </div>
          <div className="mt-2 text-[13px] text-zinc-400 font-medium">Excel → BI → Entry-level → Visa support</div>
          <a
            href="#"
            aria-label="View role: Data Associate at N26 in Berlin"
            className="mt-3 inline-block rounded-lg bg-white/10 hover:bg-white/15 px-4 py-2.5 text-[13px] font-semibold text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          >
            View role
          </a>
        </div>

        {/* Job 3 */}
        <div className="mt-4 rounded-lg border border-border-subtle bg-glass-subtle p-4 shadow-base backdrop-blur-sm hover:border-border-default transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[15px] text-white">Operations Intern → Revolut</div>
            <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-300 border border-fuchsia-400/30">Dublin</span>
          </div>
          <div className="mt-2 text-[13px] text-zinc-400 font-medium">Ops → Customer Experience → 6-month paid</div>
          <a
            href="#"
            aria-label="View role: Operations Intern at Revolut in Dublin"
            className="mt-3 inline-block rounded-lg bg-white/10 hover:bg-white/15 px-4 py-2.5 text-[13px] font-semibold text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          >
            View role
          </a>
        </div>

        {/* CTA */}
        <a
          href="#"
          aria-label="Find my matches"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#9A6AFF] to-[#6B4EFF] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_2px_10px_rgba(154,106,255,0.25)] hover:shadow-[0_4px_14px_rgba(154,106,255,0.35)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        >
          Find my matches
        </a>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-zinc-800/50 text-[12px] text-zinc-500 leading-relaxed">
          You're receiving these recommendations based on your profile.<br />
          <a href="#" className="underline text-zinc-400 hover:text-purple-400 transition-colors">Unsubscribe</a> → <a href="#" className="underline text-zinc-400 hover:text-purple-400 transition-colors">Manage preferences</a>
        </div>
      </div>
    </div>
  );
}
