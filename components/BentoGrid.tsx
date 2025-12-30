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
			className={cn(
				"group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-zinc-700",
				className
			)}
		>
			{/* Subtle Glow Effect on Hover */}
			<div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(139,92,246,0.1)_0%,transparent_70%)]" />

			<div className="relative z-10 flex h-full flex-col justify-between">
				<div>
					<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-purple-500">
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
					{/* Card 1: Resume Sync */}
					<FeatureCard
						title="Smart Sync"
						description="Upload once. Our AI parses your skills, experience, and 'hidden' strengths in seconds."
						icon={FileJson}
						className="md:col-span-1"
					>
						<div className="mt-4 space-y-2">
							<div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
								{/* The Scanning Effect */}
								<motion.div
									animate={{ x: ["-100%", "100%"] }}
									transition={{
										repeat: Infinity,
										duration: 2,
										ease: "linear",
									}}
									className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"
								/>
								{/* The Actual Progress */}
								<div className="h-full bg-purple-600 w-[75%] shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
							</div>
							{/* Status Label */}
							<div className="mt-2 flex items-center gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
								<span className="text-[10px] font-mono text-purple-400 uppercase">
									Extracting Tech Stack...
								</span>
							</div>
						</div>
					</FeatureCard>

					{/* Card 2: The Brain (Large Card) */}
					<FeatureCard
						title="The Matching Engine"
						description="We scan thousands of daily listings across the web, comparing every line of the JD against your specific profile requirements."
						icon={Cpu}
						className="md:col-span-2"
					>
						<div className="mt-auto flex flex-wrap gap-2 pt-4">
							{["Location Check", "Salary Fit", "Tech Stack", "Seniority"].map(
								(tag) => (
									<span
										key={tag}
										className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-[10px] text-purple-400 border border-purple-500/20"
									>
										<CheckCircle2 size={10} /> {tag}
									</span>
								)
							)}
						</div>
					</FeatureCard>

					{/* Card 3: Match Intelligence (Wide Card) */}
					<FeatureCard
						title="Match Intelligence"
						description="Our engine calculates fit across 20+ data points including tech stack, seniority, and salary bands."
						icon={Brain}
						className="md:col-span-3 h-auto"
					>
						<div className="mt-8 relative h-32 w-full flex items-center justify-center overflow-hidden">
							{/* Visualizing the "Matching" Process */}
							<div className="flex items-center gap-8 z-10">
								<div className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-[10px] text-zinc-300">
									Your Resume
								</div>
								<div className="h-px w-12 bg-gradient-to-r from-purple-500 to-emerald-500 animate-pulse" />
								<div className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-[10px] text-zinc-300">
									Job Requirements
								</div>
							</div>

							{/* Background Decorative "Data Points" */}
							<div className="absolute inset-0 opacity-20 grid grid-cols-6 gap-2 pointer-events-none">
								{[...Array(12)].map((_, i) => (
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

