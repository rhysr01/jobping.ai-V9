export default function FinalCTA() {
  const tallyUrl = 'https://tally.so/r/mJEqx4?tier=free&source=finalcta';

  return (
    <section className="section-pad">
      <div className="container-page">
        <div className="glass-card rounded-2xl p-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Stop the scroll</h2>
          <p className="mt-4 text-lg text-zinc-300">Join students who receive five high fit roles each week.</p>
          <div className="mt-6 flex justify-center">
            <a 
              href={tallyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Start with 5 free roles
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-400">No CV required. Unsubscribe anytime. GDPR friendly.</p>
        </div>
      </div>
    </section>
  );
}
