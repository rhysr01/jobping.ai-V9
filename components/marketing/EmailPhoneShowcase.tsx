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
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[620px] w-[620px] rounded-full bg-brand-500/12 blur-3xl" />
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
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
              {Copy.EMAIL_SHOWCASE_KICKER}
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              {Copy.EMAIL_SHOWCASE_TITLE}
            </h2>
            <p className="max-w-xl text-base text-zinc-300 sm:text-lg">
              {Copy.EMAIL_SHOWCASE_SUBTITLE}
            </p>
            <ul className="space-y-4">
              {Copy.EMAIL_SHOWCASE_POINTS.map((point, index) => {
                const Icon = pointIcons[index] || BrandIcons.Check;
                return (
                  <li key={point} className="flex items-start gap-3 text-sm text-zinc-300 sm:text-base">
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-200">
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
                      y: [0, -12, 0],
                    }
              }
              transition={{
                duration: 6,
                repeat: prefersReduced ? 0 : Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 -z-10 translate-y-8">
                <div className="h-full w-full scale-110 rounded-full bg-brand-500/18 blur-3xl" />
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
