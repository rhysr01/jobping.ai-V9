export default function HeroMinimal() {
  return (
    <section className="relative isolate py-28 md:py-40 text-center">
      <div className="mx-auto max-w-[72rem] px-6 md:px-8">
        <h1 className="font-display text-6xl md:text-7xl font-semibold tracking-tight leading-[1.03]">
          JobPing
        </h1>
        <p className="mt-5 text-base md:text-lg text-zinc-300 max-w-[65ch] mx-auto">
          Weekly job matches for early-career roles across Europe—delivered to your inbox.
        </p>
      </div>

      {/* subtle ambient glow, no copy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_10%,rgba(80,72,255,0.12),transparent_60%)]"
      />
    </section>
  );
}
