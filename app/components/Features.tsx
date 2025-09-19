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
    <section id="features" className="section-spacing bg-black scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="relative group mb-4 inline-block">
                <div className="absolute inset-0 bg-white/[0.02] rounded-xl blur-xl group-hover:bg-white/[0.04] transition duration-300" />
                <div className="relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-xl group-hover:border-white/20 transition-all duration-200">
                  <feature.icon className="w-6 h-6 text-white/70 group-hover:text-white/90 transition-colors" />
                </div>
              </div>
              <h3 className="text-[#BBBBBB] font-light text-base mb-2 leading-tight">
                {feature.title}
              </h3>
              <p className="text-[#777777] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}