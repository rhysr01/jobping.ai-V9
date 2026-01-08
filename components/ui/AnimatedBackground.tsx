"use client";

import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import { useEffect } from "react";

export default function AnimatedBackground() {
	const { scrollY } = useScroll();

	// Parallax transforms based on scroll
	const parallaxSlow = useTransform(scrollY, [0, 1000], [0, 200]);
	const parallaxMedium = useTransform(scrollY, [0, 1000], [0, 400]);
	const parallaxFast = useTransform(scrollY, [0, 1000], [0, 600]);
	const opacityTransform = useTransform(scrollY, [0, 500], [1, 0.3]);

	// Mouse parallax values
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	// Mouse parallax effect
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			const x = (e.clientX / window.innerWidth - 0.5) * 50;
			const y = (e.clientY / window.innerHeight - 0.5) * 50;
			mouseX.set(x);
			mouseY.set(y);
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, [mouseX, mouseY]);

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
				<div className="absolute bottom-0 left-1/2 w-full h-full bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(139,92,246,0.10),transparent_60%)]" />
			</motion.div>
			
			{/* Moving animated orbs with scroll and mouse parallax */}
			<motion.div
				className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px]"
				style={{
					x: useTransform([mouseX, scrollY], ([mx, sy]: number[]) => (mx as number) * 0.3 + ((sy as number) / 1000) * 200),
					y: useTransform([mouseY, parallaxSlow], ([my, ps]: number[]) => (my as number) * 0.3 + (ps as number)),
					scale: useTransform(scrollY, [0, 1000], [1, 1.15]),
				}}
				animate={{
					scale: [1, 1.1, 1],
				}}
				transition={{
					duration: 20,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<motion.div
				className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px]"
				style={{
					x: useTransform([mouseX, scrollY], ([mx, sy]: number[]) => -(mx as number) * 0.2 - ((sy as number) / 1000) * 160),
					y: useTransform([mouseY, parallaxMedium], ([my, pm]: number[]) => -(my as number) * 0.2 + (pm as number)),
					scale: useTransform(scrollY, [0, 1000], [1, 1.2]),
				}}
				animate={{
					scale: [1, 1.15, 1],
				}}
				transition={{
					duration: 25,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 2,
				}}
			/>
			<motion.div
				className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[90px]"
				style={{
					x: useTransform([mouseX, scrollY], ([mx, sy]: number[]) => (mx as number) * 0.15 + ((sy as number) / 1000) * 120),
					y: useTransform([mouseY, parallaxFast], ([my, pf]: number[]) => (my as number) * 0.15 + (pf as number)),
					scale: useTransform(scrollY, [0, 1000], [1, 1.25]),
				}}
				animate={{
					scale: [1, 1.2, 1],
				}}
				transition={{
					duration: 30,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 4,
				}}
			/>

			{/* Additional depth layer - floating particles (simplified) */}
			<div className="absolute inset-0">
				{Array.from({ length: 15 }).map((_, i) => {
					const baseDelay = i * 0.3;
					const baseDuration = 8 + (i % 3) * 4;
					
					return (
						<motion.div
							key={i}
							className="absolute w-1 h-1 bg-emerald-400/15 rounded-full blur-sm"
							initial={{
								x: `${(i * 7) % 100}%`,
								y: `${(i * 11) % 100}%`,
								opacity: 0,
							}}
							animate={{
								y: [`${(i * 11) % 100}%`, `${((i * 11) % 100) - 20}%`, `${(i * 11) % 100}%`],
								opacity: [0, 0.4, 0],
								scale: [0.5, 1.2, 0.5],
							}}
							transition={{
								duration: baseDuration,
								repeat: Infinity,
								delay: baseDelay,
								ease: "easeInOut",
							}}
						/>
					);
				})}
			</div>
			
			{/* Enhanced noise texture with parallax */}
			<motion.div 
				className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
					y: parallaxSlow,
				}}
			/>
			
			{/* Subtle animated grid with parallax */}
			<motion.div 
				className="absolute inset-0 opacity-[0.03] animated-grid"
				aria-hidden="true"
				style={{ y: parallaxFast }}
			/>

			{/* Radial gradient overlay for depth */}
			<motion.div
				className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)]"
				style={{ opacity: opacityTransform }}
			/>
		</div>
	);
}

