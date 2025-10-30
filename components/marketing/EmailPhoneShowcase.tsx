"use client";

import { motion } from "framer-motion";
import DeviceFrame from "./DeviceFrame";
import SampleInterviewEmail from "./SampleInterviewEmail";
import SectionHeader from "@/components/ui/SectionHeader";
import GlassCard from "@/components/ui/GlassCard";
import { useReducedMotion } from "@/components/ui/useReducedMotion";

export default function EmailPhoneShowcase() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container-page container-rhythm">
        {/* Section header */}
        <SectionHeader
          title="Real jobs. Real matches. Delivered to your inbox."
          description="See exactly what you'll receive → curated roles that match your profile, delivered weekly to your email. No apps to download, no dashboards to navigate."
        />

        {/* Phone showcase with floating animation */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-center"
        >
          <motion.div
            animate={prefersReduced ? {} : {
              y: [0, -12, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            {/* Glowing shadow behind phone */}
            <div className="absolute inset-0 -z-10 translate-y-8">
              <div className="w-full h-full bg-brand-500/20 rounded-full blur-3xl scale-110" />
            </div>

            {/* Phone frame */}
            <div className="relative">
              <DeviceFrame>
                <SampleInterviewEmail />
              </DeviceFrame>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
        >
          <GlassCard variant="subtle" hover="lift" className="rounded-xl p-6">
            <div className="text-2xl mb-2" aria-hidden="true">📧</div>
            <h3 className="text-white font-semibold mb-2">Weekly emails</h3>
            <p className="text-base text-neutral-300 font-medium">5 hand-picked roles every week</p>
          </GlassCard>
          <GlassCard variant="subtle" hover="lift" className="rounded-xl p-6">
            <div className="text-2xl mb-2" aria-hidden="true">⚡</div>
            <h3 className="text-white font-semibold mb-2">60-second read</h3>
            <p className="text-base text-neutral-300 font-medium">Everything you need in one email</p>
          </GlassCard>
          <GlassCard variant="subtle" hover="lift" className="rounded-xl p-6">
            <div className="text-2xl mb-2" aria-hidden="true">🎯</div>
            <h3 className="text-white font-semibold mb-2">Perfect matches</h3>
            <p className="text-base text-neutral-300 font-medium">AI-filtered for your profile</p>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
