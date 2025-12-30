/**
 * Performance utilities for animations and device detection
 */

// Throttle animations based on device performance
export function shouldThrottleAnimations(): boolean {
	if (typeof window === "undefined") return false;

	// Check for low-end device indicators
	const connection =
		(navigator as any).connection ||
		(navigator as any).mozConnection ||
		(navigator as any).webkitConnection;
	const hardwareConcurrency = navigator.hardwareConcurrency || 4;
	const deviceMemory = (navigator as any).deviceMemory || 4;

	// Throttle if:
	// - Slow connection (2G, 3G)
	// - Low CPU cores (< 4)
	// - Low device memory (< 4GB)
	if (connection) {
		const effectiveType = connection.effectiveType;
		if (effectiveType === "2g" || effectiveType === "slow-2g") return true;
	}

	if (hardwareConcurrency < 4) return true;
	if (deviceMemory < 4) return true;

	return false;
}

// Intersection Observer hook for lazy loading animations
import { type RefObject, useEffect, useState } from "react";

export function useIntersectionObserver(
	ref: RefObject<Element>,
	options?: IntersectionObserverInit,
): boolean {
	const [isIntersecting, setIsIntersecting] = useState(false);

	useEffect(() => {
		if (!ref.current) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsIntersecting(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1, ...options },
		);

		observer.observe(ref.current);
		return () => observer.disconnect();
	}, [ref, options]);

	return isIntersecting;
}
