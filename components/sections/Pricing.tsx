export default function Pricing() {
  return (
    <section id="pricing" className="section-pad">
      <div className="container-page">
        <h2 className="text-center font-bold text-4xl md:text-5xl tracking-tight">Five hand picked roles in every email. No dashboards. No scrolling marathons.</h2>
        <p className="mt-3 text-center p-muted">Pick how often you want great roles.</p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
            <h3 className="text-2xl font-bold">Free plan. Weekly</h3>
            <ul className="mt-4 space-y-2 p-muted">
              <li>• Five roles on signup</li>
              <li>• One email per week with five roles</li>
              <li>• Curated and deduplicated</li>
              <li>• Email support</li>
            </ul>
            <a href="https://tally.so/r/mJEqx4?tier=free&source=pricing" className="btn-primary mt-6">Get my weekly 5</a>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 ring-1 ring-brand-500/20 p-8">
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-brand-500/15 text-brand-300">Popular</span>
            <h3 className="mt-2 text-2xl font-bold">Premium plan. Three times per week</h3>
            <p className="mt-1 p-muted"><strong>€7 per month</strong> or <strong>€15 quarterly</strong></p>
            <ul className="mt-4 space-y-2 p-muted">
              <li>• Five roles on signup</li>
              <li>• Delivery on Monday, Wednesday, and Friday with five roles each</li>
              <li>• Optional standout alerts with a maximum of two per week</li>
              <li>• Finer filters and priority support</li>
            </ul>
            <a href="/upgrade" className="btn-outline mt-6">Get 3 times weekly matches</a>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          No CV required. Unsubscribe anytime. GDPR friendly.
        </p>
      </div>
    </section>
  );
}
