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
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
            <BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
            {Copy.BUILT_FOR_STUDENTS_KICKER}
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            {Copy.BUILT_FOR_STUDENTS_TITLE}
          </h2>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">
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
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-[3px] hover:border-brand-500/25 hover:bg-white/10 sm:p-8"
              >
                <span className="absolute -right-4 top-6 text-6xl font-black text-white/5">
                  {feature.num}
                </span>
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
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
