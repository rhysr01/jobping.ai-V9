import LogoWordmark from "@/components/LogoWordmark";

export default function Hero() {
  return (
    <section className="relative isolate text-center section-pad">
      <div className="container-page">
        <LogoWordmark />
        <p className="mt-4 text-lg md:text-xl p-muted max-w-[60ch] mx-auto leading-7 md:leading-8">
          Weekly early-career matches across Europe—straight to your inbox.
        </p>
      </div>

      {/* spotlight behind the wordmark (subtle, consistent) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
                   bg-[radial-gradient(70%_45%_at_50%_5%,rgba(99,102,241,0.18),transparent_60%)]"
      />
    </section>
  );
}
