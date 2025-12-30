"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
	title: string;
	description?: string;
	eyebrow?: string;
	align?: "left" | "center";
	className?: string;
}

export default function SectionHeader({
	title,
	description,
	eyebrow,
	align = "center",
	className = "",
}: SectionHeaderProps) {
	const alignment =
		align === "left" ? "items-start text-left" : "items-center text-center";

	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.5 }}
			className={`mb-12 flex flex-col gap-4 ${alignment} ${className}`}
		>
			{eyebrow && (
				<span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
					{eyebrow}
				</span>
			)}
			<h2 className="text-balance text-3xl font-semibold text-white sm:text-4xl">
				{title}
			</h2>
			{description && (
				<p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
					{description}
				</p>
			)}
		</motion.div>
	);
}
