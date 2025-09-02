'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Shield, Clock, Mail } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative bg-[#0B0B0F] pt-32 pb-24 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1F1F23]/10 via-transparent to-transparent"></div>
      
      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-[#F8F9FA] font-extrabold text-6xl sm:text-7xl lg:text-8xl leading-tight tracking-tight mb-8"
        >
          Database with thousands of EU and UK jobs
          <br />
          <span className="text-[#D1D5DB]">straight to your email</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[#9CA3AF] text-xl sm:text-2xl leading-relaxed mb-12 max-w-4xl mx-auto"
        >
          Stop the job search. Focus on the application.
          <br />2,800+ sources scraped daily. Visa-friendly roles prioritized.
        </motion.p>

        {/* Value Props */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-8 mb-16 text-[#D1D5DB] text-base font-medium"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
            <span>No endless scrolling</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
            <span>EU/UK focus</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
            <span>Visa-friendly priority</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
            <span>Fresh opportunities daily</span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
        >
          <a href="#signup" className="bg-white text-[#0B0B0F] px-12 py-6 rounded-2xl font-bold text-xl hover:bg-[#F8F9FA] transition-all duration-300 flex items-center gap-3 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] active:scale-[0.98]">
            Get Jobs Delivered Daily
            <ArrowRight className="w-6 h-6" />
          </a>
          <a href="#preview" className="text-[#D1D5DB] hover:text-white font-medium text-xl flex items-center gap-3 transition-colors">
            <Play className="w-6 h-6" />
            See Email Preview
          </a>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8 text-[#6B7280] text-base"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>GDPR compliant</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}