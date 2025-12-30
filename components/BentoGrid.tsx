"use client";

import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/ui/TiltCard";
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
				"group relative overflow-hidden rounded-3xl glass-card elevation-1 p-6 transition-all hover:elevation-2 hover:border-purple-500/30 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-black",
				className
			)}
		>
			{/* Subtle Glow Effect on Hover */}
			<div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(139,92,246,0.1)_0%,transparent_70%)]" />

			<div className="relative z-10 flex h-full flex-col justify-between">
				<div>
					<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg glass-card elevation-1 text-purple-500">
						<Icon size={20} />
					</div>
					<h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
					<p className="mt-2 text-sm text-zinc-400 leading-relaxed">
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
		<section className="py-24 px-6 bg-black">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
					Matching at the speed of AI
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]">
					{/* Card 1: Quick Setup */}
					<FeatureCard
						title="Instant Setup"
						description="Tell us your career path and preferred cities. No resume upload needed—just simple preferences that power our AI matching in seconds."
						icon={FileJson}
						className="md:col-span-1"
					>
						<div className="mt-4 space-y-4">
							<div className="relative h-28 w-full rounded-xl bg-zinc-900/50 border border-white/5 overflow-hidden">
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
						description="We scan thousands of daily listings across multiple job boards. Our AI analyzes each job description against your career path and location preferences to find your perfect entry-level matches."
						icon={Cpu}
						className="md:col-span-2"
					>
						<div className="mt-auto flex flex-wrap gap-2 pt-4">
							{["Career Path", "Location Match", "Entry Level", "Work Environment", "Role Fit"].map(
								(tag) => (
									<span
										key={tag}
										className="flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium text-purple-300 border border-purple-500/20"
									>
										<CheckCircle2 size={13} className="shrink-0" /> {tag}
									</span>
								)
							)}
						</div>
					</FeatureCard>

					{/* Card 3: Match Intelligence (Wide Card) */}
					<FeatureCard
						title="Smart Scoring System"
						description="Every job is scored across 8 factors: career path alignment (most important), location match, work environment, role fit, experience level, company culture, skills alignment, and job freshness. We then ensure diversity across job sources and cities for balanced, high-quality matches."
						icon={Brain}
						className="md:col-span-3 h-auto"
					>
						<div className="mt-8 relative h-32 w-full flex items-center justify-center overflow-hidden">
							{/* Visualizing the "Matching" Process */}
							<div className="flex items-center gap-6 z-10 flex-wrap justify-center">
								<div className="px-3 py-1.5 rounded-lg glass-card elevation-1 text-xs text-zinc-200">
									Your Preferences
								</div>
								<div className="h-px w-8 bg-gradient-to-r from-purple-500 to-emerald-500 animate-pulse" />
								<div className="px-3 py-1.5 rounded-lg border border-emerald-700 bg-emerald-900/20 text-xs text-emerald-200">
									AI Analysis
								</div>
								<div className="h-px w-8 bg-gradient-to-r from-emerald-500 to-purple-500 animate-pulse" />
								<div className="px-3 py-1.5 rounded-lg glass-card elevation-1 text-xs text-zinc-200">
									Job Listings
								</div>
							</div>

							{/* Background Decorative "Data Points" */}
							<div className="absolute inset-0 opacity-20 grid grid-cols-8 gap-2 pointer-events-none">
								{[...Array(16)].map((_, i) => (
									<div
										key={i}
										className="h-1 w-1 bg-zinc-500 rounded-full"
									/>
								))}
							</div>
						</div>
					</FeatureCard>
				</div>
			</div>
		</section>
	);
}

