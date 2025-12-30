"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";

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
		match_reason: "Perfect for your finance background and interest in AI automation. Located in London, visa sponsorship available, and requires 0-2 years experience.",
		visa_confidence: "likely",
		description: "Join our digital transformation team to build AI-powered automation solutions for financial services clients.",
	},
	{
		id: 2,
		title: "Graduate Financial Analyst",
		company: "Goldman Sachs",
		location: "London, UK",
		work_environment: "on-site",
		match_score: 0.92,
		match_reason: "Matches your finance interest and early-career focus. Located in London, visa sponsorship available.",
		visa_confidence: "likely",
		description: "Analyze financial data and support investment decisions. Perfect for recent finance graduates.",
	},
	{
		id: 3,
		title: "Junior Quantitative Developer",
		company: "JPMorgan Chase",
		location: "London, UK",
		work_environment: "hybrid",
		match_score: 0.90,
		match_reason: "Great fit for your finance and programming skills. Located in London with visa support.",
		visa_confidence: "likely",
		description: "Develop quantitative models and trading systems. Python, SQL, and financial markets knowledge required.",
	},
	{
		id: 4,
		title: "Associate - Risk Analytics",
		company: "Barclays",
		location: "London, UK",
		work_environment: "hybrid",
		match_score: 0.88,
		match_reason: "Excellent match for your finance background. Located in London, visa sponsorship available.",
		visa_confidence: "likely",
		description: "Build risk models and analytics dashboards. Work with Python, SQL, and financial data.",
	},
	{
		id: 5,
		title: "Junior FinTech Developer",
		company: "Revolut",
		location: "London, UK",
		work_environment: "hybrid",
		match_score: 0.85,
		match_reason: "Perfect for your interest in finance and technology. Located in London, EU-friendly.",
		visa_confidence: "verified",
		description: "Build financial products that millions use. React, Python, and modern fintech tooling.",
	},
];

export function HeroMobileMockup({ stats, topMatch }: HeroMockupProps) {
	const userCount = stats?.totalUsers
		? stats.totalUsers.toLocaleString()
		: "10,000+";

	// Use topMatch for first job if provided, otherwise use sample
	const jobs = topMatch 
		? [{ ...SAMPLE_JOBS[0], ...topMatch, match_score: topMatch.matchScore ? topMatch.matchScore / 100 : 0.86 }, ...SAMPLE_JOBS.slice(1)]
		: SAMPLE_JOBS;

	const getVisaStyle = (confidence: string) => {
		switch (confidence) {
			case "verified":
				return {
					bg: "bg-emerald-500/20",
					text: "text-emerald-400",
					dot: "bg-emerald-400",
					label: "Verified Visa",
				};
			case "likely":
				return {
					bg: "bg-blue-500/20",
					text: "text-blue-400",
					dot: "bg-blue-400",
					label: "Likely Visa",
				};
			default:
				return {
					bg: "bg-zinc-500/20",
					text: "text-zinc-400",
					dot: "bg-zinc-400",
					label: "Check Visa",
				};
		}
	};

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
				<div 
					className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl"
					aria-label="Free tier job matches preview - showing 5 matched jobs"
				>
					{/* Header - Free Plan Indicator (matches real design) */}
					<div className="flex h-14 w-full items-center justify-center border-b border-zinc-900 bg-zinc-950 px-4">
						<div className="flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5">
							<span className="w-2 h-2 bg-brand-400 rounded-full"></span>
							<span className="text-[11px] font-medium text-brand-200">
								Free Plan · Viewing 5/5 matches
							</span>
						</div>
					</div>

					{/* Scrollable Job Cards Container */}
					<div className="flex flex-col gap-3 p-3 overflow-y-auto h-[calc(100%-3.5rem)] bg-black">
						{jobs.map((job, index) => {
							const matchScore = job.match_score 
								? Math.round(job.match_score * 100)
								: 86 - index * 2;
							const visaStyle = getVisaStyle(job.visa_confidence || "likely");
							const isFirst = index === 0;
							
							return (
								<article
									key={job.id}
									className={`glass-card elevation-2 p-3.5 hover:elevation-3 transition-all duration-300 ${
										!isFirst ? "opacity-90" : ""
									}`}
									role="listitem"
								>
									{/* Top Row: Job Number + Match Score + Visa Confidence */}
									<div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
										<span className="text-[10px] font-bold text-brand-400 bg-brand-500/20 px-2 py-0.5 rounded-full">
											#{index + 1}
										</span>
										<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
											matchScore >= 92
												? "text-emerald-400 bg-emerald-500/20"
												: matchScore >= 85
												? "text-green-400 bg-green-500/20"
												: "text-yellow-400 bg-yellow-500/20"
										}`}>
											{matchScore}% Match
										</span>
										{job.visa_confidence && job.visa_confidence !== "unknown" && (
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${visaStyle.bg} ${visaStyle.text} border border-white/5 font-medium`}>
												<span className={`w-1 h-1 rounded-full ${visaStyle.dot} opacity-80`} aria-hidden="true"></span>
												{visaStyle.label}
											</span>
										)}
									</div>

									{/* Job Title */}
									<h3 className="text-sm font-bold mb-1 text-zinc-100 break-words tracking-tight line-clamp-1">
										{job.title}
									</h3>

									{/* Company - Brand color */}
									<p className="text-brand-300 font-medium mb-2 text-xs">
										{job.company}
									</p>

									{/* Location + Work Environment */}
									<div className="flex flex-wrap gap-1.5 mb-2.5">
										<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800/50 text-[10px] text-zinc-300">
											📍 {job.location}
										</span>
										{job.work_environment && (
											<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800/50 text-[10px] capitalize text-zinc-300">
												{workEnvEmoji(job.work_environment)} {job.work_environment}
											</span>
										)}
									</div>

									{/* Match Reason - Only show for first 2 jobs to save space */}
									{job.match_reason && index < 2 && (
										<div className="mb-2.5 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
											<p className="text-[9px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
												<span>💡</span>
												Why this match?
											</p>
											<p className="text-[10px] text-zinc-200 leading-relaxed line-clamp-2">
												{job.match_reason}
											</p>
										</div>
									)}

									{/* Description - Truncated (only first job) */}
									{index === 0 && job.description && (
										<p className="text-zinc-400 text-[10px] mb-2.5 line-clamp-2 leading-relaxed">
											{job.description}
										</p>
									)}

									{/* Action Buttons */}
									<div className="flex gap-1.5">
										<button className="flex-1 bg-emerald-500 text-zinc-950 font-bold px-2.5 py-1.5 rounded-lg text-[10px] hover:bg-emerald-400 transition-all">
											Apply Now →
										</button>
										<button className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-300 text-[10px] font-medium">
											👎
										</button>
									</div>
								</article>
							);
						})}
					</div>

					{/* CTA Overlay - Dynamic user count */}
					<div className="absolute bottom-6 left-0 w-full px-4">
						<div className="rounded-xl bg-white p-3 text-center shadow-2xl">
							<span className="text-[11px] font-extrabold text-black uppercase tracking-tight">
								JOIN {userCount} ENGINEERS
							</span>
						</div>
					</div>
				</div>
			</TiltCard>

			{/* Glow behind the phone */}
			<div className="absolute -inset-10 -z-10 bg-purple-500/20 blur-[80px] opacity-40" />
		</div>
	);
}
