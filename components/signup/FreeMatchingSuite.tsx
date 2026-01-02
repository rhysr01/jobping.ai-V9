"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { GuaranteedMatchingProgress } from "./GuaranteedMatchingProgress";
import { TIMING } from "@/lib/constants";
import { useGuaranteedMatchingProgress } from "@/hooks/useGuaranteedMatchingProgress";

interface FreeMatchingSuiteProps {
	matchCount: number;
	isLoading: boolean;
	onComplete?: () => void;
}

type FlowState = "celebrating" | "matching" | "complete";

/**
 * Unified "Matching Suite" - Combines celebration + progress into one cohesive experience
 * Phase A: 2s Celebration (confetti + success message)
 * Phase B: 6s Matching Progress (animated stages)
 * Phase C: Reveal (job cards fade in)
 */
export function FreeMatchingSuite({
	matchCount,
	isLoading,
	onComplete,
}: FreeMatchingSuiteProps) {
	const [flowState, setFlowState] = useState<FlowState>("celebrating");
	const [confettiActive, setConfettiActive] = useState(true);

	// Use the progress hook for matching stage
	const { currentStage } = useGuaranteedMatchingProgress(
		flowState === "matching" && isLoading,
	);

	// Single source of truth for timeline
	useEffect(() => {
		// Phase A: Celebration (2 seconds)
		const celebrationTimer = setTimeout(() => {
			setFlowState("matching");
			setConfettiActive(false);
		}, TIMING.MATCHING_CELEBRATION_MS || 2000);

		return () => {
			clearTimeout(celebrationTimer);
		};
	}, []);

	// Move to complete when loading finishes
	useEffect(() => {
		if (!isLoading && flowState === "matching") {
			const revealTimer = setTimeout(() => {
				setFlowState("complete");
				onComplete?.();
			}, 300); // Small delay for smooth transition

			return () => clearTimeout(revealTimer);
		}
	}, [isLoading, flowState, onComplete]);

	// Confetti animation (only during celebration phase)
	useEffect(() => {
		if (!confettiActive || flowState !== "celebrating") return;

		const duration = TIMING.MATCHING_CELEBRATION_MS || 2000;
		const animationEnd = Date.now() + duration;
		const defaults = {
			startVelocity: 30,
			spread: 360,
			ticks: 60,
			zIndex: 9999,
		};

		function randomInRange(min: number, max: number) {
			return Math.random() * (max - min) + min;
		}

		const colors = ["#8b5cf6", "#10b981", "#ffffff"];

		const interval = setInterval(() => {
			const timeLeft = animationEnd - Date.now();
			if (timeLeft <= 0) {
				clearInterval(interval);
				return;
			}

			const particleCount = 50 * (timeLeft / duration);

			// Triple burst confetti
			confetti({
				...defaults,
				particleCount,
				colors: [colors[0], colors[1]],
				origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
			});
			confetti({
				...defaults,
				particleCount,
				colors: [colors[1], colors[2]],
				origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
			});
			confetti({
				...defaults,
				particleCount: particleCount * 0.5,
				colors: colors,
				origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 },
			});
		}, 250);

		return () => clearInterval(interval);
	}, [confettiActive, flowState]);

	// Don't render if complete
	if (flowState === "complete") {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
			<div className="w-full max-w-2xl mx-auto px-4 space-y-8">
				{/* Celebration Header - Shows during celebration phase */}
				<AnimatePresence mode="wait">
					{flowState === "celebrating" && (
						<motion.div
							key="celebration"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3 }}
							className="text-center"
						>
							{/* Success Icon */}
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{
									delay: 0.1,
									type: "spring",
									stiffness: 200,
									damping: 15,
								}}
								className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.6)] border-4 border-emerald-500/30 mb-6"
							>
								<BrandIcons.Check className="w-10 h-10 text-white" />
							</motion.div>

							<h2 className="text-3xl font-bold text-white mb-2">Success!</h2>
							<p className="text-zinc-400 text-lg">
								Found{" "}
								<span className="text-brand-400 font-semibold">{matchCount}</span>{" "}
								{matchCount === 1 ? "match" : "matches"} for you.
							</p>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Matching Progress - Shows during matching phase */}
				<AnimatePresence mode="wait">
					{flowState === "matching" && (
						<motion.div
							key="matching"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3 }}
						>
							<GuaranteedMatchingProgress currentStageIndex={currentStage} />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

