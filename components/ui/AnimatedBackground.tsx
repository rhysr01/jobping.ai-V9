"use client";

import { motion } from "framer-motion";

export default function AnimatedBackground() {
	return (
		<div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
			{/* Base gradient */}
			<div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950" />
			
			{/* Animated mesh gradients */}
			<div className="absolute inset-0 opacity-40">
				<div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_100%_50%_at_0%_0%,rgba(16,185,129,0.15),transparent_60%)]" />
				<div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_100%_50%_at_100%_0%,rgba(59,130,246,0.12),transparent_60%)]" />
				<div className="absolute bottom-0 left-1/2 w-full h-full bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(139,92,246,0.10),transparent_60%)]" />
			</div>
			
			{/* Moving animated orbs */}
			<motion.div
				className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px]"
				animate={{
					x: [0, 100, 0],
					y: [0, 50, 0],
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
				animate={{
					x: [0, -80, 0],
					y: [0, 30, 0],
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
				animate={{
					x: [0, 60, 0],
					y: [0, -40, 0],
					scale: [1, 1.2, 1],
				}}
				transition={{
					duration: 30,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 4,
				}}
			/>
			
			{/* Enhanced noise texture */}
			<div 
				className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>
			
			{/* Subtle animated grid */}
			<div 
				className="absolute inset-0 opacity-[0.03] animated-grid"
				aria-hidden="true"
			/>
		</div>
	);
}

