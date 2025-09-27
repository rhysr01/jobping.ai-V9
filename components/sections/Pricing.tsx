export default function Pricing() {
  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center">Choose your plan</h2>
        <p className="mt-2 text-center p-muted">
          5 hand-picked roles per email. No job-board blasts.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
            <h3 className="text-xl font-semibold">Free — Weekly digest</h3>
            <ul className="mt-4 space-y-2 p-muted">
              <li>• 5 roles on signup</li>
              <li>• 1 email each week (5 roles)</li>
              <li>• Same time every week</li>
              <li>• Curated, de-duped</li>
              <li>• Email support</li>
            </ul>
            <a href="/start" className="btn-primary mt-6">Get 5 matches — Free</a>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 ring-1 ring-brand-500/20 p-8">
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-brand-500/15 text-brand-300">
              Popular
            </span>
            <h3 className="mt-2 text-xl font-semibold">Premium — 3× weekly</h3>
            <p className="mt-1 p-muted"><strong>€7/mo</strong> · Annual €59 (save €25)</p>
            <ul className="mt-4 space-y-2 p-muted">
              <li>• 5 roles on signup</li>
              <li>• Mon / Wed / Fri delivery (5 roles each)</li>
              <li>• Optional standout alerts (max 2/wk)</li>
              <li>• Finer filters</li>
              <li>• Priority support</li>
            </ul>
            <a href="/upgrade" className="btn-outline mt-6">Upgrade to Premium</a>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          No CV required · Unsubscribe anytime · GDPR-friendly
        </p>
      </div>
    </section>
  );
}
