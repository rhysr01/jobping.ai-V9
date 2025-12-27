import React from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SIGNUP_INITIAL_ROLES } from "@/lib/productMetrics";

export default function SampleSignupForm() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 text-[14px] leading-[1.5] text-zinc-100 font-sans bg-black overflow-y-auto max-h-[600px] custom-scrollbar">
      {/* Progress Indicator - showing all steps completed */}
      <div className="mb-6">
        <div className="flex justify-between mb-2 px-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-lg bg-green-500 text-white shadow-green-500/30">
                <BrandIcons.Check className="h-4 w-4" />
              </div>
              <span className="hidden text-[10px] font-bold text-zinc-300">
                {i === 1 ? 'Basics' : i === 2 ? 'Preferences' : i === 3 ? 'Career' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
          <div className="h-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-500 shadow-[0_0_10px_rgba(109,90,143,0.3)] w-full" />
        </div>
        <div className="text-[10px] text-zinc-400 text-center mt-1">
          100% complete
        </div>
      </div>

      {/* Form Container - scrollable to show all steps */}
      <div className="space-y-6">
        {/* STEP 1: Basics */}
        <div className="rounded-xl border-2 border-white/20 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-white/[0.03]">
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-black text-white mb-1">Step 1: Let's get started</h2>
              <p className="text-[13px] font-medium text-zinc-100">Tell us about yourself</p>
            </div>

            {/* GDPR Consent */}
            <div className="bg-gradient-to-r from-brand-500/12 via-brand-600/12 to-brand-500/12 border-2 border-brand-500/30 rounded-xl p-3 shadow-[0_0_15px_rgba(109,90,143,0.15)]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="mt-0.5 w-4 h-4 rounded border-2 border-brand-500 bg-brand-500 cursor-default flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-white font-medium mb-1 text-[12px]">
                    I agree to receive job recommendations via email <span className="text-red-400">*</span>
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    By checking this box, you consent to receive personalized job matches and agree to our{' '}
                    <span className="text-brand-400 underline font-semibold">Privacy Policy</span>
                    {' '}and{' '}
                    <span className="text-brand-400 underline font-semibold">Terms of Service</span>
                    . You can unsubscribe at any time.
                  </p>
                </div>
              </label>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Full Name *</label>
              <input
                type="text"
                value="Alex Johnson"
                readOnly
                className="w-full px-3 py-2.5 bg-black/50 border-2 border-green-500/60 rounded-xl text-white text-[13px] placeholder-zinc-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] backdrop-blur-sm"
                placeholder="John Smith"
              />
              <p className="mt-1.5 text-[10px] text-green-400 flex items-center gap-1.5 font-medium">
                <BrandIcons.CheckCircle className="h-3 w-3 flex-shrink-0" />
                Looks good!
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1">Email *</label>
              <p className="text-[10px] font-medium text-zinc-300 mb-2">Get {SIGNUP_INITIAL_ROLES} jobs in your welcome email, then curated drops weekly.</p>
              <input
                type="email"
                value="alex@example.com"
                readOnly
                className="w-full px-3 py-2.5 bg-black/50 border-2 border-green-500/60 rounded-xl text-white text-[13px] placeholder-zinc-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] backdrop-blur-sm"
                placeholder="you@example.com"
              />
              <p className="mt-1.5 text-[10px] text-green-400 flex items-center gap-1.5 font-medium">
                <BrandIcons.CheckCircle className="h-3 w-3 flex-shrink-0" />
                Email looks good!
              </p>
            </div>

            {/* Cities */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Preferred Cities *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['London', 'Dublin', 'Amsterdam'].map(city => (
                  <span key={city} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {city}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-green-400 flex items-center gap-1.5 font-medium">
                <BrandIcons.CheckCircle className="h-3 w-3 flex-shrink-0" />
                3 cities selected
              </p>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Languages *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['English', 'French'].map(lang => (
                  <span key={lang} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {lang}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-green-400 flex items-center gap-1.5 font-medium">
                <BrandIcons.CheckCircle className="h-3 w-3 flex-shrink-0" />
                2 languages selected
              </p>
            </div>
          </div>
        </div>

        {/* STEP 2: Preferences */}
        <div className="rounded-xl border-2 border-white/20 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-white/[0.03]">
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-black text-white mb-1">Step 2: Your preferences</h2>
              <p className="text-[13px] font-medium text-zinc-100">Help us match you perfectly</p>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Target Start Date *</label>
              <input
                type="text"
                value="September 2024"
                readOnly
                className="w-full px-3 py-2.5 bg-black/50 border-2 border-green-500/60 rounded-xl text-white text-[13px] placeholder-zinc-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] backdrop-blur-sm"
              />
            </div>

            {/* Experience */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Professional Experience *</label>
              <div className="px-3 py-2.5 bg-black/50 border-2 border-green-500/60 rounded-xl text-white text-[13px]">
                0-1 years (Entry Level)
              </div>
            </div>

            {/* Work Environment */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Work Environment</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Remote', 'Hybrid'].map(env => (
                  <span key={env} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {env}
                  </span>
                ))}
              </div>
            </div>

            {/* Visa Status */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Work Authorization *</label>
              <div className="px-3 py-2.5 bg-black/50 border-2 border-green-500/60 rounded-xl text-white text-[13px]">
                EU citizen
              </div>
            </div>

            {/* Entry Level Preferences */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Entry Level Preference *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Internships', 'Graduate Programs'].map(pref => (
                  <span key={pref} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {pref}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: Career Path */}
        <div className="rounded-xl border-2 border-white/20 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-white/[0.03]">
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-black text-white mb-1">Step 3: Your career path</h2>
              <p className="text-[13px] font-medium text-zinc-100">What type of roles interest you?</p>
            </div>

            {/* Career Path */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Select Your Career Path *</label>
              <div className="px-3 py-2.5 bg-gradient-to-br from-brand-500/15 to-brand-600/12 border-2 border-brand-500 rounded-xl text-white text-[13px] font-medium">
                Strategy & Business Design
              </div>
            </div>

            {/* Roles */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Roles *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Business Analyst', 'Associate Consultant', 'Strategy Analyst'].map(role => (
                  <span key={role} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {role}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-400">+ 2 more roles selected</p>
            </div>
          </div>
        </div>

        {/* STEP 4: Optional Preferences */}
        <div className="rounded-xl border-2 border-white/20 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-white/[0.03]">
          <div className="space-y-5">
            <div>
              <h2 className="text-[18px] font-black text-white mb-1">Step 4: Additional Preferences</h2>
              <p className="text-[13px] font-medium text-zinc-100">Optional - helps us match you even better</p>
            </div>

            {/* Industries */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Industry Preferences</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Technology', 'Consulting', 'Finance'].map(industry => (
                  <span key={industry} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {industry}
                  </span>
                ))}
              </div>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Company Size Preference</label>
              <div className="px-3 py-2.5 bg-black/50 border-2 border-zinc-700 rounded-xl text-white text-[13px]">
                Scale-up (50-500)
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-[12px] font-bold text-white mb-1.5">Skills</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Excel', 'PowerPoint', 'Data Analysis'].map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-brand-500/20 border border-brand-500/40 rounded-lg text-[11px] font-medium text-brand-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold py-3 rounded-xl text-[13px] shadow-[0_4px_16px_rgba(109,90,143,0.3)] flex items-center justify-center gap-2 mt-2"
            >
              Complete Signup
              <BrandIcons.Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

