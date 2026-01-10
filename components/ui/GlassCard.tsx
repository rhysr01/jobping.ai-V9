"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type MotionProps, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/classname-utils";

const glassCardVariants = cva(
	"glass-card rounded-card border transition-all duration-300 backdrop-blur-sm",
	{
		variants: {
			intent: {
				subtle: "bg-surface-card border-border-subtle elevation-1",
				default: "bg-surface-card border-border-default elevation-2",
				elevated: "bg-surface-card border-border-elevated elevation-3",
			},
			hover: {
				none: "",
				lift: "hover:-translate-y-1",
				scale: "hover:scale-[1.02]",
			},
		},
		defaultVariants: {
			intent: "subtle",
			hover: "lift",
		},
	},
);

export interface GlassCardProps
	extends Omit<MotionProps, "children">,
		VariantProps<typeof glassCardVariants> {
	children: ReactNode;
	className?: string;
}

/**
 * Reusable glass morphism card component with CVA variants
 * Replaces long cn() class strings with clean variant props
 *
 * @example
 * <GlassCard intent="subtle" hover="lift">Content</GlassCard>
 * <GlassCard intent="elevated" hover="scale">Premium Content</GlassCard>
 */
export default function GlassCard({
	children,
	className = "",
	intent,
	hover,
	...motionProps
}: GlassCardProps) {
	const hoverProps =
		hover !== "none" && hover
			? {
					whileHover:
						hover === "lift"
							? { y: -2 }
							: hover === "scale"
								? { scale: 1.01 }
								: {},
					transition: { duration: 0.2, ease: "easeOut" as const },
				}
			: {};

	return (
		<motion.div
			className={cn(glassCardVariants({ intent, hover }), className)}
			{...hoverProps}
			{...motionProps}
		>
			{children}
		</motion.div>
	);
}
