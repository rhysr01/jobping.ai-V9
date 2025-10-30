"use client";
import { motion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import { BrandIcons } from "@/components/ui/BrandIcons";

export default function HowItWorks() {
  const items = [
    { 
      num: 1, 
      title: "Tell us what you want", 
      body: "Your target cities, work authorization, language skills, and role preferences. Takes 2 minutes.",
      icon: BrandIcons.Target
    },
    { 
      num: 2, 
      title: "We match jobs to you daily", 
      body: "Our AI monitors 1,000+ companies every day, filtering and matching roles to your exact criteria.",
      icon: BrandIcons.Zap
    },
    { 
      num: 3, 
      title: "Get your first matches within 48 hours", 
      body: "Then receive 5 hand-picked roles every week (or 15/week with Premium). Each email takes 60 seconds to read.",
      icon: BrandIcons.Mail
    },
  ];

  return (
    <section data-testid="how-it-works" className="section-padding">
      <div className="container-page container-rhythm">
        <SectionHeader title="Stop searching. Start applying." />

        <div className="mt-10 sm:mt-14 grid gap-10 sm:gap-12 md:gap-14 md:grid-cols-3 text-center">
          {items.filter(x => x && x.title).map((x, index) => {
            const Icon = x.icon;
            return (
              <motion.div 
                key={x.num} 
                className="relative px-4 py-2"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.15,
                  ease: [0.23, 1, 0.32, 1]
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className="number-chip mx-auto mb-4 relative"
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                >
                  <span className="relative z-10">{x.num}</span>
                  <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                    <Icon className="w-6 h-6 text-brand-400" />
                  </div>
                </div>
                <h3 className="mt-4 text-heading text-white font-black leading-tight">{x.title}</h3>
                <p className="mt-4 text-large text-neutral-200 leading-relaxed font-medium max-w-sm mx-auto">{x.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
