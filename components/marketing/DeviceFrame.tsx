"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
	children: React.ReactNode; // the email preview
	className?: string;
	hideOnMobile?: boolean; // NEW prop: hide device frame on mobile
	priority?: boolean; // NEW prop: prioritize image loading for LCP
	autoScroll?: boolean; // Enable auto-scroll
	scrollSpeed?: number; // Scroll speed multiplier (default: 1)
};

export default function DeviceFrame({
	children,
	className,
	hideOnMobile = false,
	priority = false,
	autoScroll = true, // Default to enabled
	scrollSpeed = 1,
}: Props) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const deviceFrameRef = useRef<HTMLDivElement>(null); // NEW: ref for device frame container
	const [isHovered, setIsHovered] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const [maxScroll, setMaxScroll] = useState(0);
	const prefersReducedMotion = useReducedMotion();
	const animationFrameRef = useRef<number | null>(null);
	const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Calculate max scroll when content loads
	useEffect(() => {
		if (scrollContainerRef.current && autoScroll) {
			const updateMaxScroll = () => {
				const container = scrollContainerRef.current;
				if (container) {
					// Use requestAnimationFrame to ensure DOM is fully rendered
					requestAnimationFrame(() => {
						if (container) {
							const max = Math.max(
								0,
								container.scrollHeight - container.clientHeight,
							);
							setMaxScroll(max);
						}
					});
				}
			};

			// Initial calculation with small delay to ensure content is loaded
			const timeoutId = setTimeout(updateMaxScroll, 100);

			// Update on resize or content change
			const resizeObserver = new ResizeObserver(() => {
				updateMaxScroll();
			});
			if (scrollContainerRef.current) {
				resizeObserver.observe(scrollContainerRef.current);
			}

			// Also check periodically for dynamic content
			const interval = setInterval(updateMaxScroll, 1000);

			return () => {
				clearTimeout(timeoutId);
				resizeObserver.disconnect();
				clearInterval(interval);
			};
		}
		return undefined;
	}, [autoScroll]);

	// Intersection Observer to detect when phone enters viewport
	useEffect(() => {
		if (!autoScroll) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					setIsInView(entry.isIntersecting);
				});
			},
			{
				threshold: 0.1, // Lower threshold for better detection
				rootMargin: "50px", // Start animation slightly before entering viewport
			},
		);

		// Use deviceFrameRef if available, otherwise fallback to scrollContainerRef
		const container =
			deviceFrameRef.current ||
			scrollContainerRef.current?.closest(".relative") ||
			scrollContainerRef.current;
		if (container) {
			observer.observe(container);
		}

		return () => {
			if (container) {
				observer.unobserve(container);
			}
		};
	}, [autoScroll]);

	// Auto-scroll animation - ultra-smooth linear scroll with no flashing
	useEffect(() => {
		if (
			!autoScroll ||
			prefersReducedMotion ||
			!isInView ||
			isHovered ||
			maxScroll <= 0
		) {
			// Clean up any running animations
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			if (resetTimeoutRef.current) {
				clearTimeout(resetTimeoutRef.current);
				resetTimeoutRef.current = null;
			}
			return;
		}

		const scrollDuration = 25000; // 25 seconds for very slow, smooth scroll down
		const resetDuration = 25000; // 25 seconds for smooth scroll back up
		let lastTimestamp: number | null = null;
		let currentScroll = scrollContainerRef.current?.scrollTop || 0;
		let isScrollingDown = true;
		let pauseUntil: number | null = null;

		const animate = (timestamp: number) => {
			if (
				isHovered ||
				!isInView ||
				!scrollContainerRef.current ||
				maxScroll <= 0
			) {
				animationFrameRef.current = null;
				lastTimestamp = null;
				return;
			}

			// Handle pause at top/bottom
			if (pauseUntil !== null) {
				if (timestamp < pauseUntil) {
					animationFrameRef.current = requestAnimationFrame(animate);
					return;
				} else {
					pauseUntil = null;
					lastTimestamp = timestamp;
				}
			}

			if (lastTimestamp === null) {
				lastTimestamp = timestamp;
				currentScroll = scrollContainerRef.current.scrollTop || 0;
			}

			const deltaTime = timestamp - lastTimestamp;
			lastTimestamp = timestamp;

			// Calculate scroll speed (pixels per millisecond)
			const activeDuration = isScrollingDown ? scrollDuration : resetDuration;
			const scrollSpeedPx = (maxScroll / activeDuration) * scrollSpeed;

			if (isScrollingDown) {
				// Scroll down smoothly
				currentScroll += scrollSpeedPx * deltaTime;

				if (currentScroll >= maxScroll) {
					// Reached bottom, pause then scroll back up
					currentScroll = maxScroll;
					isScrollingDown = false;
					pauseUntil = timestamp + 3000; // 3 second pause at bottom
					lastTimestamp = null; // Reset timestamp after pause
				}
			} else {
				// Scroll back up smoothly
				currentScroll -= scrollSpeedPx * deltaTime;

				if (currentScroll <= 0) {
					// Reached top, pause then scroll down again
					currentScroll = 0;
					isScrollingDown = true;
					pauseUntil = timestamp + 3000; // 3 second pause at top
					lastTimestamp = null; // Reset timestamp after pause
				}
			}

			// Apply scroll smoothly
			if (scrollContainerRef.current) {
				const clampedScroll = Math.max(0, Math.min(maxScroll, currentScroll));
				scrollContainerRef.current.scrollTop = clampedScroll;
			}

			// Continue animation loop indefinitely
			animationFrameRef.current = requestAnimationFrame(animate);
		};

		// Start animation immediately if conditions are met, or wait for maxScroll to be ready
		const startAnimation = () => {
			if (scrollContainerRef.current && maxScroll > 0 && isInView) {
				animationFrameRef.current = requestAnimationFrame(animate);
			}
		};

		// If maxScroll is already > 0, start immediately, otherwise wait a bit
		if (maxScroll > 0) {
			const startTimeout = setTimeout(startAnimation, 300);
			return () => {
				clearTimeout(startTimeout);
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current);
					animationFrameRef.current = null;
				}
				if (resetTimeoutRef.current) {
					clearTimeout(resetTimeoutRef.current);
					resetTimeoutRef.current = null;
				}
			};
		}

		// If maxScroll is 0, the effect will re-run when maxScroll changes
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			if (resetTimeoutRef.current) {
				clearTimeout(resetTimeoutRef.current);
				resetTimeoutRef.current = null;
			}
			lastTimestamp = null;
			pauseUntil = null;
		};
	}, [
		autoScroll,
		prefersReducedMotion,
		isInView,
		isHovered,
		maxScroll,
		scrollSpeed,
	]);

	// Scrollable content wrapper component - Remove opacity animation to prevent flashing
	const ScrollableContent = ({ children }: { children: React.ReactNode }) => (
		<div
			ref={scrollContainerRef}
			className="relative z-10 h-[788px] overflow-y-auto pb-6 px-4 scrollbar-hide"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{
				scrollbarWidth: "none",
				msOverflowStyle: "none",
				WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
			}}
		>
			{children}
		</div>
	);
	// iPhone 14 logical size used by our SVG: outer 390x844, inner screen 366x820 at (12,12)
	// Visual size reduced via responsive scale to avoid dominating the layout

	// If hideOnMobile is true, show content directly on mobile
	if (hideOnMobile) {
		return (
			<>
				{/* Mobile/Tablet: Show content directly */}
				<div className="md:hidden w-full max-w-[360px] mx-auto px-4">
					{children}
				</div>

				{/* Desktop: Show with device frame */}
				<div
					ref={deviceFrameRef}
					className={`hidden md:inline-block origin-top scale-[0.75] sm:scale-[0.78] md:scale-[0.82] lg:scale-[0.88] xl:scale-95 w-full max-w-[600px] mx-auto ${className ?? ""}`}
				>
					<div className="relative mx-auto max-w-sm rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_40px_80px_rgba(0,0,0,0.8)] p-1 ring-1 ring-white/5 backdrop-blur-sm">
						<div className="absolute top-0 left-0 right-0 h-[2px] rounded-full bg-white/10" />
						<div className="relative w-[390px] h-[844px] drop-shadow-2xl">
							{/* Glow effect around device */}
							<div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 rounded-[80px] blur-2xl opacity-50" />

							{/* Device SVG as background */}
							<Image
								src="/device/iphone-14.svg"
								alt=""
								priority={false}
								loading="lazy"
								fill
								sizes="(max-width: 768px) 390px, 440px"
								quality={85}
								className="pointer-events-none select-none relative z-10"
								aria-hidden="true"
							/>
							{/* Screen content: align to the inner screen rect (x:12,y:12,w:366,h:820) */}
							<div
								className="absolute left-[12px] top-[12px] w-[366px] h-[820px] overflow-hidden rounded-[44px] bg-black relative z-10 shadow-2xl"
								aria-label="Email preview content"
							>
								{/* Status bar */}
								<div className="relative z-10 px-4 pt-2 pb-1">
									<Image
										src="/device/statusbar-dark.svg"
										alt=""
										width={366}
										height={20}
										loading="lazy"
										aria-hidden="true"
									/>
								</div>
								{/* Scrollable email body */}
								{autoScroll ? (
									<ScrollableContent>{children}</ScrollableContent>
								) : (
									<motion.div
										className="relative z-10 h-[788px] overflow-y-auto pb-6 px-4"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.4, duration: 0.6 }}
									>
										{children}
									</motion.div>
								)}
							</div>
						</div>
					</div>
				</div>
			</>
		);
	}

	// Default behavior: show frame on all sizes (for Hero and ExampleMatchesModal)
	return (
		<div
			ref={deviceFrameRef}
			className={`inline-block origin-top scale-[0.82] sm:scale-[0.86] md:scale-[0.9] lg:scale-100 w-full max-w-[600px] mx-auto ${className ?? ""}`}
		>
			<div className="relative mx-auto max-w-sm rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_20px_50px_rgba(139,92,246,0.15),0_4px_6px_rgba(0,0,0,0.1),0_40px_80px_rgba(0,0,0,0.8)] p-1 ring-1 ring-white/5 backdrop-blur-sm">
				<div className="absolute top-0 left-0 right-0 h-[2px] rounded-full bg-white/10" />
				<div className="relative w-[390px] h-[844px] drop-shadow-2xl">
					{/* Glow effect around device */}
					<div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-brand-500/20 rounded-[80px] blur-2xl opacity-50" />

					{/* Device SVG as background */}
					<Image
						src="/device/iphone-14.svg"
						alt=""
						priority={priority}
						loading={priority ? undefined : "lazy"}
						fill
						sizes="(max-width: 768px) 390px, 440px"
						quality={85}
						className="pointer-events-none select-none relative z-10"
						aria-hidden="true"
					/>
					{/* Screen content: align to the inner screen rect (x:12,y:12,w:366,h:820) */}
					<div
						className="absolute left-[12px] top-[12px] w-[366px] h-[820px] overflow-hidden rounded-[44px] bg-black relative z-10 shadow-2xl"
						aria-label="Email preview content"
					>
						{/* Status bar */}
						<div className="relative z-10 px-4 pt-2 pb-1">
							<Image
								src="/device/statusbar-dark.svg"
								alt=""
								width={366}
								height={20}
								loading="lazy"
								aria-hidden="true"
							/>
						</div>
						{/* Scrollable email body */}
						{autoScroll ? (
							<ScrollableContent>{children}</ScrollableContent>
						) : (
							<motion.div
								className="relative z-10 h-[788px] overflow-y-auto pb-6 px-4"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.4, duration: 0.6 }}
							>
								{children}
							</motion.div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
