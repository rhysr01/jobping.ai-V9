import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { BrandIcons } from "./BrandIcons";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children?: ReactNode;
	variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient" | "outline";
	size?: "sm" | "md" | "lg" | "icon";
	isLoading?: boolean;
	className?: string;
	href?: string;
	target?: string;
	icon?: keyof typeof BrandIcons;
	fullWidth?: boolean;
	animated?: boolean; // Enable framer-motion animations
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
	children,
	variant = "primary",
	size = "md",
	isLoading = false,
	className = "",
	disabled,
	href,
	target,
	icon,
	fullWidth = false,
	animated = false,
	...props
}, ref) {
	const IconComponent = icon ? BrandIcons[icon] : null;
	const widthClass = fullWidth ? "w-full" : "";
	const baseClasses =
		"font-display inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation";

	const hoverClasses = animated ? "" : "hover:scale-[1.02] active:scale-[0.98]";

	const variants = {
		primary:
			"h-11 bg-black text-white font-medium shadow-lg shadow-black/50 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] hover:-translate-y-[2px] active:translate-y-0 active:shadow-lg transition-all duration-200 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:via-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200",
		secondary:
			"border-2 border-white/25 bg-white/[0.08] text-white font-medium hover:border-white/40 hover:bg-white/10 hover:-translate-y-[2px] hover:shadow-[0_8px_16px_-4px_rgba(255,255,255,0.1)] active:translate-y-0 transition-all duration-200",
		ghost:
			"text-content-secondary hover:text-white hover:bg-white/5 font-medium hover:-translate-y-[1px] transition-all duration-200",
		danger:
			"border-2 border-error-500/30 bg-error-500/15 text-error-200 hover:bg-error-500/25 font-medium hover:-translate-y-[2px] hover:shadow-[0_8px_16px_-4px_rgba(239,68,68,0.3)] active:translate-y-0 transition-all duration-200",
		gradient:
			"h-11 bg-gradient-to-r from-black via-gray-900 to-black text-white font-medium shadow-lg shadow-black/50 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] hover:-translate-y-[2px] active:translate-y-0 active:shadow-lg transition-all duration-200 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200",
		outline:
			"border-2 border-brand-500/50 bg-transparent hover:bg-brand-500/10 text-white font-bold rounded-xl",
	};

	const sizes = {
		sm: "px-4 py-3 text-sm min-h-[52px] sm:min-h-[48px]", // Bigger on mobile for better touch targets
		md: "px-6 py-4 text-sm sm:text-base min-h-[56px] sm:min-h-[48px]", // More generous mobile spacing
		lg: "px-8 py-5 text-base sm:text-lg min-h-[64px] sm:min-h-[48px] w-full sm:w-auto", // Largest on mobile for primary CTAs
		icon: "h-10 w-10 p-0", // Square icon button
	};

	const buttonContent = (
		<>
			{isLoading ? (
				<>
					<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
					{animated ? <span className="animate-pulse">Loading</span> : "Loading..."}
				</>
			) : (
				<>
					{IconComponent && <IconComponent className="w-5 h-5" />}
					{children}
				</>
			)}
		</>
	);

	const buttonProps = {
		type: props.type || "button",
		className: `${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`,
		disabled: disabled || isLoading,
		...props
	};

	const buttonElement = animated ? (
		<motion.button
			ref={ref}
			{...(buttonProps as any)}
			whileHover={{
				scale: disabled || isLoading ? 1 : 1.01, // Reduced scale for better performance
				transition: { duration: 0.2, ease: "easeOut" }
			}}
			whileTap={{
				scale: disabled || isLoading ? 1 : 0.99,
				transition: { duration: 0.1 }
			}}
		>
			{buttonContent}
		</motion.button>
	) : (
		<button
			ref={ref}
			{...buttonProps}
			className={`${buttonProps.className} ${hoverClasses}`}
		>
			{buttonContent}
		</button>
	);

	if (href) {
		return (
			<a
				href={href}
				target={target}
				rel={target === "_blank" ? "noreferrer noopener" : undefined}
				className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
				{...(props as any)}
			>
				{buttonContent}
			</a>
		);
	}

	return buttonElement;
});

Button.displayName = "Button";

export default Button;
