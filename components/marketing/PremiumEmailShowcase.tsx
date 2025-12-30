"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { MapPin } from "lucide-react";

const PREMIUM_DAYS = [
	{
		day: "Monday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		featuredJob: {
			title: "Software Engineering Intern",
			company: "Spotify",
			location: "Stockholm, Sweden",
			score: 98,
			matchReason:
				"Perfect for your React & TypeScript skills in a music-tech environment. Located in Stockholm, EU citizen-friendly, and requires no prior experience - ideal for interns.",
			visaConfidence: "high",
			tags: ["Remote", "Internship"],
		},
		profile: {
			careerPath: "Software Engineering",
			cities: ["Stockholm", "London", "Berlin"],
			visa: "EU Citizen",
			level: "Internship",
		},
	},
	{
		day: "Wednesday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		featuredJob: {
			title: "Graduate Frontend Developer",
			company: "Monzo",
			location: "London, UK",
			score: 92,
			matchReason:
				"Matches your fintech interest and early-career focus. Located in London, visa sponsorship available, and the hybrid setup aligns with your preferences.",
			visaConfidence: "medium",
			tags: ["Hybrid", "Graduate"],
		},
		profile: {
			careerPath: "Frontend Development",
			cities: ["London", "Barcelona"],
			visa: "Visa Sponsorship Required",
			level: "Graduate Programs",
		},
	},
	{
		day: "Friday",
		time: "09:00 AM",
		subject: "Your 5 new matches are ready",
		from: "JobPing",
		featuredJob: {
			title: "AI Research Intern",
			company: "Mistral",
			location: "Paris, France",
			score: 95,
			matchReason:
				"Aligns with your machine learning coursework and EU visa status. Located in Paris, EU citizen-friendly, and the remote arrangement provides flexibility.",
			visaConfidence: "high",
			tags: ["Remote", "Internship"],
		},
		profile: {
			careerPath: "AI/ML",
			cities: ["Paris", "Amsterdam"],
			visa: "EU Citizen",
			level: "Internship",
		},
	},
];

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
					{PREMIUM_DAYS.map((item) => (
						<TiltCard key={item.day}>
							<div 
								className="relative flex flex-col min-h-[480px] h-full w-full rounded-2xl border border-white/5 bg-[#0A0A0A] overflow-hidden shadow-2xl transition-all hover:border-purple-500/30 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black"
								aria-label={`Premium email preview for ${item.day} - ${item.featuredJob.title} at ${item.featuredJob.company}`}
							>
								{/* macOS-style Window Controls */}
								<div className="bg-[#111] px-4 py-3 border-b border-white/5 flex items-center justify-between">
									<div className="flex gap-1.5">
										<div className="w-2 h-2 rounded-full bg-red-500/20" />
										<div className="w-2 h-2 rounded-full bg-yellow-500/20" />
										<div className="w-2 h-2 rounded-full bg-green-500/20" />
									</div>
									<span className="text-xs font-mono text-zinc-400 uppercase tracking-[0.2em]">
										{item.day} @ {item.time}
									</span>
								</div>

								{/* Email Headers - Fixed Readability */}
								<div className="px-5 py-4 border-b border-white/5 bg-zinc-900/20">
									<div className="text-xs text-zinc-400 mb-1">
										From:{" "}
										<span className="text-purple-400 font-medium tracking-wide">
											{item.from}
										</span>
									</div>
									<div className="text-xs text-zinc-400">
										Subject:{" "}
										<span className="text-white font-semibold tracking-tight">
											{item.subject}
										</span>
									</div>
								</div>

								<div className="p-5 flex flex-col flex-1 justify-between overflow-y-auto">

									{/* Premium Badge */}
									<div className="mb-4">
										<span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
											⭐ Premium Member
										</span>
									</div>

									{/* Profile Section */}
									<div className="mb-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-3">
										<div className="text-xs font-semibold text-zinc-200 mb-2">
											📋 Your Profile
										</div>
										<div className="space-y-1 text-xs text-zinc-400">
											<div>
												<strong className="text-zinc-300">Career Path:</strong>{" "}
												{item.profile.careerPath}
											</div>
											<div>
												<strong className="text-zinc-300">Cities:</strong>{" "}
												{item.profile.cities.join(", ")}
											</div>
											<div>
												<strong className="text-zinc-300">Visa:</strong>{" "}
												{item.profile.visa}
											</div>
											<div>
												<strong className="text-zinc-300">Level:</strong>{" "}
												{item.profile.level}
											</div>
										</div>
									</div>

									{/* Featured Job Card */}
									<div className="rounded-xl border border-white/10 bg-black/40 p-4 mb-3">
										<div className="flex justify-between items-start mb-2">
											<h3 className="text-[17px] font-bold text-white leading-tight">
												{item.featuredJob.title}
											</h3>
											<span className="bg-purple-500/10 text-purple-400 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-tighter border border-purple-500/20 shrink-0">
												{item.featuredJob.score}% Fit
											</span>
										</div>

										<div className="text-sm font-semibold text-zinc-200 mb-2">
											{item.featuredJob.company}
										</div>

										<div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
											<MapPin size={12} className="shrink-0" />
											{item.featuredJob.location}
										</div>

										{/* Match Reason - 14px with leading-relaxed */}
										<div className="relative p-3 rounded-lg bg-zinc-900/40 border-l-2 border-purple-500 mb-4">
											<div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1.5">
												🤖 Why This Matches
											</div>
											<p className="text-sm text-zinc-200 italic leading-relaxed">
												"{item.featuredJob.matchReason}"
											</p>
										</div>

										{/* Tags */}
										<div className="flex flex-wrap gap-2">
											{item.featuredJob.tags.map((tag) => (
												<span
													key={tag}
													className="px-2.5 py-1 rounded-md bg-purple-500/15 text-zinc-300 text-xs font-semibold"
												>
													{tag}
												</span>
											))}
											{item.featuredJob.visaConfidence === "high" && (
												<span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
													✅ High Visa Confidence
												</span>
											)}
										</div>
									</div>

									{/* +4 more matches indicator */}
									<div className="text-center pt-3 border-t border-white/5">
										<p className="text-xs text-zinc-300 font-semibold">
											+4 more matches in this email
										</p>
									</div>
								</div>
							</div>
						</TiltCard>
					))}
				</div>
			</div>
		</section>
	);
}
