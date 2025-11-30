import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import SecondaryCTA from "@/components/sections/SecondaryCTA";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import SocialProofRow from "@/components/sections/SocialProofRow";
import TrustBadges from "@/components/sections/TrustBadges";

export default function Page() {
  return (
    <>
      <main id="main-content">
        <Hero />
        <SocialProofRow />
        <EmailPhoneShowcase />
        <HowItWorks />
        <BuiltForStudents />
        <Pricing />
        <TrustBadges />
        <SecondaryCTA />
      </main>
      <StickyMobileCTA />
      <ExitIntentPopup />
    </>
  );
}