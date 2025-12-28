"use client";
import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export default function HowItWorks() {
  const stepIcons = [BrandIcons.CheckCircle, BrandIcons.Zap, BrandIcons.Mail];

  return (
    <section
      id="how-it-works"
      data-testid="how-it-works"
      className="py-32 md:py-40 bg-black scroll-snap-section relative"
    >
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
          className="mx-auto max-w-5xl text-left sm:text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200">
            <BrandIcons.GraduationCap className="h-[5.2px] w-[5.2px] text-brand-300" />
            {Copy.HOW_IT_WORKS_TITLE}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">
            Updated daily
          </span>
          <h2 className="section-title mt-4 mb-2">
            How JobPing Works
          </h2>
          <p className="mb-10 text-xl text-zinc-300 md:text-2xl">
            {Copy.HOW_IT_WORKS_SUMMARY}
          </p>
        </motion.div>

        <div className="relative mt-14 grid gap-8 sm:mt-16 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Enhanced connecting line with glow */}
          <svg
            className="pointer-events-none absolute left-1/2 top-[56px] hidden md:block w-[72%] h-[60px] -translate-x-1/2"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgb(168, 85, 247)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              d="M0,10 C30,0 70,20 100,10"
              stroke="url(#progressGradient)"
              strokeWidth="3"
              fill="none"
              filter="url(#glow)"
              className="drop-shadow-[0_0_16px_rgba(139,92,246,0.6)]"
            />
          </svg>
          {Copy.HOW_IT_WORKS_STEPS.filter(step => step && step.title).map((step, index) => {
            const Icon = stepIcons[index] || BrandIcons.Target;
            const isFirst = index === 0;
            
            return (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                // Staggered entrance: 100ms delay per card
                transition={{ duration: 0.55, delay: index * 0.1 }}
                whileHover={{ 
                  y: -4,
                  scale: 1.02,
                  transition: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                className={`group relative flex h-full flex-col gap-2 overflow-hidden rounded-[2rem] border-light-source bg-gradient-to-br from-zinc-900/50 via-zinc-900/30 to-zinc-900/50 backdrop-blur-md px-6 py-6 text-left transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_20px_60px_rgba(139,92,246,0.15)] md:px-7 md:py-7 ${
                  isFirst ? 'md:col-span-2' : ''
                }`}
              >
                {/* Multi-layer glass effect with light source */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent pointer-events-none rounded-[2rem]" />
                <div className="absolute inset-[1px] bg-gradient-to-tr from-purple-500/0 via-purple-500/0 to-purple-500/5 group-hover:via-purple-500/10 rounded-[2rem] pointer-events-none transition-all duration-300" />
                
                <div className="relative z-10">
                  {/* Number badge with metallic effect */}
                  <motion.span 
                    className="relative inline-flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/30 via-purple-600/20 to-purple-500/30 border-t border-purple-500/40 border-r border-purple-500/30 border-b border-purple-500/20 border-l border-purple-500/30 text-2xl md:text-3xl font-black text-purple-200 shadow-[0_4px_16px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] mb-4"
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  >
                    {/* Inner metallic shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent rounded-2xl" />
                    <span className="relative z-10">{index + 1}</span>
                  </motion.span>
                  
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/12 text-brand-200 transition-all duration-200 group-hover:bg-brand-500/20 group-hover:scale-110"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.span>
                    <h3 className="text-xl font-semibold text-zinc-100 sm:text-2xl mb-2 tracking-tight">{step.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
