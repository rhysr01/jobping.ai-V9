"use client";
import { motion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { IconBadge } from "@/components/ui/IconBadge";
import * as Copy from "@/lib/copy";

export default function HowItWorks() {
  return (
    <section data-testid="how-it-works" className="section-padding">
      <div className="container-page container-rhythm">
        <SectionHeader title={Copy.HOW_IT_WORKS_TITLE} />

        <div className="mt-10 sm:mt-14 grid gap-10 sm:gap-12 md:gap-14 md:grid-cols-3 text-center">
          {Copy.HOW_IT_WORKS_STEPS.filter(x => x && x.title).map((x, index) => {
            const icons = [BrandIcons.Target, BrandIcons.Zap, BrandIcons.Mail];
            const Icon = icons[index] || BrandIcons.Target;
            return (
            <motion.div 
              key={index + 1} 
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
                  <span className="relative z-10">{index + 1}</span>
                  <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                <div className="flex justify-center mb-4">
                  <IconBadge>
                    <Icon className="w-6 h-6 text-brand-400" />
                  </IconBadge>
                </div>
                <h3 className="mt-4 text-2xl sm:text-3xl md:text-4xl text-white font-black leading-tight">{x.title}</h3>
                <p className="mt-4 text-lg sm:text-xl text-neutral-100 leading-relaxed font-semibold max-w-sm mx-auto">{x.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
