"use client";

import { useState, useEffect, useCallback } from "react";

const STAGE_DURATIONS = [2000, 3000, 4000, 2000]; // Total: 11s (SQL, Geo, AI, Score)

/**
 * Hook to coordinate guaranteed matching progress stages
 * Manages staged timing for perceived performance - makes results feel "fresh" rather than "stale"
 */
export function useGuaranteedMatchingProgress(
	isActive: boolean,
	onComplete?: () => void,
) {
	const [currentStage, setCurrentStage] = useState(0);
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		if (!isActive || isComplete) return;

		const timers: NodeJS.Timeout[] = [];

		// Calculate cumulative timings for each stage
		let cumulativeTime = 0;
		STAGE_DURATIONS.forEach((duration, index) => {
			cumulativeTime += duration;
			const timer = setTimeout(() => {
				if (index < STAGE_DURATIONS.length - 1) {
					setCurrentStage(index + 1);
				} else {
					setIsComplete(true);
					onComplete?.();
				}
			}, cumulativeTime);

			timers.push(timer);
		});

		return () => {
			timers.forEach((timer) => clearTimeout(timer));
		};
	}, [isActive, isComplete, onComplete]);

	const reset = useCallback(() => {
		setCurrentStage(0);
		setIsComplete(false);
	}, []);

	return {
		currentStage,
		isComplete,
		reset,
	};
}

