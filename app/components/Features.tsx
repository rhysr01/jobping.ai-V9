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
    <section id="features" className="py-16 md:py-20 bg-black scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0F0F0F] border border-[#1F1F1F] rounded-lg mb-4">
                <feature.icon className="w-5 h-5 text-[#CCCCCC]" />
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