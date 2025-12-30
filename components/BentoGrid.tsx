"use client";

import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/ui/TiltCard";
import GradientText from "@/components/ui/GradientText";
import Heading from "@/components/ui/Heading";
import { FileJson, Cpu, Brain, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const FeatureCard = ({
	title,
	description,
	icon: Icon,
	className,
	children,
}: {
	title: string;
	description: string;
	icon: React.ComponentType<any>;
	className?: string;
	children?: React.ReactNode;
}) => {
	const cardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const card = cardRef.current;
		if (!card) return;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = card.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;
			card.style.setProperty("--x", `${x}%`);
			card.style.setProperty("--y", `${y}%`);
		};

		card.addEventListener("mousemove", handleMouseMove);
		return () => card.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div
			ref={cardRef}
			role="article"
			aria-label={`${title} - ${description}`}
			className={cn(
				"group relative overflow-hidden rounded-3xl glass-card elevation-1 p-6 transition-all duration-300",
				"hover:elevation-3 hover:border-purple-500/50 hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)]",
				"focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black",
				"bg-gradient-to-br from-surface-base/90 via-surface-base/95 to-surface-elevated/90",
				className
			)}
		>
			{/* Enhanced Glow Effect on Hover */}
			<div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(139,92,246,0.15)_0%,transparent_70%)]" />
			
			{/* Subtle inner glow */}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

			<div className="relative z-10 flex h-full flex-col justify-between">
				<div>
					<div className={cn(
						"mb-4 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl",
						"glass-card elevation-1 text-purple-400",
						"bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent",
						"border border-purple-500/30",
						"shadow-[0_4px_16px_rgba(139,92,246,0.2)]",
						"group-hover:shadow-[0_8px_24px_rgba(139,92,246,0.3)]",
						"group-hover:scale-110 transition-transform duration-300"
					)}>
						<Icon size={24} className="md:w-7 md:h-7" />
					</div>
					<Heading
						level="h3"
						className={cn(
							"text-xl md:text-2xl mb-3",
							"group-hover:[&>span]:from-white group-hover:[&>span]:via-purple-200 group-hover:[&>span]:to-emerald-200",
							"transition-all duration-300"
						)}
					>
						<GradientText variant="brand">{title}</GradientText>
					</Heading>
					<p className={cn(
						"mt-2 text-base md:text-lg text-content-secondary leading-relaxed",
						"group-hover:text-content-heading transition-colors duration-300"
					)}>
						{description}
					</p>
				</div>
				{children}
			</div>
		</div>
	);
};

