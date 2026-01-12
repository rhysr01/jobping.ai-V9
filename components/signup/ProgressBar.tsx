"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "../ui/BrandIcons";

interface ProgressBarProps {
	step: number;
}

export function ProgressBar({ step }: ProgressBarProps) {
	return (
		<>
			{/* Sticky Progress Bar - iOS Safari Compatible */}
			<div className="sticky top-[-1px] z-40 bg-black/90 backdrop-blur-md border-b border-white/10 mb-6 shadow-lg">
				<div className="h-1.5 bg-zinc-800/80 relative overflow-hidden">
					<motion.div
						className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
						initial={{ width: 0 }}
						animate={{ width: `${(step / 4) * 100}%` }}
						transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
					/>
					{/* Animated shimmer effect */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
						animate={{
							x: ["-100%", "200%"],
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							repeatDelay: 1,
							ease: "easeInOut",
						}}
						style={{ width: `${(step / 4) * 100}%` }}
					/>
				</div>
				<div className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
					<span className="text-zinc-300">Step {step} of 4</span>
					<span className="text-emerald-400">{Math.round((step / 4) * 100)}%</span>
				</div>
			</div>

			{/* Desktop Progress Indicator - Hidden on mobile */}
			<div className="mb-10 sm:mb-16 hidden sm:block" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4} aria-label={`Signup progress: Step ${step} of 4`}>
				<div className="flex justify-between mb-3 sm:mb-4 px-1 sm:px-2">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="flex items-center gap-1 sm:gap-3">
							<motion.div
								className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all shadow-lg ${
									i < step
										? "bg-emerald-500 text-white shadow-emerald-500/30"
										: i === step
											? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.4)] ring-4 ring-emerald-500/30"
											: "bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400"
								}`}
								animate={i === step ? { scale: [1, 1.1, 1] } : {}}
								transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
							>
								{i < step ? <BrandIcons.Check className="h-6 w-6" /> : i}
							</motion.div>
							<span className="hidden sm:inline text-sm font-bold text-zinc-300">
								{i === 1
									? "Basics"
									: i === 2
										? "Preferences"
										: i === 3
											? "Career"
											: "Optional"}
							</span>
							{i === 4 && (
								<span className="hidden sm:inline text-xs text-zinc-500 ml-1">
									(Optional)
								</span>
							)}
						</div>
					))}
				</div>
				<div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50 relative">
					<motion.div
						className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] relative"
						initial={{ width: 0 }}
						animate={{ width: `${(step / 4) * 100}%` }}
						transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
					>
						{/* Shimmer effect */}
						<motion.div
							className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
							animate={{
								x: ["-100%", "200%"],
							}}
							transition={{
								duration: 2,
								repeat: Infinity,
								repeatDelay: 1,
								ease: "easeInOut",
							}}
					/>
					</motion.div>
				</div>
				<div className="text-xs text-zinc-400 text-center mt-2 font-medium">
					{Math.round((step / 4) * 100)}% complete
				</div>
			</div>
		</>
	);
}
