export default function Hero() {
  return (
    <section className="bg-black py-20 md:py-24 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent pointer-events-none"></div>
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 text-center relative">
        <div className="mb-6 md:mb-8">
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white leading-[0.9] tracking-[-0.04em] mb-4">
            JobPing
          </h1>
          <div className="text-xl md:text-2xl text-[#CCCCCC] font-light tracking-wide">
            Graduate jobs that don't suck
          </div>
        </div>
        
        <p className="text-base text-[#999999] leading-relaxed mb-8 max-w-sm mx-auto">
          5 jobs. Every 48 hours. No spam.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#signup"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-black font-medium text-sm hover:bg-[#F8F8F8] transition-colors duration-150"
            data-testid="hero-cta-primary"
            data-analytics="cta_click"
            data-cta-type="primary"
            data-cta-location="hero"
          >
            Find My Dream Job
          </a>
          <a
            href="#pricing"
            className="text-[#999999] hover:text-[#CCCCCC] font-normal text-sm transition-colors duration-150"
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