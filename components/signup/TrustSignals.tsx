"use client";

import { motion } from "framer-motion";

interface TrustSignalsProps {
	activeJobs: string;
	isLoadingStats: boolean;
}

export function TrustSignals({
	activeJobs,
	isLoadingStats,
}: TrustSignalsProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.6 }}
			className="mt-12 text-center space-y-4"
		>
			<div className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-6 py-3 rounded-full backdrop-blur-sm">
				<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
				<span className="text-sm font-bold text-zinc-300">
					{isLoadingStats ? (
						<span className="inline-block w-24 h-4 bg-zinc-600/20 rounded animate-pulse"></span>
					) : (
						`${activeJobs} active early-career roles`
					)}
				</span>
				<span className="text-zinc-400">·</span>
				<span className="text-sm text-zinc-400">Updated daily</span>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 px-4">
				<div className="flex items-center gap-1.5">
					<svg
						className="w-4 h-4 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
					<span>No CV required</span>
				</div>
				<span className="text-zinc-700">·</span>
				<div className="flex items-center gap-1.5">
					<svg
						className="w-4 h-4 text-green-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
					<span>Unsubscribe anytime</span>
				</div>
			</div>
		</motion.div>
	);
}
