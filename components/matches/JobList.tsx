import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Job } from "@/hooks/useMatches";
import { BrandIcons } from "../ui/BrandIcons";
import Button from "../ui/Button";
import { HotMatchBadge } from "../ui/HotMatchBadge";
import { trackEvent } from "../../lib/analytics";
import { X } from "lucide-react";

interface JobListProps {
	jobs: Job[];
	dismissedJobIds: Set<number>;
	dismissingJobId: number | null;
	clickedJobId: number | null;
	onJobClick: (jobId: number, company: string, position: number, job?: Job) => void;
	onJobDismiss: (job: Job) => void;
	showUpgradeBanner: boolean;
}

export function JobList({
	jobs,
	dismissedJobIds,
	dismissingJobId,
	clickedJobId,
	onJobClick,
	onJobDismiss,
	showUpgradeBanner,
}: JobListProps) {
	return (
		<div className="space-y-6">
			{jobs.map((job, index) => {
				const isDismissed = dismissedJobIds.has(job.id);
				const isDismissing = dismissingJobId === job.id;
				const isClicked = clickedJobId === job.id;

				if (isDismissed) return null;

				return (
					<AnimatePresence key={job.id}>
						<motion.div
							initial={{ opacity: 1, scale: 1, height: "auto" }}
							exit={{
								opacity: 0,
								scale: 0.8,
								height: 0,
								marginBottom: 0,
							}}
							transition={{
								duration: 0.3,
								ease: "easeInOut",
							}}
							className="relative"
						>
							{/* Job Card */}
							<motion.div
								className={`group relative rounded-2xl border-2 p-6 transition-all duration-300 ${
									isClicked
										? "border-brand-500 bg-brand-500/5 shadow-[0_0_30px_rgba(109,90,143,0.3)]"
										: "border-border-default bg-surface-elevated/40 hover:border-border-default hover:shadow-lg"
								} ${isDismissing ? "opacity-50 scale-95" : ""}`}
								whileHover={{ y: -2 }}
								transition={{ duration: 0.2 }}
							>
								{/* Dismiss Button */}
								<button
									onClick={() => onJobDismiss(job)}
									disabled={isDismissing}
									className="absolute top-4 right-4 z-10 rounded-full bg-zinc-800/80 p-2 text-zinc-400 opacity-0 shadow-sm transition-all hover:bg-zinc-700 hover:text-zinc-300 group-hover:opacity-100 disabled:opacity-50"
									aria-label={`Dismiss ${job.company} job`}
								>
									<X className="h-4 w-4" />
								</button>

								{/* Hot Match Badge */}
								{job.match_score && job.match_score >= 85 && (
									<div className="mb-3">
										<HotMatchBadge />
									</div>
								)}

								{/* Job Header */}
								<div className="mb-4">
									<h3 className="mb-2 text-xl font-bold text-white">
										{job.title}
									</h3>
									<p className="text-lg font-semibold text-brand-400">
										{job.company_name || job.company}
									</p>
									<p className="text-sm text-content-secondary">
										{job.location}
									</p>
								</div>

								{/* Match Score & Reason */}
								{job.match_score && (
									<div className="mb-4 flex items-center gap-2">
										<div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1">
											<BrandIcons.CheckCircle className="h-4 w-4 text-emerald-400" />
											<span className="text-sm font-medium text-emerald-400">
												{job.match_score}% match
											</span>
										</div>
										{job.match_reason && (
											<span className="text-xs text-content-secondary">
												{job.match_reason}
											</span>
										)}
									</div>
								)}

								{/* Visa Confidence */}
								{job.visa_confidence && job.visa_confidence !== "unknown" && (
									<div className="mb-4">
										<span
											className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
												job.visa_confidence === "verified"
													? "bg-green-100 text-green-800 border-green-200"
													: job.visa_confidence === "likely"
													? "bg-yellow-100 text-yellow-800 border-yellow-200"
													: "bg-gray-100 text-gray-800 border-gray-200"
											}`}
										>
											{job.visa_confidence_percentage && (
												<span>{job.visa_confidence_percentage}%</span>
											)}
											<span>
												{job.visa_confidence === "verified"
													? "Verified"
													: job.visa_confidence === "likely"
													? "Likely"
													: "Local Only"}
											</span>
										</span>
									</div>
								)}

								{/* Job Description Preview */}
								<div className="mb-6">
									<p className="text-sm text-content-secondary line-clamp-3">
										{job.description.length > 200
											? `${job.description.substring(0, 200)}...`
											: job.description}
									</p>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-3">
									<Link
										href={job.job_url || job.url}
										target="_blank"
										rel="noopener noreferrer"
										onClick={() => {
											onJobClick(job.id, job.company, index, job);
											trackEvent("job_link_clicked", {
												job_id: job.id,
												company: job.company,
												title: job.title,
												url: job.job_url || job.url,
											});
										}}
										className="flex-1"
									>
										<Button
											variant="primary"
											size="sm"
											className="w-full"
											disabled={isDismissing}
										>
											View Job →
										</Button>
									</Link>

									<Button
										variant="secondary"
										size="sm"
										onClick={() => onJobDismiss(job)}
										disabled={isDismissing}
										className="px-4"
									>
										{isDismissing ? "..." : "Not for me"}
									</Button>
								</div>

								{/* Upgrade Banner */}
								{showUpgradeBanner && index === 0 && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className="mt-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4"
									>
										<p className="text-sm text-amber-200">
											🎯 <strong>Want more matches?</strong> Upgrade to Premium for
											15 jobs/week instead of 5.
										</p>
										<Link href="/pricing" className="mt-2 inline-block">
											<Button variant="secondary" size="sm">
												Upgrade Now →
											</Button>
										</Link>
									</motion.div>
								)}
							</motion.div>
						</motion.div>
					</AnimatePresence>
				);
			})}

			{/* No more jobs message */}
			{jobs.length > 0 && jobs.every((job) => dismissedJobIds.has(job.id)) && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center py-12"
				>
					<BrandIcons.CheckCircle className="mx-auto h-16 w-16 text-emerald-400 mb-4" />
					<h3 className="text-xl font-bold text-white mb-2">
						All caught up!
					</h3>
					<p className="text-content-secondary mb-6">
						You've reviewed all your current matches. New jobs arrive every few hours.
					</p>
					<Link href="/pricing">
						<Button variant="primary">
							Get 15 Jobs/Week with Premium →
						</Button>
					</Link>
				</motion.div>
			)}
		</div>
	);
}