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
		salary: "€2,500 - €3,500/month",
		location: "Stockholm, Sweden",
		score: 98,
	};

	const userCount = stats?.totalUsers
		? stats.totalUsers.toLocaleString()
		: "10,000+";

	return (
		<div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px]">
			<TiltCard>
				<div 
					className="relative aspect-[9/19] w-full overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl"
					aria-label="Free tier job matches preview - showing top match with 98% score"
				>
					{/* Mock Browser UI */}
					<div className="flex h-12 w-full items-end justify-center border-b border-zinc-900 bg-zinc-950 pb-2">
						<div className="h-4 w-32 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
							<span className="text-xs font-mono text-zinc-400 uppercase tracking-tighter">
								jobping.com/matches
							</span>
						</div>
						{/* Free tier indicator - Trust messaging */}
						<div className="absolute top-2 right-2">
							<div className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 border border-white/10">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
								</span>
								<span className="text-[12px] font-medium text-zinc-300 uppercase tracking-tight">
									Free Forever • No Credit Card
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 p-4">
						{/* Primary Focus Card (Free Tier) */}
						<div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 p-4 shadow-xl">
							<div className="flex items-center justify-between mb-3">
								<div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
									<Zap size={16} fill="white" />
								</div>
								<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
									{displayJob.score}% Match
								</span>
							</div>
							<h4 className="text-sm font-bold text-white leading-tight truncate">
								{displayJob.title}
							</h4>
							<p className="text-[13px] text-zinc-300 mt-1">
								{displayJob.company} • {displayJob.salary}
							</p>
							<div className="mt-4 flex items-center gap-2 text-xs text-zinc-300">
								<MapPin size={12} className="shrink-0" /> {displayJob.location}
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
							<span className="text-[13px] font-black text-black uppercase tracking-tight">
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

