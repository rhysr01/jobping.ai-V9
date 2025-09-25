export default function PricingSection() {
  return (
    <section className="mx-auto max-w-[72rem] px-6 md:px-8 py-24 md:py-28">
      <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05] text-center">
        Choose your plan
      </h2>
      <p className="mt-4 text-[15px] md:text-base leading-7 md:leading-8 text-zinc-300 max-w-[65ch] mx-auto text-center">
        Start free and upgrade when you're ready for more opportunities.
      </p>
      
      <div className="grid md:grid-cols-2 gap-8 mt-16">
        {/* Free */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
          <h3 className="font-display text-xl font-semibold">Free</h3>
          <p className="mt-2 text-zinc-400">Perfect for getting started</p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-300">
            <li>• 5 job matches per day</li>
            <li>• Weekly delivery</li>
            <li>• Basic matching</li>
            <li>• Email support</li>
          </ul>
          <a 
            href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=pricing&utm_campaign=free"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-2xl px-5 py-3 border border-zinc-700 text-white hover:border-zinc-600 transition"
          >
            Get Started — Free
          </a>
        </div>
        
        {/* Premium */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 ring-1 ring-indigo-500/20 p-8 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-indigo-500 text-white text-xs px-3 py-1 rounded-full">Popular</span>
          </div>
          <h3 className="font-display text-xl font-semibold">Premium</h3>
          <p className="mt-2 text-zinc-400">For serious job seekers</p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-300">
            <li>• 15 job matches per day</li>
            <li>• Daily delivery</li>
            <li>• AI-powered matching</li>
            <li>• Priority support</li>
            <li>• Advanced filters</li>
          </ul>
          <a 
            href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=pricing&utm_campaign=premium"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-2xl px-5 py-3 bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition"
          >
            Upgrade to Premium
          </a>
        </div>
      </div>
    </section>
  );
}
