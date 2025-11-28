import { Suspense } from 'react';
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import SecondaryCTA from "@/components/sections/SecondaryCTA";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SocialProofRow from "@/components/sections/SocialProofRow";
import TrustBadges from "@/components/sections/TrustBadges";

function SectionSkeleton() {
  return (
    <div className="section-padding">
      <div className="container-page container-rhythm">
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <main id="main-content">
        <Suspense fallback={<SectionSkeleton />}>
          <Hero />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <SocialProofRow />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <EmailPhoneShowcase />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <BuiltForStudents />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Pricing />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <TrustBadges />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <SecondaryCTA />
        </Suspense>
      </main>
      <StickyMobileCTA />
      <ExitIntentPopup />
    </>
  );
}