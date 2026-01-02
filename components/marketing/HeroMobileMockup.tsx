"use client";

import { BrandIcons } from "@/components/ui/BrandIcons";
import { IPhoneShell } from "@/components/ui/IPhoneShell";
import { TiltCard } from "@/components/ui/TiltCard";
import { trackEvent } from "@/lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "@/lib/copy";
import {
	getVisaConfidenceLabel,
	getVisaConfidenceStyle,
} from "@/Utils/matching/visa-confidence";

interface HeroMockupProps {
	stats?: { totalUsers: number };
	topMatch?: any;
}

// Sample jobs for London finance user - matching real free tier experience
const SAMPLE_JOBS = [
	{
		id: 1,
		title: "Junior - GenAI & Hyper-automation Developer",
		company: "Deloitte",
		location: "London, UK",
		work_environment: "hybrid",
		match_score: 0.86,
		match_reason:
			"Perfect for your finance background and interest in AI automation. Located in London, visa sponsorship available, and requires 0-2 years experience.",
		visa_confidence: "likely",
		description:
			"Join our digital transformation team to build AI-powered automation solutions for financial services clients.",
	},
	{
		id: 2,
		title: "Graduate Financial Analyst",
		company: "Goldman Sachs",
		location: "London, UK",
		work_environment: "on-site",
		match_score: 0.92,
		match_reason:
			"Matches your finance interest and early-career focus. Located in London, visa sponsorship available.",
		visa_confidence: "likely",
		description:
			"Analyze financial data and support investment decisions. Perfect for recent finance graduates.",
	},
	{
		id: 3,
		title: "Junior Quantitative Developer",
		company: "JPMorgan Chase",
		location: "London, UK",
		work_environment: "hybrid",
		match_score: 0.9,
		match_reason:
			"Great fit for your finance and programming skills. Located in London with visa support.",
		visa_confidence: "likely",
		description:
			"Develop quantitative models and trading systems. Python, SQL, and financial markets knowledge required.",
	},
];

