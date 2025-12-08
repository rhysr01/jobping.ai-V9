import Hero from "@/components/sections/Hero";
import CompanyLogos from "@/components/sections/CompanyLogos";
import CountryFlags from "@/components/sections/CountryFlags";
import HowItWorks from "@/components/sections/HowItWorks";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import SocialProofRow from "@/components/sections/SocialProofRow";
import Footer from "@/components/sections/Footer";

export default function Page() {
  return (
    <>
      <main id="main-content" className="scroll-snap-type-y-proximity" style={{ scrollSnapType: 'y proximity' }}>
        <Hero />
        <CompanyLogos />
        <HowItWorks />
        <EmailPhoneShowcase />
        <SocialProofRow />
        <Pricing />
        <CountryFlags />
        <BuiltForStudents />
      </main>
      <div className="h-16 w-full bg-gradient-to-b from-transparent to-black/40" />
      <Footer />
      <StickyMobileCTA />
      <ExitIntentPopup />
    </>
  );
}