'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { useReducedMotion } from '@/components/ui/useReducedMotion';
import { apiCallJson } from '@/lib/api-client';

interface CountryFlag {
  country: string;
  flag: string;
  cities: string[];
  count: number;
}

export default function CountryFlags() {
  const [countries, setCountries] = useState<CountryFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    async function fetchCountries() {
      try {
        const data = await apiCallJson<{ countries?: CountryFlag[] }>('/api/countries');
        console.log('Countries API response:', data);
        setCountries(data.countries || []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        // Silently fail - this is not critical for page functionality
      } finally {
        setIsLoading(false);
      }
    }
    fetchCountries();
  }, []);

  if (isLoading) {
    return (
      <section className="pt-10 pb-10 md:pt-12 md:pb-12 bg-black scroll-snap-section relative">
        <div className="container-page">
          <div className="h-[120px] flex items-center justify-center">
            <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // Show section even if no countries (for fallback display)
  if (countries.length === 0) {
    return (
      <section className="pt-10 pb-10 md:pt-12 md:pb-12 bg-black scroll-snap-section relative">
        <div className="container-page relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-left sm:text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[10px] font-medium tracking-[0.16em] uppercase text-brand-200 shadow-lg shadow-brand-500/10">
              <BrandIcons.Target className="h-3 w-3 text-brand-300" />
              Active Countries
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-white text-balance mt-3 mb-2">
              Opportunities across Europe
            </h2>
            <p className="text-base text-zinc-300 md:text-lg leading-relaxed mb-6">
              We operate in these countries
            </p>
            <div className="text-sm text-zinc-500 mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <p>Loading countries...</p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 bg-black scroll-snap-section relative">
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
            <BrandIcons.Target className="h-4 w-4 text-brand-300" />
            Active Countries
          </motion.span>
          <h2 className="section-title mt-4 mb-3">
            Opportunities across Europe
          </h2>
          <p className="text-xl text-zinc-300 md:text-2xl leading-relaxed">
            We operate in these countries
          </p>
        </motion.div>

        <div className="relative">
          {/* Enhanced fade edges with gradient glow */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black via-black/80 to-transparent z-10" />
          
          {/* Scroll indicator arrow on the right */}
          {countries.length > 5 && (
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2">
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-white/60"
              >
                <BrandIcons.ArrowRight className="h-6 w-6" />
              </motion.div>
              <span className="text-xs text-white/40 font-medium">Scroll</span>
            </div>
          )}
          
          {/* Subtle spotlight effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent z-0" />

          {/* Horizontal scroll container */}
          <div 
            className="flex gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-8 px-8"
            role="list"
            aria-label="Countries where JobPing operates"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {countries.map((countryData, index) => {
              const animationDelay = prefersReduced ? 0 : index * 0.03;
              
              return (
                <motion.div
                  key={countryData.country}
                  initial={prefersReduced ? undefined : { opacity: 0, scale: 0.9, y: 20 }}
                  whileInView={prefersReduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: animationDelay, ease: [0.23, 1, 0.32, 1] }}
                  whileHover={prefersReduced ? undefined : { 
                    y: -6,
                    scale: 1.02,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                  className="flex-shrink-0 snap-start"
                  role="listitem"
                  aria-label={`${countryData.country}: ${countryData.cities.length > 0 ? countryData.cities.join(', ') : countryData.country}`}
                >
                  <div className="relative h-[160px] w-[180px] flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/10 backdrop-blur-xl shadow-feature p-6 transition-all duration-300 hover:border-white/20 hover:shadow-hover group overflow-hidden">
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-brand-500/0 to-purple-500/0 group-hover:from-brand-500/10 group-hover:via-brand-500/5 group-hover:to-purple-500/10 transition-all duration-300 rounded-2xl" />
                    
                    {/* Flag - prominent */}
                    <div className="relative z-10 mb-3">
                      <span className="text-4xl leading-none drop-shadow-lg" role="img" aria-label={countryData.country}>
                        {countryData.flag}
                      </span>
                    </div>
                    
                    {/* Cities as compact text */}
                    <div className="relative z-10 flex flex-col items-center gap-1 w-full">
                      {countryData.cities.length > 0 ? (
                        <div className="text-center px-2">
                          <div className="text-xs font-medium text-zinc-300 leading-tight">
                            {countryData.cities.length <= 3 
                              ? countryData.cities.join(', ')
                              : `${countryData.cities.slice(0, 2).join(', ')}, +${countryData.cities.length - 2}`
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-zinc-400">{countryData.country}</span>
                      )}
                    </div>
                    
                    {/* Subtle shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl shine-effect" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

