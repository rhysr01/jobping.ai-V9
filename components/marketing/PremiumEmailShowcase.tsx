"use client";

import { MapPin, GraduationCap, Home, Briefcase } from "lucide-react";
import { IPhoneShell } from "@/components/ui/IPhoneShell";
import { TiltCard } from "@/components/ui/TiltCard";

// Same profile across all three emails (Monday, Wednesday, Friday)
const USER_PROFILE = {
	careerPath: "Strategy and Business Design",
	cities: ["London", "Paris"],
	visa: "Sponsorship Required",
	level: "Internships, Graduate, Entry Level",
	workStyle: "Remote, Hybrid",
};

// Real jobs from database - Strategy/Business Design roles in London & Paris
const EMAIL_JOBS = {
	monday: [
		{
			title: "Junior Business Design Analyst - Change",
			company: "Counter Terrorism Policing",
			location: "London, UK",
			jobUrl: "https://www.glassdoor.co.uk/job-listing/j?jl=1009977120890",
			score: 95,
			matchReason:
				"Perfect for your Strategy and Business Design career path. This junior role is specifically designed for early-career professionals. Located in London, and the role combines business design with strategic change initiatives.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Junior Business Design Analyst - Change - Police Staff - Counter Terrorism Policing HQ at Counter Terrorism Policing.",
		},
		{
			title: "Corporate or Retail Banking - Strategic Analyst",
			company: "eFinancialCareers",
			location: "London, UK",
			jobUrl: "https://www.reed.co.uk/jobs/corporate-or-retail-banking-strategic-analyst/56264348",
			score: 92,
			matchReason:
				"Hot match! A tier 1 strategy and analytics group looking for talented bankers to pivot into strategic projects. This team consists of ex-bankers working with Heads of Product and Strategy at major banks.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"A tier 1 strategy and analytics group are looking for talented corporate bankers or retail bankers who would like to pivot into a role using their product knowledge from a major bank to work on strategic projects.",
		},
		{
			title: "Consultant AMOA / Business Analyst Banque",
			company: "Open",
			location: "Paris, France",
			jobUrl: "https://fr.indeed.com/viewjob?jk=06a01de0320241d8",
			score: 89,
			matchReason:
				"Strong match for Strategy and Business Design in the finance sector. This consultant role focuses on retail banking, market finance, or insurance. Located in Paris, offering exposure to strategic business analysis.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Consultant AMOA / Business Analyst Banque de détail, Finance de Marché ou Assurance confirmé - H/F at Open.",
		},
		{
			title: "Trainee Recruitment Consultant",
			company: "G2 Recruitment",
			location: "London, UK",
			jobUrl: "https://www.glassdoor.co.uk/job-listing/j?jl=1009975208375",
			score: 86,
			matchReason:
				"Great entry point into strategy and business consulting. This trainee role offers structured training and exposure to multiple industries. Located in London with excellent career progression opportunities.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Trainee Recruitment Consultant at G2 Recruitment.",
		},
		{
			title: "Assistant Consultant Communication en Alternance",
			company: "L'École Française",
			location: "Paris, France",
			jobUrl: "https://www.glassdoor.fr/job-listing/j?jl=1009977514410",
			score: 84,
			matchReason:
				"Solid match for early-career consulting. This alternance role provides hands-on experience in strategic communication consulting. Based in Paris with structured learning program.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Assistant Consultant Communication en Alternance H/F at L'École Française.",
		},
	],
	wednesday: [
		{
			title: "Senior Technical Accelerator Consultant – Impact",
			company: "ServiceNow",
			location: "London, UK",
			jobUrl: "https://uk.indeed.com/viewjob?jk=dbd4d0aa59a890db",
			score: 93,
			matchReason:
				"Excellent match! ServiceNow's Impact team combines strategy with technical transformation. This role focuses on sustainability and ESG initiatives, perfect for business design professionals looking to make an impact.",
			visaConfidence: "verified",
			tags: ["On-Site", "Entry Level"],
			description:
				"Senior Technical Accelerator Consultant – Impact at ServiceNow.",
		},
		{
			title: "Consultant transformation Finance SAP S/4HANA",
			company: "Apsia",
			location: "Paris, France",
			jobUrl: "https://www.glassdoor.fr/job-listing/j?jl=1009957043862",
			score: 90,
			matchReason:
				"Hot match! This transformation consultant role combines finance strategy with business design. Work on SAP S/4HANA implementation projects in Paris, gaining exposure to enterprise transformation initiatives.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Consultant transformation Finance SAP S/4HANA Paris at Apsia.",
		},
		{
			title: "Consultant Pricing",
			company: "Converteo",
			location: "Paris, France",
			jobUrl: "https://fr.indeed.com/viewjob?jk=7c71cf8d78ef216f",
			score: 88,
			matchReason:
				"Strong alignment with Strategy and Business Design. This pricing consultant role involves strategic analysis and business modeling. Based in Paris with CDI contract, offering stability and growth.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Consultant Pricing H/F - CDI at Converteo at Converteo",
		},
		{
			title: "Inbound Headhunter & Career Consultant",
			company: "Empire",
			location: "London, UK",
			jobUrl: "https://uk.indeed.com/viewjob?jk=589340fb08c1c3a8",
			score: 85,
			matchReason:
				"Good match for strategy-minded professionals. This consulting role focuses on career strategy and talent acquisition. Located in London, offering exposure to strategic workforce planning.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Inbound Headhunter & Career Consultant at Empire.",
		},
		{
			title: "CONSULTANT CHANGE MANAGEMENT",
			company: "KONECTA HOLDING FRANCE",
			location: "Paris, France",
			jobUrl: "https://fr.indeed.com/viewjob?jk=d00602608f9a3dda",
			score: 82,
			matchReason:
				"Solid entry into change management consulting. This role focuses on organizational transformation and strategic change initiatives. Based in Paris region with opportunities to work on impactful projects.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Chez Konecta, nous recrutons des talents engagés et passionnés",
		},
	],
	friday: [
		{
			title: "Consultant(e) Confirmé(e) Quant CIB",
			company: "Nexialog Consulting",
			location: "Paris, France",
			jobUrl: "https://www.glassdoor.fr/job-listing/j?jl=1009967298608",
			score: 91,
			matchReason:
				"Excellent match for strategic quantitative analysis. This consultant role in Corporate & Investment Banking combines strategy with analytical rigor. CDI position in Paris offering strong career development.",
			visaConfidence: "verified",
			tags: ["On-Site", "Entry Level"],
			description:
				"Consultant(e) Confirmé(e) Quant CIB - CDI (H/F) at Nexialog Consulting at Nexialog Consulting",
		},
		{
			title: "Consultant AMOA – Épargne Salariale",
			company: "Reactis",
			location: "Paris, France",
			jobUrl: "https://www.glassdoor.fr/job-listing/j?jl=1009963524068",
			score: 88,
			matchReason:
				"Strong match! This AMOA consultant role focuses on employee savings strategy. Work with financial institutions in Paris, combining business analysis with strategic project management.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Consultant AMOA – Épargne Salariale (H/F) at Reactis at Reactis",
		},
		{
			title: "Lettings Consultant",
			company: "DEX Property Management",
			location: "London, UK",
			jobUrl: "https://www.glassdoor.co.uk/job-listing/j?jl=1009971317004",
			score: 85,
			matchReason:
				"Good entry point for consulting and business strategy. This role involves strategic property management and client relationship building. Located in London with clear progression paths.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Lettings Consultant at DEX Property Management.",
		},
		{
			title: "Recruitment Consultant",
			company: "The Best Connection Employment Group",
			location: "London, UK",
			jobUrl: "https://uk.indeed.com/viewjob?jk=8bc9e1397a46d01f",
			score: 83,
			matchReason:
				"Solid match for strategy and business design professionals. This consultant role offers exposure to multiple sectors and strategic workforce planning. Based in London with comprehensive training.",
			visaConfidence: "likely",
			tags: ["On-Site", "Entry Level"],
			description:
				"Recruitment Consultant at The Best Connection Employment Group.",
		},
		{
			title: "Consultant - Forensic Psychiatrist",
			company: "NHS",
			location: "London, UK",
			jobUrl: "https://uk.indeed.com/viewjob?jk=213b855aaab47089",
			score: 80,
			matchReason:
				"Alternative path for strategy professionals interested in healthcare consulting. This consultant role offers strategic impact in healthcare transformation. Permanent position in London.",
			visaConfidence: "verified",
			tags: ["On-Site", "Entry Level"],
			description:
				"This post is permanent or for a secondment opportunity",
		},
	],
};

