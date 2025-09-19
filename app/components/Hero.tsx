export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.02) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02) 0%, transparent 50%)`
          }}
        />
      </div>

      {/* Floating elements for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-[10%] w-64 h-32 bg-white/[0.02] rounded-lg rotate-12 blur-xl" />
        <div className="absolute bottom-1/3 right-[15%] w-48 h-24 bg-white/[0.02] rounded-lg -rotate-6 blur-xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tight bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
          JobPing
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          Graduate jobs that don't suck
        </h2>
        <p className="text-xl text-[#a0a0a0] mb-8">
          5 jobs. Every 48 hours. No spam.
        </p>

        <div className="flex gap-4 justify-center">
          <a href="#signup" className="btn-primary px-9 py-3.5 hover:scale-[1.02]">
            Find My Dream Job
          </a>
          <a href="#pricing" className="btn-secondary px-9 py-3.5">
            View Pricing
          </a>
        </div>
      </div>
    </section>
  );
}