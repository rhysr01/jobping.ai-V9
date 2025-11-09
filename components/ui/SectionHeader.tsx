"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  className?: string;
}

/**
 * Consistent section header component
 * Standardizes typography, spacing, and animations across all sections
 */
export default function SectionHeader({ 
  title, 
  description, 
  badge,
  className = "" 
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`text-center mb-12 md:mb-16 ${className}`}
    >
      {badge && <div className="mb-4">{badge}</div>}
      <h2 className="text-4xl sm:text-5xl md:text-6xl text-white text-balance mb-4 font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] text-shadow-md">
        {title}
      </h2>
      {description && (
        <p className="text-xl sm:text-2xl text-neutral-100 max-w-2xl mx-auto font-bold leading-relaxed text-shadow-sm">
          {description}
        </p>
      )}
    </motion.div>
  );
}
