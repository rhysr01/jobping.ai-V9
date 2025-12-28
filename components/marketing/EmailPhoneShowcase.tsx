"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
  const [preloadedJobs, setPreloadedJobs] = useState<any[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const pointIcons = [BrandIcons.Check, BrandIcons.Shield, BrandIcons.Mail];
  const dayLabel = day === 'wednesday' ? 'Wednesday' : 'Monday';

  // Pre-fetch premium jobs immediately on mount
  useEffect(() => {
    async function fetchJobs() {
      try {
        // Calculate week number for rotation
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
        
        const response = await fetch(`/api/sample-jobs?day=${day}&tier=premium&week=${weekNumber}`);
        const data = await response.json();
        
        if (data.jobs && data.jobs.length > 0) {
          setPreloadedJobs(data.jobs);
        }
      } catch (error) {
        console.error('Failed to pre-fetch premium jobs:', error);
      }
    }
    
    fetchJobs();
  }, [day]);

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

      {/* Single phone centered with dynamic backlight */}
      <div 
        className="relative flex items-center justify-center"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePosition({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onMouseLeave={() => setMousePosition({ x: 50, y: 50 })}
      >
        {/* Dynamic backlight following cursor */}
        <motion.div
          animate={{
            x: `${mousePosition.x}%`,
            y: `${mousePosition.y}%`,
          }}
          transition={{ type: 'spring', stiffness: 40, damping: 25 }}
          className="absolute bg-purple-500/25 blur-3xl rounded-full opacity-70 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: '500px', height: '500px' }}
        />
        
        {/* Static glow layers */}
        <div className="absolute -inset-6 bg-purple-600/15 blur-2xl rounded-full opacity-50" />
        <div className="absolute -inset-4 bg-purple-400/10 blur-xl rounded-full opacity-40" />
        
        {/* Floating shadow */}
        <div className="absolute inset-0 translate-y-20 bg-black/80 blur-3xl rounded-full -z-20 scale-110" />
        
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
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative"
          >
            <DeviceFrame hideOnMobile={true} autoScroll={true} scrollSpeed={1}>
              <SampleInterviewEmail day={day} careerPath={careerPath} preloadedJobs={preloadedJobs} />
            </DeviceFrame>
          </motion.div>
        </motion.div>
      </div>

    </div>
  );
}
