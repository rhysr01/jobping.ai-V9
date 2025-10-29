import Image from "next/image";
import React from "react";

export default function SampleInterviewEmail() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-4 text-[14px] leading-[1.45] text-zinc-100 font-sans">
      {/* From + Subject block (like a real client) */}
      <div className="mt-2 mb-3">
        <div className="flex items-center gap-2">
          <Image src="/branding/jobping-logo.svg" alt="" width={20} height={20} />
          <div className="font-medium">JobPing</div>
          <div className="text-zinc-500">· hello@getjobping.com</div>
        </div>
        <div className="mt-2 text-[16px] font-bold">
          Your matches this week — 3 roles picked for you
        </div>
        <div className="mt-1 text-[13px] text-zinc-400">
          London, Berlin, Dublin — early‑career roles based on your profile
        </div>
      </div>

      {/* Email card container */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_1px_2px_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.35)]">
        <p className="text-[14px] text-zinc-200">
          Hi <span className="font-medium">Alex</span>,<br />
          We found three roles that closely match your degree, skills, and location preferences.  
          Reply to this email if you want intros — or apply directly below.
        </p>

        {/* Job 1 */}
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Product Analyst · Monzo</div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-[2px] text-[12px] text-emerald-300 border border-emerald-400/20">London</span>
          </div>
          <div className="mt-1 text-[13px] text-zinc-400">SQL · Python · Experimentation · Early-career</div>
          <a
            href="#"
            aria-label="View role: Product Analyst at Monzo in London"
            className="mt-2 inline-block rounded-md bg-gradient-to-r from-[#9A6AFF] to-[#6B4EFF] px-3 py-2 text-[13px] font-semibold shadow-[0_2px_10px_rgba(154,106,255,0.25)] hover:shadow-[0_4px_14px_rgba(154,106,255,0.35)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            View role
          </a>
        </div>

        {/* Job 2 */}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Data Associate · N26</div>
            <span className="rounded-full bg-sky-500/10 px-2 py-[2px] text-[12px] text-sky-300 border border-sky-400/20">Berlin</span>
          </div>
          <div className="mt-1 text-[13px] text-zinc-400">Excel · BI · Entry-level · Visa support</div>
          <a
            href="#"
            aria-label="View role: Data Associate at N26 in Berlin"
            className="mt-2 inline-block rounded-md bg-white/10 px-3 py-2 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            View role
          </a>
        </div>

        {/* Job 3 */}
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Operations Intern · Revolut</div>
            <span className="rounded-full bg-fuchsia-500/10 px-2 py-[2px] text-[12px] text-fuchsia-300 border border-fuchsia-400/20">Dublin</span>
          </div>
          <div className="mt-1 text-[13px] text-zinc-400">Ops · Customer Experience · 6-month paid</div>
          <a
            href="#"
            aria-label="View role: Operations Intern at Revolut in Dublin"
            className="mt-2 inline-block rounded-md bg-white/10 px-3 py-2 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            View role
          </a>
        </div>

        {/* CTA */}
        <a
          href="#"
          aria-label="Find my matches"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#9A6AFF] to-[#6B4EFF] px-4 py-3 text-[14px] font-bold shadow-[0_2px_10px_rgba(154,106,255,0.25)] hover:shadow-[0_4px_14px_rgba(154,106,255,0.35)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          Find my matches
        </a>

        {/* Footer */}
        <div className="mt-4 text-[12px] text-zinc-500">
          You’re receiving these recommendations based on your profile.  
          <a href="#" className="underline">Unsubscribe</a> · <a href="#" className="underline">Manage preferences</a>
        </div>
      </div>
    </div>
  );
}
