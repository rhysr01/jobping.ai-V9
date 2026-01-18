"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
	"rounded-lg border backdrop-blur-sm transition-all duration-300 ease-out",
	{
		variants: {
			variant: {
				"job-card": "bg-white/[0.02] border-white/10 hover:border-brand-500/30 hover:bg-white/[0.04] p-6 hover:-translate-y-0.5",
				"pricing-card": "bg-white/[0.02] border-white/10 p-8 hover:bg-white/[0.04] hover:-translate-y-0.5",
				"feature-card": "bg-white/5 border-white/10 p-6 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5",
				"testimonial-card": "bg-white/[0.03] border-white/10 p-6 hover:bg-white/[0.06] hover:-translate-y-0.5",
				"company-logo": "bg-white/[0.03] border-white/8 p-6 hover:bg-white/[0.05] hover:border-white/15",
			},
			elevation: {
				flat: "",
				lifted: "shadow-md hover:shadow-lg hover:shadow-brand-500/10",
				floating: "shadow-lg hover:shadow-xl hover:shadow-brand-500/15",
			},
		},
		defaultVariants: {
			variant: "job-card",
			elevation: "flat",
		},
	}
);

export interface CardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {
	children: React.ReactNode;
}

export function Card({ className, variant, elevation, children, ...props }: CardProps) {
	return (
		<div
			className={cn(cardVariants({ variant, elevation }), className)}
			{...props}
		>
			{children}
		</div>
	);
}

// Specialized card components for common use cases
export function JobCard({ children, className, ...props }: Omit<CardProps, 'variant'>) {
	return (
		<Card variant="job-card" elevation="lifted" className={className} {...props}>
			{children}
		</Card>
	);
}

export function PricingCard({ children, className, ...props }: Omit<CardProps, 'variant'>) {
	return (
		<Card variant="pricing-card" elevation="floating" className={className} {...props}>
			{children}
		</Card>
	);
}

export function FeatureCard({ children, className, ...props }: Omit<CardProps, 'variant'>) {
	return (
		<Card variant="feature-card" elevation="lifted" className={className} {...props}>
			{children}
		</Card>
	);
}

export function CompanyLogoCard({ children, className, ...props }: Omit<CardProps, 'variant'>) {
	return (
		<Card variant="company-logo" elevation="flat" className={className} {...props}>
			{children}
		</Card>
	);
}