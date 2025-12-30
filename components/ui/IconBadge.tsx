/**
 * IconBadge - Reusable icon container component
 * Consistent styling for icons throughout the app
 */

import type { ReactNode } from "react";

interface IconBadgeProps {
	children: ReactNode;
	size?: "sm" | "md" | "lg";
	variant?: "default" | "brand";
	className?: string;
}

export function IconBadge({
	children,
	size = "md",
	variant = "brand",
	className = "",
}: IconBadgeProps) {
	const sizeClasses = {
		sm: "p-2",
		md: "p-3",
		lg: "p-4",
	};

	const variantClasses = {
		default: "bg-glass-subtle border border-border-subtle",
		brand: "bg-brand-500/10 border border-brand-500/20",
	};

	const iconSizes = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	return (
		<div
			className={`flex justify-center items-center ${sizeClasses[size]} rounded-xl ${variantClasses[variant]} ${className}`}
		>
			<div className={iconSizes[size]}>{children}</div>
		</div>
	);
}
