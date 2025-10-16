export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24 md:py-28 lg:py-36 scroll-mt-24">
      <div className="container-page">
        <h2 className="text-center font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight px-4">Five hand picked roles in every email. No dashboards. No scrolling marathons.</h2>
        <p className="mt-2 sm:mt-3 text-center p-muted text-sm sm:text-base px-4">Pick how often you want great roles.</p>
        <div className="mt-4 sm:mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Sign up today → Get your first 5 roles within 48 hours
          </div>
        </div>

        <div className="mt-8 sm:mt-10 grid gap-6 sm:gap-8 md:grid-cols-2 px-4">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold">Free</h3>
            <p className="mt-2 text-zinc-400 text-xs sm:text-sm">Perfect for starting your job search</p>
            <div className="mt-3 sm:mt-4 mb-4 sm:mb-6">
              <div className="text-3xl sm:text-4xl font-black text-white">5 jobs</div>
              <div className="text-zinc-500 text-xs sm:text-sm">per week</div>
            </div>
            <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 p-muted text-sm sm:text-base">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong className="text-white">5 roles on signup</strong> + 5 every week</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>AI-matched to your profile</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Deduplicated and quality-filtered</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Email support</span>
              </li>
            </ul>
            <a href="https://tally.so/r/mJEqx4?tier=free&source=pricing" target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 sm:mt-6 w-full text-center touch-manipulation">Get my 5 weekly roles</a>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/10 to-purple-600/5 p-6 sm:p-8 relative">
            <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block text-[10px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold shadow-lg">
                ⭐ Most Popular
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mt-2">Premium</h3>
            <p className="mt-2 text-zinc-400 text-xs sm:text-sm">3x more opportunities • First access to new roles</p>
            <div className="mt-3 sm:mt-4 mb-2">
              <div className="text-3xl sm:text-4xl font-black text-white">15 jobs</div>
              <div className="text-zinc-400 text-xs sm:text-sm font-semibold">per week (Mon • Wed • Fri)</div>
            </div>
            <div className="mt-2 mb-4 sm:mb-6">
              <span className="text-xl sm:text-2xl font-bold text-white">€7</span>
              <span className="text-zinc-500 text-xs sm:text-sm">/month</span>
              <span className="ml-2 sm:ml-3 text-xs sm:text-sm text-zinc-500">or €15/quarter</span>
            </div>
            <ul className="space-y-2 sm:space-y-3 p-muted text-sm sm:text-base">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong className="text-white">10 roles on signup</strong> + 15 per week</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong className="text-white">60+ jobs per month</strong> vs 20 on free tier</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong className="text-white">24-hour early access</strong> to fresh roles</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Hot match alerts (2/week for urgent roles)</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Advanced filters and preferences</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
            <a href="/upgrade" className="btn-primary mt-4 sm:mt-6 w-full text-center bg-gradient-to-r from-brand-500 to-purple-600 touch-manipulation">Get my 15 weekly roles</a>
            <p className="mt-2 sm:mt-3 text-center text-[10px] sm:text-xs text-zinc-500">
              Cancel anytime. No commitments.
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
