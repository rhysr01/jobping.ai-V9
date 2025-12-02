'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BrandIcons } from '@/components/ui/BrandIcons';
import { useReducedMotion } from '@/components/ui/useReducedMotion';

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
        const response = await fetch('/api/countries');
        if (!response.ok) {
          console.error('API error:', response.status, response.statusText);
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        console.log('Countries API response:', data);
        setCountries(data.countries || []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCountries();
  }, []);

  if (isLoading) {
    return (
      <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 bg-black scroll-snap-section relative">
        <div className="container-page">
          <div className="h-[200px] flex items-center justify-center">
            <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // Show section even if no countries (for fallback display)
  if (countries.length === 0) {
    return (
      <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 bg-black scroll-snap-section relative">
        <div className="container-page relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-left sm:text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200 shadow-lg shadow-brand-500/10">
              <BrandIcons.Target className="h-4 w-4 text-brand-300" />
              Active Countries
            </span>
            <h2 className="section-title mt-4 mb-3">
              Opportunities across Europe
            </h2>
            <p className="text-xl text-zinc-300 md:text-2xl leading-relaxed mb-8">
              We operate in these countries
            </p>
            <div className="text-sm text-zinc-500 mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
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

        <div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto"
          role="list"
          aria-label="Countries where JobPing operates"
        >
          {countries.map((countryData, index) => {
            const animationDelay = prefersReduced ? 0 : index * 0.05;
            const cityAnimationDelay = prefersReduced ? 0 : index * 0.05;
            
            return (
              <motion.div
                key={countryData.country}
                initial={prefersReduced ? undefined : { opacity: 0, scale: 0.9, y: 20 }}
                whileInView={prefersReduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ 
                  duration: prefersReduced ? 0 : 0.4, 
                  delay: animationDelay, 
                  ease: [0.23, 1, 0.32, 1] 
                }}
                whileHover={prefersReduced ? undefined : { 
                  y: -6,
                  scale: 1.02,
                  transition: { type: 'spring', stiffness: 400, damping: 25 }
                }}
                className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/10 backdrop-blur-xl shadow-feature transition-all duration-300 hover:border-white/20 hover:shadow-hover overflow-hidden"
                role="listitem"
                aria-label={`${countryData.country}: ${countryData.cities.length > 0 ? countryData.cities.join(', ') : countryData.country}`}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-brand-500/0 to-purple-500/0 group-hover:from-brand-500/10 group-hover:via-brand-500/5 group-hover:to-purple-500/10 transition-all duration-300 rounded-2xl" />
                
                {/* Flag - larger and prominent */}
                <div className="relative z-10">
                  <span className="text-4xl leading-none drop-shadow-lg" role="img" aria-label={countryData.country}>
                    {countryData.flag}
                  </span>
                </div>
                
                {/* Cities as badges */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 w-full min-h-[2rem]">
                  {countryData.cities.length > 0 ? (
                    countryData.cities.map((city, cityIndex) => (
                      <motion.span
                        key={`${countryData.country}-${city}`}
                        initial={prefersReduced ? undefined : { opacity: 0, scale: 0.8 }}
                        whileInView={prefersReduced ? undefined : { opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ 
                          delay: cityAnimationDelay + (prefersReduced ? 0 : cityIndex * 0.03), 
                          duration: prefersReduced ? 0 : 0.3 
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-all duration-200 group-hover:bg-white/8 group-hover:border-white/15"
                      >
                        {city}
                      </motion.span>
                    ))
                  ) : (
                    <span className="text-xs font-medium text-zinc-400">{countryData.country}</span>
                  )}
                </div>
                
                {/* Subtle shine effect on hover - using CSS classes instead of inline styles */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl shine-effect" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

