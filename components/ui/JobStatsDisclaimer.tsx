"use client";

import { motion } from "framer-motion";
import { Info, Zap } from "lucide-react";
import { Badge } from "./badge";

interface JobStatsDisclaimerProps {
	totalJobs?: number;
	totalCities?: number;
	isLoadingStats?: boolean;
	className?: string;
}

export function JobStatsDisclaimer({
	totalJobs = 8958,
	totalCities = 21,
	isLoadingStats = false,
	className = "",
}: JobStatsDisclaimerProps) {
	const jobSources = [
		"Indeed",
		"Glassdoor",
		"Adzuna",
		"Jooble",
		"Reed",
		"Arbeitnow",
		"Company Pages",
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay: 0.5, duration: 0.6 }}
			className={`text-center space-y-4 ${className}`}
		>
			{/* Job Stats Banner */}
			<div className="inline-flex items-center gap-3 px-6 py-4 rounded-full glass-card elevation-1 border border-white/10 bg-gradient-to-r from-zinc-900/60 to-zinc-800/60">
				{/* Live indicator */}
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
					<span className="text-sm font-medium text-emerald-400">Live</span>
				</div>

				{/* Stats */}
				<div className="flex items-center gap-1 text-lg md:text-xl">
					<span className="text-zinc-300">Updated daily •</span>
					<span className="text-white font-bold">
						{isLoadingStats ? (
							<span className="inline-block w-16 h-5 bg-zinc-600/30 rounded animate-pulse"></span>
						) : (
							`${totalJobs.toLocaleString()}+ roles`
						)}
					</span>
					<span className="text-zinc-300">from</span>
					<span className="text-white font-bold">{totalCities} cities</span>
					<span className="text-zinc-300">across Europe</span>
				</div>
			</div>

			{/* Enhanced Disclaimer */}
			<div className="max-w-3xl mx-auto">
				<div className="inline-flex items-start gap-3 px-6 py-4 rounded-xl glass-card elevation-1 border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm">
					<div className="flex-shrink-0 mt-0.5">
						<Info className="h-5 w-5 text-blue-400" />
					</div>

					<div className="text-left space-y-3">
						<p className="text-sm text-zinc-300 leading-relaxed">
							<span className="font-medium text-white">JobPing</span> aggregates jobs from trusted public sources and company career pages. We are not affiliated with these companies and match you with available listings.
						</p>

						{/* Job Sources Badges */}
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-zinc-400 font-medium">Sources:</span>
							{jobSources.map((source, index) => (
								<Badge
									key={source}
									variant="secondary"
									className="text-xs bg-zinc-800/60 text-zinc-300 border-zinc-700/50 hover:bg-zinc-700/60 transition-colors"
								>
									{source}
								</Badge>
							))}
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}