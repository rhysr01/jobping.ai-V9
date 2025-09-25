import HeroMinimal from './(marketing)/_components/HeroMinimal';
import NavbarMinimal from './(marketing)/_components/NavbarMinimal';
import CTASection from './(marketing)/_components/CTASection';
import PricingSection from './(marketing)/_components/PricingSection';

export default function Page() {
  return (
    <div id="main" className="min-h-screen text-white antialiased">
      <NavbarMinimal />
      <HeroMinimal />
      <CTASection />
      <PricingSection />
    </div>
  );
}