const PREMIUM_DAYS = [
	{
		day: "Monday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		jobs: EMAIL_JOBS.monday,
	},
	{
		day: "Wednesday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		jobs: EMAIL_JOBS.wednesday,
	},
	{
		day: "Friday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		jobs: EMAIL_JOBS.friday,
	},
];

const getVisaStyle = (confidence: string) => {
	switch (confidence) {
		case "verified":
			return {
				bg: "bg-emerald-500/20",
				text: "text-emerald-400",
				border: "border-emerald-500/30",
				label: "✅ High Visa Confidence",
			};
		case "likely":
			return {
				bg: "bg-blue-500/20",
				text: "text-blue-400",
				border: "border-blue-500/30",
				label: "🔵 Likely Visa",
			};
		default:
			return {
				bg: "bg-zinc-500/20",
				text: "text-content-muted",
				border: "border-zinc-500/30",
				label: "Check Visa",
			};
	}
};

const renderContent = (email: typeof PREMIUM_DAYS[0]) => {
	// All emails show the same format: scrollable email with all 5 jobs
	// Note: IPhoneShell already provides overflow-y-auto, we just need to fill the space
	return (
		<div className="h-full bg-zinc-950 flex flex-col">
		{/* Email Header - Sticky */}
		<div className="px-3 py-2 border-b border-white/5 bg-surface-elevated/20 shrink-0">
			<div className="text-[10px] text-zinc-400 mb-0.5">
				From: <span className="text-purple-400 font-medium">{email.from}</span>
			</div>
			<div className="text-[10px] text-zinc-400">
				Subject: <span className="text-white font-semibold">{email.subject}</span>
			</div>
		</div>

		{/* Email Body - All content flows naturally for scrolling */}
		<div className="p-3 space-y-2.5">
			{/* Premium Badge */}
			<div className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
				<span className="text-yellow-400">⭐</span> Premium Member
			</div>

			{/* Title */}
			<h1 className="text-[13px] font-bold text-white">
				{email.subject}
			</h1>

			{/* Profile Pill - Fixed layout */}
			<div className="rounded-full bg-indigo-500/20 border border-white/15 px-2.5 py-1">
				<div className="flex items-start gap-1 text-[10px]">
					<div className="flex items-center gap-1 shrink-0">
						<Briefcase size={10} className="text-indigo-300" />
						<span className="text-content-heading font-medium whitespace-nowrap">
							{USER_PROFILE.careerPath}
						</span>
					</div>
					<span className="text-content-muted shrink-0">·</span>
					<div className="flex items-center gap-1 shrink-0">
						<MapPin size={10} className="text-indigo-300" />
						<span className="text-content-heading font-medium whitespace-nowrap">
							{USER_PROFILE.cities.join(", ")}
						</span>
					</div>
				</div>
			</div>

				{/* All 5 Job Cards */}
				<div className="space-y-2.5 pt-1">
					{email.jobs.map((job, index) => (
						<div
							key={index}
							className="rounded-lg border border-white/10 bg-black/40 p-2.5"
						>
				{/* Match Score & Company */}
				<div className="flex items-center justify-between mb-1.5">
					<span
						className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
							job.score >= 92
								? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/40"
								: "bg-purple-500/30 text-purple-400 border border-purple-500/40"
						}`}
					>
						{job.score >= 92 ? "🔥 " : ""}
						{job.score}% Match
					</span>
					<div className="text-[10px] font-semibold text-content-heading truncate ml-2">
						{job.company}
					</div>
				</div>

				{/* Job Title */}
				<h3 className="text-[12px] font-bold text-white mb-1 leading-tight line-clamp-2">
					{job.title}
				</h3>

				{/* Location */}
				<div className="flex items-center gap-1 text-[10px] text-content-secondary mb-1.5">
					<MapPin size={10} className="shrink-0" />
					{job.location}
				</div>

				{/* Match Reason */}
				<div className="mb-1.5 p-1.5 bg-purple-500/15 border-l-2 border-purple-500 rounded">
					<div className="text-[9px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5">
						🤖 Why This Matches
					</div>
					<p className="text-[10px] text-content-heading leading-relaxed line-clamp-2">
						{job.matchReason}
					</p>
				</div>

				{/* Tags */}
				<div className="flex flex-wrap gap-1 mb-1.5">
					{job.tags.map((tag) => (
						<span
							key={tag}
							className="px-1.5 py-0.5 rounded bg-purple-500/15 text-content-secondary text-[9px] font-semibold"
						>
							{tag}
						</span>
					))}
					{job.visaConfidence && (
						<span
							className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getVisaStyle(job.visaConfidence).bg} ${getVisaStyle(job.visaConfidence).text} ${getVisaStyle(job.visaConfidence).border}`}
						>
							{getVisaStyle(job.visaConfidence).label}
						</span>
					)}
				</div>

				{/* Action Buttons */}
				<div className="space-y-1 relative z-10">
					<a
						href={job.jobUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="block w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold px-2 py-1.5 rounded-lg text-[10px] text-center hover:from-emerald-500 hover:to-green-500 transition-colors pointer-events-auto cursor-pointer"
						onClick={(e) => {
							e.stopPropagation();
							window.open(job.jobUrl, '_blank', 'noopener,noreferrer');
						}}
					>
						Apply Now →
					</a>
					<div className="flex gap-1">
						<button
							type="button"
							className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded-lg text-[9px] font-semibold pointer-events-auto"
						>
							👍 Good
						</button>
						<button
							type="button"
							className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded-lg text-[9px] font-semibold pointer-events-auto"
						>
							👎 Not for me
						</button>
					</div>
				</div>
						</div>
					))}
				</div>

				{/* Bottom spacing for scroll */}
				<div className="h-4" />
			</div>
		</div>
	);
};

export function PremiumEmailShowcase() {
	return (
		<section className="py-24 sm:py-32 md:py-40 bg-black border-t border-border-subtle scroll-snap-section relative">
			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

			<div className="container-page relative z-10 px-4 sm:px-6">
				<div className="text-center mb-10 sm:mb-12 md:mb-16">
					<h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
						The Premium Rhythm
					</h2>
					<p className="text-sm sm:text-base text-content-secondary max-w-2xl mx-auto italic">
						"The closest thing to having a personal headhunter."
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 md:gap-8 max-w-6xl mx-auto">
					{PREMIUM_DAYS.map((email) => (
						<div key={email.day} className="relative flex flex-col items-center">
							{/* Day Label - Bigger and Bolder */}
							<div className="mb-4 sm:mb-6 text-center">
								<div className="text-lg sm:text-xl font-black text-white mb-1">
									{email.day}
								</div>
								<div className="text-sm text-zinc-400 font-medium">
									{email.time}
								</div>
							</div>

							<TiltCard>
								<div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto overflow-hidden">
									<IPhoneShell
										aria-label={`Premium email preview for ${email.day} showing 5 job matches`}
									>
										{renderContent(email)}
									</IPhoneShell>
								</div>
							</TiltCard>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
