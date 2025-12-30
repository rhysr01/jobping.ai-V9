"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const PREMIUM_DAYS = [
	{
		day: "Monday",
		subject: "Your Weekly Kickoff: 5 New Matches",
		featuredJob: "Software Engineering Intern @ Spotify (Stockholm)",
		matchReason: "Perfect for your React & TypeScript skills in a music-tech environment.",
		stats: { skills: 95, salary: 90, tech: 100 },
	},
	{
		day: "Wednesday",
		subject: "Mid-week Pulse: Top 5 High-Growth Roles",
		featuredJob: "Graduate Frontend Developer @ Monzo (London)",
		matchReason: "Matches your fintech interest and early-career focus.",
		stats: { skills: 92, salary: 98, tech: 85 },
	},
	{
		day: "Friday",
		subject: "The Weekend Update: 5 Remote Matches",
		featuredJob: "AI Research Intern @ Mistral (Paris)",
		matchReason: "Aligns with your machine learning coursework and EU visa status.",
		stats: { skills: 100, salary: 85, tech: 95 },
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
					<p className="text-zinc-500 max-w-2xl mx-auto italic">
						"The closest thing to having a personal headhunter."
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{PREMIUM_DAYS.map((item) => (
						<TiltCard key={item.day}>
							<div className="group relative flex flex-col h-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-purple-500/50">
								{/* Email Header */}
								<div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
									<div className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-[10px] font-bold italic text-white">
										JP
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">
											{item.day} Delivery
										</p>
									</div>
									<Mail size={14} className="text-zinc-700" />
								</div>

								{/* Match Evidence with Animated Bars */}
								<div className="mb-4 rounded-xl bg-zinc-900/50 p-4 border border-zinc-800">
									<h4 className="text-xs font-bold text-white mb-3">
										{item.featuredJob}
									</h4>
									<div className="space-y-3">
										{Object.entries(item.stats).map(([label, val]) => (
											<div key={label}>
												<div className="flex justify-between text-[8px] uppercase text-zinc-500 mb-1">
													<span>{label}</span>
													<span>{val}%</span>
												</div>
												<div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
													<motion.div
														initial={{ width: 0 }}
														whileInView={{ width: `${val}%` }}
														viewport={{ once: true }}
														transition={{ duration: 1, delay: 0.2 }}
														className="h-full bg-purple-500"
													/>
												</div>
											</div>
										))}
									</div>
								</div>

								<p className="text-[11px] text-zinc-400 leading-relaxed italic mb-6">
									"{item.matchReason}"
								</p>

								<div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-900 text-zinc-600 text-[10px] font-bold uppercase">
									<span>+4 more matches</span>
									<ArrowRight size={14} />
								</div>
							</div>
						</TiltCard>
					))}
				</div>
			</div>
		</section>
	);
}

