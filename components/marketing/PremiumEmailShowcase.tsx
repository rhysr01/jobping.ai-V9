"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { MapPin } from "lucide-react";

// Same profile across all three emails (Monday, Wednesday, Friday)
	const USER_PROFILE = {
	careerPath: "Strategy and Business Design",
	cities: ["London", "Paris"],
	visa: "Visa Sponsorship Required",
	level: "Internships, Graduate, Entry Level",
	workStyle: "Remote, Hybrid",
};

// Sample jobs for each email (5 jobs per email, different jobs each day)
const EMAIL_JOBS = {
	monday: [
		{
			title: "Strategy & Business Design Intern",
			company: "McKinsey & Company",
			location: "London, UK",
			score: 98,
			matchReason:
				"Perfect for your Strategy and Business Design career path. McKinsey's practice focuses on projects that align with your interests. Located in London, visa sponsorship available, and requires no prior experience - ideal for interns.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Internship"],
			description: "Join our strategy team to help leading organizations solve complex business challenges. Work on strategic planning, market analysis, and business design.",
		},
		{
			title: "Business Design Graduate",
			company: "BCG Digital Ventures",
			location: "London, UK",
			score: 92,
			matchReason:
				"Hot match! BCG Digital Ventures' Graduate Programme is specifically designed for recent graduates. The hybrid work arrangement fits your preferences, and the role is in London with visa sponsorship available.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Graduate"],
			description: "Design and launch new digital businesses. Work with startups and corporates to build innovative solutions from concept to market.",
		},
		{
			title: "Strategy Consultant",
			company: "Roland Berger",
			location: "Paris, France",
			score: 90,
			matchReason:
				"Roland Berger's team specializes in work that matches your Strategy and Business Design career path. The role is based in Paris with visa sponsorship available, and the hybrid setup aligns with your preferences.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Entry Level"],
			description: "Work on strategic projects across industries. Help clients transform their businesses through innovative strategies and design thinking.",
		},
		{
			title: "Business Design Intern",
			company: "IDEO",
			location: "London, UK",
			score: 88,
			matchReason:
				"Great match for Strategy and Business Design. IDEO offers structured training for interns, located in London with visa sponsorship available.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Internship"],
			description: "Design human-centered business solutions. Combine strategy, design, and innovation to create meaningful impact.",
		},
		{
			title: "Strategic Design Associate",
			company: "Fjord",
			location: "Paris, France",
			score: 85,
			matchReason:
				"Strong alignment with your Strategy and Business Design goals. Fjord's team offers clear progression paths. Hybrid work style, visa sponsorship available, and entry-level friendly with excellent training support.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Entry Level"],
			description: "Design service experiences and business strategies. Work at the intersection of design, business, and technology.",
		},
	],
	wednesday: [
		{
			title: "Strategy Graduate Programme",
			company: "Deloitte",
			location: "London, UK",
			score: 95,
			matchReason:
				"Perfect for your Strategy and Business Design career path. Deloitte's graduate programme focuses on projects that align with your interests. Located in London, visa sponsorship available, and designed for recent graduates.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Graduate"],
			description: "Help clients navigate complex business challenges. Work on strategic planning, digital transformation, and business model innovation.",
		},
		{
			title: "Business Design Consultant",
			company: "PwC",
			location: "Paris, France",
			score: 93,
			matchReason:
				"Hot match! PwC's program is specifically designed for early-career professionals. The hybrid work arrangement fits your preferences, and the role is in Paris with visa sponsorship available.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Entry Level"],
			description: "Design innovative business models and strategies. Combine consulting expertise with design thinking to deliver transformative solutions.",
		},
		{
			title: "Strategy & Innovation Intern",
			company: "EY",
			location: "London, UK",
			score: 91,
			matchReason:
				"EY's team specializes in work that matches your Strategy and Business Design career path. Hybrid setup aligns with your preferences, and requires no prior experience - ideal for interns.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Internship"],
			description: "Drive strategic innovation for leading organizations. Work on growth strategies, market entry, and business transformation.",
		},
		{
			title: "Business Design Strategist",
			company: "McKinsey Digital",
			location: "Paris, France",
			score: 89,
			matchReason:
				"Great match for Strategy and Business Design. McKinsey Digital offers structured training for entry-level professionals, located in Paris with visa sponsorship available.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Entry Level"],
			description: "Design digital strategies and business models. Combine strategic thinking with design to create innovative digital solutions.",
		},
		{
			title: "Strategic Planning Graduate",
			company: "KPMG",
			location: "London, UK",
			score: 87,
			matchReason:
				"Strong alignment with your Strategy and Business Design goals. KPMG's graduate programme offers clear progression paths. Hybrid work style, and designed for recent graduates.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Graduate"],
			description: "Help organizations develop strategic plans and business designs. Work on market analysis, competitive strategy, and organizational design.",
		},
	],
	friday: [
		{
			title: "Business Design Analyst",
			company: "Accenture",
			location: "London, UK",
			score: 94,
			matchReason:
				"Perfect for your Strategy and Business Design career path. Accenture's practice focuses on projects that align with your interests. Located in London, visa sponsorship available, and entry-level friendly.",
			visaConfidence: "likely",
			tags: ["Hybrid", "Entry Level"],
			description: "Design innovative business solutions and strategies. Work with clients to transform their organizations through design-led approaches.",
		},
		{
			title: "Strategy Graduate",
			company: "Oliver Wyman",
			location: "Paris, France",
			score: 92,
			matchReason:
				"Hot match! Oliver Wyman's graduate programme is specifically designed for recent graduates. The hybrid work arrangement fits your preferences, and visa sponsorship available.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Graduate"],
			description: "Solve complex strategic challenges for leading organizations. Work on market strategy, organizational design, and business transformation.",
		},
		{
			title: "Design Strategy Intern",
			company: "Pentagram",
			location: "London, UK",
			score: 90,
			matchReason:
				"Pentagram's team specializes in work that matches your Strategy and Business Design career path. The role is based in London with visa sponsorship available, and requires no prior experience - ideal for interns.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Internship"],
			description: "Develop strategic design solutions for brands and organizations. Work at the intersection of design, strategy, and business.",
		},
		{
			title: "Business Strategy Associate",
			company: "Kearney",
			location: "Paris, France",
			score: 88,
			matchReason:
				"Great match for Strategy and Business Design. Kearney offers structured training for entry-level professionals, hybrid work style, with comprehensive training support.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Entry Level"],
			description: "Help clients develop winning strategies. Work on strategic planning, market analysis, and business model design.",
		},
		{
			title: "Innovation Strategy Graduate",
			company: "Capgemini Invent",
			location: "London, UK",
			score: 86,
			matchReason:
				"Strong alignment with your Strategy and Business Design goals. Capgemini Invent's graduate programme offers clear progression paths. Located in London with visa sponsorship available.",
			visaConfidence: "verified",
			tags: ["Hybrid", "Graduate"],
			description: "Design innovation strategies and new business models. Combine strategic thinking with design to drive organizational transformation.",
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
				text: "text-zinc-400",
				border: "border-zinc-500/30",
				label: "Check Visa",
			};
	}
};

