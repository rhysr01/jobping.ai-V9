"use client";
import LogoWordmark from "@/components/LogoWordmark";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative isolate text-center section-pad">
      <div className="container-page">
        <LogoWordmark />
        <p className="mt-6 text-xl md:text-2xl text-zinc-200 max-w-[62ch] mx-auto leading-8">
          Graduate jobs that actually match you. Five per week, straight to your inbox.
        </p>
        <p className="mt-4 text-base md:text-lg text-zinc-400 max-w-[58ch] mx-auto">
          Set up takes 2 minutes. No CV upload. No endless scrolling.
        </p>
        
        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10"
        >
          <a
            href="https://tally.so/r/mJEqx4"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-2xl hover:shadow-brand-500/30"
          >
            Get Started — It's Free
          </a>
          <p className="mt-4 text-sm text-zinc-500">
            Join 200+ graduates finding better opportunities
          </p>
        </motion.div>
      </div>

      {/* Big background orbs — dramatic motion */}
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
      
      {/* Floating orbs for extra drama */}
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
        className="pointer-events-none absolute top-20 right-20 w-32 h-32 bg-brand-500/20 rounded-full blur-xl"
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
        className="pointer-events-none absolute bottom-20 left-20 w-24 h-24 bg-purple-500/20 rounded-full blur-lg"
      />
    </section>
  );
}
