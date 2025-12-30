import { type MotionProps, motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps extends Omit<MotionProps, "children"> {
	children: ReactNode;
	className?: string;
	variant?: "default" | "elevated" | "subtle";
	hover?: boolean | "lift" | "scale";
}

/**
 * Reusable glass morphism card component with consistent hover effects
 * Supports both static and animated (motion) variants
 */
export default function GlassCard({
	children,
	className = "",
	variant = "subtle",
	hover = true,
	...motionProps
}: GlassCardProps) {
	const baseClasses =
		"glass-card rounded-2xl border transition-all duration-300 backdrop-blur-sm";

	const variants = {
		subtle: "bg-glass-subtle border-border-subtle elevation-1",
		default: "bg-glass-default border-border-default elevation-2",
		elevated: "bg-glass-elevated border-border-elevated elevation-3",
	};

	const hoverEffects = {
		lift: { y: -2 },
		scale: { scale: 1.01 },
		true: { y: -2 },
	};

	const hoverProps = hover
		? {
				whileHover:
					hoverEffects[hover === true ? "true" : hover] || hoverEffects.true,
				transition: { duration: 0.2, ease: "easeOut" as const },
			}
		: {};

	const Component = motion.div;

	return (
		<Component
			className={`${baseClasses} ${variants[variant]} ${className}`}
			{...hoverProps}
			{...motionProps}
		>
			{children}
		</Component>
	);
}
