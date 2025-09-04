'use client';

import { motion } from 'framer-motion';
import { 
  Brain, Globe, GraduationCap, Clock, 
  Network, Mail, Target, Shield 
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Brain,
      title: "Advanced AI Matching",
      description: "GPT-4 powered algorithm analyzes 50+ data points to find your perfect job matches with 90%+ accuracy.",
      highlight: "50+ data points analyzed"
    },
    {
      icon: Network,
      title: "2,800+ Job Sources",
      description: "Comprehensive scanning of Greenhouse, Lever, Workday, and thousands of other sources for hidden opportunities.",
      highlight: "Hidden job discovery"
    },
    {
      icon: Globe,
      title: "Visa-Friendly Filtering",
      description: "Automatically filters jobs based on visa status and work authorization requirements across 27 countries.",
      highlight: "27 countries supported"
    },
    {
      icon: Clock,
      title: "Ultra-Fresh Opportunities",
      description: "Jobs categorized by freshness: Ultra Fresh (<24h), Fresh (1-3 days) with real-time posting alerts.",
      highlight: "Real-time alerts"
    },
    {
      icon: GraduationCap,
      title: "Graduate-Optimized",
      description: "Specialized curation for entry-level roles, graduate programs, and early-career opportunities.",
      highlight: "Entry-level focus"
    },
    {
      icon: Mail,
      title: "Zero-Effort Delivery",
      description: "Curated opportunities delivered every 48 hours while you sleep. No dashboard required.",
      highlight: "Fully automated"
    }
  ];

  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-[#0B0B0F] relative">
      <div className="absolute inset-0 bg-pattern opacity-20"></div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-[#F8F9FA] font-bold text-4xl lg:text-5xl mb-8 tracking-tight"
          >
            Why JobPing Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[#9CA3AF] text-xl max-w-3xl mx-auto leading-relaxed"
          >
            Advanced AI technology meets comprehensive job discovery to deliver opportunities you won't find anywhere else.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 premium-card rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/10 to-transparent opacity-50"></div>
                                      <feature.icon className="w-8 h-8 text-white relative z-10" />
                </div>
                <h3 className="text-[#F8F9FA] font-semibold text-2xl mb-4 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[#9CA3AF] leading-relaxed mb-6 text-lg">
                  {feature.description}
                </p>
                <div className="bg-white/5 rounded-xl px-4 py-3 inline-block border border-white/10">
                  <span className="text-[#10B981] text-base font-medium">
                    ✓ {feature.highlight}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>



        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-[#151519] to-[#1F1F23] rounded-2xl p-8 border border-[#374151]">

            <h3 className="text-[#F8F9FA] font-bold text-2xl mb-4">
              Ready to Stop Job Hunting?
            </h3>
            <p className="text-[#9CA3AF] text-lg mb-6 max-w-2xl mx-auto">
              No more endless scrolling - just quality opportunities delivered to your inbox.
            </p>
            <a href="#signup" className="premium-button inline-flex items-center gap-3 bg-white text-[#0B0B0F] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#F9F9F9] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              Get My First 5 Matches Free
              <span>→</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}