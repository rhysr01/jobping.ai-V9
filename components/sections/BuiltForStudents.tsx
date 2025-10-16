export default function BuiltForStudents() {
  const features = [
    { 
      num: 1, 
      title: "Your profile drives everything", 
      body: "Matches based on your location, visa status, and interests. Zero generic spam.",
      stats: "Smart matching = Zero wasted time"
    },
    { 
      num: 2, 
      title: "EU and UK coverage", 
      body: "We pull from major job boards and directly from company pages across European markets.",
      stats: "15+ cities · 5 job boards · Daily updates"
    },
    { 
      num: 3, 
      title: "AI that learns from you", 
      body: "Rate each job match. Our AI gets smarter with every click, delivering better matches over time.",
      stats: "🧠 Smarter matches with each feedback"
    },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center px-4">We search 1,000+ companies daily. You review 5 weekly.</h2>

        <div className="mt-8 sm:mt-10 grid gap-6 sm:gap-8 md:grid-cols-3 md:gap-12">
          {features.filter(feature => feature && feature.title).map((feature) => (
            <div key={feature.num} className="glass-card rounded-2xl p-6 sm:p-8 md:p-10 interactive-hover relative overflow-hidden">
              <div className="number-chip">{feature.num}</div>
              <h3 className="mt-4 text-lg sm:text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 p-muted text-sm sm:text-base">{feature.body}</p>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs sm:text-sm font-semibold text-brand-400">{feature.stats}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
