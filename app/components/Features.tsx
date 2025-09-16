import { Search, Mail, Target } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Search,
      title: "Daily curation",
      description: "We scan top sources + company pages."
    },
    {
      icon: Mail,
      title: "Email delivery only",
      description: "No dashboards, just clean daily emails."
    },
    {
      icon: Target,
      title: "Early-career focus",
      description: "Internships, grad & junior roles."
    }
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-black scroll-mt-20 md:scroll-mt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-left md:text-center space-y-3">
              <feature.icon className="w-5 h-5 text-white mb-4 inline-block" />
              <h3 className="text-white font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-[#888888] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}