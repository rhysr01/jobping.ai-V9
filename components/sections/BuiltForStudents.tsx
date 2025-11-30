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
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-violet-200">
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
                className="group relative overflow-hidden rounded-2xl bg-zinc-950/70 border border-white/5 p-5 md:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.45),_rgba(39,39,42,1)_70%)]">
                    <motion.span 
                      className="relative inline-flex h-10 w-10 items-center justify-center text-brand-200 transition-all duration-300 group-hover:scale-110"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {feature.body}
                    </p>
                    {feature.meta && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {feature.meta}
                      </p>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </div>
      </div>
    </section>
  );
}
