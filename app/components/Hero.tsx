export default function Hero() {
  return (
    <section className="bg-black py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center relative">
        <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight tracking-[-0.03em] mb-6">
          AI finds your perfect job matches—delivered daily
        </h1>
        
        <p className="text-lg text-[#888888] leading-7 mb-8 max-w-2xl mx-auto">
          Stop scrolling job boards. Get personalized opportunities from top companies delivered straight to your inbox.
        </p>
        
        <div className="mb-6">
          <span className="inline-block bg-[#111111] border border-[#1A1A1A] rounded-full px-4 py-2 text-sm text-[#CCCCCC]">
            ⚡ Start getting matches today
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#signup"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-black font-medium hover:bg-[#CCCCCC] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-1"
            data-testid="hero-cta-primary"
            data-analytics="cta_click"
            data-cta-type="primary"
            data-cta-location="hero"
          >
            Get My First Job Matches
          </a>
          <a
            href="#pricing"
            className="text-white hover:text-[#CCCCCC] font-medium transition-colors"
            data-testid="hero-cta-secondary"
            data-analytics="cta_click"
            data-cta-type="secondary"
            data-cta-location="hero"
          >
            View Pricing
          </a>
        </div>
      </div>
    </section>
  );
}