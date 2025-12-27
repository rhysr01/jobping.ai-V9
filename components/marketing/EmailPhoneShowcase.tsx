"use client";

import { motion } from "framer-motion";
import DeviceFrame from "./DeviceFrame";
import SampleInterviewEmail from "./SampleInterviewEmail";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

interface EmailPhoneShowcaseProps {
  day?: 'monday' | 'wednesday';
  careerPath?: string; // e.g., 'finance', 'tech', 'strategy'
}

export default function EmailPhoneShowcase({ day = 'monday', careerPath = 'finance' }: EmailPhoneShowcaseProps) {
  const prefersReduced = useReducedMotion();
  const pointIcons = [BrandIcons.Check, BrandIcons.Shield, BrandIcons.Mail];
  const dayLabel = day === 'wednesday' ? 'Wednesday' : 'Monday';

  return (
    <div className="relative">
      {/* Day label */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-200">
          {dayLabel} Drop
        </span>
      </motion.div>

      {/* Single phone centered */}
      <div className="relative flex items-center justify-center">
        {/* Spotlight */}
        <div className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 h-[400px] w-[400px] bg-[radial-gradient(circle_at_center,_theme(colors.brand.500/0.22),_transparent_70%)] blur-md-hero opacity-70" />
        
        {/* Single phone - Email Preview */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <motion.div
            animate={
              prefersReduced
                ? {}
                : {
                    y: [-2, 2, -2],
                    rotate: [-1, 1, -1],
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
              <div className="h-full w-full scale-110 rounded-full bg-black/40 blur-lg-hero" />
            </div>
            <DeviceFrame hideOnMobile={true}>
              <SampleInterviewEmail day={day} careerPath={careerPath} />
            </DeviceFrame>
          </motion.div>
        </motion.div>
      </div>

      {/* Schedule text below email */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center mt-4 text-sm text-zinc-400"
      >
        Example matches - Free: 5 matches (one-time) • Premium: 15 matches/week
      </motion.p>
    </div>
  );
}
