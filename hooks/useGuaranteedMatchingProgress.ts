"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TIMING } from "../lib/constants";

// Use constants from lib/constants.ts
const STAGE_DURATIONS = [
	TIMING.MATCHING_STAGES.SQL,
	TIMING.MATCHING_STAGES.GEO,
	TIMING.MATCHING_STAGES.AI,
	TIMING.MATCHING_STAGES.SCORE,
]; // Total: 11s (SQL, Geo, AI, Score)
const MIN_DELAY_MS = TIMING.MATCHING_MIN_DELAY_MS;

/**
 * Hook to coordinate guaranteed matching progress stages
 * Manages staged timing for perceived performance - makes results feel "fresh" rather than "stale"
 *
 * Performance Art Logic: If API returns in 100ms, user sees 1.9s of "Neural Sweep" animation.
 * This builds trust and makes the results feel intentional, not glitchy.
 */
export function useGuaranteedMatchingProgress(
	isActive: boolean,
	onComplete?: () => void,
) {
	const [currentStage, setCurrentStage] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const startTimeRef = useRef<number | null>(null);
	const nestedTimerRef = useRef<NodeJS.Timeout | null>(null); // CRITICAL FIX: Move to top of hook

	useEffect(() => {
		if (!isActive || isComplete) return;

		// Track start time for minimum delay enforcement
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}

		const timers: NodeJS.Timeout[] = [];

		// Calculate cumulative timings for each stage
		let cumulativeTime = 0;
		STAGE_DURATIONS.forEach((duration, index) => {
			cumulativeTime += duration;
			const timer = setTimeout(() => {
				if (index < STAGE_DURATIONS.length - 1) {
					setCurrentStage(index + 1);
				} else {
					// Ensure minimum delay before completion
					// If API returns fast, we still show animation for MIN_DELAY_MS
					const elapsed = Date.now() - (startTimeRef.current || 0);
					const remainingDelay = Math.max(0, MIN_DELAY_MS - elapsed);

					// CRITICAL FIX: Store nested timeout for cleanup
					nestedTimerRef.current = setTimeout(() => {
						setIsComplete(true);
						onComplete?.();
					}, remainingDelay);
				}
			}, cumulativeTime);

			timers.push(timer);
		});

		return () => {
			timers.forEach((timer) => {
				clearTimeout(timer);
			});
			// CRITICAL FIX: Clean up nested timeout to prevent memory leaks
			if (nestedTimerRef.current) {
				clearTimeout(nestedTimerRef.current);
			}
		};
	}, [isActive, isComplete, onComplete]);

	const reset = useCallback(() => {
		setCurrentStage(0);
		setIsComplete(false);
		startTimeRef.current = null;
		if (nestedTimerRef.current) {
			clearTimeout(nestedTimerRef.current);
			nestedTimerRef.current = null;
		}
	}, []);

	return {
		currentStage,
		isComplete,
		reset,
	};
}
