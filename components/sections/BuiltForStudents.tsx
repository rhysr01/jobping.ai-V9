"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function BuiltForStudents() {
  const featureIcons = [BrandIcons.Briefcase, BrandIcons.CheckCircle, BrandIcons.Mail];

  return (
    <section className="pt-20 pb-20 md:pt-24 md:pb-24 lg:pt-28 lg:pb-28 bg-black scroll-snap-section relative">
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
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200">
            <BrandIcons.GraduationCap className="h-[5.2px] w-[5.2px] text-brand-300" />
            {Copy.BUILT_FOR_STUDENTS_KICKER}
          </span>
          <h2 className="section-title mb-3 text-center">
            Why Students Choose JobPing
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
                className="group relative overflow-hidden rounded-xl bg-white/[0.06] border border-white/10 p-6 backdrop-blur-xl shadow-feature transition-all duration-200 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,theme(colors.brand.500/0.4),transparent_70%)]">
                    <Icon className="h-5 w-5 text-brand-300" />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-base md:text-lg font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-300 mt-1 max-w-[600px]">
                      {feature.body}
                    </p>
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
