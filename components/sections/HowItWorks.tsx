"use client";
import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function HowItWorks() {
  const stepIcons = [BrandIcons.CheckCircle, BrandIcons.Zap, BrandIcons.Mail];

  return (
    <section data-testid="how-it-works" className="section-padding">
      <div className="container-page container-rhythm">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
            {Copy.HOW_IT_WORKS_TITLE}
          </span>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Less typing, more applying
          </h2>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">
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
                className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-[0_18px_60px_rgba(10,0,32,0.28)] backdrop-blur-sm sm:p-7"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-200">
                  {index + 1}
                </span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/12 text-brand-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{step.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
