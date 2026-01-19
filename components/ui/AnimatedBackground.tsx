"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { RetroGrid } from "./RetroGrid";

export default function AnimatedBackground() {
	// Prevent SSR issues by ensuring we're on client
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);


	// Prevent SSR hydration issues
	if (!isClient) {
		return (
			<div className="fixed inset-0 -z-50 bg-gradient-to-br from-zinc-950 via-black to-zinc-950" />
		);
	}

	return (
		<div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
			{/* Base gradient */}
			<div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950" />


			{/* Perspective Grid - clean, professional background */}
			<RetroGrid className="-z-20" opacity={0.3} gridSize={25} angle={35} />


			{/* Enhanced film grain noise texture */}
			<motion.div
				className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
					filter: "contrast(1.1) brightness(1.05)",
				}}
			/>
		</div>
	);
}
