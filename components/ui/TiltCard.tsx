"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useRef } from "react";

export const TiltCard = ({ children }: { children: React.ReactNode }) => {
	const targetRef = useRef<HTMLDivElement>(null);

	// Motion values for 3D tilt effect - used in mouse tracking
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const mouseXSpring = useSpring(x);
	const mouseYSpring = useSpring(y);

	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		if (!targetRef.current) return;

		const rect = targetRef.current.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;

		// Explicitly use the motion values - this ensures TypeScript recognizes they're used
		x.set(xPct);
		y.set(yPct);
	};

	const handleMouseLeave = () => {
		x.set(0);
		y.set(0);
	};

	return (
		<motion.article
			ref={targetRef}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			aria-label="Interactive job match preview card"
			tabIndex={0}
			style={{
				rotateY,
				rotateX,
				transformStyle: "preserve-3d",
			}}
			className="relative h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
		>
			<div
				style={{
					transform: "translateZ(50px)",
					transformStyle: "preserve-3d",
				}}
			>
				{children}
			</div>
		</motion.article>
	);
};
