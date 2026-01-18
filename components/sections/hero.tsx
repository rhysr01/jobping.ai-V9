"use client";

import { memo } from "react";
import { trackEvent } from "../../lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "../../lib/copy";
import HeroBackgroundAura from "../ui/HeroBackgroundAura";
import CustomButton from "../ui/CustomButton";

function Hero() {
	return (
		<section
			data-testid="hero-section"
			className="section-padding-hero pt-32 pb-24 relative isolate overflow-visible min-h-screen flex items-center bg-transparent"
		>
			{/* Layer 1: The Dot Grid (The Foundation) */}
			<div
				className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
				aria-hidden="true"
			/>

			{/* Layer 2: Enhanced Gradient Background with Depth + HeroBackgroundAura (The Mood) */}
			<div
				className="absolute inset-0 -z-10"
				style={{
					background: `
						radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15), transparent),
						radial-gradient(ellipse 60% 80% at 80% 60%, rgba(59, 130, 246, 0.10), transparent),
						radial-gradient(ellipse 50% 50% at 20% 80%, rgba(139, 92, 246, 0.08), transparent),
						linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8)),
						#000
					`,
				}}
			/>

			{/* Subtle single gradient orb for premium feel */}
			<div
				className="absolute inset-0 -z-10 overflow-hidden"
				aria-hidden="true"
			>
				<div className="absolute top-0 -left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px]" />
			</div>

			<div className="absolute inset-0 -z-10">
				<HeroBackgroundAura />
			</div>

			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

			{/* Main container - Centered content */}
			<div className="container-page relative z-10 mx-auto max-w-7xl overflow-visible">
					{/* LEFT SIDE - Content */}
					<div className="text-center space-y-8 relative overflow-visible px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
						{/* MASSIVE Headline - Clear hierarchy */}
						<h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none mb-8 max-w-full overflow-visible" style={{ wordSpacing: "0.05em" }}>
							Stop Scrolling.<br/>
							<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
								Start Applying.
							</span>
						</h1>

						{/* Clear, impactful value proposition */}
						<p className="text-lg sm:text-xl md:text-2xl text-zinc-300 leading-relaxed max-w-3xl mx-auto mb-12">
							Get your perfect European job in{" "}
							<strong className="text-white font-bold">2 minutes</strong>
							{", "}not 40+ hours of searching.
						</p>

						{/* SINGLE prominent CTA */}
						<div className="flex justify-center">
							<CustomButton
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", { type: "free", location: "hero" });
								}}
								variant="primary"
								size="xl"
								className="text-xl px-12 py-6 w-full sm:w-auto"
								aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
								icon="ArrowRight"
							>
								{CTA_GET_MY_5_FREE_MATCHES}
							</CustomButton>
						</div>
						</div>
			</div>
		</section>
	);
}

export default memo(Hero);
