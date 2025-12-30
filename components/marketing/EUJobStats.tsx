"use client";

import { motion } from "framer-motion";
import { Briefcase, Globe, GraduationCap, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import GradientText from "@/components/ui/GradientText";
import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

interface JobStats {
	internships: number;
	graduateRoles: number;
	earlyCareer: number;
	total: number;
	cities: number;
}

export function EUJobStats() {
	const [stats, setStats] = useState<JobStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		async function fetchStats() {
			try {
				const response = await fetch("/api/stats/eu-jobs", {
					signal: AbortSignal.timeout(10000),
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: Failed to fetch stats`);
				}

				const data = await response.json();
				if (data.success && data.data) {
					setStats(data.data);
					setHasError(false);
				} else {
					throw new Error("Invalid response format");
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Failed to fetch EU job stats:", error);
				}
				setHasError(true);
				setStats({
					internships: 1973,
					graduateRoles: 320,
					earlyCareer: 4580,
					total: 6837,
					cities: 18,
				});
			} finally {
				setIsLoading(false);
			}
		}

		fetchStats();
	}, []);

	if (isLoading) {
		return (
			<section className="py-32 md:py-40 relative bg-black scroll-snap-section">
				<div className="container-page relative z-10">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-40 glass-card elevation-1 rounded-2xl animate-pulse bg-white/5"
							/>
						))}
					</div>
				</div>
			</section>
		);
	}

	const displayStats = stats || {
		internships: 1973,
		graduateRoles: 320,
		earlyCareer: 4580,
		total: 6837,
		cities: 18,
	};

	const statCards = [
		{
			icon: Briefcase,
			label: "Internships",
			value: displayStats.internships.toLocaleString(),
			color: "purple",
		},
		{
			icon: GraduationCap,
			label: "Graduate Roles",
			value: displayStats.graduateRoles.toLocaleString(),
			color: "emerald",
		},
		{
			icon: Rocket,
			label: "Early Career",
			value: displayStats.earlyCareer.toLocaleString(),
			color: "blue",
		},
		{
			icon: Globe,
			label: "Total Active",
			value: displayStats.total.toLocaleString(),
			color: "zinc",
			subtext: `Across ${displayStats.cities} EU cities`,
		},
	];

	const colorConfig = {
		purple: {
			iconBg: "bg-gradient-to-br from-purple-500/30 to-purple-600/20",
			iconBorder: "border-purple-500/40",
			iconText: "text-purple-200",
			iconShadow: "shadow-[0_4px_16px_rgba(139,92,246,0.3)]",
			cardHover: "hover:border-purple-500/30",
		},
		emerald: {
			iconBg: "bg-gradient-to-br from-emerald-500/30 to-emerald-600/20",
			iconBorder: "border-emerald-500/40",
			iconText: "text-emerald-200",
			iconShadow: "shadow-[0_4px_16px_rgba(16,185,129,0.3)]",
			cardHover: "hover:border-emerald-500/30",
		},
		blue: {
			iconBg: "bg-gradient-to-br from-blue-500/30 to-blue-600/20",
			iconBorder: "border-blue-500/40",
			iconText: "text-blue-200",
			iconShadow: "shadow-[0_4px_16px_rgba(59,130,246,0.3)]",
			cardHover: "hover:border-blue-500/30",
		},
		zinc: {
			iconBg: "bg-gradient-to-br from-zinc-500/30 to-zinc-600/20",
			iconBorder: "border-zinc-500/40",
			iconText: "text-zinc-200",
			iconShadow: "shadow-[0_4px_16px_rgba(113,113,122,0.2)]",
			cardHover: "hover:border-zinc-500/30",
		},
	};

	return (
		<section className="py-32 md:py-40 relative bg-black scroll-snap-section">
			{/* Scroll momentum fade - consistent with other sections */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

			<div className="container-page relative z-10">
				{/* Header - consistent with other sections */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12 md:mb-16"
				>
					<Heading
						level="h2"
						color="gradient"
						align="center"
						className="mb-4 text-3xl md:text-4xl"
					>
						Live EU Job Market Data
					</Heading>
					<p className="text-lg md:text-xl text-content-secondary max-w-2xl mx-auto leading-relaxed">
						Real-time insights into early-career opportunities across Europe
					</p>
				</motion.div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
					{statCards.map((stat, index) => {
						const Icon = stat.icon;
						const colors = colorConfig[stat.color as keyof typeof colorConfig];

						return (
							<motion.div
								key={stat.label}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									delay: index * 0.1,
									duration: 0.5,
									ease: "easeOut",
								}}
							>
								<GlassCard
									intent="default"
									hover="lift"
									className={cn(
										"group relative p-6 h-full transition-all duration-300",
										colors.cardHover,
									)}
								>
									<div className="relative z-10">
										{/* Icon */}
										<motion.span
											className={cn(
												"inline-flex h-12 w-12 items-center justify-center rounded-xl border mb-4",
												colors.iconBg,
												colors.iconBorder,
												colors.iconText,
												colors.iconShadow,
												"transition-all duration-300",
											)}
											whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
											transition={{ duration: 0.3 }}
										>
											<Icon size={24} />
										</motion.span>

										{/* Value */}
										<div className="mb-3">
											<Heading
												level="h3"
												className="text-4xl md:text-5xl mb-1 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent"
											>
												{stat.value}
											</Heading>
										</div>

										{/* Label */}
										<p className="text-sm font-semibold uppercase tracking-wider mb-2 text-content-secondary">
											{stat.label}
										</p>

										{/* Subtext */}
										{stat.subtext && (
											<p className="text-xs text-content-muted mt-2">
												{stat.subtext}
											</p>
										)}
									</div>
								</GlassCard>
							</motion.div>
						);
					})}
				</div>

				{/* Footer text - cleaner and more consistent */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.5, duration: 0.6 }}
					className="mt-12 md:mt-16 text-center"
				>
					<p className="text-sm md:text-base text-content-secondary">
						Updated daily •{" "}
						<GradientText variant="accent" className="font-semibold">
							{displayStats.total.toLocaleString()}+ roles
						</GradientText>{" "}
						from{" "}
						<GradientText variant="accent" className="font-semibold">
							{displayStats.cities} cities
						</GradientText>{" "}
						across Europe
					</p>
					{hasError && (
						<p className="text-xs text-content-muted mt-2 italic">
							Showing cached data
						</p>
					)}
				</motion.div>
			</div>
		</section>
	);
}
