import type { ReactNode } from "react";

interface BadgeProps {
	children: ReactNode;
	variant?: "default" | "success" | "warning" | "info" | "brand";
	size?: "sm" | "md" | "lg";
	className?: string;
}

export default function Badge({
	children,
	variant = "default",
	size = "md",
	className = "",
}: BadgeProps) {
	const baseClasses =
		"inline-flex items-center gap-1.5 font-medium rounded-full border transition-all duration-200 backdrop-blur-sm";

	const variants = {
		default:
			"bg-white/5 border-white/10 text-zinc-300 hover:bg-white/8 hover:border-white/15 shadow-[0_1px_2px_rgba(255,255,255,0.05)]",
		success:
			"bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/15 hover:border-green-500/30 shadow-[0_1px_2px_rgba(34,197,94,0.1)]",
		warning:
			"bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/15 hover:border-yellow-500/30 shadow-[0_1px_2px_rgba(234,179,8,0.1)]",
		info: "bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/30 shadow-[0_1px_2px_rgba(139,92,246,0.1)]",
		brand:
			"bg-brand-500/10 border-brand-500/20 text-brand-300 hover:bg-brand-500/15 hover:border-brand-500/30 shadow-[0_1px_2px_rgba(109,90,143,0.08)]",
	};

	const sizes = {
		sm: "px-2 py-0.5 text-xs",
		md: "px-3 py-1 text-sm",
		lg: "px-4 py-1.5 text-base",
	};

	return (
		<span
			className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
		>
			{children}
		</span>
	);
}