export function PremiumEmailShowcase() {
	return (
		<section className="py-24 bg-black border-t border-zinc-900">
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-16">
					<h2 className="text-3xl font-bold text-white mb-4">
						The Premium Rhythm
					</h2>
					<p className="text-zinc-300 max-w-2xl mx-auto italic">
						"The closest thing to having a personal headhunter."
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{PREMIUM_DAYS.map((email) => {
						const featuredJob = email.jobs[0]; // Show first job as featured
						const remainingCount = email.jobs.length - 1;

						return (
							<TiltCard key={email.day}>
								<div
									className="relative flex flex-col min-h-[600px] h-full w-full rounded-2xl border border-white/5 bg-[#0A0A0A] overflow-hidden shadow-2xl transition-all hover:border-purple-500/30 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black"
									aria-label={`Premium email preview for ${email.day} - ${featuredJob.title} at ${featuredJob.company}`}
								>
									{/* macOS-style Window Controls */}
									<div className="bg-[#111] px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
										<div className="flex gap-1.5">
											<div className="w-2 h-2 rounded-full bg-red-500/20" />
											<div className="w-2 h-2 rounded-full bg-yellow-500/20" />
											<div className="w-2 h-2 rounded-full bg-green-500/20" />
										</div>
										<span className="text-xs font-mono text-zinc-400 uppercase tracking-[0.2em]">
											{email.day} @ {email.time}
										</span>
									</div>

									{/* Email Headers */}
									<div className="px-5 py-4 border-b border-white/5 bg-zinc-900/20 shrink-0">
										<div className="text-xs text-zinc-400 mb-1">
											From:{" "}
											<span className="text-purple-400 font-medium tracking-wide">
												{email.from}
											</span>
										</div>
										<div className="text-xs text-zinc-400">
											Subject:{" "}
											<span className="text-white font-semibold tracking-tight">
												{email.subject}
											</span>
										</div>
									</div>

									{/* Email Content - Scrollable */}
									<div className="p-5 flex flex-col flex-1 overflow-y-auto">
										{/* Premium Badge */}
										<div className="mb-4 shrink-0">
											<span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
												⭐ Premium Member
											</span>
										</div>

										{/* Title */}
										<h1 className="text-lg font-bold text-white mb-2 shrink-0">
											{email.subject} ✨
										</h1>

										{/* Intro Text */}
										<p className="text-sm text-zinc-300 mb-4 leading-relaxed shrink-0">
											here's what our matcher surfaced for you today. Every role
											below cleared the filters you set - location, career path,
											visa, and early-career fit.
										</p>

										{/* Profile Section - SAME FOR ALL EMAILS */}
										<div className="mb-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-3 shrink-0">
											<div className="text-xs font-semibold text-zinc-200 mb-2">
												📋 Your Profile
											</div>
											<div className="space-y-1 text-xs text-zinc-400">
												<div>
													<strong className="text-zinc-300">Career Path:</strong>{" "}
													{USER_PROFILE.careerPath}
												</div>
												<div>
													<strong className="text-zinc-300">Cities:</strong>{" "}
													{USER_PROFILE.cities.join(", ")}
												</div>
												<div>
													<strong className="text-zinc-300">Visa:</strong>{" "}
													{USER_PROFILE.visa}
												</div>
												<div>
													<strong className="text-zinc-300">Level:</strong>{" "}
													{USER_PROFILE.level}
												</div>
												<div>
													<strong className="text-zinc-300">Work Style:</strong>{" "}
													{USER_PROFILE.workStyle}
												</div>
											</div>
										</div>

										{/* Featured Job Card (First Job) - Matches Real Email Design */}
										<div className="rounded-xl border border-white/10 bg-black/40 p-4 mb-3">
											{/* Match Score Badge */}
											<div className="flex items-center justify-between mb-3">
												<span
													className={`text-xs font-bold px-2.5 py-1 rounded ${
														featuredJob.score >= 92
															? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
															: "bg-purple-500/20 text-purple-400 border border-purple-500/30"
													}`}
												>
													{featuredJob.score >= 92 ? "🔥 " : ""}
													{featuredJob.score}% Match
												</span>
												<div className="text-sm font-semibold text-zinc-200">
													{featuredJob.company}
												</div>
											</div>

											{/* Job Title */}
											<h3 className="text-base font-bold text-white mb-2 leading-tight">
												{featuredJob.title}
											</h3>

											{/* Location */}
											<div className="flex items-center gap-1.5 text-xs text-zinc-300 mb-3">
												<MapPin size={12} className="shrink-0" />
												{featuredJob.location}
											</div>

											{/* Match Reason - Purple border left, matches real email */}
											<div className="mb-3 p-3 bg-purple-500/15 border-l-2 border-purple-500 rounded">
												<div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
													🤖 Why This Matches
												</div>
												<p className="text-sm text-zinc-200 leading-relaxed">
													{featuredJob.matchReason}
												</p>
											</div>

											{/* Description */}
											<p className="text-xs text-zinc-400 mb-3 leading-relaxed line-clamp-2">
												{featuredJob.description}
											</p>

											{/* Tags */}
											<div className="flex flex-wrap gap-1.5 mb-3">
												{featuredJob.tags.map((tag) => (
													<span
														key={tag}
														className="px-2 py-0.5 rounded bg-purple-500/15 text-zinc-300 text-[10px] font-semibold"
													>
														{tag}
													</span>
												))}
												{featuredJob.visaConfidence && (
													<span
														className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getVisaStyle(featuredJob.visaConfidence).bg} ${getVisaStyle(featuredJob.visaConfidence).text} ${getVisaStyle(featuredJob.visaConfidence).border}`}
													>
														{getVisaStyle(featuredJob.visaConfidence).label}
													</span>
												)}
											</div>

											{/* Action Buttons - Matches Real Email */}
											<div className="flex gap-2">
												<button className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-3 py-2 rounded-lg text-xs hover:from-indigo-500 hover:to-purple-500 transition-all">
													View Match Evidence →
												</button>
											</div>
											<div className="flex gap-2 mt-2">
												<button className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
													👍 Good match
												</button>
												<button className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
													👎 Not for me
												</button>
											</div>
										</div>

										{/* +4 more matches indicator */}
										<div className="text-center pt-3 border-t border-white/5 shrink-0">
											<p className="text-xs text-zinc-300 font-semibold">
												+{remainingCount} more matches in this email
											</p>
										</div>
									</div>
								</div>
							</TiltCard>
						);
					})}
				</div>
			</div>
		</section>
	);
}
