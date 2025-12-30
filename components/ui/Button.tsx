import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
	size?: "sm" | "md" | "lg";
	isLoading?: boolean;
	className?: string;
	href?: string;
	target?: string;
}

export default function Button({
	children,
	variant = "primary",
	size = "md",
	isLoading = false,
	className = "",
	disabled,
	href,
	target,
	...props
}: ButtonProps) {
	const baseClasses =
		"inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]";

	const variants = {
		primary:
			"h-11 bg-brand-500 text-white font-medium shadow-md shadow-brand-500/30 hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0",
		secondary:
			"border-2 border-white/25 bg-white/[0.08] text-white font-medium hover:border-brand-500/50 hover:bg-white/5",
		ghost: "text-zinc-300 hover:text-white hover:bg-white/5 font-medium",
		danger:
			"border-2 border-error-500/30 bg-error-500/15 text-error-200 hover:bg-error-500/25 font-medium",
		gradient:
			"h-11 bg-gradient-to-r from-brand-500 to-purple-500 text-white font-medium shadow-md shadow-brand-500/30 hover:from-purple-600 hover:to-purple-600 hover:-translate-y-0.5 active:translate-y-0 transition-all",
	};

	const sizes = {
		sm: "px-4 py-2.5 text-sm min-h-[44px]", // Ensure 44px minimum touch target
		md: "px-5 py-3 text-sm sm:text-base min-h-[44px]",
		lg: "px-7 py-3.5 text-base sm:text-lg min-h-[48px] w-full sm:w-auto",
	};

	if (href) {
		return (
			<a
				href={href}
				target={target}
				rel={target === "_blank" ? "noreferrer noopener" : undefined}
				className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
				{...(props as any)}
			>
				{isLoading ? (
					<>
						<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
						Loading...
					</>
				) : (
					children
				)}
			</a>
		);
	}

	return (
		<button
			className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
			disabled={disabled || isLoading}
			{...props}
		>
			{isLoading ? (
				<>
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
					Loading...
				</>
			) : (
				children
			)}
		</button>
	);
}
