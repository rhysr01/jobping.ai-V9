export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24 md:py-32 lg:py-40 scroll-mt-24">
      <div className="container-page">
        <h2 className="h2-section text-center px-4">Five hand-picked roles in every email. No dashboards. No scrolling marathons.</h2>
        <p className="mt-4 sm:mt-5 text-center p-muted text-base sm:text-lg md:text-xl px-4">Pick how often you want great roles.</p>
        <div className="mt-4 sm:mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Sign up today → 10 roles in 48 hours for free
          </div>
        </div>

        <div className="mt-10 sm:mt-12 grid gap-8 sm:gap-10 md:grid-cols-2 px-4 items-center">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-7 sm:p-9 opacity-90 hover:opacity-100 transition-opacity">
            <h3 className="text-xl sm:text-2xl font-bold">Free</h3>
            <p className="mt-2 text-zinc-400 text-xs sm:text-sm">Perfect for starting your job search</p>
            <div className="mt-3 sm:mt-4 mb-4 sm:mb-6">
              <div className="text-3xl sm:text-4xl font-black text-white">5 jobs</div>
              <div className="text-zinc-500 text-xs sm:text-sm">per week</div>
            </div>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 p-muted text-sm sm:text-base">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong className="text-white">10 roles on signup</strong> + 5 every week</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>AI-matched to your profile</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>No duplicates • Quality filtered</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Email support</span>
              </li>
            </ul>
            <a href="https://tally.so/r/mJEqx4?tier=free&source=pricing" target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4 sm:mt-6 w-full text-center touch-manipulation">Get My 5 Weekly Roles</a>
          </div>

          {/* Premium - MASSIVE EMPHASIS */}
          <div className="rounded-3xl border-4 border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/15 p-8 sm:p-10 relative shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:shadow-[0_0_100px_rgba(99,102,241,0.8)] transition-all duration-300 transform hover:scale-[1.02]">
            {/* HUGE Badge */}
            <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2">
              <span className="inline-block text-sm sm:text-base px-6 sm:px-8 py-2 sm:py-3 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-black shadow-[0_8px_24px_rgba(99,102,241,0.6)] animate-pulse uppercase tracking-wider">
                MOST POPULAR
              </span>
            </div>
            
            {/* Best Value Badge */}
            <div className="absolute -top-3 -right-3 sm:-right-4">
              <div className="bg-green-500 text-black text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg rotate-12 uppercase">
                Best Value
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black mt-4 bg-gradient-to-r from-brand-400 to-purple-500 bg-clip-text text-transparent">Premium</h3>
            <p className="mt-3 text-zinc-300 text-sm sm:text-base font-semibold">3x more opportunities • First access to new roles</p>
            
            <div className="mt-4 sm:mt-6 mb-3 bg-black/30 rounded-2xl p-4 sm:p-6 border border-brand-500/30">
              <div className="text-5xl sm:text-6xl md:text-7xl font-black bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">15 jobs</div>
              <div className="text-zinc-300 text-sm sm:text-base font-bold mt-1">per week (Mon • Wed • Fri)</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white">€7</span>
                <span className="text-zinc-400 text-base sm:text-lg font-semibold">/month</span>
              </div>
              <div className="mt-2 text-xs sm:text-sm text-zinc-400">
                or <span className="text-white font-bold">€15/quarter</span> <span className="ml-2 text-green-400 font-semibold">(save €6!)</span>
              </div>
            </div>

            <ul className="space-y-3 sm:space-y-4 p-muted text-sm sm:text-base">
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span><strong className="text-white text-base sm:text-lg">10 roles on signup</strong> + 15 per week (50% more!)</span>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span><strong className="text-white text-base sm:text-lg">60+ jobs per month</strong> vs 20 on free tier</span>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span><strong className="text-white text-base sm:text-lg">24-hour early access</strong> to fresh roles</span>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span className="text-white">Hot match alerts (2/week for urgent roles)</span>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span className="text-white">Advanced filters and preferences</span>
              </li>
              <li className="flex items-start gap-3 sm:gap-4">
                <span className="text-brand-400 mt-0.5 text-xl">✓</span>
                <span className="text-white">Priority support</span>
              </li>
            </ul>
            
            <a href="/upgrade" className="btn-primary mt-6 sm:mt-8 w-full text-center text-lg sm:text-xl py-5 sm:py-6 font-black shadow-[0_12px_40px_rgba(99,102,241,0.6)] hover:shadow-[0_16px_50px_rgba(99,102,241,0.9)] transform hover:scale-[1.03] transition-all duration-200 touch-manipulation uppercase tracking-wide">
              Get Premium Now
            </a>
            
            <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-zinc-400 font-semibold">
              Cancel anytime. No commitments. 30-day money-back guarantee.
            </p>
          </div>
        </div>

        <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-zinc-400 px-4">
          No CV required. Unsubscribe anytime. GDPR friendly.
        </p>
      </div>
    </section>
  );
}
