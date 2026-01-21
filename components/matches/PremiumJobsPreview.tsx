"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import CustomButton from "../ui/CustomButton";
import { trackEvent } from "../../lib/analytics";

interface Job {
	id: string;
	title: string;
	company: string;
	location: string;
	match_score: number;
	posted_date: string;
	url: string;
}

interface PremiumJobsPreviewProps {
	userPreferences: {
		cities: string[];
		careerPath: string[];
		tier: string;
	};
	className?: string;
}

export function PremiumJobsPreview({ userPreferences, className = "" }: PremiumJobsPreviewProps) {
	const [premiumJobs, setPremiumJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	const fetchPremiumPreviews = async () => {
		if (hasLoaded) return; // Already loaded

		setLoading(true);
		setError(false);

		try {
			const response = await fetch("/api/preview-matches", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					cities: userPreferences.cities,
					careerPath: userPreferences.careerPath[0],
					limit: 3, // Reduced to 3 premium previews (less API load)
					isPreview: true,
					isPremiumPreview: true, // Flag for premium-quality jobs
				}),
			});

			if (!response.ok) throw new Error("Failed to fetch");

			const data = await response.json();
			setPremiumJobs(data.matches || []);
			setHasLoaded(true);
		} catch (err) {
			console.error("PremiumJobsPreview fetch error:", err);
			setError(true);
		} finally {
			setLoading(false);
		}
	};

	// Lazy load: Only fetch when component becomes visible
	useEffect(() => {
		if (userPreferences.tier !== 'premium' && !hasLoaded) {
			// Use Intersection Observer for lazy loading
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						fetchPremiumPreviews();
						observer.disconnect();
					}
				},
				{ threshold: 0.1 } // Trigger when 10% visible
			);

			const element = document.getElementById('premium-preview-trigger');
			if (element) {
				observer.observe(element);
			}

			return () => observer.disconnect();
		}
		return undefined; // Explicit return for TypeScript
	}, [userPreferences, hasLoaded]);

	// Don't show for premium users
	if (userPreferences.tier === 'premium') {
		return null;
	}

	// Show loading skeleton while fetching
	if (loading && premiumJobs.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className={`mt-12 ${className}`}
			>
				<div className="text-center mb-8">
					<div className="animate-pulse">
						<div className="h-8 bg-zinc-800 rounded w-80 mx-auto mb-2"></div>
						<div className="h-4 bg-zinc-800 rounded w-64 mx-auto"></div>
					</div>
				</div>
				<div className="grid gap-4 md:gap-6">
					{[1, 2, 3].map((i) => (
						<div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
							<div className="animate-pulse space-y-3">
								<div className="flex justify-between">
									<div className="space-y-2">
										<div className="h-5 bg-white/10 rounded w-48"></div>
										<div className="h-4 bg-white/10 rounded w-32"></div>
									</div>
									<div className="h-6 bg-white/10 rounded w-16"></div>
								</div>
								<div className="flex justify-between">
									<div className="h-4 bg-white/10 rounded w-24"></div>
									<div className="h-4 bg-white/10 rounded w-20"></div>
								</div>
							</div>
						</div>
					))}
				</div>
			</motion.div>
		);
	}

	// Don't show if error or no jobs after loading
	if (error || (!loading && premiumJobs.length === 0)) {
		return null;
	}

	// Main component render

	const handleUpgradeClick = () => {
		trackEvent('premium_preview_clicked', { 
			location: 'matches_page',
			job_count: premiumJobs.length
		});
	};

	return (
		<motion.div
			id="premium-preview-trigger"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className={`mt-12 ${className}`}
		>
			{/* Header */}
			<div className="text-center mb-8">
				<motion.div
					animate={{ rotate: [0, 10, -10, 0] }}
					transition={{ duration: 2, repeat: Infinity, delay: 1 }}
					className="inline-block text-4xl mb-2"
				>
					🔥
				</motion.div>
				<h3 className="text-2xl font-bold text-white mb-2">
					Unlock Premium Matches Like These
				</h3>
				<p className="text-zinc-400 text-lg">
					Premium users get <strong className="text-emerald-400">15 matches/week</strong> instead of 5
				</p>
				<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
					<BrandIcons.Star className="w-4 h-4 text-amber-400" />
					<span className="text-sm font-medium text-amber-200">
						Better companies • Newer jobs • Higher match scores
					</span>
				</div>
			</div>

			{/* Premium Job Previews */}
			<div className="grid gap-4 md:gap-6">
				{premiumJobs.slice(0, 3).map((job, index) => (
					<motion.div
						key={job.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="relative group"
					>
						{/* Blur overlay */}
						<motion.div 
							className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center"
							whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
						>
							<div className="text-center p-6">
								<motion.div
									animate={{ scale: [1, 1.1, 1] }}
									transition={{ duration: 2, repeat: Infinity }}
									className="inline-block mb-3"
								>
									<BrandIcons.Shield className="w-8 h-8 text-amber-400" />
								</motion.div>
								<p className="text-white font-bold mb-3">Premium Only</p>
								<CustomButton
									size="sm"
									href="/signup"
									onClick={handleUpgradeClick}
									className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
								>
									Upgrade to Unlock
								</CustomButton>
							</div>
						</motion.div>

						{/* Blurred job preview */}
						<div className="blur-sm opacity-60 bg-white/5 border border-white/10 rounded-xl p-6">
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<h4 className="text-lg font-bold text-white mb-1 line-clamp-1">
										{job.title}
									</h4>
									<p className="text-zinc-300 font-medium mb-1">{job.company}</p>
									<p className="text-zinc-400 text-sm">{job.location}</p>
								</div>
								<div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full">
									<span className="text-sm font-bold">{job.match_score}%</span>
									{job.match_score >= 90 && (
										<span className="text-xs">🔥</span>
									)}
								</div>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-zinc-400 text-sm">
									<BrandIcons.Clock className="w-4 h-4" />
									<span>Posted recently</span>
								</div>
								<div className="flex items-center gap-2 text-brand-400">
									<BrandIcons.ArrowRight className="w-4 h-4" />
									<span className="text-sm font-medium">View Details</span>
								</div>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Call to Action */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className="mt-8 text-center p-6 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-2xl"
			>
				<h4 className="text-xl font-bold text-white mb-2">
					Ready to unlock your full potential?
				</h4>
				<p className="text-zinc-300 mb-4">
					Get 15 premium matches delivered 3x per week for just €5/month
				</p>
				<CustomButton
					size="lg"
					href="/signup"
					onClick={handleUpgradeClick}
					className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xl shadow-amber-500/30"
				>
					<BrandIcons.Star className="w-5 h-5 mr-2" />
					Upgrade to Premium
				</CustomButton>
			</motion.div>
		</motion.div>
	);

	// This should never be reached, but TypeScript needs it
	return null;
}
