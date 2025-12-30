"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BrandIcons } from "./BrandIcons";

interface VisaConfidenceTooltipProps {
	confidence: "verified" | "likely" | "local-only" | "unknown";
	reason: string;
	confidencePercentage?: number;
	children: React.ReactNode;
}

export function VisaConfidenceTooltip({
	confidence,
	reason,
	confidencePercentage,
	children,
}: VisaConfidenceTooltipProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);

	const showTooltip = isHovered || isFocused;

	// Position tooltip above the trigger
	useEffect(() => {
		if (showTooltip && tooltipRef.current && triggerRef.current) {
			const triggerRect = triggerRef.current.getBoundingClientRect();
			const tooltipRect = tooltipRef.current.getBoundingClientRect();

			// Position above, centered
			tooltipRef.current.style.left = `${triggerRect.left + (triggerRect.width / 2) - tooltipRect.width / 2}px`;
			tooltipRef.current.style.top = `${triggerRect.top - tooltipRect.height - 8}px`;
		}
	}, [showTooltip]);

	return (
		<div className="relative inline-flex items-center">
			<div
				ref={triggerRef}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
				className="inline-flex items-center"
			>
				{children}
				<button
					type="button"
					className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
					aria-label="Visa sponsorship details"
					tabIndex={0}
				>
					<BrandIcons.Info className="w-3 h-3 text-zinc-400" />
				</button>
			</div>

			<AnimatePresence>
				{showTooltip && (
					<motion.div
						ref={tooltipRef}
						initial={{ opacity: 0, y: 4, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className="fixed z-50 pointer-events-none"
						role="tooltip"
					>
						<div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl max-w-xs">
							{/* Glass morphism effect */}
							<div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl" />

							<div className="relative">
								{confidencePercentage !== undefined &&
									confidencePercentage > 0 && (
										<div className="text-xs font-semibold text-brand-400 mb-2">
											{confidencePercentage}% Confidence
										</div>
									)}
								<p className="text-sm text-zinc-200 leading-relaxed">
									{reason}
								</p>
								{confidence === "unknown" && (
									<div className="mt-3 pt-3 border-t border-white/10">
										<p className="text-xs text-zinc-400 italic">
											💡 Pro Tip: Many startups sponsor visas even if not
											listed. Read our guide on how to ask during interviews.
										</p>
									</div>
								)}
							</div>

							{/* Arrow pointing down */}
							<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-r border-b border-white/10 rotate-45" />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
