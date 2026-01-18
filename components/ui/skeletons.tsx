import { cn } from "@/lib/utils"

export function JobCardSkeleton() {
	return (
		<div className="space-y-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl animate-pulse">
			{/* Company logo skeleton */}
			<div className="w-12 h-12 bg-zinc-700/50 rounded-lg" />

			{/* Title skeleton */}
			<div className="space-y-2">
				<div className="h-4 bg-zinc-700/50 rounded w-3/4" />
				<div className="h-3 bg-zinc-700/50 rounded w-1/2" />
			</div>

			{/* Match score skeleton */}
			<div className="h-6 bg-zinc-700/50 rounded-full w-20" />

			{/* Description skeleton */}
			<div className="space-y-2">
				<div className="h-3 bg-zinc-700/50 rounded w-full" />
				<div className="h-3 bg-zinc-700/50 rounded w-5/6" />
			</div>

			{/* Button skeleton */}
			<div className="h-10 bg-zinc-700/50 rounded-xl w-full" />
		</div>
	)
}

export function FormSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			{/* Label */}
			<div className="h-6 bg-zinc-700/50 rounded w-32" />

			{/* Input field */}
			<div className="h-14 bg-zinc-700/50 rounded-xl border-2 border-zinc-700/30" />

			{/* Helper text */}
			<div className="h-4 bg-zinc-700/50 rounded w-48" />

			{/* Error state */}
			<div className="h-5 bg-red-900/20 rounded w-40" />
		</div>
	)
}

export function PricingCardSkeleton() {
	return (
		<div className="p-8 bg-white/[0.02] border border-white/10 rounded-3xl animate-pulse">
			<div className="space-y-4">
				{/* Icon skeleton */}
				<div className="w-14 h-14 bg-zinc-700/50 rounded-2xl" />

				{/* Title skeleton */}
				<div className="h-6 bg-zinc-700/50 rounded w-24" />

				{/* Price skeleton */}
				<div className="h-10 bg-zinc-700/50 rounded w-16" />

				{/* Features skeleton */}
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center gap-3">
							<div className="w-5 h-5 bg-zinc-700/50 rounded-full" />
							<div className="h-4 bg-zinc-700/50 rounded flex-1" />
						</div>
					))}
				</div>

				{/* Button skeleton */}
				<div className="h-12 bg-zinc-700/50 rounded-xl" />
			</div>
		</div>
	)
}

export function CompanyLogoSkeleton() {
	return (
		<div className="h-[180px] w-[200px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 animate-pulse">
			<div className="w-full h-full bg-zinc-700/50 rounded-lg" />
		</div>
	)
}

interface SkeletonProps {
	className?: string
}

export function Skeleton({ className }: SkeletonProps) {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-zinc-700/50",
				className
			)}
		/>
	)
}

// Enhanced loading states with context
export function PageLoading({ title = "Loading...", subtitle }: { title?: string; subtitle?: string }) {
	return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<div className="text-center space-y-6">
				<div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
				<div className="space-y-2">
					<h2 className="text-white text-xl font-semibold">{title}</h2>
					{subtitle && <p className="text-zinc-400">{subtitle}</p>}
				</div>
			</div>
		</div>
	)
}

export function ContentLoading({ title = "Loading content...", className }: { title?: string; className?: string }) {
	return (
		<div className={cn("flex flex-col items-center justify-center py-12 space-y-4", className)}>
			<div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
			<p className="text-zinc-400 text-sm">{title}</p>
		</div>
	)
}

export function FormLoading({ fields = 3, showButton = true }: { fields?: number; showButton?: boolean }) {
	return (
		<div className="space-y-6 animate-pulse">
			{Array.from({ length: fields }).map((_, i) => (
				<div key={i} className="space-y-2">
					<div className="h-5 bg-zinc-700/50 rounded w-24" />
					<div className="h-12 bg-zinc-700/50 rounded-xl" />
				</div>
			))}
			{showButton && <div className="h-12 bg-zinc-700/50 rounded-xl w-full" />}
		</div>
	)
}