"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";

// Reduced motion guard
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReduced(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);
  
  return prefersReduced;
};

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
        {/* Large JobPing branding with graduation cap - LOUD & BOUNCY */}
        <motion.div 
          className="inline-flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.08, 1],
            y: [0, -16, 0]
          }}
          transition={{ 
            opacity: { duration: 0.6 },
            scale: { 
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: [0.34, 1.56, 0.64, 1]
            },
            y: {
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: [0.34, 1.56, 0.64, 1]
            }
          }}
        >
          {/* Graduation Cap Icon - ANIMATED */}
          <svg
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l10 5-10 5L2 8l10-5z" />
            <path d="M22 10v4" />
            <path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
          </svg>
          
          {/* JobPing Text - 20% smaller to let value prop dominate */}
          <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none">
            <span className="bg-gradient-to-b from-white via-purple-50 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(139,92,246,0.8)]" style={{
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.6))'
            }}>
              JobPing
            </span>
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="mt-8 text-white text-5xl font-bold mb-4"
        >
          Land your first job faster without endless scrolling.
        </motion.h1>
        <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
          We match you to real roles that fit your skills, degree, and goals. No spam. No dead ends.
        </p>
        
        {/* Centered bottom section */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center space-y-6">
          {/* Signup bonus urgency banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1 text-sm text-purple-300">
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>• {`${activeJobs} active early-career roles · Updated daily`}</>
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
                     className="mt-5 rounded-lg bg-gradient-to-r from-[#9A6AFF] to-[#6B4EFF] px-8 py-3 text-lg font-semibold shadow-[0_4px_12px_rgba(106,75,255,0.4)] hover:from-[#A77FFF] hover:to-[#7B5DFF] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                     aria-label="Find my matches"
                   >
              <span className="relative">Find my matches</span>
            </Button>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-zinc-500 text-center">
              No logins · No spam · Unsubscribe anytime
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
          rotate: prefersReduced ? 0 : [0, 1, -1, 0]
        }}
        transition={{ 
          duration: 2, 
          ease: [0.23, 1, 0.32, 1],
          repeat: prefersReduced ? 0 : Infinity,
          repeatType: "reverse"
        }}
        className="pointer-events-none absolute inset-0 -z-10"
      />
      
      {/* Floating orbs - respect reduced motion */}
      <motion.div
        aria-hidden
        animate={{ 
          y: prefersReduced ? 0 : [0, -10, 0],
          opacity: prefersReduced ? 0.3 : [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 4,
          repeat: prefersReduced ? 0 : Infinity,
          ease: "easeInOut"
        }}
        className="pointer-events-none absolute top-10 sm:top-20 right-4 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-brand-500/20 rounded-full blur-xl"
      />
      <motion.div
        aria-hidden
        animate={{ 
          y: prefersReduced ? 0 : [0, 15, 0],
          opacity: prefersReduced ? 0.2 : [0.2, 0.5, 0.2]
        }}
        transition={{ 
          duration: 5,
          repeat: prefersReduced ? 0 : Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="pointer-events-none absolute bottom-10 sm:bottom-20 left-4 sm:left-20 w-16 sm:w-24 h-16 sm:h-24 bg-purple-500/20 rounded-full blur-lg"
      />
    </section>
  );
}
