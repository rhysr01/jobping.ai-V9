"use client";

import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { RetroGrid } from "./RetroGrid";

export default function AnimatedBackground() {
	// Prevent SSR issues by ensuring we're on client
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const { scrollY } = useScroll();
	const [isMobile, setIsMobile] = useState(false);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		setIsMobile(window.innerWidth < 768);
		setPrefersReducedMotion(
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
	}, []);

	// Optimized parallax transforms based on device
	const parallaxSlow = useTransform(
		scrollY,
		[0, 1000],
		[0, isMobile ? 100 : 200],
	);
	const parallaxMedium = useTransform(
		scrollY,
		[0, 1000],
		[0, isMobile ? 200 : 400],
	);
	const parallaxFast = useTransform(
		scrollY,
		[0, 1000],
		[0, isMobile ? 300 : 600],
	);
	const opacityTransform = useTransform(scrollY, [0, 500], [1, 0.3]);

	// Mouse parallax values - only on desktop
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	// Mouse parallax effect - disabled on mobile
	useEffect(() => {
		if (isMobile || prefersReducedMotion) return;

		const handleMouseMove = (e: MouseEvent) => {
			const x = (e.clientX / window.innerWidth - 0.5) * 30; // Reduced multiplier
			const y = (e.clientY / window.innerHeight - 0.5) * 30;
			mouseX.set(x);
			mouseY.set(y);
		};

		window.addEventListener("mousemove", handleMouseMove, { passive: true });
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [mouseX, mouseY, isMobile, prefersReducedMotion]);

	// Prevent SSR hydration issues
	if (!isClient) {
		return (
			<div className="fixed inset-0 -z-50 bg-gradient-to-br from-zinc-950 via-black to-zinc-950" />
		);
	}

	return (
		<div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
			{/* Base gradient with parallax */}
			<motion.div
				className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950"
				style={{ y: parallaxSlow }}
			/>

			{/* Animated mesh gradients with parallax */}
			<motion.div
				className="absolute inset-0 opacity-40"
				style={{ y: parallaxMedium, opacity: opacityTransform }}
			>
				<div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_100%_50%_at_0%_0%,rgba(16,185,129,0.15),transparent_60%)]" />
				<div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_100%_50%_at_100%_0%,rgba(59,130,246,0.12),transparent_60%)]" />
				<div className="absolute bottom-0 left-1/2 w-full h-full bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(20,184,166,0.10),transparent_60%)]" />
			</motion.div>

			{/* Perspective Grid - replaces floating orbs for cleaner, more professional look */}
			<RetroGrid className="-z-20" opacity={0.3} gridSize={25} angle={35} />

			{/* Optimized particle count - significantly reduced on mobile */}
			<div className="absolute inset-0">
				{Array.from({ length: isMobile ? 1 : 8 }).map((_, i) => {
					const baseDelay = i * (isMobile ? 1 : 0.5); // Slower, less frequent on mobile
					const baseDuration = isMobile ? 20 + (i % 2) * 10 : 12 + (i % 3) * 6; // Much slower on mobile

					return (
						<motion.div
							key={i}
							className="absolute w-1 h-1 bg-emerald-400/10 rounded-full blur-sm"
							initial={{
								x: `${(i * 13) % 100}%`, // More spread out
								y: `${(i * 17) % 100}%`,
								opacity: 0,
							}}
							animate={
								prefersReducedMotion
									? undefined
									: {
											y: [
												`${(i * 17) % 100}%`,
												`${((i * 17) % 100) - (isMobile ? 10 : 15)}%`,
												`${(i * 17) % 100}%`,
											],
											opacity: [0, isMobile ? 0.2 : 0.4, 0], // Much more subtle on mobile
											scale: [0.3, isMobile ? 0.8 : 1.2, 0.3], // Smaller scale changes
										}
							}
							transition={
								prefersReducedMotion
									? undefined
									: {
											duration: baseDuration,
											repeat: Infinity,
											delay: baseDelay,
											ease: "easeInOut",
										}
							}
						/>
					);
				})}
			</div>

			{/* Enhanced film grain noise texture */}
			<motion.div
				className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
					y: parallaxSlow,
					filter: "contrast(1.1) brightness(1.05)",
				}}
			/>

			{/* Animated grid - completely disabled on mobile for performance */}
			{!isMobile && (
				<motion.div
					className={`absolute inset-0 opacity-[0.03] ${prefersReducedMotion ? "" : "animated-grid"}`}
					aria-hidden="true"
					style={{ y: parallaxFast }}
				/>
			)}

			{/* Radial gradient overlay for depth */}
			<motion.div
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]"
				style={{ opacity: opacityTransform }}
			/>
		</div>
	);
}
