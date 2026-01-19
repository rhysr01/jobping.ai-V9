"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface RetroGridProps {
	className?: string;
	opacity?: number;
	gridSize?: number;
	angle?: number;
}

export function RetroGrid({
	className = "",
	opacity = 0.4,
	gridSize = 20,
	angle = 45,
}: RetroGridProps) {
	const { scrollY } = useScroll();
	const [isClient, setIsClient] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		setIsClient(true);
		setIsMobile(window.innerWidth < 768);
	}, []);

	const parallaxY = useTransform(scrollY, [0, 1000], [0, isMobile ? 50 : 100]);

	if (!isClient) return null;

	return (
		<motion.div
			className={`absolute inset-0 ${className}`}
			style={{ y: parallaxY }}
		>
			{/* Perspective Grid Pattern */}
			<div
				className="absolute inset-0 opacity-30"
				style={{
					backgroundImage: `
            linear-gradient(${angle}deg, rgba(20,184,166,${opacity}) 1px, transparent 1px),
            linear-gradient(${angle + 90}deg, rgba(20,184,166,${opacity}) 1px, transparent 1px)
          `,
					backgroundSize: `${gridSize}px ${gridSize}px`,
					maskImage:
						"linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
				}}
			/>

			{/* Secondary grid for depth */}
			<div
				className="absolute inset-0 opacity-20"
				style={{
					backgroundImage: `
            linear-gradient(${angle + 15}deg, rgba(59,130,246,${opacity * 0.5}) 1px, transparent 1px),
            linear-gradient(${angle + 105}deg, rgba(59,130,246,${opacity * 0.5}) 1px, transparent 1px)
          `,
					backgroundSize: `${gridSize * 2}px ${gridSize * 2}px`,
					maskImage:
						"linear-gradient(to bottom, transparent 0%, black 30%, black 80%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, transparent 0%, black 30%, black 80%, transparent 100%)",
				}}
			/>
		</motion.div>
	);
}
