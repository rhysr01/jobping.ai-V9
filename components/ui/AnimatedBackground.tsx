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

	// Optimized parallax transform for RetroGrid
	const parallaxY = useTransform(
		scrollY,
		[0, 1000],
		[0, isMobile ? 50 : 100]
	);

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


			{/* Perspective Grid - clean, professional background */}
			<RetroGrid className="-z-20" opacity={0.3} gridSize={25} angle={35} />


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
