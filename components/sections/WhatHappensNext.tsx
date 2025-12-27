"use client";
import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function WhatHappensNext() {
  const stepIcons = [BrandIcons.Users, BrandIcons.Zap, BrandIcons.Mail];

  return (
    <section className="pt-24 pb-24 md:pt-28 md:pb-28 lg:pt-32 lg:pb-32 relative overflow-hidden bg-[#0a0a0a]">
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center mb-12"
        >
          <h2 className="section-title mt-4 mb-2">
            {Copy.WHAT_HAPPENS_NEXT_TITLE}
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {Copy.WHAT_HAPPENS_NEXT_STEPS.map((step, index) => {
            const Icon = stepIcons[index] || BrandIcons.Target;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl hover:border-brand-500/30 transition-all"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/12 text-brand-200 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-semibold text-brand-400 mb-2 uppercase tracking-wider">
                  {step.time}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-300">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

