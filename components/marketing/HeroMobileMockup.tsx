"use client";

import { MapPin } from "lucide-react";
import { IPhoneShell } from "../ui/IPhoneShell";
import { TiltCard } from "../ui/TiltCard";
import Link from "next/link";
import { BrandIcons } from "../ui/BrandIcons";
import { CTA_GET_MY_5_FREE_MATCHES, CTA_GET_MY_5_FREE_MATCHES_ARIA } from "../../lib/copy";
import { trackEvent } from "../../lib/analytics";
import { useEffect, useState } from "react";

interface HeroMockupProps {
	stats?: { totalUsers: number };
	topMatch?: any;
	preloadedJobs?: any[];
}

// Fallback sample jobs if API fails
const FALLBACK_JOBS = [
	{
		title: "Strategy & Business Design Intern",
		company: "McKinsey & Company",
		location: "London, UK",
		matchScore: 95,
		matchReason: "Perfect for your Strategy and Business Design career path. Located in London, visa sponsorship available.",
		workEnvironment: "Hybrid",
		type: "Internship",
	},
	{
		title: "Graduate Programme - Consulting",
		company: "BCG",
		location: "Amsterdam, Netherlands",
		matchScore: 92,
		matchReason: "Ideal for recent graduates in Strategy. Visa sponsorship available for non-EU candidates.",
		workEnvironment: "Hybrid",
		type: "Graduate Programme",
	},
	{
		title: "Junior Business Analyst",
		company: "Deloitte",
		location: "Dublin, Ireland",
		matchScore: 89,
		matchReason: "Great entry-level role matching your career path. Dublin location with visa support.",
		workEnvironment: "On-site",
		type: "Full-time",
	},
	{
		title: "Strategy Consultant (Entry Level)",
		company: "PwC",
		location: "Berlin, Germany",
		matchScore: 86,
		matchReason: "Entry-level role in Strategy consulting. Berlin office with relocation support.",
		workEnvironment: "Hybrid",
		type: "Full-time",
	},
	{
		title: "Business Design Intern",
		company: "EY",
		location: "Paris, France",
		matchScore: 84,
		matchReason: "Internship opportunity in Business Design. Paris location, French language preferred.",
		workEnvironment: "Hybrid",
		type: "Internship",
	},
];

