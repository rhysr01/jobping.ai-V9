"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

interface HeroSectionProps {
	activeJobs: string;
	totalUsers: string;
	isLoadingStats: boolean;
}

export function HeroSection({
	activeJobs,
	totalUsers,
	isLoadingStats,
}: HeroSectionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="mb-10 text-center sm:mb-16 md:mb-20"
		>
		<span className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-500/50 bg-brand-500/15 px-5 py-2 text-sm font-bold text-brand-100 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
			<BrandIcons.Star className="h-4 w-4" />
			Premium · €5/month · Cancel anytime
		</span>

		<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
			Onboarding
		</span>
		<h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
			Get 15 Premium Matches for €5/mo
		</h1>
			<p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-medium leading-relaxed text-zinc-100 px-2">
				We only ask for the essentials so we can filter internships and graduate
				roles you can actually land.
			</p>

			<div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-100">
				{Copy.REASSURANCE_ITEMS.map((item) => (
					<span
						key={item}
						className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm"
					>
						<BrandIcons.Check className="h-4 w-4 text-brand-300" />
						{item}
					</span>
				))}
			</div>

			<div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-300">
				<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-brand-100 backdrop-blur-sm">
					<BrandIcons.Target className="h-4 w-4 text-brand-300" />
					{isLoadingStats ? (
						<span className="inline-block h-4 w-20 animate-pulse rounded bg-white/15" />
					) : (
						`${activeJobs} active jobs this week`
					)}
				</span>
				{!isLoadingStats &&
					totalUsers &&
					parseInt(totalUsers.replace(/\D/g, ""), 10) > 0 && (
						<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
							<BrandIcons.Users className="h-4 w-4 text-brand-300" />
							{`${totalUsers}+ students on JobPing`}
						</span>
					)}
				<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
					<BrandIcons.Clock className="h-4 w-4 text-brand-300" />
					First drop arrives within 48 hours
				</span>
			</div>
		</motion.div>
	);
}
