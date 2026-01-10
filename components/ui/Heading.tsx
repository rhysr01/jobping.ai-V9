"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/classname-utils";

const headingVariants = cva("font-display font-bold tracking-tight", {
	variants: {
		level: {
			display: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]", // Hero only
			h1: "text-3xl sm:text-4xl md:text-5xl leading-tight", // Page titles
			h2: "text-2xl sm:text-3xl md:text-4xl leading-tight", // Section headings
			h3: "text-xl sm:text-2xl leading-tight", // Subsection headings
			h4: "text-lg sm:text-xl leading-tight", // Card titles
		},
		color: {
			primary: "text-content-primary",
			secondary: "text-content-secondary",
			// Gradient variant - accessibility checked: purple-200 to emerald-200 on zinc-950
			// WCAG AA compliant for large text (18pt+)
			gradient:
				"bg-gradient-to-r from-white via-purple-200 to-emerald-200 bg-clip-text text-transparent",
		},
		align: {
			left: "text-left",
			center: "text-center",
			right: "text-right",
		},
	},
	defaultVariants: {
		level: "h2",
		color: "primary",
		align: "left",
	},
});

export interface HeadingProps
	extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
		VariantProps<typeof headingVariants> {
	as?: "h1" | "h2" | "h3" | "h4";
}

/**
 * Centralized Heading component with consistent typography scale
 * Replaces inline heading classes throughout the codebase
 *
 * @example
 * <Heading level="h2" color="gradient" align="center">Section Title</Heading>
 * <Heading level="display" as="h1">Hero Title</Heading>
 */
export default function Heading({
	className,
	level,
	color,
	align,
	as,
	...props
}: HeadingProps) {
	// Map level to semantic HTML element
	const Component =
		as ||
		(level === "display" || level === "h1"
			? "h1"
			: level === "h2"
				? "h2"
				: level === "h3"
					? "h3"
					: "h4");

	return (
		<Component
			className={cn(headingVariants({ level, color, align }), className)}
			{...props}
		/>
	);
}
