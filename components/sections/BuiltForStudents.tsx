"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function BuiltForStudents() {
  const featureIcons = [BrandIcons.Briefcase, BrandIcons.CheckCircle, BrandIcons.Mail];

  return (
    <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 bg-black scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
            {Copy.BUILT_FOR_STUDENTS_KICKER}
          </span>
          <h2 className="section-title mb-3 text-center">
            Built for students. Designed for jobseekers.
          </h2>
          <p className="mb-10 text-xl text-zinc-300 md:text-2xl">
            {Copy.BUILT_FOR_STUDENTS_SUBTITLE}
          </p>
        </motion.div>

        <div className="mt-10 space-y-3 max-w-4xl mx-auto">
          {Copy.BUILT_FOR_STUDENTS_FEATURES.filter(feature => feature && feature.title).map((feature, index) => {
            const Icon = featureIcons[index] || BrandIcons.Sparkles;
            return (
              <motion.li
                key={feature.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-xl shadow-feature px-6 py-6 text-left transition-all duration-200 hover:-translate-y-1 md:px-7 md:py-7"
              >
                <motion.span 
                  className="absolute -right-4 top-6 text-6xl font-semibold text-white/5 transition-all duration-300 group-hover:text-white/10 group-hover:scale-110"
                  animate={{ 
                    opacity: [0.05, 0.1, 0.05],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.5
                  }}
                >
                  {feature.num}
                </motion.span>
                <div className="flex items-center gap-4">
                  <motion.span 
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-110"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <h3 className="text-xl font-semibold text-white sm:text-2xl mb-2">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-base text-zinc-300/90 leading-relaxed">
                  {feature.body}
                </p>
                {feature.meta && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {feature.meta}
                  </p>
                )}
              </motion.li>
            );
          })}
        </div>
      </div>
    </section>
  );
}
