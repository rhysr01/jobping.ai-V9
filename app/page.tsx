import HeroMinimal from './(marketing)/_components/HeroMinimal';
import NavbarMinimal from './(marketing)/_components/NavbarMinimal';
import CTASection from './(marketing)/_components/CTASection';
import HowItWorks from './(marketing)/_components/HowItWorks';
import PricingSection from './(marketing)/_components/PricingSection';

export default function Page() {
  return (
    <div id="main" className="min-h-screen text-white antialiased">
      <NavbarMinimal />
      <HeroMinimal />
      <CTASection />
      <HowItWorks />
      <PricingSection />
    </div>
  );
}