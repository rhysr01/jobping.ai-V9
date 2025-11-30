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
    {
      name: "Indeed",
      logo: "/logos/indeed.svg",
      description: "Job board via JobSpy"
    },
    {
      name: "Glassdoor",
      logo: "/logos/glassdoor.svg",
      description: "Job board via JobSpy"
    },
    {
      name: "Google Jobs",
      logo: "/logos/google-jobs.svg",
      description: "Job aggregator via JobSpy"
    },
    {
      name: "ZipRecruiter",
      logo: "/logos/ziprecruiter.svg",
      description: "Job board via JobSpy"
    }
  ];

  return (
    <section className="section-padding py-16 border-t border-white/10">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <p className="mb-6 text-center text-[0.7rem] font-bold uppercase tracking-wider opacity-70 text-zinc-200">
            Powered by live feeds from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className="group relative flex items-center justify-center opacity-70 transition-all duration-200 hover:opacity-100 hover:-translate-y-1 surface-base px-4 py-3 rounded-2xl"
              >
                <div className="relative h-5 w-auto opacity-70">
                  <Image
                    src={badge.logo}
                    alt={badge.name}
                    width={120}
                    height={40}
                    className="h-full w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0"
                    loading="lazy"
                  />
                </div>
                <span className="sr-only">{badge.description}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

