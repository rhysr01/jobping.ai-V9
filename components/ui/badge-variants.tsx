"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-2 rounded-full border backdrop-blur-sm transition-all",
	{
		variants: {
			variant: {
				"social-proof": "px-4 py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
				"trust-signal": "px-3 py-1 bg-white/[0.03] border-white/10 text-zinc-300",
				"premium-feature": "px-3 py-1 bg-gradient-to-r from-brand-500/20 to-purple-500/20 border-brand-500/30 text-brand-200",
				"job-match": "px-2 py-1 bg-brand-500/20 border-brand-500/30 text-brand-200 text-xs",
				"status-success": "px-3 py-1 bg-success/10 border-success/20 text-success",
				"status-error": "px-3 py-1 bg-error/10 border-error/20 text-error",
				"status-warning": "px-3 py-1 bg-warning/10 border-warning/20 text-warning",
			},
			size: {
				sm: "px-2 py-1 text-xs",
				md: "px-3 py-1.5 text-sm",
				lg: "px-4 py-2 text-base",
			},
		},
		defaultVariants: {
			variant: "social-proof",
			size: "md",
		},
	}
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	children: React.ReactNode;
	icon?: React.ReactNode;
}

export function Badge({ className, variant, size, children, icon, ...props }: BadgeProps) {
	return (
		<div
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		>
			{icon}
			<span>{children}</span>
		</div>
	);
}

// Specialized badge components for common use cases
export function SocialProofBadge({ children, className, ...props }: Omit<BadgeProps, 'variant'>) {
	return (
		<Badge variant="social-proof" size="md" className={className} {...props}>
			{children}
		</Badge>
	);
}

export function TrustSignalBadge({ children, className, ...props }: Omit<BadgeProps, 'variant'>) {
	return (
		<Badge variant="trust-signal" size="sm" className={className} {...props}>
			{children}
		</Badge>
	);
}

export function PremiumFeatureBadge({ children, className, ...props }: Omit<BadgeProps, 'variant'>) {
	return (
		<Badge variant="premium-feature" size="sm" className={className} {...props}>
			{children}
		</Badge>
	);
}

export function JobMatchBadge({ children, className, ...props }: Omit<BadgeProps, 'variant'>) {
	return (
		<Badge variant="job-match" size="sm" className={className} {...props}>
			{children}
		</Badge>
	);
}