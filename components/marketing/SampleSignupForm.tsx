import React from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SIGNUP_INITIAL_ROLES } from "@/lib/productMetrics";

export default function SampleSignupForm() {
  return (
    <div className="mx-auto w-full max-w-[360px] px-4 py-6 text-[14px] leading-[1.5] text-zinc-100 font-sans bg-black">
      {/* Progress Indicator - exact match */}
      <div className="mb-6">
        <div className="flex justify-between mb-2 px-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-lg ${
                i === 1 ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' :
                'bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400'
              }`}>
                {i === 1 ? <BrandIcons.Check className="h-4 w-4" /> : i}
              </div>
              <span className="hidden text-[10px] font-bold text-zinc-300">
                {i === 1 ? 'Basics' : i === 2 ? 'Preferences' : i === 3 ? 'Career' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
          <div className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] w-1/4" />
        </div>
        <div className="text-[10px] text-zinc-400 text-center mt-1">
          25% complete
        </div>
      </div>

      {/* Form Container - glass-card styling */}
      <div className="rounded-xl border-2 border-white/20 p-4 shadow-[0_15px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl bg-white/[0.03]">
        <div className="space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-[18px] font-black text-white mb-1">Let's get started</h2>
            <p className="text-[13px] font-medium text-zinc-100">Tell us about yourself</p>
          </div>

          {/* GDPR Consent - exact match */}
          <div className="bg-gradient-to-r from-brand-500/15 via-purple-600/15 to-brand-500/15 border-2 border-brand-500/40 rounded-xl p-3 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
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

          {/* Continue button */}
          <button
            className="w-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-semibold py-3 rounded-xl text-[13px] shadow-[0_4px_16px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 mt-2"
          >
            Continue
            <BrandIcons.ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

