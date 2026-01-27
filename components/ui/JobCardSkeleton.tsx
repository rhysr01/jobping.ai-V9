"use client";

import { motion } from "framer-motion";

interface JobCardSkeletonProps {
	count?: number;
	className?: string;
}

export function JobCardSkeleton({ count = 1, className = "" }: JobCardSkeletonProps) {
	const skeletons = Array.from({ length: count }, (_, i) => i);

	return (
		<div className={`space-y-6 ${className}`}>
			{skeletons.map((i) => (
				<motion.div
					key={i}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: i * 0.1 }}
					className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
				>
					{/* Match badge skeleton */}
					<div className="mb-4 h-8 w-32 animate-pulse rounded-full bg-zinc-800" />

					{/* Title skeleton */}
					<div className="mb-3 h-7 w-3/4 animate-pulse rounded bg-zinc-800" />

					{/* Company skeleton */}
					<div className="mb-3 h-6 w-1/2 animate-pulse rounded bg-zinc-800" />

					{/* Location + visa */}
					<div className="mb-4 flex gap-3">
						<div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
						<div className="h-5 w-32 animate-pulse rounded-full bg-zinc-800" />
					</div>

					{/* Match reason box */}
					<div className="mb-4 space-y-2 rounded-lg bg-zinc-800/50 p-3">
						<div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
						<div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
					</div>

					{/* Description skeleton */}
					<div className="mb-6 space-y-2">
						<div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
						<div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
						<div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
					</div>

					{/* Buttons skeleton */}
					<div className="flex gap-3">
						<div className="h-12 flex-1 animate-pulse rounded-xl bg-zinc-800" />
						<div className="h-12 w-16 animate-pulse rounded-xl bg-zinc-800" />
					</div>
				</motion.div>
			))}
		</div>
	);
}

export default JobCardSkeleton;

