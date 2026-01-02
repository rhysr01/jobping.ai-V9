"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { TIMING } from "@/lib/constants";

const STAGES = [
	{
		id: "sql",
		label: "Deep Database Query",
		sub: "Checking 2,000+ indexed roles...",
		duration: TIMING.MATCHING_STAGES.SQL,
	},
	{
		id: "geo",
		label: "Location Perimeter Expansion",
		sub: "Broadening search to Greater Region...",
		duration: TIMING.MATCHING_STAGES.GEO,
	},
	{
		id: "ai",
		label: "Real-time Source Scraping",
		sub: "Pinging 50+ job boards via AI...",
		duration: TIMING.MATCHING_STAGES.AI,
	},
	{
		id: "score",
		label: "Semantic Alignment",
		sub: "Ranking matches by career path...",
		duration: TIMING.MATCHING_STAGES.SCORE,
	},
];

interface GuaranteedMatchingProgressProps {
	currentStageIndex: number;
	onComplete?: () => void;
}

/**
 * GuaranteedMatchingProgress - "Neural Sweep" visual for premium matching experience
 * Transforms waiting time into perceived value by showing the engine "working"
 */
export function GuaranteedMatchingProgress({
	currentStageIndex,
	onComplete,
}: GuaranteedMatchingProgressProps) {
	return (
		<div className="w-full max-w-md mx-auto space-y-8 py-12">
			{/* The Visual "Scanner" - Matches BentoGrid scanning pattern */}
			<output
				className="relative h-48 w-full bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden"
				aria-live="polite"
				aria-label="Scanning for job matches"
			>
				{/* Animated Scanning Line - Vertical sweep */}
				<motion.div
					animate={{ top: ["-10%", "110%"] }}
					transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
					className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-700 to-transparent z-10 shadow-[0_0_15px_rgba(76,29,149,0.7)]"
					aria-hidden="true"
				/>

				{/* Abstract "Data Particles" - Subtle background animation */}
				<div className="absolute inset-0 flex items-center justify-center opacity-20">
					<div className="grid grid-cols-6 gap-4">
						{[...Array(24)].map((_, i) => (
							<motion.div
								key={i}
								animate={{ opacity: [0.2, 0.8, 0.2] }}
								transition={{
									duration: Math.random() * 2 + 1,
									repeat: Infinity,
									delay: Math.random() * 0.5,
								}}
								className="w-1 h-1 bg-brand-700 rounded-full"
								aria-hidden="true"
							/>
						))}
					</div>
				</div>
			</output>

			{/* The Progress Steps */}
			<div className="space-y-6">
				<AnimatePresence mode="wait">
					{STAGES.map((stage, index) => {
						const isActive = index === currentStageIndex;
						const isCompleted = index < currentStageIndex;
						const _isPending = index > currentStageIndex;

						return (
							<motion.div
								key={stage.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{
									opacity: isActive || isCompleted ? 1 : 0.3,
									x: 0,
								}}
								className="flex items-start gap-4 transition-opacity duration-500"
							>
								<div className="mt-1 flex-shrink-0">
									{isCompleted ? (
										<CheckCircle className="text-emerald-500 w-5 h-5" />
									) : isActive ? (
										<motion.div
											animate={{ rotate: 360 }}
											transition={{
												duration: 1,
												repeat: Infinity,
												ease: "linear",
											}}
											className="w-5 h-5 border-2 border-brand-700 border-t-transparent rounded-full"
											aria-label="Processing"
										/>
									) : (
										<div className="w-5 h-5 border-2 border-zinc-700 rounded-full" />
									)}
								</div>
								<div className="flex-1">
									<h3
										className={`text-sm font-bold ${
											isActive
												? "text-brand-500"
												: isCompleted
													? "text-emerald-400"
													: "text-zinc-400"
										}`}
									>
										{stage.label}
									</h3>
									{isActive && (
										<motion.p
											initial={{ opacity: 0, y: -5 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-xs text-zinc-500 italic mt-1"
										>
											{stage.sub}
										</motion.p>
									)}
								</div>
							</motion.div>
						);
					})}
				</AnimatePresence>
			</div>
		</div>
	);
}
