import LogoWordmark from './LogoWordmark';

export default function HeroMinimal() {
  return (
    <section className="relative isolate text-center py-20 md:py-24">
      <div className="mx-auto max-w-[80rem] px-6 md:px-8">
        <LogoWordmark />
        <p className="mt-6 text-xl md:text-2xl text-zinc-200 max-w-[60ch] mx-auto leading-8 md:leading-9 font-medium">
          Weekly job matches for early-career roles across Europe—delivered to your inbox.
        </p>
        <div className="mx-auto mt-5 h-[2px] w-28 rounded bg-gradient-to-r from-brand-500/70 to-transparent" />
        <a 
          href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=hero&utm_campaign=start"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-10 text-xl px-8 py-4"
        >
          Get 5 matches — Free
        </a>
      </div>

      {/* spotlight behind the wordmark */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10
        bg-[radial-gradient(70%_45%_at_50%_5%,rgba(99,102,241,0.18),transparent_60%)]" />
    </section>
  );
}
