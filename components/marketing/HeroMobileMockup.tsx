"use client";

import React from "react";
import { TiltCard } from "@/components/ui/TiltCard";
import { MapPin, Zap } from "lucide-react";

interface HeroMockupProps {
	stats?: { totalUsers: number };
	topMatch?: any; // For future real data integration
}

export function HeroMobileMockup({ stats, topMatch }: HeroMockupProps) {
	// We use hardcoded data to ensure the Hero always looks "Top Tier"
	const displayJob = topMatch || {
		title: "Software Engineering Intern",
		company: "Spotify",
		salary: "€3,500 - €4,200/month",
		location: "Stockholm, Sweden",
		score: 98,
	};

	const userCount = stats?.totalUsers
		? stats.totalUsers.toLocaleString()
		: "10,000+";

	return (
		<div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px]">
			<TiltCard>
				<div className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl">
					{/* Mock Browser UI */}
					<div className="flex h-12 w-full items-end justify-center border-b border-zinc-900 bg-zinc-950 pb-2">
						<div className="h-4 w-32 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
							<span className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">
								jobping.com/matches
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-3 p-4">
						{/* Primary Focus Card (Free Tier) */}
						<div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 p-4 shadow-xl">
							<div className="flex items-center justify-between mb-3">
								<div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
									<Zap size={16} fill="white" />
								</div>
								<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-500 border border-emerald-500/20 uppercase tracking-tight">
									{displayJob.score}% Match
								</span>
							</div>
							<h4 className="text-sm font-bold text-white">
								{displayJob.title}
							</h4>
							<p className="text-[11px] text-zinc-400 mt-1">
								{displayJob.company} • {displayJob.salary}
							</p>
							<div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
								<MapPin size={12} /> {displayJob.location}
							</div>
						</div>

						{/* Hint of more matches */}
						{[1, 2].map((i) => (
							<div
								key={i}
								className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-4 opacity-40"
							>
								<div className="h-4 w-24 bg-zinc-800 rounded mb-2" />
								<div className="h-3 w-32 bg-zinc-800/50 rounded" />
							</div>
						))}
					</div>

					{/* Social Proof CTA */}
					<div className="absolute bottom-8 left-0 w-full px-6">
						<div className="rounded-xl bg-white p-3 text-center shadow-2xl">
							<span className="text-[11px] font-extrabold text-black">
								JOIN {userCount} ENGINEERS
							</span>
						</div>
					</div>
				</div>
			</TiltCard>

			{/* Glow behind the phone to pop it off the Hero background */}
			<div className="absolute -inset-10 -z-10 bg-purple-500/20 blur-[80px] opacity-40" />
		</div>
	);
}

