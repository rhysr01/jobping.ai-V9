"use client";

import { motion } from "framer-motion";
import Image from "next/image";

/**
 * Trust Badges Component
 * Shows company logos and data sources to build credibility
 * Modern SaaS pattern: "Trusted by" or "Powered by"
 */
export default function TrustBadges() {
  const badges = [
    {
      name: "Reed.co.uk",
      logo: "/logos/reed.svg",
      description: "UK's largest job board"
    },
    {
      name: "Adzuna",
      logo: "/logos/adzuna.svg",
      description: "Global job aggregator"
    },
    {
      name: "Greenhouse",
      logo: "/logos/greenhouse.svg",
      description: "Company career pages"
    },
  ];

  return (
    <section className="pt-16 pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 border-t border-white/10">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <p className="mb-3 text-center text-[11px] uppercase tracking-[0.22em] text-zinc-300">
            Opportunities sourced from trusted platforms
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className="group relative flex items-center justify-center transition-all duration-200 hover:-translate-y-1 bg-white/[0.08] border border-white/10 px-4 py-3 rounded-xl hover:border-white/20 hover:bg-white/[0.12] hover:shadow-[0_4px_12px_rgba(124,94,255,0.15)]"
                role="listitem"
              >
                <div className="relative h-8 w-auto text-white">
                  <Image
                    src={badge.logo}
                    alt={badge.name}
                    width={120}
                    height={40}
                    className="h-8 w-auto object-contain transition-all duration-300 opacity-90 group-hover:opacity-100 group-hover:brightness-110 group-hover:scale-105"
                    loading="lazy"
                    unoptimized
                    onError={(e) => {
                      // Fallback: Show text if image fails to load
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-sm font-semibold text-white">${badge.name}</span>`;
                      }
                    }}
                  />
                </div>
                {/* Fallback text (hidden, shown via onError) */}
                <span className="sr-only">{badge.description}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

