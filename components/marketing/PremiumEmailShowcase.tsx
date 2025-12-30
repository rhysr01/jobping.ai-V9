"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { motion } from "framer-motion";

const PREMIUM_DAYS = [
	{
		day: "Monday",
		time: "09:00 AM",
		company: "Spotify",
		jobTitle: "Software Engineering Intern",
		matchReason: "Perfect for your React & TypeScript skills in a music-tech environment.",
		stats: { skills: 95, salary: 90, tech: 100 },
	},
	{
		day: "Wednesday",
		time: "09:00 AM",
		company: "Monzo",
		jobTitle: "Graduate Frontend Developer",
		matchReason: "Matches your fintech interest and early-career focus.",
		stats: { skills: 92, salary: 98, tech: 85 },
	},
	{
		day: "Friday",
		time: "09:00 AM",
		company: "Mistral",
		jobTitle: "AI Research Intern",
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
							<div className="group relative bg-[#0D0D0D] rounded-2xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-purple-500/30">
								{/* Browser/Email Header */}
								<div className="bg-[#161616] px-4 py-3 border-b border-white/5 flex items-center justify-between">
									<div className="flex gap-1.5">
										<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
										<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
										<div className="w-2.5 h-2.5 rounded-full bg-white/10" />
									</div>
									<div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
										{item.day} @ {item.time}
									</div>
								</div>

								<div className="p-6">
									{/* From/To Logic */}
									<div className="flex flex-col gap-1 mb-6 border-b border-white/5 pb-4">
										<div className="text-xs text-zinc-500">
											From:{" "}
											<span className="text-purple-400">
												JobPing Intelligence
											</span>
										</div>
										<div className="text-xs text-zinc-500">
											Subject:{" "}
											<span className="text-white font-medium">
												100% Match: {item.company}
											</span>
										</div>
									</div>

									{/* The Job Detail */}
									<div className="space-y-4">
										<div className="flex justify-between items-start">
											<h3 className="text-lg font-bold text-white leading-tight">
												{item.jobTitle}
											</h3>
											<span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
												98% Fit
											</span>
										</div>

										{/* Match Reason as an "Internal Memo" */}
										<div className="bg-zinc-900/50 rounded-lg p-3 border-l-2 border-purple-500">
											<p className="text-[13px] text-zinc-300 italic leading-relaxed">
												"{item.matchReason}"
											</p>
										</div>

										{/* The "Evidence" Progress Bars - Styled more like a dashboard */}
										<div className="space-y-3 pt-2">
											{Object.entries(item.stats).map(([label, val]) => (
												<div key={label} className="space-y-1">
													<div className="flex justify-between text-[10px] uppercase text-zinc-500 font-bold">
														<span>{label}</span>
														<span>{val}%</span>
													</div>
													<div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
														<motion.div
															initial={{ width: 0 }}
															whileInView={{ width: `${val}%` }}
															viewport={{ once: true }}
															transition={{ duration: 1, delay: 0.2 }}
															className="h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"
														/>
													</div>
												</div>
											))}
										</div>
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

