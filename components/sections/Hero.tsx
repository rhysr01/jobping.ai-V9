"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";

export default function Hero() {
  const [activeJobs, setActiveJobs] = useState("12,748");
  const [isLoading, setIsLoading] = useState(true);

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
    <section data-testid="hero-section" className="relative isolate text-center section-padding-hero overflow-hidden">
      {/* Parallax background elements */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
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
          
          {/* Large JobPing Text - MASSIVE WITH GLOW */}
          <div className="text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter leading-none">
            <span className="bg-gradient-to-b from-white via-purple-50 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(139,92,246,0.8)]" style={{
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.6))'
            }}>
              JobPing
            </span>
          </div>
        </motion.div>
        
        <h1 className="mt-8 text-display text-white text-balance max-w-[20ch] mx-auto relative">
          <span className="relative z-10">No logins. Zero scrolling. Jobs in your inbox.</span>
          {/* Subtle radial highlight behind CTA */}
          <div className="absolute -inset-8 bg-gradient-to-r from-brand-500/20 via-purple-600/20 to-brand-500/20 rounded-full blur-3xl opacity-60 -z-10" />
        </h1>
        <div className="mt-7 sm:mt-9 px-4">
          <div className="inline-flex items-center gap-2 bg-white/7 border border-white/10 rounded-full px-4 py-2 shadow-[0_0_24px_rgba(139,92,246,0.25)]">
            <svg className="w-4 h-4 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 1.41-1.41L12 16.17l8.59-8.58L22 9l-10 10z" />
            </svg>
            <span className="text-sm sm:text-base md:text-lg text-white">
              Internships, grad programmes, and early‑career opportunities delivered weekly.
            </span>
          </div>
        </div>
        <p className="mt-6 text-body text-neutral-400 max-w-[58ch] mx-auto">
          Stop searching. Start applying.
        </p>
        
        {/* Signup bonus urgency banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 sm:mt-8"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" aria-hidden="true"></span>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              `${activeJobs} active early-career roles · Updated daily`
            )}
          </div>
        </motion.div>
        
        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 sm:mt-8 px-4"
        >
          <a
            href="/signup"
            className="btn-mobile inline-block text-heading font-bold text-white bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl interactive-scale interactive-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black relative overflow-hidden group"
            aria-label="Get my matches in 48 hours"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative">Get my matches in 48 hours</span>
          </a>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-zinc-500">
            No logins · No spam · Unsubscribe anytime
          </p>
        </motion.div>
      </div>

      {/* Big background orbs  dramatic motion */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          rotate: [0, 1, -1, 0]
        }}
        transition={{ 
          duration: 2, 
          ease: [0.23, 1, 0.32, 1],
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="pointer-events-none absolute inset-0 -z-10 enhanced-grid"
      />
      
      {/* Floating orbs for extra drama - hidden on small screens */}
      <motion.div
        aria-hidden
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="pointer-events-none absolute top-10 sm:top-20 right-4 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-brand-500/20 rounded-full blur-xl"
      />
      <motion.div
        aria-hidden
        animate={{ 
          y: [0, 15, 0],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ 
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="pointer-events-none absolute bottom-10 sm:bottom-20 left-4 sm:left-20 w-16 sm:w-24 h-16 sm:h-24 bg-purple-500/20 rounded-full blur-lg"
      />
    </section>
  );
}
