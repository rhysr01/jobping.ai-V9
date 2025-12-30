import type { ReactNode } from "react";

interface SkeletonProps {
	className?: string;
	children?: ReactNode;
}

export default function Skeleton({ className = "", children }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse bg-white/10 rounded relative overflow-hidden ${className}`}
		>
			<div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
			{children}
		</div>
	);
}

export function SkeletonText({
	lines = 1,
	className = "",
}: {
	lines?: number;
	className?: string;
}) {
	return (
		<div className={`space-y-2 ${className}`}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
				/>
			))}
		</div>
	);
}

export function SkeletonCard({ className = "" }: { className?: string }) {
	return (
		<div className={`p-6 space-y-4 ${className}`}>
			<Skeleton className="h-6 w-1/3" />
			<SkeletonText lines={3} />
			<Skeleton className="h-10 w-full" />
		</div>
	);
}
