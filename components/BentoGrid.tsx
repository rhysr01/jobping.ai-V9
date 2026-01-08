"use client";

import { motion } from "framer-motion";
import { Brain, CheckCircle2, Cpu, FileJson, BookOpen, MapPin, Award, TrendingUp, Building, Target, Zap, Users, Sparkles, Mail } from "lucide-react";
import { useEffect, useRef } from "react";
import GradientText from "@/components/ui/GradientText";
import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

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
		<article
			ref={cardRef}
			aria-label={`${title} - ${description}`}
			className={cn(
				"group relative overflow-hidden rounded-3xl glass-card elevation-1 p-6 transition-all duration-300",
				"hover:elevation-3 hover:border-emerald-500/30 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]",
				"focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 focus-within:ring-offset-black",
				"bg-gradient-to-br from-surface-base/90 via-surface-base/95 to-surface-elevated/90",
				className,
			)}
		>
			{/* Enhanced Glow Effect on Hover */}
			<div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(16,185,129,0.15)_0%,transparent_70%)]" />

			{/* Subtle inner glow */}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

			<div className="relative z-10 flex h-full flex-col justify-between">
				<div>
					<div
						className={cn(
							"mb-4 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl",
							"glass-card elevation-1 text-emerald-400",
							"bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent",
							"border border-emerald-500/30",
							"shadow-[0_4px_16px_rgba(16,185,129,0.2)]",
							"group-hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
							"group-hover:scale-110 transition-transform duration-300",
						)}
					>
						<Icon size={24} className="md:w-7 md:h-7" />
					</div>
					<Heading
						level="h3"
						className={cn(
							"text-xl md:text-2xl mb-3",
							"group-hover:[&>span]:from-white group-hover:[&>span]:via-purple-200 group-hover:[&>span]:to-emerald-200",
							"transition-all duration-300",
						)}
					>
						<GradientText variant="brand">{title}</GradientText>
					</Heading>
					<p
						className={cn(
							"mt-2 text-base md:text-lg text-content-secondary leading-relaxed",
							"group-hover:text-content-heading transition-colors duration-300",
						)}
					>
						{description}
					</p>
				</div>
				{children}
			</div>
		</article>
	);
};

export default function HowItWorksBento() {
	return (
	<section
		id="how-it-works"
		className={cn(
			"py-24 sm:py-32 md:py-40 bg-black relative overflow-hidden scroll-snap-section",
			"before:absolute before:inset-0 before:bg-gradient-to-b before:from-purple-900/5 before:via-transparent before:to-emerald-900/5 before:pointer-events-none",
		)}
	>
		{/* Scroll momentum fade */}
		<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />

		<div className="container-page relative z-10 px-4 sm:px-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6 }}
				className="mb-10 sm:mb-12 text-center"
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

			{/* Connecting line between steps - Desktop only */}
			<div className="hidden md:block absolute top-1/4 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/50 to-emerald-500/20 z-0" />
			
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:auto-rows-auto relative">
				{/* Card 1: Quick Setup */}
				<FeatureCard
					title="Instant Setup"
					description="Tell us your career path and preferred cities. No resume upload needed—just simple preferences that power our AI matching in seconds."
					icon={FileJson}
					className="md:col-span-1 min-h-[280px] relative group"
				>
					{/* Step Number with Glow */}
					<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
						<div className="relative">
							<div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full group-hover:bg-emerald-500/50 transition-all" />
							<div className="relative w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-500/20">
								<span className="text-xl font-bold bg-gradient-to-br from-emerald-300 to-emerald-500 bg-clip-text text-transparent">1</span>
							</div>
						</div>
					</div>
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
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
									<div className="flex items-center gap-2">
										<span className="text-xs font-mono text-purple-300 bg-black/60 px-3 py-1.5 rounded-md border border-brand-600/20 uppercase tracking-widest">
											Processing Preferences
										</span>
									</div>
									
									{/* Progress bar animation */}
									<div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
										<motion.div
											animate={{ x: ["-100%", "200%"] }}
											transition={{
												repeat: Infinity,
												duration: 1.5,
												ease: "easeInOut",
											}}
											className="h-full w-1/3 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
										/>
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
						className="md:col-span-2 min-h-[280px] relative group"
					>
						{/* Step Number with Glow */}
						<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
							<div className="relative">
								<div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full group-hover:bg-emerald-500/50 transition-all" />
								<div className="relative w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-500/20">
									<span className="text-xl font-bold bg-gradient-to-br from-emerald-300 to-emerald-500 bg-clip-text text-transparent">2</span>
								</div>
							</div>
						</div>
						<div className="mt-auto flex flex-wrap gap-2.5 pt-4">
							{[
								"Career Path",
								"Location Match",
								"Visa Sponsorship",
								"Entry Level",
								"Work Environment",
								"Role Fit",
							].map((tag) => {
								const isVisa = tag === "Visa Sponsorship";
								return (
									<span
										key={tag}
										className={cn(
											"flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border transition-all duration-300",
											"group-hover:scale-105",
											isVisa
												? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_4px_12px_rgba(16,185,129,0.2)] group-hover:shadow-[0_6px_16px_rgba(16,185,129,0.3)]"
												: "bg-brand-600/10 text-purple-300 border-brand-600/20 group-hover:bg-brand-600/15",
										)}
									>
										<CheckCircle2
											size={16}
											className={cn(
												"shrink-0",
												isVisa ? "text-emerald-400" : "text-purple-400",
											)}
										/>{" "}
										{tag}
									</span>
								);
							})}
						</div>
					</FeatureCard>

					{/* Card 3: What's In Every Email */}
				<FeatureCard
					title="What's In Every Email"
					description="Every role includes salary range, visa info, and why it's a match for you - so you can decide in seconds."
					icon={Mail}
					className="md:col-span-3 min-h-[320px] relative group"
				>
					{/* Step Number with Glow */}
					<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
						<div className="relative">
							<div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full group-hover:bg-emerald-500/50 transition-all" />
							<div className="relative w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-500/20">
								<span className="text-xl font-bold bg-gradient-to-br from-emerald-300 to-emerald-500 bg-clip-text text-transparent">3</span>
							</div>
						</div>
					</div>
					<div className="mt-4 space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: 0.1 }}
								whileHover={{ scale: 1.02, y: -4 }}
								className="flex flex-col gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition-all duration-300"
							>
								<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.2)]">
									<Mail className="w-6 h-6 text-emerald-300" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-semibold text-emerald-200 text-base mb-1">5 roles you actually qualify for</div>
									<div className="text-sm text-emerald-300/80">Filtered by visa, location, experience</div>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: 0.2 }}
								whileHover={{ scale: 1.02, y: -4 }}
								className="flex flex-col gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition-all duration-300"
							>
								<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.2)]">
									<CheckCircle2 className="w-6 h-6 text-emerald-300" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-semibold text-emerald-200 text-base mb-1">Salary range and visa status upfront</div>
									<div className="text-sm text-emerald-300/80">No surprises</div>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: 0.3 }}
								whileHover={{ scale: 1.02, y: -4 }}
								className="flex flex-col gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition-all duration-300"
							>
								<div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.2)]">
									<Target className="w-6 h-6 text-emerald-300" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-semibold text-emerald-200 text-base mb-1">One-click feedback</div>
									<div className="text-sm text-emerald-300/80">Improve future matches</div>
								</div>
							</motion.div>
						</div>
					</div>
				</FeatureCard>
				</div>
			</div>
		</section>
	);
}
