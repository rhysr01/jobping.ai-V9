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
			className="section-padding-hero pt-32 pb-24 relative isolate overflow-visible h-screen sm:min-h-screen flex items-center bg-transparent"
		>
			{/* Layer 1: The Dot Grid (The Foundation) */}
			<div
				className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
				aria-hidden="true"
			/>

			{/* Layer 2: Simplified Gradient Background (The Mood) */}
			<div
				className="absolute inset-0 -z-10"
				style={{
					background: `
						radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.15), transparent),
						linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8))
					`,
				}}
			/>

			{/* Enhanced gradient orbs for visual interest */}
			<div
				className="absolute inset-0 -z-10 overflow-hidden"
				aria-hidden="true"
			>
				<div className="absolute top-20 -left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse sm:animate-none" />
				<div className="absolute bottom-20 -right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-[100px]" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] animate-pulse delay-1000 sm:animate-none" />
			</div>

			<div className="absolute inset-0 -z-10">
				<HeroBackgroundAura />
			</div>

			{/* Radial Spotlight for grounding and depth */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

			{/* Main container - Centered content */}
			<div className="container-page relative z-10 mx-auto max-w-7xl overflow-visible">
				{/* LEFT SIDE - Content */}
				<div className="text-center space-y-8 relative overflow-visible px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
					{/* IMPACTFUL Headline with Enhanced Typography */}
					<h1
						className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-none mb-6 max-w-full overflow-visible tracking-tighter"
						style={{ wordSpacing: "0.05em" }}
					>
						<span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
							Graduate Jobs
						</span>
						<span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
							Made Simple
						</span>
					</h1>

					{/* Clear, impactful value proposition */}
					<p className="text-lg sm:text-xl md:text-2xl text-zinc-300 leading-tight max-w-4xl mx-auto mb-8">
						Get European internships, graduate & early-career roles in 2 minutes. <strong className="text-white font-bold">Personalized matches.</strong>
					</p>

					{/* Enhanced Social Proof */}
					<div className="relative mt-12 mb-8">
						{/* Social proof metrics */}
						<div className="relative flex items-center justify-center gap-4 mb-12">
							<div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full backdrop-blur-sm border border-emerald-500/20">
								<div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse sm:animate-none"></div>
								<span className="text-sm font-medium">
									1,000+ students matched
								</span>
							</div>
							<div className="w-px h-4 bg-zinc-600"></div>
							<div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full backdrop-blur-sm border border-cyan-500/20">
								<span className="text-sm font-medium">22 European cities</span>
							</div>
						</div>
					</div>

					{/* ENHANCED prominent CTA with glow */}
					<div className="flex justify-center">
						<div className="relative group">
							{/* Glow effect */}
							<div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>

							<CustomButton
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", { type: "free", location: "hero" });
								}}
								variant="primary"
								size="xl"
								className="relative text-xl px-12 py-6 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300"
								aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
								icon="ArrowRight"
							>
								{CTA_GET_MY_5_FREE_MATCHES}
							</CustomButton>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default memo(Hero);
