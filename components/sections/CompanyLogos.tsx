'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { apiCallJson, ApiError } from '@/lib/api-client';

interface Company {
  name: string;
  logoPath: string;
}

export default function CompanyLogos() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        setIsLoading(true);
        setError(false);
        const data = await apiCallJson<{ companies?: Company[] }>('/api/companies');
        if (process.env.NODE_ENV === 'development') {
          console.log('Companies API response:', data);
        }
        setCompanies(data.companies || []);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        setError(true);
        // Silently fail - this is not critical for page functionality
      } finally {
        setIsLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  // Auto-scroll logos slowly to the right
  useEffect(() => {
    if (!scrollContainerRef.current || companies.length === 0 || isHovered) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let lastTimestamp: number | null = null;
    const scrollSpeed = 0.3; // Pixels per millisecond (very slow)

    const animate = (timestamp: number) => {
      if (!scrollContainerRef.current || isHovered) {
        animationFrameRef.current = null;
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const container = scrollContainerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;

      // If we've reached the end, smoothly reset to start
      if (currentScroll >= maxScroll - 1) {
        container.scrollTo({
          left: 0,
          behavior: 'smooth'
        });
        // Wait a moment before restarting
        setTimeout(() => {
          lastTimestamp = null;
          animationFrameRef.current = requestAnimationFrame(animate);
        }, 2000);
        return;
      }

      // Scroll slowly to the right
      const newScroll = currentScroll + (scrollSpeed * deltaTime);
      container.scrollLeft = Math.min(newScroll, maxScroll);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [companies, isHovered]);

  if (isLoading) {
    return (
      <section className="py-24 md:py-32 bg-black scroll-snap-section relative">
        <div className="container-page">
          <div className="h-[200px] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="h-6 w-64 bg-white/10 rounded animate-pulse mx-auto" 
              />
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="h-4 w-48 bg-white/5 rounded animate-pulse mx-auto" 
              />
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // Hide section if no companies (production-ready)
  // Error state: silently hide - not critical for conversion
  if (companies.length === 0) {
    return null;
  }
  
  // If error, still show section but with empty state (graceful degradation)
  if (error) {
    return null; // Silent fail - section is not critical
  }

  return (
    <section className="py-32 md:py-40 bg-black scroll-snap-section relative">
      {/* Scroll momentum fade */}
      <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
      {/* Soft section band */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />
      
      <div className="container-page relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-left sm:text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200 shadow-lg shadow-brand-500/10"
          >
            <BrandIcons.Briefcase className="h-4 w-4 text-brand-300" />
            Featured Companies
          </motion.span>
          <h2 className="section-title mt-4 mb-3 text-zinc-100">
            Jobs from companies like:
          </h2>
          <p className="text-xl text-zinc-200 md:text-2xl leading-relaxed">
            We've matched roles from these companies (and 400+ more)
          </p>
        </motion.div>

        <div className="relative after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-12 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent">
          {/* Subtle spotlight effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent z-0" />

          {/* Horizontal scroll container with auto-scroll */}
          <div 
            ref={scrollContainerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-8 px-8 [mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)] will-change-transform"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {companies.map((company, index) => (
              <motion.div
                key={`${company.name}-${index}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.05, // Staggered entrance
                  ease: [0.23, 1, 0.32, 1] 
                }}
                whileHover={{ 
                  y: -6,
                  scale: 1.02,
                  transition: { type: 'spring', stiffness: 400, damping: 25 }
                }}
                className="flex-shrink-0 snap-start"
              >
                <div className="relative h-[180px] w-[200px] flex items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.18] via-white/[0.12] to-white/[0.18] backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] p-6 transition-all duration-300 ease-out hover:border-purple-500/50 hover:shadow-[0_12px_48px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] group overflow-hidden">
                  {/* Animated shimmer sweep */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  />
                  
                  {/* Inner glow with light source */}
                  <div className="absolute inset-[1px] bg-gradient-to-br from-white/[0.12] via-transparent to-white/[0.04] rounded-2xl pointer-events-none" />
                  
                  {/* Logo with stronger contrast */}
                  <div className="relative z-10 flex items-center justify-center">
                    <Image
                      src={company.logoPath}
                      alt={`${company.name} company logo`}
                      width={140}
                      height={140}
                      className="object-contain h-[140px] w-auto opacity-70 grayscale transition-all duration-500 ease-out group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-125 filter drop-shadow-[0_4px_12px_rgba(139,92,246,0.4)]"
                      onError={(e) => {
                        console.error(`Failed to load logo: ${company.logoPath}`, e);
                        const parent = (e.target as HTMLElement).parentElement?.parentElement?.parentElement;
                        if (parent) {
                          parent.style.display = 'none';
                        }
                      }}
                      onLoad={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`Successfully loaded logo: ${company.logoPath}`);
                        }
                      }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-xs text-zinc-400">
            JobPing is not affiliated to these companies, we match you with their public job listings
          </p>
        </motion.div>
      </div>
    </section>
  );
}

