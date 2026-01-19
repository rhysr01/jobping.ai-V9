import { cn } from "@/lib/utils";

interface SmartLoadingProps {
	stage: "validating" | "matching" | "preparing" | "complete";
	className?: string;
}

export function SmartLoading({ stage, className }: SmartLoadingProps) {
	const messages = {
		validating: "Connecting to European job registries...",
		matching: "Filtering 4,200+ roles for visa-sponsorship...",
		preparing:
			"Cross-referencing profile with Berlin, Amsterdam, and London hubs...",
		complete: "Calculating match-score for 12 potential roles...",
	};

	const icons = {
		validating: "🔍",
		matching: "🎯",
		preparing: "✨",
		complete: "🎉",
	};

	return (
		<div className={cn("flex items-center gap-4 p-6", className)}>
			{/* Simple loading spinner */}
			<div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin flex-shrink-0" />

			{/* Loading message */}
			<div>
				<p className="text-white font-medium">
					{icons[stage]} {messages[stage]}
				</p>
				{stage === "matching" && (
					<p className="text-sm text-zinc-400">
						This usually takes 5-10 seconds
					</p>
				)}
			</div>
		</div>
	);
}

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function LoadingSpinner({
	size = "md",
	className,
}: LoadingSpinnerProps) {
	const sizes = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	return (
		<div
			className={cn(
				"animate-spin rounded-full border-2 border-current border-t-transparent",
				sizes[size],
				className,
			)}
		/>
	);
}
