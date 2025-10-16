export default function FinalCTA() {
  const tallyUrl = 'https://tally.so/r/mJEqx4?tier=free&source=finalcta';

  return (
    <section className="section-pad">
      <div className="container-page">
        <div className="text-center mb-8 sm:mb-12 px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Personalised for you in your inbox weekly</h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-zinc-300">Here's exactly what you'll receive:</p>
        </div>

        {/* Real email preview with actual jobs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_60px_rgba(99,102,241,0.15)]">
            
            {/* Purple gradient header - EXACT match */}
            <div className="relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)',
              padding: '32px 20px'
            }}>
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1), transparent 50%)',
                pointerEvents: 'none'
              }}></div>
              <div className="relative z-10 text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1" style={{
                  letterSpacing: '-1px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}>
                  🎯 JobPing
                </div>
                <div className="text-[10px] sm:text-xs text-white/95 font-semibold uppercase tracking-wider">
                  AI-Powered Job Matching for Europe
                </div>
              </div>
            </div>

            {/* Email content */}
            <div className="p-4 sm:p-6 md:p-8 bg-black">
              {/* Greeting */}
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">5 perfect matches just dropped</h3>
                <p className="text-zinc-400 text-xs sm:text-sm">We found roles that actually match you—no generic spam, just quality.</p>
              </div>

              {/* Hot Match Job Card */}
              <div className="mb-4 sm:mb-6 p-4 sm:p-6 md:p-7 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-br from-brand-500/8 to-purple-600/5 shadow-[0_8px_32px_rgba(99,102,241,0.25)]">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-[10px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg mb-3 sm:mb-4 shadow-[0_4px_12px_rgba(139,92,246,0.4)]">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></span>
                  Hot Match • 92% Match
                </div>
                <div className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">Investment Banking Analyst Intern – Financial Sponsors Group</div>
                <div className="text-zinc-300 font-semibold text-sm sm:text-base mb-1 sm:mb-2">Guggenheim Partners</div>
                <div className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">London, England</div>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                  Guggenheim Partners is a global investment and advisory firm with a track record of delivering results through innovative solutions. Join our Financial Sponsors Group for a 6-month internship starting January 2026.
                </p>
                <p className="text-zinc-600 text-[10px] sm:text-xs italic mb-3 sm:mb-4">Based on your preference for Finance roles in London</p>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Application Link</p>
                  <p className="text-[10px] sm:text-xs text-brand-400 font-mono break-all bg-black/40 p-2 sm:p-2.5 rounded-lg border border-brand-500/15">
                    https://uk.indeed.com/viewjob?jk=e35ae28b179f6b06
                  </p>
                  <p className="mt-2 text-[10px] text-zinc-500">Copy and paste this link into your browser to apply</p>
                </div>
              </div>

              {/* Regular Job Card */}
              <div className="mb-4 sm:mb-6 p-4 sm:p-6 md:p-7 rounded-2xl border border-brand-500/20 bg-[#111111] shadow-[0_4px_20px_rgba(99,102,241,0.15)]">
                <div className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">Graduate Trainee - Finance</div>
                <div className="text-zinc-300 font-semibold text-sm sm:text-base mb-1 sm:mb-2">NatWest Group</div>
                <div className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">London, England</div>
                <div className="mb-3 sm:mb-4">
                  <span className="inline-block bg-gradient-to-r from-brand-500 to-purple-600 text-white text-[10px] sm:text-xs font-bold px-3 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                    88% Match
                  </span>
                </div>
                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                  Join NatWest Group&apos;s Finance Graduate Programme. Gain hands-on experience across financial planning, analysis, and reporting while building your career at one of the UK&apos;s leading banks.
                </p>
                <p className="text-zinc-600 text-[10px] sm:text-xs italic mb-3 sm:mb-4">Based on your preference for Finance roles in London</p>
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Application Link</p>
                  <p className="text-[10px] sm:text-xs text-brand-400 font-mono break-all bg-black/40 p-2 sm:p-2.5 rounded-lg border border-brand-500/15">
                    https://www.linkedin.com/jobs/view/4313740922
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
            <div className="bg-[#0a0a0a]/80 border-t border-brand-500/15 p-4 sm:p-6 text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-500 mb-1">JobPing</div>
              <p className="text-[10px] sm:text-xs text-zinc-600">AI-powered job matching for Europe</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
