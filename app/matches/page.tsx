"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { ApiError, apiCall, apiCallJson } from "@/lib/api-client";
import {
	FREE_ROLES_PER_SEND,
	PREMIUM_ROLES_PER_WEEK,
} from "@/lib/productMetrics";
import { showToast } from "@/lib/toast";
import {
	getVisaConfidenceLabel,
	getVisaConfidenceStyle,
} from "@/Utils/matching/visa-confidence";

interface Job {
	id: number;
	title: string;
	company: string;
	location: string;
	city: string;
	country: string;
	description: string;
	url: string;
	work_environment: string;
	match_score?: number;
	match_reason?: string;
	visa_confidence?: "verified" | "likely" | "local-only" | "unknown";
	visa_confidence_label?: string;
	visa_confidence_reason?: string;
	visa_confidence_percentage?: number;
	job_hash?: string;
}

function MatchesPageContent() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
	const [_jobsViewed, setJobsViewed] = useState(0);
	const [clickedJobId, setClickedJobId] = useState<number | null>(null);
	const [dismissedJobIds, setDismissedJobIds] = useState<Set<number>>(
		new Set(),
	);
	const [dismissingJobId, setDismissingJobId] = useState<number | null>(null);
	const jobsContainerRef = useRef<HTMLDivElement>(null);

	const fetchMatches = useCallback(async () => {
		try {
			setError("");
			setLoading(true);
			const response = await apiCall("/api/matches/free");

			// Handle 401 - Cookie expired or invalid
			if (response.status === 401) {
				setError(
					"Your session has expired. Please sign up again to see your matches.",
				);
				setLoading(false);
				// Optionally redirect after a delay
				setTimeout(() => {
					window.location.href = "/signup/free?expired=true";
				}, 3000);
				return;
			}

			// Handle other errors
			if (!response.ok) {
				const data = await response
					.json()
					.catch(() => ({ error: "Failed to load matches" }));
				setError(data.error || "Failed to load matches. Please try again.");
				setLoading(false);
				return;
			}

			const data = await response.json();
			setJobs(data.jobs || []);
			setLoading(false);
		} catch (err) {
			// ApiError provides user-friendly messages
			const errorMessage =
				err instanceof ApiError
					? err.message
					: "Failed to load matches. Please try signing up again.";
			setError(errorMessage);
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMatches();
	}, [fetchMatches]);

	// Track job views and show upgrade banner after engagement
	useEffect(() => {
		if (jobs.length === 0) return;

		// Show banner after 3 seconds OR after viewing 2+ jobs
		const timer = setTimeout(() => {
			setShowUpgradeBanner(true);
		}, 3000);

		return () => clearTimeout(timer);
	}, [jobs.length]);

	// Memoized scroll handler to prevent re-creating on every render
	const handleScroll = useCallback(() => {
		const container = jobsContainerRef.current;
		if (!container) return;

		const scrollPosition = window.scrollY + window.innerHeight;

		// Show banner after scrolling past first job
		if (scrollPosition > container.offsetTop + 200) {
			setShowUpgradeBanner(true);
		}
	}, []);

	// Get user email from cookie for feedback
	const getUserEmail = useCallback(() => {
		if (typeof document === "undefined") return null;
		const cookies = document.cookie.split(";");
		const emailCookie = cookies.find((c) =>
			c.trim().startsWith("free_user_email="),
		);
		if (emailCookie) {
			return decodeURIComponent(emailCookie.split("=")[1]).toLowerCase().trim();
		}
		return null;
	}, []);

	// Handle job dismissal with ghost state animation
	const handleJobDismiss = useCallback(
		async (job: Job) => {
			if (dismissingJobId === job.id) return;

			setDismissingJobId(job.id);

			// Start ghost animation (shrink and fade)
			setTimeout(() => {
				setDismissedJobIds((prev) => new Set(prev).add(job.id));
				setDismissingJobId(null);

				// Show toast notification
				showToast.success(`Got it. We won't show you ${job.company} again.`);

				// Track feedback
				trackEvent("job_dismissed", {
					job_id: job.id,
					company: job.company,
					title: job.title,
				});

				// Send feedback to API
				const email = getUserEmail();
				if (email) {
					// Use job_hash if available, otherwise generate from job data
					const jobHash =
						job.job_hash ||
						`job-${job.id}-${job.company.toLowerCase().replace(/\s+/g, "-")}`;

					apiCallJson("/api/feedback/enhanced", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							jobHash,
							email,
							feedbackType: "not_relevant",
							verdict: "negative",
							relevanceScore: 1,
							matchQualityScore: 1,
							reason: "User marked as not relevant",
							source: "web",
						}),
					}).catch((err) => {
						console.error("Failed to send feedback:", err);
						// Don't show error to user - feedback is non-critical
					});
				}
			}, 300); // Animation duration
		},
		[dismissingJobId, getUserEmail],
	);

	// Memoized job click handler to prevent re-creating on every render
	const handleJobClick = useCallback(
		(jobId: number, company: string, position: number, _job?: Job) => {
			// Track job view
			setJobsViewed((prev) => {
				const newCount = prev + 1;
				// Show upgrade banner after viewing 2 jobs
				if (newCount >= 2) {
					setShowUpgradeBanner(true);
				}
				return newCount;
			});

			// Track click using unified function
			trackEvent("job_clicked", {
				job_id: jobId,
				company,
				position,
				source: "free_matches",
			});
		},
		[],
	);

	// Track scroll to show banner after user scrolls past first job
	useEffect(() => {
		if (!jobsContainerRef.current || jobs.length === 0) return;

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [jobs.length, handleScroll]);

	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center p-4">
				<div
					className="text-center"
					role="status"
					aria-live="polite"
					aria-label="Loading job matches"
				>
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
						className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full mx-auto mb-4"
						aria-hidden="true"
					/>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-zinc-300 text-lg mb-2"
					>
						Finding your perfect matches...
					</motion.p>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="text-zinc-300 text-sm"
					>
						This usually takes 5-10 seconds
					</motion.p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-card elevation-2 p-8 text-center max-w-md mx-auto"
				>
					<div className="text-red-400 mb-4">
						<svg
							className="w-16 h-16 mx-auto mb-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>

					<h2 className="text-xl font-semibold mb-2">Failed to load matches</h2>
					<p className="text-zinc-300 mb-6">{error}</p>

					<Button
						onClick={() => {
							setError("");
							setLoading(true);
							// Retry logic - call your fetch function
							fetchMatches();
						}}
					>
						Try Again
					</Button>

					<p className="text-sm text-zinc-300 mt-4">
						Still having issues?{" "}
						<a
							href="mailto:contact@getjobping.com"
							className="text-brand-400 hover:underline"
						>
							Contact support
						</a>
					</p>
				</motion.div>
			</div>
		);
	}

	if (jobs.length === 0) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-card elevation-2 p-8 text-center max-w-md mx-auto border-dashed border-zinc-700"
				>
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						className="w-12 h-12 border-2 border-zinc-700 border-t-brand-500 rounded-full mx-auto mb-6"
						aria-hidden="true"
					/>
					<h2 className="text-2xl font-bold mb-4 text-zinc-100 tracking-tight">
						No matches found
					</h2>
					<p className="text-zinc-400 mb-6 leading-relaxed">
						We couldn't find jobs matching your preferences right now.
					</p>

					<div className="space-y-4 mb-6">
						<p className="text-sm text-zinc-400 font-medium">Try:</p>
						<ul className="text-sm text-zinc-400 space-y-2 leading-relaxed">
							<li>• Selecting more cities</li>
							<li>• Choosing a different career path</li>
							<li>• Coming back tomorrow (we add 100+ jobs daily)</li>
						</ul>
					</div>

					<div className="mt-6 space-y-3">
						<Button href="/signup/free" variant="secondary" className="w-full">
							Try Different Preferences
						</Button>
						<Button href="/signup" variant="gradient" className="w-full">
							Upgrade to Premium for More Jobs
						</Button>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black py-8">
			<div className="container max-w-5xl mx-auto px-4">
				{/* Tier Indicator */}
				<div className="text-center mb-6">
					<motion.span
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-200"
					>
						<span className="w-2 h-2 bg-brand-400 rounded-full"></span>
						Free Plan · Viewing {jobs.length}/{FREE_ROLES_PER_SEND} matches
					</motion.span>
				</div>

				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold mb-2 tracking-tight text-zinc-100">
						Your {jobs.length} Matched Jobs
					</h1>
					<p className="text-zinc-400 leading-relaxed">
						Hand-picked by our AI based on your preferences
					</p>
					{/* Screen reader announcement for loaded jobs */}
					<div role="status" aria-live="polite" className="sr-only">
						Successfully loaded {jobs.length}{" "}
						{jobs.length === 1 ? "job match" : "job matches"}
					</div>
				</div>

				{/* Sticky Upgrade Banner - Shown after engagement */}
				{showUpgradeBanner && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="sticky top-0 z-10 bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl p-5 mb-8 shadow-xl border border-brand-400/30"
					>
						<div className="flex items-center justify-between flex-wrap gap-4">
							<div>
								<p className="font-bold text-white text-lg mb-1">
									🚀 Want {PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} more
									jobs this week?
								</p>
								<p className="text-sm text-white/90">
									Premium: {PREMIUM_ROLES_PER_WEEK} jobs/week (3x more) · 5
									fresh jobs Mon/Wed/Fri
								</p>
							</div>
							<Link href="/signup">
								<Button
									variant="secondary"
									size="lg"
									className="shadow-lg"
									onClick={() => {
										trackEvent("upgrade_clicked", { location: "top_banner" });
									}}
								>
									Start Premium - €5/month
								</Button>
							</Link>
						</div>
					</motion.div>
				)}

				{/* Job Cards */}
				<div
					ref={jobsContainerRef}
					className="space-y-5 mb-12"
					role="list"
					aria-label="Job matches"
				>
					<AnimatePresence mode="popLayout">
						{jobs
							.filter((job) => !dismissedJobIds.has(job.id))
							.map((job, index) => {
								const isDismissing = dismissingJobId === job.id;
								return (
									<motion.article
										key={job.id}
										initial={{ opacity: 0, y: 20 }}
										animate={
											isDismissing
												? {
														opacity: 0.2,
														scale: 0.95,
														height: 0,
														marginBottom: 0,
													}
												: {
														opacity: 1,
														y: 0,
														scale: 1,
													}
										}
										exit={{
											opacity: 0,
											scale: 0.95,
											height: 0,
											marginBottom: 0,
										}}
										transition={{
											duration: isDismissing ? 0.3 : 0.5,
											delay: isDismissing ? 0 : index * 0.1,
											ease: "easeInOut",
										}}
										className="glass-card elevation-2 p-5 hover:elevation-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5 overflow-hidden"
										role="listitem"
										aria-labelledby={`job-title-${job.id}`}
									>
										{/* Top Row: Job Number + Match Score + Visa Confidence */}
										<div className="flex items-center gap-2 mb-3 flex-wrap">
											<span className="text-xs font-bold text-brand-400 bg-brand-500/20 px-2.5 py-1 rounded-full">
												#{index + 1}
											</span>
											{job.match_score && (
												<span
													className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
														job.match_score >= 0.92
															? "text-emerald-400 bg-emerald-500/20"
															: "text-green-400 bg-green-500/20"
													}`}
												>
													{Math.round(job.match_score * 100)}% Match
												</span>
											)}
											{/* Simplified Visa Confidence - Inline Badge (No Tooltip) */}
											{job.visa_confidence &&
												job.visa_confidence !== "unknown" &&
												(() => {
													const style = getVisaConfidenceStyle(
														job.visa_confidence,
													);
													const label =
														job.visa_confidence_label ||
														getVisaConfidenceLabel(job.visa_confidence);
													return (
														<span
															className={`
                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                            border border-white/5
                            ${style.bgColor}
                            ${style.textColor}
                            font-medium
                          `}
															title={
																job.visa_confidence_reason ||
																"Visa sponsorship information"
															}
														>
															<span
																className={`w-1.5 h-1.5 rounded-full ${style.dotColor} opacity-80`}
																aria-hidden="true"
															/>
															{label}
														</span>
													);
												})()}
										</div>

										{/* Job Title - Larger, more prominent */}
										<h3
											id={`job-title-${job.id}`}
											className="text-xl font-bold mb-1.5 text-zinc-100 break-words tracking-tight"
										>
											{job.title}
										</h3>

										{/* Company - Brand color */}
										<p className="text-brand-300 font-medium mb-2 break-words">
											{job.company}
										</p>

										{/* Location + Work Environment */}
										<div className="flex flex-wrap gap-2 mb-3">
											<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-800/50 text-sm text-zinc-300">
												📍{" "}
												{job.location ||
													`${job.city}${job.country ? `, ${job.country}` : ""}`}
											</span>
											{job.work_environment && (
												<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-800/50 text-sm capitalize text-zinc-300">
													{job.work_environment === "remote" && "🌍"}
													{job.work_environment === "hybrid" && "🏢"}
													{job.work_environment === "on-site" && "🏛️"}{" "}
													{job.work_environment}
												</span>
											)}
										</div>

										{/* Match Reason Display - Clean, No Pills */}
										{job.match_reason && (
											<div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
												<p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
													<span>💡</span>
													Why this match?
												</p>
												<p className="text-sm text-zinc-200 leading-relaxed">
													{job.match_reason}
												</p>
											</div>
										)}

										{/* Description */}
										<p className="text-zinc-400 text-sm mb-4 line-clamp-3 leading-relaxed">
											{job.description
												?.replace(/<[^>]*>/g, "")
												.substring(0, 200)}
											...
										</p>

										<div className="flex gap-3">
											<Button
												variant="primary"
												size="lg"
												className="flex-1 bg-emerald-500 text-zinc-950 font-bold px-6 hover:bg-emerald-400 transition-all duration-200"
												disabled={clickedJobId === job.id || isDismissing}
												onClick={async () => {
													setClickedJobId(job.id);
													handleJobClick(job.id, job.company, index + 1);

													// Track apply click (5x weight in penalty calculation)
													const email = getUserEmail();
													if (email && job.job_hash) {
														apiCallJson("/api/feedback/enhanced", {
															method: "POST",
															headers: { "Content-Type": "application/json" },
															body: JSON.stringify({
																jobHash: job.job_hash,
																email,
																feedbackType: "click",
																verdict: "positive",
																relevanceScore: job.match_score || 80,
																matchQualityScore: 5,
																reason: "User clicked Apply button",
																source: "web",
																metadata: {
																	action: "apply_clicked",
																	page: "matches",
																},
															}),
														}).catch((err) => {
															console.error(
																"Failed to track apply click:",
																err,
															);
															// Don't block user - tracking is non-critical
														});
													}

													// Open URL
													window.open(job.url, "_blank", "noopener,noreferrer");

													// Clear loading state after 2s
													setTimeout(() => setClickedJobId(null), 2000);
												}}
											>
												{clickedJobId === job.id ? "Opening..." : "Apply Now →"}
											</Button>

											<motion.button
												type="button"
												onClick={() => handleJobDismiss(job)}
												disabled={isDismissing}
												whileTap={{ scale: 1.5 }}
												className={`
                    px-4 py-2.5 rounded-lg
                    border border-zinc-700 bg-zinc-900/40
                    text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/60
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-sm font-medium
                  `}
												aria-label={`Mark ${job.company} as not relevant`}
											>
												<span className="flex items-center gap-1.5">
													<span>👎</span>
													<span className="hidden sm:inline">Not Relevant</span>
												</span>
											</motion.button>
										</div>
									</motion.article>
								);
							})}
					</AnimatePresence>
				</div>

				{/* Bottom CTA - Only show after viewing jobs */}
				{showUpgradeBanner && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="glass-card elevation-3 p-8 text-center bg-gradient-to-br from-brand-500/10 to-purple-600/10 border-2 border-brand-500/20"
					>
						<h2 className="text-3xl font-bold mb-3">
							Want {PREMIUM_ROLES_PER_WEEK - FREE_ROLES_PER_SEND} More Jobs This
							Week?
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
							<div className="text-center p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
								<p className="text-2xl font-bold text-white mb-1">
									{FREE_ROLES_PER_SEND}
								</p>
								<p className="text-sm text-zinc-300">Free (one-time)</p>
							</div>
							<div className="text-center p-4 rounded-lg bg-brand-500/20 border border-brand-500/30">
								<p className="text-2xl font-bold text-brand-200 mb-1">
									{PREMIUM_ROLES_PER_WEEK}
								</p>
								<p className="text-sm text-zinc-300">Premium (per week)</p>
							</div>
						</div>
						<p className="text-lg text-zinc-300 mb-6">
							Premium members get 5 fresh jobs delivered Mon/Wed/Fri (3x more
							than free)
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<Link href="/signup">
								<Button
									variant="gradient"
									size="lg"
									onClick={() => {
										trackEvent("upgrade_clicked", { location: "bottom_cta" });
									}}
								>
									Start Premium - €5/month
								</Button>
							</Link>
							<p className="text-sm text-zinc-300">Cancel anytime</p>
						</div>
					</motion.div>
				)}
			</div>
		</div>
	);
}

export default function MatchesPage() {
	return (
		<ErrorBoundary>
			<MatchesPageContent />
		</ErrorBoundary>
	);
}
