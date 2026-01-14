"use client";

import { motion } from "framer-motion";
import { memo, useEffect, useState } from "react";
import { useStats } from "../../hooks/useStats";
import { useWindowSize } from "../../hooks/useWindowSize";
import { trackEvent } from "../../lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "../../lib/copy";
import { HeroMobileMockup } from "../marketing/HeroMobileMockup";
import { BrandIcons } from "../ui/BrandIcons";
import GradientText from "../ui/GradientText";
import HeroBackgroundAura from "../ui/HeroBackgroundAura";
import TrustBadges from "./trust-badges";

function Hero() {
	const [preloadedJobs, setPreloadedJobs] = useState<any[]>([]);
	const { stats } = useStats();
	const { isMobile } = useWindowSize();

	// Defer job pre-fetching to improve initial page load performance
	useEffect(() => {
		async function fetchJobs() {
			try {
				// Calculate week number for rotation
				const now = new Date();
				const start = new Date(now.getFullYear(), 0, 1);
				const days = Math.floor(
					(now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
				);
				const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

				const response = await fetch(
					`/api/sample-jobs?day=monday&tier=free&week=${weekNumber}`,
					{
						signal: AbortSignal.timeout(8000), // 8 second timeout for hero
					},
				);

				if (!response.ok) {
					throw new Error(
						`HTTP ${response.status}: Failed to fetch sample jobs`,
					);
				}

				const data = await response.json();

				if (data.jobs && data.jobs.length > 0) {
					setPreloadedJobs(data.jobs);
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Failed to pre-fetch jobs:", error);
				}
				// Silently fail - hero will use fallback data
				// This is intentional as hero should always render
			}
		}

		const timeoutId = setTimeout(fetchJobs, 2000); // Defer by 2 seconds

		return () => clearTimeout(timeoutId); // Cleanup timeout on unmount
	}, []);

	return (
		<section
			data-testid="hero-section"
			className="section-padding-hero pt-28 pb-20 md:pt-32 md:pb-24 relative isolate overflow-visible min-h-[60vh] md:min-h-[65vh] flex items-center bg-transparent"
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

			{/* Animated Gradient Orbs for Premium Feel */}
			<div
				className="absolute inset-0 -z-10 overflow-hidden"
				aria-hidden="true"
			>
				<div className="absolute top-0 -left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
				<div
					className="absolute top-1/4 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-[100px] animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
				<div
					className="absolute bottom-0 left-1/2 w-72 h-72 bg-purple-500/10 rounded-full blur-[90px] animate-pulse"
					style={{ animationDelay: "2s" }}
				/>
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
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							duration: isMobile ? 0.4 : 0.6,
							ease: "easeOut", // Better performance than easeInOut
						}}
						className="text-left space-y-4 sm:space-y-6 relative overflow-visible px-4 sm:pr-8 md:pr-10 sm:pl-6"
						style={{
							backgroundColor: "transparent",
							overflow: "visible",
							overflowX: "visible",
							overflowY: "visible",
							willChange: "transform, opacity", // Hint browser for optimization
							backfaceVisibility: "hidden", // Prevent flickering
							transform: "translateZ(0)", // Force hardware acceleration
						}}
					>
						{/* Headline - "Silver Silk" gradient */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2, duration: 0.6 }}
							className="font-display text-[2.5rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.15] lg:text-7xl lg:leading-[1.15] font-extrabold tracking-tight mb-3 max-w-full sm:max-w-[560px] lg:max-w-[640px] xl:max-w-[760px] relative overflow-visible"
							style={{ wordSpacing: "0.05em", letterSpacing: "-0.02em" }}
						>
							{/* Silver Silk gradient: purple-500/80 (20%) → zinc-100 (50%) → purple-500/80 (80%) */}
							<GradientText variant="brand" className="inline-block">
								Get 5 early-career
							</GradientText>{" "}
							<GradientText variant="brand" className="inline-block">
								job matches
							</GradientText>{" "}
							<span className="text-content-primary inline-block">
								instantly
							</span>{" "}
							<GradientText
								variant="brand"
								className={`inline-block text-[2.5rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.15] lg:text-7xl lg:leading-[1.15] font-black ${isMobile ? "" : "will-change-transform"}`}
								style={
									isMobile
										? {}
										: {
												transform: "translateZ(0)",
												backfaceVisibility: "hidden",
											}
								}
							>
								free
							</GradientText>
						</motion.h1>

						{/* Tagline - Emerald Green */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.22, duration: 0.6 }}
							className="text-base sm:text-lg md:text-xl text-emerald-400 leading-relaxed max-w-xl mb-4 mt-2 sm:mt-4 overflow-visible"
							style={{ wordSpacing: "0.02em" }}
						>
							<GradientText variant="brand" className="inline">
								Skip
							</GradientText>{" "}
							<GradientText variant="brand" className="inline">
								40+
							</GradientText>{" "}
							hours of job searching a month.{" "}
							<GradientText variant="brand" className="inline">
								Get
							</GradientText>{" "}
							<GradientText variant="brand" className="inline">
								5
							</GradientText>{" "}
							roles matching your{" "}
							<GradientText variant="brand" className="inline">
								skills
							</GradientText>
							,
							<GradientText variant="brand" className="inline">
								location
							</GradientText>
							, and{" "}
							<GradientText variant="brand" className="inline">
								visa
							</GradientText>{" "}
							in{" "}
							<GradientText variant="brand" className="inline">
								2 minutes
							</GradientText>
							.
						</motion.p>

						{/* Social Proof for Free Instant Matches */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.28, duration: 0.6 }}
							className="mb-6"
						>
							<div className="inline-flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/8 to-purple-500/10 border border-emerald-500/20 rounded-full backdrop-blur-sm">
								{/* Animated pulse dot */}
								<motion.div
									className="relative flex h-3 w-3"
									animate={{ scale: [1, 1.2, 1] }}
									transition={{ duration: 2, repeat: Infinity }}
								>
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
								</motion.div>

								{/* Live counter effect */}
								<motion.span
									className="text-sm font-semibold text-emerald-300"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.5 }}
								>
									1,247 students got matches
								</motion.span>

								{/* Trending indicator */}
								<motion.div
									className="flex items-center gap-1 text-emerald-400"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.7 }}
								>
									<BrandIcons.TrendingUp className="h-3 w-3" />
									<span className="text-xs font-medium">+23 today</span>
								</motion.div>
							</div>
						</motion.div>

						{/* CTAs */}
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3, duration: 0.6 }}
							className="flex flex-col gap-3 pt-2"
						>
							<a
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", { type: "free", location: "hero" });
								}}
								className="btn-cta-enhanced w-full sm:w-auto sm:max-w-xs hover:shadow-[0_8px_30px_rgba(139,92,246,0.4)]"
								aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
							>
								<span className="flex items-center justify-center gap-2">
									{CTA_GET_MY_5_FREE_MATCHES}
									<BrandIcons.ArrowRight className="h-5 w-5" />
								</span>
							</a>

							<TrustBadges />

							{/* Onboarding Preview - What we'll ask */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.42, duration: 0.6 }}
								className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 backdrop-blur-sm shadow-lg shadow-brand-500/5"
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
						</motion.div>
					</motion.div>

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
