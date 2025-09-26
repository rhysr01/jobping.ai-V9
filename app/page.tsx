import HeroMinimal from './(marketing)/_components/HeroMinimal';
import NavbarMinimal from './(marketing)/_components/NavbarMinimal';
import CredibilityStripe from './(marketing)/_components/CredibilityStripe';
import CTASection from './(marketing)/_components/CTASection';
import HowItWorks from './(marketing)/_components/HowItWorks';
import CredibilitySection from './(marketing)/_components/CredibilitySection';
import PricingSection from './(marketing)/_components/PricingSection';

export default function Page() {
  return (
    <div id="main" className="min-h-screen text-white antialiased">
      <NavbarMinimal />
      <HeroMinimal />
      <CredibilityStripe />
      <hr className="mx-auto my-12 w-full max-w-[80rem] border-t border-white/10" />
      <CTASection />
      <hr className="mx-auto my-12 w-full max-w-[80rem] border-t border-white/10" />
      <HowItWorks />
      <hr className="mx-auto my-12 w-full max-w-[80rem] border-t border-white/10" />
      <CredibilitySection />
      <hr className="mx-auto my-12 w-full max-w-[80rem] border-t border-white/10" />
      <PricingSection />
    </div>
  );
}