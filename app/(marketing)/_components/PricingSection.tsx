export default function PricingSection() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24">
      <h2 className="font-bold text-4xl md:text-5xl tracking-tight text-center">Choose your plan</h2>
      <p className="mt-4 text-lg text-zinc-200 text-center font-medium">5 instant matches now, then weekly deliveries.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-8">
        {/* Free */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
          <h3 className="font-bold text-2xl">Free</h3>
          <p className="mt-3 text-lg text-zinc-200 font-medium">Perfect for getting started</p>
          <ul className="mt-6 space-y-3 text-base text-zinc-200 font-medium">
            <li>• 5 instant matches on signup</li>
            <li>• 5 jobs per week</li>
            <li>• Weekly email delivery</li>
            <li>• Basic matching algorithm</li>
            <li>• Email support</li>
          </ul>
          <a 
            href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=pricing&utm_campaign=free"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-2xl px-6 py-3.5 text-lg font-bold
                       border border-white/15 text-white
                       hover:border-brand-500/40 hover:-translate-y-0.5
                       focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          >
            Get Started — Free
          </a>
        </div>
        
        {/* Premium */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 ring-1 ring-indigo-500/20 p-8">
          <span className="inline-block text-xs px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300">Popular</span>
          <h3 className="font-bold text-2xl mt-2">Premium</h3>
          <p className="mt-3 text-lg text-zinc-200 font-medium">For serious job seekers</p>
          <ul className="mt-6 space-y-3 text-base text-zinc-200 font-medium">
            <li>• 5 instant matches on signup</li>
            <li>• 15 jobs per week</li>
            <li>• Weekly email delivery</li>
            <li>• AI-powered matching</li>
            <li>• Priority support</li>
            <li>• Advanced filters</li>
          </ul>
          <a 
            href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=pricing&utm_campaign=premium"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-6 text-xl px-8 py-4"
          >
            Upgrade to Premium
          </a>
        </div>
      </div>
    </section>
  );
}
