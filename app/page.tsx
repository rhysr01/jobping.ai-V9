"use client";

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
			</main>
			<div className="h-8 w-full bg-gradient-to-b from-transparent to-black/40" />
			<Footer />
			<StickyMobileCTA />
			<ScrollCTA />
			<ExitIntentPopup />
		</>
	);
}
