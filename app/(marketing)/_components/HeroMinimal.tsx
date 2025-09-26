export default function HeroMinimal() {
  return (
    <section className="relative isolate py-20 md:py-28 text-center">
      <div className="mx-auto max-w-[80rem] px-6 md:px-8">
        <h1 className="font-semibold text-7xl md:text-8xl tracking-tight leading-[1.02]
                       bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent">
          JobPing
        </h1>

        <p className="mt-3 text-lg md:text-xl text-zinc-300 max-w-[60ch] mx-auto
                      leading-7 md:leading-8 [text-wrap:balance]">
          Weekly job matches for early-career roles across Europe—delivered to your inbox.
        </p>

        <div className="mx-auto mt-6 h-[2px] w-24 rounded bg-gradient-to-r from-brand-500/70 to-transparent" />

        <a 
          href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=hero&utm_campaign=start"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-8"
        >
          Get 5 matches — Free
        </a>
      </div>

      {/* one soft glow, lighter than before */}
      <div 
        aria-hidden 
        className="pointer-events-none absolute inset-0
                   bg-[radial-gradient(80%_55%_at_50%_0%,rgba(80,72,255,0.10),transparent_60%)]" 
      />
    </section>
  );
}