export default function HowItWorksBento() {
	return (
		<section className={cn(
			"py-32 md:py-40 bg-black relative overflow-hidden scroll-snap-section",
			"before:absolute before:inset-0 before:bg-gradient-to-b before:from-purple-900/5 before:via-transparent before:to-emerald-900/5 before:pointer-events-none"
		)}>
			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
			
			<div className="container-page relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="mb-12 text-center"
				>
					<Heading
						level="h2"
						color="gradient"
						align="center"
						className="drop-shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
					>
						Matching at the speed of AI
					</Heading>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]">
					{/* Card 1: Quick Setup */}
					<FeatureCard
						title="Instant Setup"
						description="Tell us your career path and preferred cities. No resume upload needed—just simple preferences that power our AI matching in seconds."
						icon={FileJson}
						className="md:col-span-1"
					>
						<div className="mt-4 space-y-4">
							<div className="relative h-28 w-full rounded-xl bg-surface-elevated/50 border border-white/5 overflow-hidden">
								{/* Vertical Scanning Line */}
								<motion.div
									animate={{ top: ["-10%", "110%"] }}
									transition={{
										repeat: Infinity,
										duration: 2,
										ease: "linear",
									}}
									className="absolute left-0 right-0 h-[1px] bg-purple-400 shadow-[0_0_15px_#a855f7] z-20"
								/>

								{/* Scanning UI Labels */}
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
									<span className="text-xs font-mono text-purple-300 bg-black/60 px-3 py-1.5 rounded-md border border-purple-500/20 uppercase tracking-widest">
										Processing Preferences...
									</span>
									<div className="flex gap-1">
										{[1, 2, 3].map((i) => (
											<div
												key={i}
												className="w-1 h-1 rounded-full bg-purple-500/40 animate-bounce"
												style={{
													animationDelay: `${i * 0.2}s`,
												}}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					</FeatureCard>

					{/* Card 2: The Matching Engine */}
					<FeatureCard
						title="AI-Powered Matching"
						description="We scan 1,400+ daily listings across multiple job boards. Our AI analyzes each job description against your career path, location preferences, and visa requirements to find your perfect entry-level matches."
						icon={Cpu}
						className="md:col-span-2"
					>
						<div className="mt-auto flex flex-wrap gap-2.5 pt-4">
							{["Career Path", "Location Match", "Visa Sponsorship", "Entry Level", "Work Environment", "Role Fit"].map(
								(tag) => {
									const isVisa = tag === "Visa Sponsorship";
									return (
										<span
											key={tag}
											className={cn(
												"flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border transition-all duration-300",
												"group-hover:scale-105",
												isVisa
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_4px_12px_rgba(16,185,129,0.2)] group-hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)]"
													: "bg-purple-500/10 text-purple-300 border-purple-500/20 group-hover:bg-purple-500/15"
											)}
										>
											<CheckCircle2 size={16} className={cn("shrink-0", isVisa ? "text-emerald-400" : "text-purple-400")} /> {tag}
										</span>
									);
								}
							)}
						</div>
					</FeatureCard>

					{/* Card 3: Match Intelligence (Wide Card) */}
					<FeatureCard
						title="Smart Scoring System"
						description="Every job is scored across 8+ factors: career path alignment (most important), location match, visa sponsorship availability (critical for international students), work environment, role fit, experience level, company culture, skills alignment, and job freshness. We then ensure diversity across job sources and cities for balanced, high-quality matches."
						icon={Brain}
						className="md:col-span-3 h-auto"
					>
						<div className="mt-8 relative h-40 md:h-48 w-full flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-surface-elevated/50 via-surface-base/80 to-surface-elevated/50 border border-white/5">
							{/* Visualizing the "Matching" Process */}
							<div className="flex items-center gap-6 md:gap-8 z-10 flex-wrap justify-center">
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5 }}
									className={cn(
										"px-5 py-3 md:px-6 md:py-4 rounded-xl glass-card elevation-2",
										"text-base md:text-lg font-bold text-white",
										"shadow-lg shadow-purple-500/30",
										"bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent",
										"border border-purple-500/30"
									)}
								>
									Your Preferences
								</motion.div>
								<motion.div
									animate={{ scale: [1, 1.2, 1] }}
									transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
									className="h-1 w-12 md:w-16 bg-gradient-to-r from-purple-500 via-purple-400 to-emerald-500 rounded-full shadow-lg shadow-purple-500/40"
								/>
								<motion.div
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5, delay: 0.2 }}
									className={cn(
										"px-5 py-3 md:px-6 md:py-4 rounded-xl border-2 border-emerald-500/60",
										"bg-gradient-to-br from-emerald-500/25 via-emerald-500/15 to-transparent",
										"text-base md:text-lg font-bold text-emerald-200",
										"shadow-lg shadow-emerald-500/40",
										"backdrop-blur-sm"
									)}
								>
									AI Analysis
								</motion.div>
								<motion.div
									animate={{ scale: [1, 1.2, 1] }}
									transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
									className="h-1 w-12 md:w-16 bg-gradient-to-r from-emerald-500 via-emerald-400 to-purple-500 rounded-full shadow-lg shadow-emerald-500/40"
								/>
								<motion.div
									initial={{ opacity: 0, x: 20 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5, delay: 0.4 }}
									className={cn(
										"px-5 py-3 md:px-6 md:py-4 rounded-xl glass-card elevation-2",
										"text-base md:text-lg font-bold text-white",
										"shadow-lg shadow-purple-500/30",
										"bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent",
										"border border-purple-500/30"
									)}
								>
									Job Listings
								</motion.div>
							</div>

							{/* Background Decorative "Data Points" with animation */}
							<div className="absolute inset-0 opacity-20 grid grid-cols-8 gap-2 pointer-events-none">
								{[...Array(16)].map((_, i) => (
									<motion.div
										key={i}
										initial={{ opacity: 0, scale: 0 }}
										whileInView={{ opacity: 1, scale: 1 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.05, duration: 0.3 }}
										className="h-1 w-1 bg-purple-400 rounded-full"
									/>
								))}
							</div>
							
							{/* Animated gradient overlay */}
							<motion.div
								animate={{
									backgroundPosition: ["0% 0%", "100% 100%"],
								}}
								transition={{
									duration: 10,
									repeat: Infinity,
									repeatType: "reverse",
								}}
								className="absolute inset-0 opacity-10 bg-gradient-to-br from-purple-500/20 via-transparent to-emerald-500/20 pointer-events-none"
								style={{ backgroundSize: "200% 200%" }}
							/>
						</div>
					</FeatureCard>
				</div>
			</div>
		</section>
	);
}

