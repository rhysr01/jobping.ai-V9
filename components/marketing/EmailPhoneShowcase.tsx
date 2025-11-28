"use client";

import { motion } from "framer-motion";
import DeviceFrame from "./DeviceFrame";
import SampleInterviewEmail from "./SampleInterviewEmail";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function EmailPhoneShowcase() {
  const prefersReduced = useReducedMotion();
  const pointIcons = [BrandIcons.Check, BrandIcons.Shield, BrandIcons.Mail];

  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-br from-[#080014] via-[#0a001a] to-[#1a0030]">
      <div className="absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/14 blur-[140px]" />
      </div>

      <div className="container-page container-rhythm">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-7 text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
              {Copy.EMAIL_SHOWCASE_KICKER}
            </span>
            <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {Copy.EMAIL_SHOWCASE_TITLE}
            </h2>
            <p className="max-w-xl text-base font-medium leading-relaxed text-zinc-100 sm:text-lg">
              {Copy.EMAIL_SHOWCASE_SUBTITLE}
            </p>
            <ul className="space-y-4">
              {Copy.EMAIL_SHOWCASE_POINTS.map((point, index) => {
                const Icon = pointIcons[index] || BrandIcons.Check;
                return (
                  <li key={point} className="flex items-start gap-3 text-sm font-medium text-zinc-100 sm:text-base">
                    <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            <motion.div
              animate={
                prefersReduced
                  ? {}
                  : {
                      y: [-2, 2, -2],
                      rotate: [-1.2, 1.2, -1.2],
                    }
              }
              transition={{
                duration: 7,
                repeat: prefersReduced ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 -z-10 translate-y-8">
                <div className="h-full w-full scale-110 rounded-full bg-black/40 blur-[120px]" />
              </div>
              <DeviceFrame>
                <SampleInterviewEmail />
              </DeviceFrame>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
