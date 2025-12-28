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
      </main>
      <div className="h-16 w-full bg-gradient-to-b from-transparent to-black/40" />
      <Footer />
      <StickyMobileCTA />
      <ScrollCTA />
      <ExitIntentPopup />
    </>
  );
}