export default function Hero() {
  return (
    <section className="bg-black py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center relative">
        <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight tracking-[-0.03em] mb-6">
          Personalised job matches daily in your inbox
        </h1>
        
        <p className="text-lg text-zinc-300 leading-7 mb-8 max-w-2xl mx-auto">
          No dashboards—just clean daily emails with early-career roles from top sources.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#signup"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-black font-medium hover:bg-zinc-100 transition-colors shadow-lg hover:shadow-xl"
            data-testid="hero-cta-primary"
            data-analytics="cta_click"
            data-cta-type="primary"
            data-cta-location="hero"
          >
            Get started free
          </a>
          <a
            href="#pricing"
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            data-testid="hero-cta-secondary"
            data-analytics="cta_click"
            data-cta-type="secondary"
            data-cta-location="hero"
          >
            Upgrade to Premium
          </a>
        </div>
      </div>
    </section>
  );
}