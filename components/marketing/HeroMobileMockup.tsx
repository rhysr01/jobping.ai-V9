"use client";

import { IPhoneShell } from "@/components/ui/IPhoneShell";
import { TiltCard } from "@/components/ui/TiltCard";

interface HeroMockupProps {
	stats?: { totalUsers: number };
	topMatch?: any;
}

export function HeroMobileMockup({ stats: _stats, topMatch: _topMatch }: HeroMockupProps) {

	return (
		<div className="relative mx-auto w-full max-w-[320px] lg:max-w-[380px]">
			<TiltCard>
				{/* Screen Glow Container */}
				<div className="relative">
					{/* Enhanced purple glow behind the phone */}
					<div className="absolute -inset-12 -z-10 bg-purple-500/30 blur-[100px] opacity-50" />
					<div className="absolute -inset-8 -z-10 bg-brand-500/20 blur-[60px] opacity-40" />

					<IPhoneShell aria-label="Premium job match preview - showing 98% match result">
						{/* Show single high-quality job card instead of signup flow */}
						<div className="flex flex-col p-4 pt-6 bg-black h-full overflow-y-auto">
							{/* Premium Badge */}
							<div className="mb-4 shrink-0">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3.5 py-1.5 text-sm font-bold text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
									<span className="text-yellow-400">⭐</span> Premium Member
								</span>
							</div>

							{/* Single Featured Job Card - High Match Score */}
							<article className="glass-card elevation-2 p-5 rounded-xl border-2 border-emerald-500/30 relative">
								{/* Match Score Badge - Glowing */}
								<div className="flex items-center justify-between mb-3">
									<span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.4)]">
										🔥 98% Match
									</span>
									<div className="text-sm font-semibold text-white">
										McKinsey & Company
									</div>
								</div>

								{/* Job Title */}
								<h3 className="text-base font-bold text-white mb-2 leading-tight">
									Strategy & Business Design Intern
								</h3>

								{/* Location */}
								<div className="flex items-center gap-1.5 text-xs text-zinc-300 mb-3">
									📍 London, UK
								</div>

								{/* Match Reason - Muted styling */}
								<div className="mb-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
									<p className="text-xs font-semibold text-zinc-400 mb-1.5">
										Why this match?
									</p>
									<p className="text-sm text-zinc-200 leading-relaxed">
										Perfect for your Strategy and Business Design career path. Located in London, visa sponsorship available.
									</p>
								</div>

								{/* Tags */}
								<div className="flex flex-wrap gap-1.5 mb-3">
									<span className="px-2 py-0.5 rounded bg-purple-500/15 text-zinc-300 text-[10px] font-semibold">
										Hybrid
									</span>
									<span className="px-2 py-0.5 rounded bg-purple-500/15 text-zinc-300 text-[10px] font-semibold">
										Internship
									</span>
								</div>

								{/* Action Button */}
								<button
									type="button"
									className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-4 py-2.5 rounded-lg text-xs hover:from-indigo-500 hover:to-purple-500 transition-all"
								>
									View Match Evidence →
								</button>
							</article>
						</div>
					</IPhoneShell>
				</div>
			</TiltCard>
		</div>
	);
}
