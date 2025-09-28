export default function FinalCTA() {
  return (
    <section className="section-pad">
      <div className="container-page">
        <div className="glass-card rounded-2xl p-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Ready to stop endless scrolling?</h2>
          <p className="mt-4 text-lg text-zinc-300">Join 500+ students who get their weekly dose of hand-picked opportunities.</p>
          <div className="mt-6 flex justify-center">
            <a href="#signup" className="btn-primary">Get your first 5 matches free</a>
          </div>
          <p className="mt-4 text-sm text-zinc-400">No CV required • Unsubscribe anytime • GDPR-friendly</p>
        </div>

        {/* Embed form below with its own scroll area */}
        <div id="signup" className="mt-10 rounded-2xl overflow-hidden border border-white/10">
          <iframe
            src="https://tally.so/r/mJEqx4?jobping=landing"
            title="JobPing Signup"
            className="w-full h-[760px] bg-black"
          />
        </div>
      </div>
    </section>
  );
}
