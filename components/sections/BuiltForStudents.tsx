"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function BuiltForStudents() {
  const featureIcons = [BrandIcons.Briefcase, BrandIcons.CheckCircle, BrandIcons.Mail];

  return (
    <section className="section-padding bg-gradient-to-br from-[#05030c] via-[#03010d] to-[#160233]">
      <div className="container-page container-rhythm">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
            <BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
            {Copy.BUILT_FOR_STUDENTS_KICKER}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {Copy.BUILT_FOR_STUDENTS_TITLE}
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-zinc-100 sm:text-lg">
            {Copy.BUILT_FOR_STUDENTS_SUBTITLE}
          </p>
        </motion.div>

        <ul className="mt-12 space-y-6 sm:space-y-7 sm:space-y-8">
          {Copy.BUILT_FOR_STUDENTS_FEATURES.filter(feature => feature && feature.title).map((feature, index) => {
            const Icon = featureIcons[index] || BrandIcons.Sparkles;
            return (
              <motion.li
                key={feature.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.08] p-7 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/50 hover:bg-white/12 hover:shadow-[0_16px_40px_rgba(99,102,241,0.25)] sm:p-9"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <motion.span 
                  className="absolute -right-4 top-6 text-6xl font-black text-white/5 transition-all duration-300 group-hover:text-white/10 group-hover:scale-110"
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
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-110"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <h3 className="text-lg font-bold text-white sm:text-xl">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-100 sm:text-base">
                  {feature.body}
                </p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
