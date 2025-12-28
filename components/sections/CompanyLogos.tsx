'use client';

import { useEffect, useState } from 'react';
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

  if (isLoading) {
    return (
      <section className="py-24 md:py-32 bg-black scroll-snap-section relative">
        <div className="container-page">
          <div className="h-[200px] flex items-center justify-center">
            <div className="space-y-3">
              <div className="h-6 w-64 bg-white/10 rounded animate-pulse mx-auto" />
              <div className="h-4 w-48 bg-white/5 rounded animate-pulse mx-auto" />
            </div>
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
    <section className="py-24 md:py-32 bg-black scroll-snap-section relative">
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
          <h2 className="section-title mt-4 mb-3">
            Jobs from companies like:
          </h2>
          <p className="text-xl text-zinc-300 md:text-2xl leading-relaxed">
            We've matched roles from these companies (and 400+ more)
          </p>
        </motion.div>

        <div className="relative after:absolute after:inset-y-0 after:right-0 after:w-20 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-20 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent">
          {/* Subtle spotlight effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/3 to-transparent z-0" />

          {/* Horizontal scroll container */}
          <div 
            className="flex gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-8 px-8 [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)] will-change-transform"
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
                transition={{ duration: 0.4, delay: index * 0.03, ease: [0.23, 1, 0.32, 1] }}
                whileHover={{ 
                  y: -6,
                  scale: 1.02,
                  transition: { type: 'spring', stiffness: 400, damping: 25 }
                }}
                className="flex-shrink-0 snap-start"
              >
                <div className="relative h-[160px] w-[180px] flex items-center justify-center rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-white/10 shadow-feature p-6 transition-all duration-200 ease-in-out hover:border-white/20 hover:shadow-hover group overflow-hidden">
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-brand-500/0 to-brand-600/0 group-hover:from-brand-500/8 group-hover:via-brand-500/4 group-hover:to-brand-600/8 transition-all duration-200 rounded-2xl" />
                  
                  {/* Logo - unified grayscale treatment */}
                  <div className="relative z-10 flex items-center justify-center">
                    <Image
                      src={company.logoPath}
                      alt={`${company.name} company logo`}
                      width={140}
                      height={140}
                      className="object-contain h-[120px] w-auto opacity-50 grayscale transition-all duration-200 ease-in-out group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110"
                      onError={(e) => {
                        console.error(`Failed to load logo: ${company.logoPath}`, e);
                        // Hide broken logos - no text fallback
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
                  
                  
                  {/* Subtle shine effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full" 
                       style={{ transition: 'transform 0.6s ease-in-out, opacity 0.3s ease-in-out' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Counter */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-xs md:text-sm text-zinc-500">
            {companies.length}+ companies this month • Updated daily
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            JobPing is not affiliated to these companies, we match you with their public job listings
          </p>
        </motion.div>
      </div>
    </section>
  );
}

