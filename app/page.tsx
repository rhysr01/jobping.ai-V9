"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import HowItWorksBento from "@/components/BentoGrid";
import ErrorBoundary from "@/components/ErrorBoundary";
import { EUJobStats } from "@/components/marketing/EUJobStats";
import { PremiumEmailShowcase } from "@/components/marketing/PremiumEmailShowcase";
import CompanyLogos from "@/components/sections/CompanyLogos";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Pricing from "@/components/sections/Pricing";
import SocialProofRow from "@/components/sections/SocialProofRow";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import ScrollCTA from "@/components/ui/ScrollCTA";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import { trackScrollDepth } from "@/lib/scroll-tracking";

export default function Page() {
  useEffect(() => {
    const cleanup = trackScrollDepth();
    return cleanup;
  }, []);

  return (
    <>
      <main
        id="main-content"
        className="scroll-snap-type-y-proximity pb-32"
        style={{ scrollSnapType: "y proximity" }}
      >
        {/* Conversion-Optimized Section Order:
					1. Hero - The hook
					2. CompanyLogos - Trust signal (Big Tech association)
					3. EUJobStats - The "Why Now" (creates urgency)
					4. HowItWorksBento - The logic (explains AI matching)
					5. PremiumEmailShowcase - The "Aha!" moment (visual proof of value)
					6. Pricing - The decision point (immediately after showing value, €5 feels smaller)
					7. SocialProofRow - FOMO (others are using this)
					8. FAQ - Objection killer (addresses Visa/Cancellation fears)
					9. Final CTA - Safety net for scrollers
				*/}
        <ErrorBoundary>
          <Hero />
        </ErrorBoundary>
        <ErrorBoundary>
          <CompanyLogos />
        </ErrorBoundary>
        <ErrorBoundary>
          <EUJobStats />
        </ErrorBoundary>
        <ErrorBoundary>
          <HowItWorksBento />
        </ErrorBoundary>
        <ErrorBoundary>
          <PremiumEmailShowcase />
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
                  Get 5 personalized matches in under 2 minutes. 100% free to
                  start.
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <a
                    href="/signup/free"
                    aria-label="Get my 5 free job matches - start free signup"
                    className="inline-flex min-h-[44px] items-center gap-2 px-8 py-3 bg-brand-500 text-white rounded-full text-sm font-semibold hover:bg-brand-500/90 transition-colors shadow-lg shadow-brand-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Get My 5 Free Matches
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Arrow right"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
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
