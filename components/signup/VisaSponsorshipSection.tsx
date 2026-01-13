"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "../ui/BrandIcons";

interface VisaSponsorshipSectionProps {
	visaSponsorship: "yes" | "no" | "";
	onChange: (value: "yes" | "no") => void;
	isSubmitting: boolean;
}

export function VisaSponsorshipSection({
	visaSponsorship,
	onChange,
	isSubmitting,
}: VisaSponsorshipSectionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="relative mb-8"
		>
			{/* Background effects */}
			<div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/5 via-transparent to-brand-500/5 rounded-3xl blur-2xl" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.08),transparent_50%)]" />

			<div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-800/60 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6 sm:p-8 overflow-hidden">
				{/* Animated background elements */}
				<motion.div
					className="absolute top-6 right-6 w-28 h-28 bg-gradient-to-br from-emerald-500/10 to-brand-500/10 rounded-full blur-xl"
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.3, 0.7, 0.3],
					}}
					transition={{
						duration: 4,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-6 left-6 w-20 h-20 bg-gradient-to-br from-brand-500/10 to-emerald-500/10 rounded-full blur-lg"
					animate={{
						scale: [1.2, 1, 1.2],
						opacity: [0.4, 0.2, 0.4],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 1.5,
					}}
				/>

				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="mb-6"
				>
					<div className="flex items-center gap-3 mb-4">
						<motion.div
							animate={{ rotate: [0, -5, 5, 0] }}
							transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
							className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
						>
							<BrandIcons.Passport className="w-5 h-5 text-white" />
						</motion.div>
						<label className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
							Visa & Citizenship Status
						</label>
						<span className="text-emerald-400 font-bold">*</span>
					</div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
						className="bg-gradient-to-r from-emerald-500/10 to-brand-500/10 border border-emerald-500/20 rounded-xl p-4"
					>
						<p className="text-sm text-zinc-300 leading-relaxed">
							<span className="font-semibold text-emerald-400">90%</span> of graduate applications from international students are
							rejected due to visa issues. We'll filter jobs that match your eligibility.
						</p>
					</motion.div>
				</motion.div>
				{/* Visa Options */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="grid grid-cols-1 sm:grid-cols-2 gap-4"
				>
					{/* Yes - Needs Visa */}
					<motion.button
						type="button"
						onClick={() => onChange("yes")}
						whileHover={{ scale: 1.02, y: -2 }}
						whileTap={{ scale: 0.98 }}
						disabled={isSubmitting}
						className={`relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
							visaSponsorship === "yes"
								? "border-emerald-500 bg-gradient-to-br from-emerald-500/15 to-emerald-700/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
								: "border-zinc-700/50 bg-zinc-900/40 hover:border-emerald-500/40 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
						} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						{/* Animated background */}
						{visaSponsorship === "yes" && (
							<motion.div
								className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-emerald-600/5"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3 }}
							/>
						)}

						{/* Hover effect */}
						{visaSponsorship !== "yes" && (
							<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-700/0 group-hover:from-emerald-500/5 group-hover:to-emerald-700/5 transition-all duration-300" />
						)}

						<div className="relative flex flex-col items-center text-center">
							<motion.div
								animate={visaSponsorship === "yes" ? { scale: 1.1 } : { scale: 1 }}
								transition={{ duration: 0.2 }}
								className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
							>
								<BrandIcons.CheckCircle className="w-8 h-8 text-white" />
							</motion.div>

							<h3 className={`text-lg font-bold mb-2 ${
								visaSponsorship === "yes" ? "text-white" : "text-zinc-200"
							}`}>
								Yes, I need visa sponsorship
							</h3>

							<p className={`text-sm leading-relaxed ${
								visaSponsorship === "yes" ? "text-emerald-100" : "text-zinc-400"
							}`}>
								We'll focus on companies that sponsor international graduates
							</p>

							{visaSponsorship === "yes" && (
								<motion.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									className="absolute top-4 right-4 w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg"
								>
									<BrandIcons.Check className="w-4 h-4 text-white" />
								</motion.div>
							)}
						</div>
					</motion.button>

					{/* No - EU Citizen */}
					<motion.button
						type="button"
						onClick={() => onChange("no")}
						whileHover={{ scale: 1.02, y: -2 }}
						whileTap={{ scale: 0.98 }}
						disabled={isSubmitting}
						className={`relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
							visaSponsorship === "no"
								? "border-brand-500 bg-gradient-to-br from-brand-500/15 to-brand-700/10 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
								: "border-zinc-700/50 bg-zinc-900/40 hover:border-brand-500/40 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
						} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						{/* Animated background */}
						{visaSponsorship === "no" && (
							<motion.div
								className="absolute inset-0 bg-gradient-to-br from-brand-400/10 to-brand-600/5"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3 }}
							/>
						)}

						{/* Hover effect */}
						{visaSponsorship !== "no" && (
							<div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-700/0 group-hover:from-brand-500/5 group-hover:to-brand-700/5 transition-all duration-300" />
						)}

						<div className="relative flex flex-col items-center text-center">
							<motion.div
								animate={visaSponsorship === "no" ? { scale: 1.1 } : { scale: 1 }}
								transition={{ duration: 0.2 }}
								className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
							>
								<span className="text-2xl">🇪🇺</span>
							</motion.div>

							<h3 className={`text-lg font-bold mb-2 ${
								visaSponsorship === "no" ? "text-white" : "text-zinc-200"
							}`}>
								No, I have EU citizenship
							</h3>

							<p className={`text-sm leading-relaxed ${
								visaSponsorship === "no" ? "text-brand-100" : "text-zinc-400"
							}`}>
								We'll show all available graduate opportunities across Europe
							</p>

							{visaSponsorship === "no" && (
								<motion.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									className="absolute top-4 right-4 w-6 h-6 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center shadow-lg"
								>
									<BrandIcons.Check className="w-4 h-4 text-white" />
								</motion.div>
							)}
						</div>
					</motion.button>
				</motion.div>
			</div>
		</motion.div>
	);
}