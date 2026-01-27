"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import { HotMatchBadge } from "../ui/HotMatchBadge";
import CustomButton from "../ui/CustomButton";
import { trackEvent } from "../../lib/analytics";

interface LiveJobsReviewProps {
	cities: string[];
	careerPath: string;
	isVisible: boolean;
	className?: string;
}

interface JobPreview {
	id: number;
	title: string;
	company: string;
	company_name?: string;
	location: string;
	match_score?: number;
	match_reason?: string;
	description: string;
	job_url: string;
	posted_at?: string;
}

export function LiveJobsReview({
	cities,
	careerPath,
	isVisible,
	className = "",
}: LiveJobsReviewProps) {
	const [jobPreviews, setJobPreviews] = useState<JobPreview[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasFetched, setHasFetched] = useState(false);

	// Fetch job previews when cities and career are selected
	const fetchJobPreviews = useCallback(async () => {
		if (!cities.length || !careerPath || hasFetched) return;

		setIsLoading(true);
		setError(null);

		try {
			// Call preview-matches API with limited results for preview
			const response = await fetch("/api/preview-matches", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					cities,
					careerPath,
					limit: 3, // Only show 3 preview jobs
					isPreview: true,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch job previews");
			}

			const data = await response.json();

			if (data.matches && data.matches.length > 0) {
				setJobPreviews(data.matches.slice(0, 3)); // Limit to 3 previews
			} else {
				setJobPreviews([]);
			}
		} catch (err) {
			if (process.env.NODE_ENV === "development") {
				console.error("Error fetching job previews:", err);
			}
			setError("Unable to load job previews right now");
		} finally {
			setIsLoading(false);
			setHasFetched(true);
		}
	}, [cities, careerPath, hasFetched]);

	// Trigger fetch when dependencies change
	useEffect(() => {
		if (cities.length > 0 && careerPath && !hasFetched) {
			fetchJobPreviews();
		}
	}, [cities, careerPath, hasFetched]);

	// Reset when cities or career change
	useEffect(() => {
		setHasFetched(false);
		setJobPreviews([]);
		setError(null);
	}, [cities, careerPath]);

	if (!isVisible) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, height: 0, y: 20 }}
				animate={{ opacity: 1, height: "auto", y: 0 }}
				exit={{ opacity: 0, height: 0, y: -20 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className={`rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-black/50 to-emerald-500/10 p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl overflow-hidden ${className}`}
			>
				{/* Animated background */}
				<motion.div
					className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-600/5"
					animate={{
						x: ["-100%", "200%"],
					}}
					transition={{
						duration: 4,
						repeat: Infinity,
						ease: "linear",
					}}
				/>

				<div className="relative z-10">
					{/* Header */}
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<motion.div
								animate={{
									scale: [1, 1.2, 1],
									rotate: [0, 180, 360],
								}}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: "easeInOut",
								}}
								className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"
							>
								<BrandIcons.Target className="w-4 h-4 text-emerald-400" />
							</motion.div>
							<h3 className="text-lg font-bold text-white">Live Job Preview</h3>
						</div>
						{jobPreviews.length > 0 && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50"
							>
								<span className="text-emerald-400 font-semibold text-xs">
									{jobPreviews.length} matches
								</span>
							</motion.div>
						)}
					</div>

					{/* Loading State */}
					{isLoading && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm text-content-secondary mb-4">
								<motion.span
									className="inline-block h-3 w-3 rounded-full bg-emerald-400"
									animate={{ opacity: [1, 0.5, 1] }}
									transition={{ duration: 1.5, repeat: Infinity }}
								/>
								Searching for perfect matches...
							</div>
							{/* Loading skeleton */}
							{[1, 2, 3].map((i) => (
								<motion.div
									key={i}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: i * 0.1 }}
									className="rounded-xl border border-white/10 bg-white/5 p-4"
								>
									<div className="animate-pulse space-y-2">
										<div className="h-4 bg-white/10 rounded w-3/4"></div>
										<div className="h-3 bg-white/10 rounded w-1/2"></div>
										<div className="h-3 bg-white/10 rounded w-2/3"></div>
									</div>
								</motion.div>
							))}
						</div>
					)}

					{/* Error State */}
					{error && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="text-center py-8"
						>
							<BrandIcons.AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
							<p className="text-sm text-amber-200 mb-2">{error}</p>
							<p className="text-xs text-content-secondary">
								Don't worry - you'll still get your matches after signup!
							</p>
						</motion.div>
					)}

					{/* Job Previews */}
					{!isLoading && !error && jobPreviews.length > 0 && (
						<div className="space-y-3">
							<p className="text-sm text-emerald-200 mb-4">
								🎯 Here are some jobs you'll likely match with:
							</p>

							{jobPreviews.map((job, index) => (
								<motion.div
									key={job.id}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.1 }}
									className="group relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 p-4"
								>
									{/* Hot match indicator */}
									{job.match_score && job.match_score >= 85 && (
										<div className="absolute -top-2 -right-2">
											<HotMatchBadge />
										</div>
									)}

									{/* Job title and company */}
									<div className="mb-2">
										<h4 className="font-semibold text-white text-sm leading-tight mb-1">
											{job.title}
										</h4>
										<p className="text-xs text-emerald-400 font-medium">
											{job.company_name || job.company}
										</p>
									</div>

									{/* Location */}
									<p className="text-xs text-content-secondary mb-2">
										📍 {job.location}
									</p>

									{/* Match score */}
									{job.match_score && (
										<div className="flex items-center gap-2 mb-2">
											<div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
												<BrandIcons.CheckCircle className="h-3 w-3 text-emerald-400" />
												<span className="text-xs font-medium text-emerald-400">
													{job.match_score}% match
												</span>
											</div>
											{job.match_reason && (
												<span className="text-xs text-content-secondary truncate">
													{job.match_reason}
												</span>
											)}
										</div>
									)}

									{/* Description preview */}
									<p className="text-xs text-content-secondary line-clamp-2 mb-3 leading-relaxed">
										{job.description.length > 100
											? `${job.description.substring(0, 100)}...`
											: job.description}
									</p>

									{/* Action hint */}
									<div className="flex items-center justify-between">
										<span className="text-xs text-content-secondary">
											{job.posted_at
												? `${new Date(job.posted_at).toLocaleDateString()}`
												: "Recent"}
										</span>
										<CustomButton
											variant="secondary"
											size="sm"
											className="text-xs px-3 py-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => {
												trackEvent("preview_job_clicked", {
													job_id: job.id,
													company: job.company,
													title: job.title,
													from_form: true,
												});
												window.open(
													job.job_url,
													"_blank",
													"noopener,noreferrer",
												);
											}}
										>
											Quick View →
										</CustomButton>
									</div>
								</motion.div>
							))}

							{/* Encouragement message */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
								className="mt-4 p-3 rounded-xl bg-black/30 border border-emerald-500/20"
							>
								<p className="text-xs text-emerald-200 text-center">
									✨ <strong>These look promising!</strong> Complete your signup
									to see all matches →
								</p>
							</motion.div>
						</div>
					)}

					{/* No previews found */}
					{!isLoading && !error && hasFetched && jobPreviews.length === 0 && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="text-center py-6"
						>
							<BrandIcons.Compass className="w-10 h-10 text-content-secondary mx-auto mb-3" />
							<p className="text-sm text-content-secondary mb-2">
								Searching for matches...
							</p>
							<p className="text-xs text-content-secondary">
								Complete your signup to get personalized matches!
							</p>
						</motion.div>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
