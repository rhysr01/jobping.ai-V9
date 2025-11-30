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
    <section className="pt-16 md:pt-20 pb-20 md:pb-24 relative overflow-hidden bg-black scroll-snap-section">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-indigo-900/40 to-transparent" />
      {/* Subtle spotlight behind email showcase */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-64 blur-3xl opacity-80 bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.28),_transparent_60%)] -z-10" />

      <div className="container-page relative z-10 px-4 md:px-6">
        <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          {/* Left-side spotlight */}
          <div className="pointer-events-none absolute left-[5%] top-[30%] h-[400px] w-[400px] bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.22),transparent_70%)] blur-[90px] opacity-70" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-7 text-left max-w-xl relative z-10"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-violet-200">
              {Copy.EMAIL_SHOWCASE_KICKER}
            </span>
          <h2 className="section-title mb-2">
            {Copy.EMAIL_SHOWCASE_TITLE}
          </h2>
          <p className="mb-10 text-xl text-zinc-300 md:text-2xl">
            {Copy.EMAIL_SHOWCASE_SUBTITLE}
          </p>
            <ul className="space-y-4">
              {Copy.EMAIL_SHOWCASE_POINTS.map((point, index) => {
                const Icon = pointIcons[index] || BrandIcons.Check;
                return (
                  <li key={point} className="flex items-start gap-3 text-base text-zinc-300/90 leading-relaxed">
                    <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{point}</span>
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
