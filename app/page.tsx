'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Hero from "@/components/sections/Hero";
import CompanyLogos from "@/components/sections/CompanyLogos";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import ScrollCTA from "@/components/ui/ScrollCTA";
import SocialProofRow from "@/components/sections/SocialProofRow";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/sections/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trackScrollDepth } from "@/lib/scroll-tracking";
import * as Copy from "@/lib/copy";

export default function Page() {
  useEffect(() => {
    const cleanup = trackScrollDepth();
    return cleanup;
  }, []);

  return (
    <>
      <main id="main-content" className="scroll-snap-type-y-proximity pb-32" style={{ scrollSnapType: 'y proximity' }} role="main">
        <ErrorBoundary>
          <Hero />
        </ErrorBoundary>
        <ErrorBoundary>
          <CompanyLogos />
        </ErrorBoundary>
        <ErrorBoundary>
          <HowItWorks />
        </ErrorBoundary>
        {/* Email preview section - Monday only */}
        <ErrorBoundary>
          <section className="py-32 md:py-40 relative overflow-hidden bg-black">
            <div className="container-page relative z-10 px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-brand-200">
                  {Copy.EMAIL_SHOWCASE_KICKER}
                </span>
                <h2 className="section-title mt-4 mb-2">
                  {Copy.EMAIL_SHOWCASE_TITLE}
                </h2>
                <p className="text-xl text-zinc-300 md:text-2xl mb-6">
                  {Copy.EMAIL_SHOWCASE_SUBTITLE}
                </p>
              </div>
              <div className="flex justify-center">
                <EmailPhoneShowcase day="monday" careerPath="finance" />
              </div>
            </div>
          </section>
        </ErrorBoundary>
        <ErrorBoundary>
          <Pricing />
        </ErrorBoundary>
        <ErrorBoundary>
          <SocialProofRow />
        </ErrorBoundary>
        <ErrorBoundary>
          <FAQ />
        </ErrorBoundary>
        
        {/* Final CTA Section - Bridge FAQ to Footer */}
        <ErrorBoundary>
          <section className="py-16 md:py-20 relative overflow-hidden bg-black">
            <div className="container-page relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl mx-auto text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Ready to find your job?
                </h2>
                <p className="text-base md:text-lg text-zinc-300 mb-6">
                  Get 5 personalized matches in under 2 minutes. 100% free to start.
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a
                    href="/signup/free"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-full text-sm font-semibold hover:bg-brand-500/90 transition-colors shadow-lg shadow-brand-500/30"
                  >
                    Get My 5 Free Matches
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </ErrorBoundary>
      </main>
      <div className="h-8 w-full bg-gradient-to-b from-transparent to-black/40" />
      <Footer />
      <StickyMobileCTA />
      <ScrollCTA />
      <ExitIntentPopup />
    </>
  );
}