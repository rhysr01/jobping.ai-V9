"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { BrandIcons } from "@/components/ui/BrandIcons";
import { useStats } from "@/hooks/useStats";

export default function SocialProofRow() {
	const { stats, isLoading: _isLoading } = useStats();
	const [_weeklyNewJobs, setWeeklyNewJobs] = useState("");
	const [_totalUsers, setTotalUsers] = useState("");
	const [_statsStale, setStatsStale] = useState(true);

	useEffect(() => {
		if (stats) {
			const hasFreshStats = stats.weeklyNewJobs > 0 && stats.totalUsers > 0;
			setWeeklyNewJobs(stats.weeklyNewJobs.toLocaleString("en-US"));
			setTotalUsers(stats.totalUsers.toLocaleString("en-US"));
			setStatsStale(!hasFreshStats);
		}
	}, [stats]);

	const items = [
		{
			icon: <BrandIcons.Mail className="h-5 w-5" />,
			eyebrow: "",
			title: `5 roles you actually qualify for (filtered by visa, location, experience)`,
			description: "",
		},
		{
			icon: <BrandIcons.CheckCircle className="h-5 w-5" />,
			eyebrow: "",
			title: `Salary range and visa status upfront - no surprises`,
			description: "",
		},
		{
			icon: <BrandIcons.Target className="h-5 w-5" />,
			eyebrow: "",
			title: `One-click feedback to improve future matches`,
			description: "",
		},
	];

	return (
		<section className="py-32 md:py-40 scroll-snap-section relative bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50">
			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
			{/* Soft section band */}
			<div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />
			<div className="container-page relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mx-auto max-w-3xl text-center mb-8"
				>
					<h3 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent mb-6">
						What's In Every Email
					</h3>
				</motion.div>
				<div className="mt-8 md:mt-10">
					<div className="mx-auto max-w-6xl rounded-2xl glass-card elevation-2 p-6 relative">
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.55 }}
							className="grid gap-4 md:grid-cols-3"
						>
							{items.map((item, index) => (
								<motion.div
									key={item.title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5, delay: index * 0.1 }}
									whileHover={{
										y: -4,
										transition: { type: "spring", stiffness: 300, damping: 20 },
									}}
									className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] px-6 py-6 transition-all duration-500 hover:bg-white/[0.06] hover:border-emerald-500/30 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_48px_rgba(16,185,129,0.15)]"
								>
									{/* Glow effect on hover */}
									<div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />
									
									{/* Glowing divider */}
									{index < items.length - 1 && (
										<span className="hidden md:inline absolute right-0 top-1/2 h-12 w-px bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent -translate-y-1/2" />
									)}

									{/* Icon with glow effect */}
									<motion.span
										className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 text-emerald-200 shadow-[0_4px_16px_rgba(16,185,129,0.3)] group-hover:shadow-[0_8px_24px_rgba(16,185,129,0.5)] transition-all duration-300"
										whileHover={{ scale: 1.15, rotate: [0, -10, 10, 0] }}
									>
										{/* Inner glow */}
										<div className="absolute inset-0 bg-gradient-to-br from-emerald-300/30 to-transparent rounded-xl" />
										<div className="relative z-10">{item.icon}</div>
									</motion.span>

									<div className="space-y-2 relative z-10">
										{item.eyebrow && (
											<p className="text-xs uppercase tracking-[0.16em] text-content-secondary mb-2">
												{item.eyebrow}
											</p>
										)}
										{/* Title with subtle gradient */}
										<h3 className="text-xl font-bold text-content-heading mb-2 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
											{item.title}
										</h3>
										{item.description && (
											<p className="text-sm text-content-secondary transition-all duration-200 group-hover:text-content-heading">
												{item.description}
											</p>
										)}
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