export function HeroMobileMockup({ stats, topMatch }: HeroMockupProps) {
	// Use topMatch for first job if provided, otherwise use sample
	// Only show 3 jobs in hero mockup for better spacing
	const jobs = topMatch
		? [
				{
					...SAMPLE_JOBS[0],
					...topMatch,
					match_score: topMatch.matchScore ? topMatch.matchScore / 100 : 0.86,
				},
				...SAMPLE_JOBS.slice(1, 3),
			]
		: SAMPLE_JOBS.slice(0, 3);

	const workEnvEmoji = (env: string) => {
		const map: Record<string, string> = {
			remote: "🌍",
			hybrid: "🏢",
			"on-site": "🏛️",
		};
		return map[env] || "🌍";
	};

	return (
		<div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px]">
			<TiltCard>
				{/* Screen Glow Container */}
				<div className="relative">
					{/* Glow behind the phone */}
					<div className="absolute -inset-10 -z-10 bg-purple-500/20 blur-[80px] opacity-40" />

					<IPhoneShell aria-label="Free tier job matches preview - showing 3 matched jobs">
						{/* Header - Free Plan Indicator (matches real design) */}
						<div className="flex h-14 w-full items-center justify-center border-b border-border-subtle bg-surface-base px-4 pt-4">
							<div className="flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5">
								<span className="w-2 h-2 bg-brand-400 rounded-full"></span>
								<span className="text-[11px] font-medium text-brand-200">
									Free Plan · Viewing 3/5 matches
								</span>
							</div>
						</div>

						{/* Scrollable Job Cards Container */}
						<div className="flex flex-col gap-3 p-4 pt-6 overflow-y-auto bg-black">
							{jobs.map((job, index) => {
								const matchScore = job.match_score
									? Math.round(job.match_score * 100)
									: 86 - index * 2;

								return (
									<article
										key={job.id}
										className="glass-card elevation-2 p-5 hover:elevation-3 transition-all duration-300"
									>
										{/* Top Row: Job Number + Match Score + Visa Confidence */}
										<div className="flex items-center gap-2 mb-3 flex-wrap">
											<span className="text-xs font-bold text-brand-400 bg-brand-500/20 px-2.5 py-1 rounded-full">
												#{index + 1}
											</span>
											<span
												className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
													(job.match_score && job.match_score >= 0.92) ||
													matchScore >= 92
														? "text-emerald-400 bg-emerald-500/20"
														: "text-green-400 bg-green-500/20"
												}`}
											>
												{matchScore}% Match
											</span>
											{job.visa_confidence &&
												job.visa_confidence !== "unknown" &&
												(() => {
													const style = getVisaConfidenceStyle(
														job.visa_confidence,
													);
													const label = getVisaConfidenceLabel(
														job.visa_confidence,
													);
													return (
														<span
															className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-white/5 ${style.bgColor} ${style.textColor} font-medium`}
														>
															<span
																className={`w-1.5 h-1.5 rounded-full ${style.dotColor} opacity-80`}
																aria-hidden="true"
															></span>
															{label}
														</span>
													);
												})()}
										</div>

										{/* Job Title - Larger, more prominent */}
										<h3 className="text-xl font-bold mb-1.5 text-content-heading break-words tracking-tight">
											{job.title}
										</h3>

										{/* Company - Brand color */}
										<p className="text-brand-300 font-medium mb-2 break-words">
											{job.company}
										</p>

										{/* Location + Work Environment */}
										<div className="flex flex-wrap gap-2 mb-3">
											<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-elevated/50 text-sm text-content-secondary">
												📍 {job.location}
											</span>
											{job.work_environment && (
												<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-elevated/50 text-sm capitalize text-content-secondary">
													{workEnvEmoji(job.work_environment)}{" "}
													{job.work_environment}
												</span>
											)}
										</div>

										{/* Match Reason - Show for all jobs (like real page) */}
										{job.match_reason && (
											<div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
												<p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
													<span>💡</span>
													Why this match?
												</p>
												<p className="text-sm text-content-heading leading-relaxed">
													{job.match_reason}
												</p>
											</div>
										)}

										{/* Description - Show for all jobs (like real page) */}
										{job.description && (
											<p className="text-content-muted text-sm mb-4 line-clamp-3 leading-relaxed">
												{job.description.substring(0, 200)}...
											</p>
										)}

										{/* Action Buttons */}
										<div className="flex gap-3">
											<button className="flex-1 bg-emerald-500 text-content-primary font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-emerald-400 transition-all">
												Apply Now →
											</button>
											<button className="px-4 py-2.5 rounded-lg border border-border-default bg-surface-elevated/40 text-content-muted hover:text-content-secondary text-sm font-medium">
												👎
											</button>
										</div>
									</article>
								);
							})}
						</div>

						{/* CTA Overlay - Shimmer Button (matches Hero design) */}
						<div className="absolute bottom-3 left-0 w-full px-4 z-20">
							<a
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", {
										type: "free",
										location: "hero_mockup",
									});
								}}
								className="inline-flex min-h-[44px] h-12 w-full animate-shimmer items-center justify-center rounded-full border border-border-subtle bg-[linear-gradient(110deg,#000,45%,#27272a,55%,#000)] bg-[length:200%_100%] px-6 font-medium text-content-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black hover:text-content-heading hover:border-border-default text-sm md:text-base shadow-lg hover:shadow-xl shadow-[0_4px_20px_rgba(109,40,217,0.4)] hover:shadow-[0_8px_40px_rgba(109,40,217,0.5)]"
								aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
							>
								<span className="flex items-center justify-center gap-2">
									{CTA_GET_MY_5_FREE_MATCHES}
									<BrandIcons.ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
								</span>
							</a>
						</div>
					</IPhoneShell>
				</div>
			</TiltCard>
		</div>
	);
}
