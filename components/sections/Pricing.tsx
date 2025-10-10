export default function Pricing() {
  return (
    <section id="pricing" className="py-28 md:py-36">
      <div className="container-page">
        <h2 className="text-center font-bold text-4xl md:text-5xl tracking-tight">Five hand picked roles in every email. No dashboards. No scrolling marathons.</h2>
        <p className="mt-3 text-center p-muted">Pick how often you want great roles.</p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
            <h3 className="text-2xl font-bold">Free</h3>
            <p className="mt-2 text-zinc-400 text-sm">Perfect for starting your job search</p>
            <div className="mt-4 mb-6">
              <div className="text-4xl font-black text-white">5 jobs</div>
              <div className="text-zinc-500 text-sm">per week</div>
            </div>
            <ul className="mt-4 space-y-3 p-muted">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong className="text-white">5 curated roles</strong> every week</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>AI-matched to your profile</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Deduplicated and quality-filtered</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Email support</span>
              </li>
            </ul>
            <a href="https://tally.so/r/mJEqx4?tier=free&source=pricing" className="btn-primary mt-6 w-full text-center">Start free</a>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/10 to-purple-600/5 p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-block text-xs px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold shadow-lg">
                ⭐ Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-bold mt-2">Premium</h3>
            <p className="mt-2 text-zinc-400 text-sm">3x more opportunities, 3x faster results</p>
            <div className="mt-4 mb-2">
              <div className="text-4xl font-black text-white">15 jobs</div>
              <div className="text-zinc-400 text-sm font-semibold">per week (Mon • Wed • Fri)</div>
            </div>
            <div className="mt-2 mb-6">
              <span className="text-2xl font-bold text-white">€7</span>
              <span className="text-zinc-500 text-sm">/month</span>
              <span className="ml-3 text-sm text-zinc-500">or €15/quarter</span>
            </div>
            <ul className="space-y-3 p-muted">
              <li className="flex items-start gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong className="text-white">15 curated roles per week</strong> (5 on Mon, 5 on Wed, 5 on Fri)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span><strong className="text-white">3x more job opportunities</strong> than free tier</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Hot match alerts (max 2/week for urgent roles)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Advanced filters and preferences</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-brand-400 mt-0.5">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
            <a href="/upgrade" className="btn-primary mt-6 w-full text-center bg-gradient-to-r from-brand-500 to-purple-600">Upgrade to Premium</a>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Cancel anytime. No commitments.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          No CV required. Unsubscribe anytime. GDPR friendly.
        </p>
      </div>
    </section>
  );
}
