"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { useStats } from "@/hooks/useStats";
import { useWindowSize } from "@/hooks/useWindowSize";
import { trackEvent } from "../../lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "../../lib/copy";
import { HeroMobileMockup } from "../marketing/HeroMobileMockup";
import { BrandIcons } from "../ui/BrandIcons";
import HeroBackgroundAura from "../ui/HeroBackgroundAura";
import TrustBadges from "./trust-badges";
import CustomButton from "../ui/CustomButton";

function Hero() {
	const preloadedJobs: any[] = []; // Removed API call for performance
	const { stats } = useStats();
	const { isMobile } = useWindowSize();

	// Removed API call for performance - hero should render immediately

	return (
		<section
			data-testid="hero-section"
			className="section-padding-hero pt-28 pb-20 md:pt-32 md:pb-24 relative isolate overflow-visible min-h-[25vh] md:min-h-[65vh] flex items-center bg-transparent"
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

			{/* Main container - Split Layout */}
			<div className="container-page relative z-10 mx-auto max-w-7xl overflow-visible">
				{/* Split Grid Layout: Content Left, Mockup Right */}
				<div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center mt-4 md:mt-8 overflow-visible">
					{/* LEFT SIDE - Content */}
					<div className="text-left space-y-4 sm:space-y-6 relative overflow-visible px-4 sm:pr-8 md:pr-10 sm:pl-6">
						{/* Headline - Clear hierarchy */}
						<h1 className="font-display text-display-xl font-black text-white mb-3 max-w-full sm:max-w-[560px] lg:max-w-[640px] xl:max-w-[760px] relative overflow-visible" style={{ wordSpacing: "0.05em" }}>
							Stop wasting 40+ hours{" "}
							<span className="text-emerald-400">
								job searching
							</span>
						</h1>

						{/* Single, clear value proposition */}
						<p className="text-body-lg text-zinc-300 leading-relaxed max-w-xl mb-4 mt-2 sm:mt-4 overflow-visible">
							Get your perfect EU role in{" "}
							<span className="text-emerald-400 font-semibold">
								2 minutes
							</span>
							{" "}instead of wasting 40+ hours searching.
						</p>

						{/* Social Proof for Free Instant Matches */}
						<div className="mb-6">
							<div className="inline-flex items-center gap-3 px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-full">
								{/* Static elements for better mobile performance */}
								<div className="relative flex h-3 w-3">
									<span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
								</div>

								<span className="text-sm font-semibold text-emerald-300">
									1,247 students got matches
								</span>

								<div className="flex items-center gap-1 text-emerald-400">
									<BrandIcons.TrendingUp className="h-3 w-3" />
									<span className="text-xs font-medium">+23 today</span>
								</div>
							</div>
						</div>

						{/* CTAs */}
						<div className="flex flex-col gap-3 pt-2">
							<CustomButton
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", { type: "free", location: "hero" });
								}}
								variant="primary"
								size="lg"
								className="w-full sm:w-auto sm:max-w-xs"
								aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
								icon="ArrowRight"
							>
								{CTA_GET_MY_5_FREE_MATCHES}
							</CustomButton>

							<TrustBadges />

							{/* Onboarding Preview - What we'll ask */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.42, duration: 0.6 }}
								className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-zinc-900/30 border border-zinc-700"
							>
								<p className="font-display text-xs sm:text-sm font-bold text-white/90 mb-3 sm:mb-4 flex items-center gap-2">
									<BrandIcons.Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-300 flex-shrink-0" />
									Here's what we'll ask:
								</p>
								<div className="grid grid-cols-1 gap-3 sm:gap-3">
									<motion.div
										whileHover={isMobile ? undefined : { scale: 1.02 }}
										className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
										style={!isMobile ? { transform: "translateZ(0)" } : {}}
									>
										<div className="p-2 rounded-lg bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors flex-shrink-0 mt-0.5">
											<BrandIcons.MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<span className="font-display text-sm sm:text-base font-semibold text-white/90">
													Cities
												</span>
												<span className="font-display text-xs text-emerald-400 font-medium bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
													Pick up to 3
												</span>
											</div>
											<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
												London, Paris, Berlin and more - where you want to work
											</p>
										</div>
									</motion.div>

									<motion.div
										whileHover={isMobile ? undefined : { scale: 1.02 }}
										className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
										style={!isMobile ? { transform: "translateZ(0)" } : {}}
									>
										<div className="p-2 rounded-lg bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors flex-shrink-0 mt-0.5">
											<BrandIcons.Compass className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<span className="font-display text-sm sm:text-base font-semibold text-white/90">
													Career Paths
												</span>
												<span className="font-display text-xs text-emerald-400 font-medium bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
													Pick up to 2
												</span>
											</div>
											<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
												Strategy, Product, Data, Marketing, Tech...
											</p>
										</div>
									</motion.div>

									<motion.div
										whileHover={isMobile ? undefined : { scale: 1.02 }}
										className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
										style={!isMobile ? { transform: "translateZ(0)" } : {}}
									>
										<div className="p-2 rounded-lg bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors flex-shrink-0 mt-0.5">
											<BrandIcons.Passport className="h-4 w-4 sm:h-5 sm:w-5 text-brand-400" />
										</div>
										<div className="flex-1 min-w-0">
											<span className="text-sm sm:text-base font-semibold text-white/90 block mb-1">
												Visa Status
											</span>
											<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
												EU/EEA/Swiss citizen, work permit, student visa, or need
												sponsorship?
											</p>
										</div>
									</motion.div>
								</div>
							</motion.div>
						</div>
					</div>

					{/* RIGHT SIDE - Mobile Mockup (3D Interactive) */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="relative flex justify-center lg:justify-end items-start mt-8 lg:mt-0"
					>
						<HeroMobileMockup
							stats={stats ? { totalUsers: stats.totalUsers } : undefined}
							preloadedJobs={preloadedJobs}
						/>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

export default memo(Hero);
