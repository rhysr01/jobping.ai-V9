import { Suspense } from 'react';
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import Pricing from "@/components/sections/Pricing";
import EmailPhoneShowcase from "@/components/marketing/EmailPhoneShowcase";
import { SkeletonCard } from "@/components/ui/Skeleton";

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
      <Suspense fallback={<SectionSkeleton />}>
        <Hero />
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
    </>
  );
}