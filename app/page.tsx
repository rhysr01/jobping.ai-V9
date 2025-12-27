'use client';

import { useEffect } from 'react';
import Hero from "@/components/sections/Hero";
import CompanyLogos from "@/components/sections/CompanyLogos";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import ScrollCTA from "@/components/ui/ScrollCTA";
import SocialProofRow from "@/components/sections/SocialProofRow";
import Footer from "@/components/sections/Footer";
import { trackScrollDepth } from "@/lib/scroll-tracking";

export default function Page() {
  useEffect(() => {
    const cleanup = trackScrollDepth();
    return cleanup;
  }, []);

  return (
    <>
      <main id="main-content" className="scroll-snap-type-y-proximity" style={{ scrollSnapType: 'y proximity' }} role="main">
        <Hero />
        <CompanyLogos />
        <HowItWorks />
        <EmailPhoneShowcase />
        <Pricing />
        <SocialProofRow />
      </main>
      <div className="h-16 w-full bg-gradient-to-b from-transparent to-black/40" />
      <Footer />
      <StickyMobileCTA />
      <ScrollCTA />
      <ExitIntentPopup />
    </>
  );
}