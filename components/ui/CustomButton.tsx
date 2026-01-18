import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { BrandIcons } from "./BrandIcons";

const buttonVariants = cva(
	"font-display inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
	{
		variants: {
			variant: {
				primary: "bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-200",
				secondary: "border-2 border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 text-brand-100 font-medium transition-all duration-200",
				ghost: "text-zinc-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-200",
			},
			size: {
				sm: "px-4 py-3 text-sm min-h-[52px] sm:min-h-[48px]", // Bigger on mobile for better touch targets
				md: "px-6 py-4 text-sm sm:text-base min-h-[56px] sm:min-h-[48px]", // More generous mobile spacing
				lg: "px-8 py-5 text-base sm:text-lg min-h-[64px] sm:min-h-[48px] w-full sm:w-auto", // Largest on mobile for primary CTAs
				xl: "px-12 py-6 text-xl min-h-[72px] w-full sm:w-auto", // Extra large for hero CTAs
				icon: "h-10 w-10 p-0", // Square icon button
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	}
);

interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	children?: ReactNode;
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
	variant,
	size,
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
		className: buttonVariants({ variant, size, className: `${widthClass} ${className}`.trim() }),
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
				className={buttonVariants({ variant, size, className: `${widthClass} ${className}`.trim() })}
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
