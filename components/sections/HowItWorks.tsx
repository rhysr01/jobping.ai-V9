"use client";
import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function HowItWorks() {
  const stepIcons = [BrandIcons.CheckCircle, BrandIcons.Zap, BrandIcons.Mail];

  return (
    <section
      data-testid="how-it-works"
      className="section-padding bg-gradient-to-br from-[#080018] via-[#050312] to-[#11022c]"
    >
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
            {Copy.HOW_IT_WORKS_TITLE}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">
            Updated daily
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Less typing, more applying
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-zinc-100 sm:text-lg">
            {Copy.HOW_IT_WORKS_SUMMARY}
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:mt-16 sm:grid-cols-3">
          {Copy.HOW_IT_WORKS_STEPS.filter(step => step && step.title).map((step, index) => {
            const Icon = stepIcons[index] || BrandIcons.Target;
            return (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.1 }}
                whileHover={{ 
                  y: -4,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] p-7 text-left backdrop-blur-md transition-all duration-300 hover:border-brand-500/50 hover:bg-white/12 hover:shadow-[0_12px_32px_rgba(99,102,241,0.25)] sm:p-8"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <motion.span 
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-200 transition-all duration-300 group-hover:bg-brand-500/25 group-hover:scale-110"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {index + 1}
                </motion.span>
                <div className="flex items-center gap-3">
                  <motion.span 
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/12 text-brand-200 transition-all duration-300 group-hover:bg-brand-500/20 group-hover:scale-110"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.span>
                  <h3 className="text-lg font-bold text-white sm:text-xl">{step.title}</h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-100 sm:text-base">{step.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
