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
      stats: "Smarter matches with each feedback"
    },
  ];

  return (
    <section className="section-padding">
      <div className="container-page container-rhythm">
        <h2 className="text-heading text-center text-white text-balance">We search 1,000+ companies daily. You get hand-picked matches weekly.</h2>

        <div className="mt-10 sm:mt-12 grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-14">
          {features.filter(feature => feature && feature.title).map((feature) => (
            <div key={feature.num} className="surface-raised rounded-2xl p-8 sm:p-10 md:p-12 interactive-lift relative overflow-hidden">
              <div className="number-chip">{feature.num}</div>
              <h3 className="mt-6 text-heading text-white">{feature.title}</h3>
              <p className="mt-3 text-body text-neutral-400 leading-relaxed">{feature.body}</p>
              <div className="mt-6 pt-5 border-t border-zinc-700/50">
                <p className="text-small font-bold text-brand-400">{feature.stats}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
