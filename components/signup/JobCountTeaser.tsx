"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import { CAREER_PATHS } from "./constants";

interface JobCountTeaserProps {
	cities: string[];
	careerPath: string[];
}

interface JobCount {
	count: number;
	isLowCount: boolean;
}

export function JobCountTeaser({ cities, careerPath }: JobCountTeaserProps) {
	const [jobCount, setJobCount] = useState<JobCount | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	const fetchJobCount = async () => {
		if (cities.length === 0) return; // Only require cities, not career path

		setLoading(true);
		setError(false);

		try {
		const response = await fetch("/api/preview-matches", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
		cities,
		careerPath: careerPath.length > 0 ? careerPath[0] : undefined, // Optional career path
		limit: 0, // Count only
		isPreview: false, // Fast count query
		}),
		});

		if (!response.ok) {
					console.error('API Response:', response.status, await response.text());
		 throw new Error("Failed to fetch");
		}

		const data = await response.json();
		console.log('API Data:', data); // Debug logging
				setJobCount({
					count: data.count || 0,
					isLowCount: data.count < 20,
				});
		} catch (err) {
			console.error("JobCountTeaser fetch error:", err);
			setError(true);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const timeoutId = setTimeout(fetchJobCount, 500); // Debounce
		return () => clearTimeout(timeoutId);
	}, [cities, careerPath]);

	if (loading) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 mt-4"
			>
				<div className="flex items-center gap-3">
					<div className="w-5 h-5 rounded-full bg-brand-400/20 animate-pulse" />
					<div className="h-4 bg-brand-400/20 rounded animate-pulse flex-1 max-w-48" />
				</div>
			</motion.div>
		);
	}

	if (error || !jobCount) return null;

	const careerLabel = CAREER_PATHS.find((p) => p.value === careerPath[0])?.label || "jobs";
	const citiesText = cities.length === 1 ? cities[0] : `${cities.length} cities`;
	
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.1 }}
			className={`border rounded-xl p-4 mt-4 ${
				jobCount.isLowCount
					? "bg-amber-500/10 border-amber-500/20"
					: "bg-emerald-500/10 border-emerald-500/20"
			}`}
		>
			<div className="flex items-center gap-3">
				<motion.div
					animate={{ scale: [1, 1.1, 1] }}
					transition={{ duration: 2, repeat: Infinity, delay: 1 }}
					className={`w-8 h-8 rounded-full flex items-center justify-center ${
						jobCount.isLowCount
							? "bg-amber-500/20"
							: "bg-emerald-500/20"
					}`}
				>
					{jobCount.isLowCount ? (
						<BrandIcons.AlertCircle className="w-4 h-4 text-amber-400" />
					) : (
						<BrandIcons.Target className="w-4 h-4 text-emerald-400" />
					)}
				</motion.div>
				
				<div className="flex-1">
					<div className={`font-bold text-lg ${
						jobCount.isLowCount ? "text-amber-200" : "text-emerald-200"
					}`}>
						{jobCount.count.toLocaleString()} {careerLabel.split(" ")[0]} jobs available
					</div>
					<div className="text-sm text-zinc-400">
						in {citiesText} • Updated daily
					</div>
				</div>

				{!jobCount.isLowCount && (
					<motion.div
						animate={{ rotate: [0, 10, -10, 0] }}
						transition={{ duration: 2, repeat: Infinity, delay: 2 }}
						className="text-2xl"
					>
						🎯
					</motion.div>
				)}
			</div>

			{jobCount.isLowCount && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					className="mt-3 text-sm text-amber-300 bg-amber-500/5 rounded-lg p-3"
				>
					💡 Consider selecting additional cities to see more opportunities
				</motion.div>
			)}
		</motion.div>
	);
}
