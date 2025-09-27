import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import BuiltForStudents from "@/components/sections/BuiltForStudents";
import Pricing from "@/components/sections/Pricing";

export default function Page() {
  return (
    <>
      <Hero />               {/* no CTA here */}
      <HowItWorks />
      <BuiltForStudents />
      <Pricing />            {/* the ONLY CTAs live here */}
    </>
  );
}