"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import * as Copy from "@/lib/copy";
import { BrandIcons } from "@/components/ui/BrandIcons";

export default function Hero() {
  const [activeJobs, setActiveJobs] = useState("12,748");
  const [isLoading, setIsLoading] = useState(true);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.activeJobsFormatted) {
          setActiveJobs(data.activeJobsFormatted);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        // Keep the default value "12,748" if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <section data-testid="hero-section" className="relative flex flex-col items-center justify-center min-h-[90vh] pt-8 text-center overflow-hidden">
      {/* Dark clean gradient background with subtle radial light */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#060013] via-[#0a001e] to-[#120033]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(154,106,255,0.12)_0%,transparent_70%)] blur-3xl" />
      </div>
      
      <div className="container-page container-rhythm relative z-10">
        {/* Large JobPing branding with graduation cap - Calm motion */}
        <motion.div 
          className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1
          }}
          transition={{ 
            opacity: { duration: 0.6 },
            scale: { duration: 0.6 }
          }}
          whileHover={prefersReduced ? {} : { scale: 1.02 }}
        >
          {/* Graduation Cap Icon */}
          <motion.div
            whileHover={prefersReduced ? {} : { rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <BrandIcons.GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-white flex-shrink-0" />
          </motion.div>
          
          {/* JobPing Text - Clean, no glow */}
          <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none">
            <span className="bg-gradient-to-b from-white via-purple-50/90 to-purple-200/80 bg-clip-text text-transparent">
              JobPing
            </span>
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="mt-8 text-white text-display mb-6 text-balance leading-tight"
        >
          {Copy.HERO_HEADLINE}
        </motion.h1>
        <p className="text-neutral-300 leading-relaxed max-w-2xl mx-auto text-xl font-medium mt-2 text-neutral-200">
          {Copy.HERO_SUBLINE}
        </p>
        
        {/* Centered bottom section */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center space-y-6">
          {/* Stats pill - tag style, not CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/15 backdrop-blur-sm px-5 py-2 text-small text-brand-200 shadow-[0_2px_8px_rgba(154,106,255,0.15)]">
              <BrandIcons.Target className="w-4 h-4 text-brand-400" />
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span className="font-medium">{`${activeJobs} active early-career roles · Updated daily`}</span>
              )}
            </div>
          </motion.div>
          
          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Button
              href="/signup"
              variant="primary"
              size="lg"
              className="mt-5 rounded-xl shadow-[0_4px_12px_rgba(106,75,255,0.40)] hover:shadow-[0_6px_20px_rgba(106,75,255,0.50)] hover:brightness-105"
              aria-label={Copy.HERO_CTA}
            >
              <span className="relative flex items-center gap-2">
                {Copy.HERO_CTA}
                <BrandIcons.ArrowRight className="w-5 h-5" />
              </span>
            </Button>
            <p className="mt-4 text-small text-zinc-400 text-center leading-relaxed">
              Free · No spam · Unsubscribe anytime
            </p>
          </motion.div>
        </div>
      </div>

      {/* Big background orbs - respect reduced motion */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          rotate: prefersReduced ? 0 : [0, 0.5, -0.5, 0]
        }}
        transition={{ 
          duration: 12, 
          ease: "easeInOut",
          repeat: prefersReduced ? 0 : Infinity,
          repeatType: "reverse"
        }}
        className="pointer-events-none absolute inset-0 -z-10"
      />
      
      {/* Floating orbs - respect reduced motion */}
      <motion.div
        aria-hidden
        animate={{ 
          y: prefersReduced ? 0 : [0, -6, 0],
          opacity: prefersReduced ? 0.25 : [0.25, 0.45, 0.25]
        }}
        transition={{ 
          duration: 8,
          repeat: prefersReduced ? 0 : Infinity,
          ease: "easeInOut"
        }}
        className="pointer-events-none absolute top-10 sm:top-20 right-4 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-brand-500/15 rounded-full blur-xl"
      />
      <motion.div
        aria-hidden
        animate={{ 
          y: prefersReduced ? 0 : [0, 6, 0],
          opacity: prefersReduced ? 0.2 : [0.2, 0.4, 0.2]
        }}
        transition={{ 
          duration: 8,
          repeat: prefersReduced ? 0 : Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="pointer-events-none absolute bottom-10 sm:bottom-20 left-4 sm:left-20 w-16 sm:w-24 h-16 sm:h-24 bg-purple-500/12 rounded-full blur-lg"
      />
    </section>
  );
}
