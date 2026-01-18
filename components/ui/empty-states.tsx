import { motion } from "framer-motion";
import Link from "next/link";
import { BrandIcons } from "./BrandIcons";
import CustomButton from "./CustomButton";

interface EmptyStateProps {
	title: string;
	description: string;
	icon?: keyof typeof BrandIcons;
	action?: {
		label: string;
		href: string;
		variant?: "primary" | "secondary" | "ghost";
	};
	className?: string;
}

export function EmptyState({
	title,
	description,
	icon = "Target",
	action,
	className = ""
}: EmptyStateProps) {
	const IconComponent = BrandIcons[icon];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className={`text-center py-12 px-4 ${className}`}
		>
			{/* Icon */}
			<div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center">
				<IconComponent className="w-12 h-12 text-zinc-400" />
			</div>

			{/* Content */}
			<h3 className="text-xl font-bold text-white mb-2">
				{title}
			</h3>
			<p className="text-zinc-400 mb-6 max-w-sm mx-auto leading-relaxed">
				{description}
			</p>

			{/* Action Button */}
			{action && (
				<Link href={action.href}>
					<CustomButton
						variant={action.variant || "secondary"}
						size="md"
					>
						{action.label}
					</CustomButton>
				</Link>
			)}
		</motion.div>
	);
}

// Specific empty states for JobPing
export function NoMatchesEmpty() {
	return (
		<EmptyState
			title="No matches yet"
			description="We're still learning your preferences. Try adjusting your criteria or check back soon for personalized job recommendations."
			icon="Target"
			action={{
				label: "Update Preferences",
				href: "/preferences",
				variant: "secondary"
			}}
		/>
	);
}

export function NetworkErrorEmpty() {
	return (
		<EmptyState
			title="Connection issue"
			description="We're having trouble connecting. Please check your internet connection and try again."
			icon="AlertCircle"
			action={{
				label: "Try Again",
				href: window.location.pathname,
				variant: "primary"
			}}
		/>
	);
}

export function NoJobsAvailableEmpty() {
	return (
		<EmptyState
			title="No jobs available right now"
			description="We're continuously updating our job database. Check back in a few hours for fresh opportunities."
			icon="Clock"
		/>
	);
}

export function VisaJobsOnlyEmpty() {
	return (
		<EmptyState
			title="No visa-sponsored jobs found"
			description="We couldn't find visa-sponsored roles matching your criteria. Try expanding your location preferences or adjusting your career interests."
			icon="MapPin"
			action={{
				label: "Update Search",
				href: "/preferences",
				variant: "secondary"
			}}
		/>
	);
}