"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import GlassCard from "@/components/ui/GlassCard";

export default function BuiltForStudents() {
  const features = [
    { 
      num: 1, 
      title: "Learns what you love, filters what you don't", 
      body: "Matches based on your location, visa status, and interests. Zero generic spam.",
      stats: "Real matching = Zero wasted time"
    },
    { 
      num: 2, 
      title: "EU and UK coverage", 
      body: "We pull from major job boards and directly from company pages across European markets.",
      stats: "15+ cities → 5 job boards → Daily updates"
    },
    { 
      num: 3, 
      title: "Gets better with every click", 
      body: "Rate each job match. We learn your preferences and deliver better matches over time.",
      stats: "Better matches with each feedback"
    },
  ];

  return (
    <section className="section-padding">
      <div className="container-page container-rhythm">
        <SectionHeader
          title="Understands your degree, experience, and goals → instantly."
        />

        <div className="mt-10 sm:mt-12 grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-14">
          {features.filter(feature => feature && feature.title).map((feature, index) => (
            <GlassCard
              key={feature.num}
              variant="subtle"
              hover="lift"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.15,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="p-8 sm:p-10 md:p-12 relative overflow-hidden"
            >
              <div className="number-chip">{feature.num}</div>
              <h3 className="mt-6 text-heading text-white">{feature.title}</h3>
              <p className="mt-3 text-lg text-neutral-300 leading-relaxed font-medium">{feature.body}</p>
              <div className="mt-6 pt-5 border-t border-zinc-700/50">
                <p className="text-small font-bold text-brand-400">{feature.stats}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
