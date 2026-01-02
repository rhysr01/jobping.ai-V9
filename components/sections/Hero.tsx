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
			className="section-padding-hero pt-16 pb-20 md:pt-20 md:pb-24 relative isolate overflow-hidden min-h-[60vh] md:min-h-[65vh] flex items-center bg-black"
		>
			{/* Layer 1: The Dot Grid (The Foundation) */}
			<div
				className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
				aria-hidden="true"
			/>

			{/* Layer 2: Gradient Background + HeroBackgroundAura (The Mood) */}
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-base via-black to-surface-base" />
			<div className="absolute inset-0 -z-10">
				<HeroBackgroundAura />
			</div>

			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

			{/* Main container - Split Layout */}
			<div className="container-page relative z-10 mx-auto max-w-7xl">
				{/* Split Grid Layout: Content Left, Mockup Right */}
				<div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mt-4 md:mt-8">
					{/* LEFT SIDE - Content */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6 }}
						className="text-left space-y-6 relative"
						style={{ backgroundColor: "transparent" }}
					>
						{/* Headline - "Silver Silk" gradient */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2, duration: 0.6 }}
							className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-extrabold tracking-tighter leading-[1.1] mb-3 max-w-[540px] relative pl-1 overflow-visible"
						>
							{/* Silver Silk gradient: purple-500/80 (20%) → zinc-100 (50%) → purple-500/80 (80%) */}
							<GradientText variant="brand">Get 5 early-career</GradientText>{" "}
							<GradientText variant="brand">job matches</GradientText>{" "}
							<span className="text-content-primary block">
								instantly
							</span>
							<GradientText variant="brand" className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] font-black">
								free
							</GradientText>
						</motion.h1>

						{/* Subheadline - HIGH-STAKES - Clear value prop */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.25, duration: 0.6 }}
							className="text-lg md:text-xl text-white/70 leading-relaxed max-w-xl mb-4 mt-6"
						>
							Stop guessing about <strong className="text-white font-bold">visa status</strong>. Get curated graduate roles{" "}
							<strong className="text-white font-bold">matched to your city and career path</strong> in under 2 minutes.
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
								className="inline-flex min-h-[44px] h-12 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold px-8 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black hover:from-brand-500 hover:to-indigo-500 w-full sm:w-auto sm:max-w-xs text-base md:text-lg shadow-lg hover:shadow-xl shadow-[0_4px_20px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.6)]"
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
								className="mt-4 p-4 rounded-xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 backdrop-blur-sm shadow-lg shadow-brand-500/5"
							>
								<p className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
									<BrandIcons.Info className="h-4 w-4 text-brand-300" />
									Here's what we'll ask:
								</p>
								<div className="grid grid-cols-2 gap-2.5">
									<motion.div
										whileHover={{ scale: 1.02 }}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
									>
										<div className="p-1.5 rounded-md bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors">
											<BrandIcons.Target className="h-4 w-4 text-brand-300" />
										</div>
										<span className="text-sm font-semibold text-white/90">Cities</span>
									</motion.div>
									<motion.div
										whileHover={{ scale: 1.02 }}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
									>
										<div className="p-1.5 rounded-md bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors">
											<BrandIcons.Briefcase className="h-4 w-4 text-brand-300" />
										</div>
										<span className="text-sm font-semibold text-white/90">Career path</span>
									</motion.div>
									<motion.div
										whileHover={{ scale: 1.02 }}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
									>
										<div className="p-1.5 rounded-md bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors">
											<BrandIcons.Shield className="h-4 w-4 text-brand-300" />
										</div>
										<span className="text-sm font-semibold text-white/90">Visa status</span>
									</motion.div>
									<motion.div
										whileHover={{ scale: 1.02 }}
										className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-400/30 transition-all group"
									>
										<div className="p-1.5 rounded-md bg-brand-500/20 group-hover:bg-brand-500/30 transition-colors">
											<BrandIcons.GraduationCap className="h-4 w-4 text-brand-300" />
										</div>
										<span className="text-sm font-semibold text-white/90">Experience</span>
									</motion.div>
								</div>
							</motion.div>

							{/* Social Proof Stats */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.4, duration: 0.6 }}
								className="pt-3"
							>
								{stats ? (
									<>
										<p className="text-base font-semibold text-white/70 mb-1">
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
						className="relative flex justify-center lg:justify-end items-start"
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
