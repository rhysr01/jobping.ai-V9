"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HeroMobileMockup } from "@/components/marketing/HeroMobileMockup";
import TrustBadges from "@/components/sections/TrustBadges";
import { BrandIcons } from "@/components/ui/BrandIcons";
import GradientText from "@/components/ui/GradientText";
import HeroBackgroundAura from "@/components/ui/HeroBackgroundAura";
import { useStats } from "@/hooks/useStats";
import { trackEvent } from "@/lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "@/lib/copy";

export default function Hero() {
	const [preloadedJobs, setPreloadedJobs] = useState<any[]>([]);
	const { stats } = useStats();

	// Pre-fetch jobs immediately on mount (before component renders)
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

		fetchJobs();
	}, []);

	return (
		<section
			data-testid="hero-section"
			className="section-padding-hero pt-16 pb-20 md:pt-20 md:pb-24 relative isolate overflow-visible min-h-[60vh] md:min-h-[65vh] flex items-center bg-black"
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
					`
				}}
			/>
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
						transition={{ duration: 0.6 }}
						className="text-left space-y-4 sm:space-y-6 relative overflow-visible px-4 sm:pr-8 md:pr-10 sm:pl-6"
						style={{ backgroundColor: "transparent", overflow: "visible", overflowX: "visible", overflowY: "visible" }}
					>
						{/* Headline - "Silver Silk" gradient */}
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.6 }}
						className="text-[2.5rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.15] lg:text-7xl lg:leading-[1.15] font-extrabold tracking-tight mb-3 max-w-full sm:max-w-[560px] lg:max-w-[640px] xl:max-w-[760px] relative overflow-visible"
						style={{ wordSpacing: '0.05em', letterSpacing: '-0.02em' }}
					>
						{/* Silver Silk gradient: purple-500/80 (20%) → zinc-100 (50%) → purple-500/80 (80%) */}
						<GradientText variant="brand" className="inline-block">Get 5 early-career</GradientText>{" "}
						<GradientText variant="brand" className="inline-block">job matches</GradientText>{" "}
						<span className="text-content-primary inline-block">
							instantly—
						</span>
						<GradientText variant="brand" className="inline-block text-[2.5rem] leading-[1.15] sm:text-5xl sm:leading-[1.15] md:text-6xl md:leading-[1.15] lg:text-7xl lg:leading-[1.15] font-black">
						free
					</GradientText>
				</motion.h1>

				{/* Tagline - Simplified */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.22, duration: 0.6 }}
					className="text-base sm:text-lg md:text-xl text-zinc-300 leading-relaxed max-w-xl mb-4 mt-2 sm:mt-4 overflow-visible"
					style={{ wordSpacing: '0.02em' }}
				>
					AI-powered job matching for early-career roles across Europe. Get personalized matches delivered to your inbox.
					</motion.p>

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
						<p className="text-xs sm:text-sm font-bold text-white/90 mb-3 sm:mb-4 flex items-center gap-2">
							<BrandIcons.Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-300 flex-shrink-0" />
							Here's what we'll ask:
						</p>
						<div className="grid grid-cols-1 gap-3 sm:gap-3">
							<motion.div
								whileHover={{ scale: 1.02 }}
								className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
							>
								<div className="p-2 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors flex-shrink-0 mt-0.5">
									<BrandIcons.MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span className="text-sm sm:text-base font-semibold text-white/90">Cities</span>
										<span className="text-xs text-emerald-400 font-medium bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
											Pick up to 3
										</span>
									</div>
									<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
										London, Paris, Berlin—where you want to work
									</p>
								</div>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.02 }}
								className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
							>
								<div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors flex-shrink-0 mt-0.5">
									<BrandIcons.Compass className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
								</div>
								<div className="flex-1 min-w-0">
									<span className="text-sm sm:text-base font-semibold text-white/90 block mb-1">Career Path</span>
									<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
										Strategy, Product, Data, Marketing, Engineering...
									</p>
								</div>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.02 }}
								className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
							>
								<div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors flex-shrink-0 mt-0.5">
									<BrandIcons.Passport className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
								</div>
								<div className="flex-1 min-w-0">
									<span className="text-sm sm:text-base font-semibold text-white/90 block mb-1">Visa Status</span>
									<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
										EU citizen or non-EU requiring sponsorship?
									</p>
								</div>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.02 }}
								className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
							>
								<div className="p-2 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors flex-shrink-0 mt-0.5">
									<BrandIcons.Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
								</div>
								<div className="flex-1 min-w-0">
									<span className="text-sm sm:text-base font-semibold text-white/90 block mb-1">Experience Level</span>
									<p className="text-xs sm:text-sm text-white/70 leading-relaxed">
										Graduate, Intern, 0-2 years—your career stage
									</p>
								</div>
							</motion.div>
						</div>
					</motion.div>

					{/* Social Proof Stats */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.6 }}
						className="pt-2 sm:pt-3"
					>
						{stats ? (
							<>
								<p className="text-sm sm:text-base font-semibold text-white/70 mb-1">
									Join{" "}
									<strong className="text-white font-bold">
										{stats.totalUsers > 0
											? `${stats.totalUsers.toLocaleString("en-US")}+`
											: "1,500+"}
									</strong>{" "}
									job seekers finding roles
								</p>
								<p className="text-xs text-white/60">
									Trusted by students across Europe
								</p>
							</>
						) : (
							<div className="space-y-2">
								<div className="h-5 w-48 bg-white/5 rounded" />
								<div className="h-3 w-32 bg-white/5 rounded" />
							</div>
						)}
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
