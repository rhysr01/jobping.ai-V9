import { Search, Mail, Target } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Search,
      title: "Curated",
      description: "Hand-picked from hundreds of sources."
    },
    {
      icon: Mail,
      title: "Delivered",
      description: "Clean emails. No dashboards."
    },
    {
      icon: Target,
      title: "Graduate-focused",
      description: "Entry-level and junior roles only."
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
      <div className="text-center spacing-section-header">
        <h2 className="text-4xl font-bold text-white spacing-medium">Why JobPing Works</h2>
        <p className="text-xl text-[#808080]">Three simple reasons why graduates choose us</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
        {features.map((feature, index) => (
          <div key={index} className="text-center group">
            <div className="relative spacing-large">
              <div className="absolute inset-0 bg-white/[0.02] rounded-xl blur-xl group-hover:bg-white/[0.04] transition duration-300" />
              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-xl group-hover:border-white/20 transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-105">
                <feature.icon className="w-7 h-7 text-white/70 group-hover:text-white/90 transition-colors" />
              </div>
            </div>
            <h3 className="text-white font-semibold text-xl spacing-small leading-tight tracking-tight">
              {feature.title}
            </h3>
            <p className="text-[#808080] text-base leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}