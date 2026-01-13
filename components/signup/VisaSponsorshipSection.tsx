"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "../ui/BrandIcons";

interface VisaSponsorshipSectionProps {
	visaSponsorship: "eu" | "blue-card" | "student-visa" | "need-sponsorship" | "";
	onChange: (value: "eu" | "blue-card" | "student-visa" | "need-sponsorship") => void;
	isSubmitting: boolean;
}

export function VisaSponsorshipSection({
	visaSponsorship,
	onChange,
	isSubmitting,
}: VisaSponsorshipSectionProps) {
	const visaOptions = [
		{
			value: "eu" as const,
			title: "EU/EEA/Swiss Citizen",
			subtitle: "Full work rights",
			description: "You can work anywhere in the EU without restrictions",
			icon: "🇪🇺",
			color: "from-emerald-500 to-emerald-600",
			borderColor: "border-emerald-500",
			shadowColor: "rgba(16,185,129,0.3)",
			hoverShadow: "rgba(16,185,129,0.1)",
		},
		{
			value: "blue-card" as const,
			title: "EU Blue Card or Work Permit",
			subtitle: "Limited work rights",
			description: "You have work authorization but may have restrictions",
			icon: "🪪",
			color: "from-blue-500 to-blue-600",
			borderColor: "border-blue-500",
			shadowColor: "rgba(59,130,246,0.3)",
			hoverShadow: "rgba(59,130,246,0.1)",
		},
		{
			value: "student-visa" as const,
			title: "Student Visa Holder",
			subtitle: "Limited work rights",
			description: "You may be eligible for job seeker visa or graduate work permit",
			icon: "🎓",
			color: "from-purple-500 to-purple-600",
			borderColor: "border-purple-500",
			shadowColor: "rgba(147,51,234,0.3)",
			hoverShadow: "rgba(147,51,234,0.1)",
		},
		{
			value: "need-sponsorship" as const,
			title: "Need Employer Sponsorship",
			subtitle: "Visa required",
			description: "You'll need a company to sponsor your work visa",
			icon: "✈️",
			color: "from-orange-500 to-orange-600",
			borderColor: "border-orange-500",
			shadowColor: "rgba(249,115,22,0.3)",
			hoverShadow: "rgba(249,115,22,0.1)",
		},
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="relative mb-8"
		>
			{/* Enhanced background effects */}
			<div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/8 via-blue-500/5 to-purple-500/8 rounded-3xl blur-3xl" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_60%)]" />

			<div className="relative bg-gradient-to-br from-zinc-900/70 via-zinc-900/50 to-zinc-800/70 backdrop-blur-sm border border-zinc-700/30 rounded-3xl p-6 sm:p-8 overflow-hidden">
				{/* Animated background elements */}
				<motion.div
					className="absolute top-8 right-8 w-32 h-32 bg-gradient-to-br from-emerald-500/15 to-blue-500/15 rounded-full blur-2xl"
					animate={{
						scale: [1, 1.4, 1],
						opacity: [0.2, 0.5, 0.2],
						x: [0, 20, 0],
					}}
					transition={{
						duration: 6,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-8 left-8 w-24 h-24 bg-gradient-to-br from-purple-500/15 to-orange-500/15 rounded-full blur-xl"
					animate={{
						scale: [1.3, 1, 1.3],
						opacity: [0.3, 0.1, 0.3],
						y: [0, -15, 0],
					}}
					transition={{
						duration: 5,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 2,
					}}
				/>

				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="mb-8"
				>
					<div className="flex items-center gap-3 mb-4">
						<motion.div
							animate={{ rotate: [0, -8, 8, 0] }}
							transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
							className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl"
						>
							<BrandIcons.Passport className="w-6 h-6 text-white" />
						</motion.div>
						<div>
							<label className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-zinc-100 to-zinc-200 bg-clip-text text-transparent block">
								Work Authorization Status
							</label>
							<span className="text-sm text-zinc-400 font-medium">Choose the option that best describes you</span>
						</div>
						<span className="text-emerald-400 font-bold text-xl">*</span>
					</div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.4 }}
						className="bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-purple-500/15 border border-zinc-700/50 rounded-2xl p-5 relative overflow-hidden"
					>
						{/* Subtle animated border */}
						<motion.div
							className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl"
							animate={{
								x: ["-100%", "100%"],
							}}
							transition={{
								duration: 4,
								repeat: Infinity,
								ease: "easeInOut",
								repeatDelay: 2,
							}}
							style={{ opacity: 0.3 }}
						/>

						<div className="relative">
							<p className="text-zinc-300 leading-relaxed font-medium">
								<span className="font-bold text-emerald-400">Important:</span> Your work authorization determines which jobs we can show you.
								We'll filter opportunities that match your eligibility to maximize your chances of success.
							</p>
						</div>
					</motion.div>
				</motion.div>

				{/* Visa Options Grid */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
				>
					{visaOptions.map((option, index) => (
						<motion.button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							whileHover={{ scale: 1.03, y: -3 }}
							whileTap={{ scale: 0.97 }}
							disabled={isSubmitting}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8 + index * 0.1 }}
							className={`relative p-6 rounded-3xl border-2 transition-all duration-300 overflow-hidden group ${
								visaSponsorship === option.value
									? `${option.borderColor} bg-gradient-to-br from-${option.color.split(' ')[0]}/20 to-${option.color.split(' ')[1]}/10 shadow-[0_0_35px_${option.shadowColor}]`
									: "border-zinc-700/60 bg-zinc-900/50 hover:border-zinc-600/80 hover:bg-zinc-900/70 hover:shadow-[0_0_25px_rgba(63,63,70,0.15)]"
							} ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							{/* Dynamic background effect */}
							{visaSponsorship === option.value && (
								<motion.div
									className={`absolute inset-0 bg-gradient-to-br ${option.color.replace('from-', 'from-').replace('to-', 'to-')}/15`}
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.4 }}
								/>
							)}

							{/* Hover effect for unselected */}
							{visaSponsorship !== option.value && (
								<div className={`absolute inset-0 bg-gradient-to-br ${option.color.replace('from-', 'from-').replace('to-', 'to-')}/0 group-hover:${option.color.replace('from-', 'from-').replace('to-', 'to-')}/8 transition-all duration-300`} />
							)}

							{/* Floating particles effect */}
							{visaSponsorship === option.value && (
								<>
									<motion.div
										className="absolute top-4 right-4 w-2 h-2 bg-white/60 rounded-full"
										animate={{
											y: [0, -8, 0],
											opacity: [0.6, 1, 0.6],
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											delay: 0,
										}}
									/>
									<motion.div
										className="absolute top-6 right-8 w-1.5 h-1.5 bg-white/40 rounded-full"
										animate={{
											y: [0, -6, 0],
											opacity: [0.4, 0.8, 0.4],
										}}
										transition={{
											duration: 2.5,
											repeat: Infinity,
											delay: 0.5,
										}}
									/>
								</>
							)}

							<div className="relative flex flex-col items-center text-center">
								{/* Icon */}
								<motion.div
									animate={visaSponsorship === option.value ? { scale: 1.15, rotate: [0, -5, 5, 0] } : { scale: 1 }}
									transition={{ duration: 0.3 }}
									className={`w-20 h-20 bg-gradient-to-br ${option.color} rounded-3xl flex items-center justify-center mb-4 shadow-xl relative overflow-hidden`}
								>
									{/* Subtle shine effect */}
									<motion.div
										className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
										animate={{ x: ["-100%", "100%"] }}
										transition={{
											duration: 3,
											repeat: Infinity,
											repeatDelay: 2,
											ease: "easeInOut",
										}}
									/>
									<span className="text-3xl relative z-10" role="img" aria-label={option.title}>
										{option.icon}
									</span>
								</motion.div>

								{/* Content */}
								<div className="space-y-2">
									<h3 className={`text-lg font-bold leading-tight ${
										visaSponsorship === option.value ? "text-white" : "text-zinc-200"
									}`}>
										{option.title}
									</h3>

									<p className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${
										visaSponsorship === option.value
											? "bg-white/20 text-white"
											: "bg-zinc-700/50 text-zinc-400"
									}`}>
										{option.subtitle}
									</p>

									<p className={`text-sm leading-relaxed max-w-[280px] ${
										visaSponsorship === option.value ? "text-zinc-100" : "text-zinc-400"
									}`}>
										{option.description}
									</p>
								</div>

								{/* Selection indicator */}
								{visaSponsorship === option.value && (
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										className={`absolute top-4 right-4 w-7 h-7 bg-gradient-to-br ${option.color} rounded-full flex items-center justify-center shadow-lg border-2 border-white/20`}
									>
										<BrandIcons.Check className="w-4 h-4 text-white font-bold" />
									</motion.div>
								)}
							</div>
						</motion.button>
					))}
				</motion.div>

				{/* Additional Info */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.2 }}
					className="mt-6 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-2xl"
				>
					<p className="text-xs text-zinc-400 text-center leading-relaxed">
						<span className="font-semibold text-zinc-300">💡 Pro tip:</span> If you're unsure about your status, we recommend consulting an immigration advisor or checking with your local authorities.
						We'll help you find opportunities that match your current work authorization.
					</p>
				</motion.div>
			</div>
		</motion.div>
	);
}