export function HeroMobileMockup({ stats: _stats, topMatch: _topMatch, preloadedJobs }: HeroMockupProps) {
	const [jobs, setJobs] = useState<any[]>([]);

	useEffect(() => {
		// Use preloaded jobs if available, otherwise fetch
		if (preloadedJobs && preloadedJobs.length > 0) {
			const formattedJobs = preloadedJobs.slice(0, 5).map((job) => ({
				title: job.title || "",
				company: job.company || "",
				location: job.location || "",
								matchScore: job.matchScore ? Math.round(job.matchScore * 100) : 85,
				matchReason: job.matchReason || `Perfect for your career path. Located in ${job.location || ""}.`,
				workEnvironment: job.workEnvironment || "Hybrid",
				type: job.isInternship ? "Internship" : job.isGraduate ? "Graduate Programme" : "Full-time",
			}));
			setJobs(formattedJobs);
		} else {
			// Fetch jobs if not preloaded
			async function fetchJobs() {
				try {
					const now = new Date();
					const start = new Date(now.getFullYear(), 0, 1);
					const days = Math.floor(
						(now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
					);
					const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

					const response = await fetch(
						`/api/sample-jobs?day=monday&tier=free&week=${weekNumber}`,
						{
							signal: AbortSignal.timeout(5000),
						},
					);

					if (response.ok) {
						const data = await response.json();
						if (data.jobs && data.jobs.length > 0) {
							const formattedJobs = data.jobs.slice(0, 5).map((job: any) => ({
								title: job.title || "",
								company: job.company || "",
								location: job.location || "",
								matchScore: job.matchScore ? Math.round(job.matchScore * 100) : 85,
								matchReason: job.matchReason || `Perfect for your career path. Located in ${job.location || ""}.`,
								workEnvironment: job.workEnvironment || "Hybrid",
								type: job.isInternship ? "Internship" : job.isGraduate ? "Graduate Programme" : "Full-time",
							}));
							setJobs(formattedJobs);
							return;
						}
					}
				} catch (error) {
					// Silently fail - use fallback
				}
				// Fallback to sample data
				setJobs(FALLBACK_JOBS);
			}
			fetchJobs();
		}
	}, [preloadedJobs]);

	// Use jobs or fallback
	const displayJobs = jobs.length > 0 ? jobs : FALLBACK_JOBS;

	return (
		<div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px] transform perspective-1000 rotate-y-[-8deg] rotate-x-[2deg] transition-transform duration-300 hover:rotate-y-[-5deg] hover:rotate-x-[1deg] hover:translate-y-[-4px]">
			<TiltCard>
				{/* Screen Glow Container */}
				<div className="relative">
					{/* Enhanced purple glow behind the phone */}
					<div className="absolute -inset-12 -z-10 bg-purple-500/30 blur-[100px] opacity-50" />
					<div className="absolute -inset-8 -z-10 bg-brand-500/20 blur-[60px] opacity-40" />

					<IPhoneShell aria-label="Free job matches preview - showing 5 matches">
						<div className="flex flex-col h-full bg-black overflow-hidden">
							{/* Scrollable matches container */}
							<div className="flex-1 overflow-y-auto p-4 pt-6 space-y-4">
								{displayJobs.map((job, index) => (
									<div
										key={index}
										className="group relative"
									>
										{/* Glow effect on hover */}
										<div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-500" />
										
										{/* Card */}
										<div
											className="relative rounded-2xl bg-white/[0.03] backdrop-blur-[12px] border border-white/8 p-2.5 transition-all duration-500 ease-out hover:bg-white/[0.06] hover:border-emerald-500/30 hover:-translate-y-1"
											style={{
												boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
											}}
										>
											{/* Match Score & Company */}
											<div className="flex items-center justify-between mb-1.5">
												{/* Custom Match Badge - No Emoji */}
												<div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
													job.matchScore >= 92
														? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25"
														: "bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25"
												}`}>
													<div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
													<span className="text-[10px] font-bold text-white">
														{job.matchScore}% Match
													</span>
												</div>
											<div className="text-[10px] font-semibold text-white truncate ml-2">
												{job.company}
											</div>
										</div>

										{/* Job Title */}
										<h3 className="text-[12px] font-bold text-white mb-1 leading-tight line-clamp-2">
											{job.title}
										</h3>

										{/* Location */}
										<div className="flex items-center gap-1 text-[10px] text-zinc-300 mb-1.5">
											<MapPin size={10} className="shrink-0" />
											{job.location}
										</div>

										{/* Match Reason */}
										<div className="mb-1.5 p-1.5 bg-purple-500/15 border-l-2 border-purple-500 rounded">
											<div className="text-[9px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5">
												Why This Matches
											</div>
											<p className="text-[10px] text-white leading-relaxed line-clamp-2">
												{job.matchReason}
											</p>
										</div>

										{/* Tags */}
										<div className="flex flex-wrap gap-1 mb-1.5">
											<span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-zinc-300 text-[9px] font-semibold">
												{job.workEnvironment}
											</span>
											<span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-zinc-300 text-[9px] font-semibold">
												{job.type}
											</span>
										</div>
										</div>
									</div>
								))}
							</div>

							{/* CTA Button - Fixed at bottom */}
							<div className="p-4 pt-2 border-t border-white/10 bg-black/80 backdrop-blur-sm shrink-0">
								<Link
									href="/signup/free"
									onClick={() => {
										trackEvent("cta_clicked", {
											type: "free",
											location: "hero_mockup",
										});
									}}
									className="inline-flex w-full min-h-[44px] items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold px-6 transition-all hover:from-brand-500 hover:to-indigo-500 shadow-lg hover:shadow-xl shadow-[0_4px_20px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.6)] text-sm"
									aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
								>
									<span className="flex items-center justify-center gap-2">
										{CTA_GET_MY_5_FREE_MATCHES}
										<BrandIcons.ArrowRight className="h-4 w-4" />
									</span>
								</Link>
							</div>
						</div>
					</IPhoneShell>
				</div>
			</TiltCard>
		</div>
	);
}
