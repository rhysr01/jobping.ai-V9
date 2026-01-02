"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { trackEvent } from "@/lib/analytics";
import { apiCall } from "@/lib/api-client";

interface GhostMatchesProps {
	onUpgradeClick?: () => void;
}

export function GhostMatches({ onUpgradeClick }: GhostMatchesProps) {
	const [ghostMatchCount, setGhostMatchCount] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [_error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Fetch ghost matches count
		const fetchGhostMatches = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await apiCall("/api/matches/ghost");
				const data = await response.json();

				if (response.ok && data.ghostMatchCount > 0) {
					setGhostMatchCount(data.ghostMatchCount);

					// Track ghost matches shown (A/B test metric)
					trackEvent("ghost_matches_shown", {
						count: data.ghostMatchCount,
						variant: "ghost_matches_enabled", // A/B test variant
						timestamp: new Date().toISOString(),
					});
				} else {
					setGhostMatchCount(0);
					// Track when no ghost matches found (for A/B test analysis)
					trackEvent("ghost_matches_not_available", {
						reason: data.message || "no_matches",
					});
				}
			} catch (err) {
				console.warn("Failed to fetch ghost matches:", err);
				setError("Failed to load");
				setGhostMatchCount(0);
			} finally {
				setLoading(false);
			}
		};

		// Only fetch if user has free matches (delay to avoid blocking main content)
		const timeoutId = setTimeout(() => {
			fetchGhostMatches();
		}, 2000); // 2 second delay for ghost matches

		return () => clearTimeout(timeoutId);
	}, []);

	// Don't show if no ghost matches or still loading
	if (loading || ghostMatchCount === null || ghostMatchCount === 0) {
		return null;
	}

	const handleUpgradeClick = () => {
		// Track upgrade click from ghost matches (conversion metric)
		trackEvent("ghost_matches_upgrade_clicked", {
			ghostMatchCount,
			variant: "ghost_matches_enabled",
			location: "ghost_matches_cta",
			timestamp: new Date().toISOString(),
		});
		if (onUpgradeClick) {
			onUpgradeClick();
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
			className="mt-8 space-y-4"
		>
			{/* Divider */}
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-zinc-800"></div>
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="bg-black px-4 text-zinc-500">
						Premium Matches Available
					</span>
				</div>
			</div>

			{/* Ghost Matches Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* Show 3 blurred placeholder cards */}
				{[1, 2, 3].map((index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.6 + index * 0.1 }}
						className="glass-card elevation-2 p-6 rounded-xl border-2 border-zinc-800 relative overflow-hidden"
					>
						{/* Blur overlay */}
						<div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-md z-10 flex items-center justify-center">
							<div className="text-center">
								<BrandIcons.Clock className="h-8 w-8 mx-auto mb-2 text-brand-400" />
								<p className="text-sm font-semibold text-brand-300">
									Premium Match
								</p>
							</div>
						</div>

						{/* Blurred content (visible but unreadable) */}
						<div className="opacity-30 blur-sm">
							<div className="h-4 bg-zinc-700 rounded w-3/4 mb-3"></div>
							<div className="h-3 bg-zinc-700 rounded w-1/2 mb-4"></div>
							<div className="space-y-2">
								<div className="h-2 bg-zinc-700 rounded"></div>
								<div className="h-2 bg-zinc-700 rounded w-5/6"></div>
								<div className="h-2 bg-zinc-700 rounded w-4/6"></div>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* CTA Card */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.9 }}
				className="glass-card elevation-3 p-6 rounded-xl border-2 border-brand-600/30 bg-gradient-to-br from-brand-600/10 to-brand-700/10 text-center"
			>
				<div className="flex items-center justify-center gap-2 mb-3">
					<BrandIcons.Target className="h-5 w-5 text-brand-400" />
					<h3 className="text-xl font-bold text-white">
						{ghostMatchCount} More High-Quality Matches Found
					</h3>
				</div>
				<p className="text-zinc-300 mb-4 text-sm">
					These matches were found using AI-powered matching. Upgrade to Premium
					to unlock them and get 15 jobs per week (3x more than free).
				</p>
				<Link href="/signup" onClick={handleUpgradeClick}>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(91,33,182,0.5)] transition-all"
					>
						Upgrade to Premium →
					</motion.button>
				</Link>
			</motion.div>
		</motion.div>
	);
}
