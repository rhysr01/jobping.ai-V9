"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "../ui/BrandIcons";

const STEPS = [
	{
		number: "01",
		title: "Tell Us About Yourself",
		description:
			"Share your career interests, preferred cities, and visa requirements. Our AI learns your preferences to find the perfect matches.",
		icon: BrandIcons.Users,
		color: "from-blue-500 to-blue-600",
	},
	{
		number: "02",
		title: "AI Matching Engine",
		description:
			"Our advanced AI analyzes thousands of graduate jobs across Europe, scoring each role based on your profile, skills, and career goals.",
		icon: BrandIcons.Zap,
		color: "from-purple-500 to-purple-600",
	},
	{
		number: "03",
		title: "Get Personalized Matches",
		description:
			"Receive 5 curated job matches every week via email. Each match includes detailed reasoning, visa sponsorship info, and direct application links.",
		icon: BrandIcons.Mail,
		color: "from-emerald-500 to-emerald-600",
	},
	{
		number: "04",
		title: "Apply with Confidence",
		description:
			"Use our insights to apply strategically. Track your applications, get interview tips, and maximize your graduate job search success.",
		icon: BrandIcons.Target,
		color: "from-orange-500 to-orange-600",
	},
];

export default function HowItWorks() {
	return (
		<section
			id="how-it-works"
			className="py-16 sm:py-20 lg:py-24 relative overflow-hidden"
		>
			{/* Background effects */}
			<div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]" />

			{/* Animated background elements */}
			<motion.div
				className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.3, 0.6, 0.3],
				}}
				transition={{
					duration: 8,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<motion.div
				className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl"
				animate={{
					scale: [1.2, 1, 1.2],
					opacity: [0.4, 0.2, 0.4],
				}}
				transition={{
					duration: 10,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 2,
				}}
			/>

			<div className="container-page relative">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="text-center mb-16 sm:mb-20"
				>
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
						How JobPing{" "}
						<span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
							Works
						</span>
					</h2>
					<p className="text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed">
						Our AI-powered platform matches you with graduate jobs that fit your
						career goals, location preferences, and visa requirements. Get
						personalized matches delivered to your inbox weekly.
					</p>
				</motion.div>

				{/* Steps */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
					{STEPS.map((step, index) => (
						<motion.div
							key={step.number}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							className="group relative"
						>
							{/* Card */}
							<div className="relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 h-full hover:bg-zinc-900/80 hover:border-zinc-600/50 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/50">
								{/* Step number */}
								<div className="flex items-center justify-between mb-4">
									<div
										className={`w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}
									>
										{step.number}
									</div>

									{/* Connector line for desktop */}
									{index < STEPS.length - 1 && (
										<motion.div
											className="hidden lg:block w-8 h-0.5 bg-gradient-to-r from-zinc-600 to-zinc-500"
											initial={{ scaleX: 0 }}
											whileInView={{ scaleX: 1 }}
											viewport={{ once: true }}
											transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
											style={{ originX: 0 }}
										/>
									)}
								</div>

								{/* Icon */}
								<motion.div
									className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
									whileHover={{ rotate: 5 }}
								>
									<step.icon className="w-8 h-8 text-white" />
								</motion.div>

								{/* Content */}
								<h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
									{step.title}
								</h3>
								<p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
									{step.description}
								</p>

								{/* Hover effect overlay */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300 pointer-events-none`}
								/>
							</div>

							{/* Arrow indicator for mobile */}
							{index < STEPS.length - 1 && (
								<motion.div
									initial={{ opacity: 0, scale: 0 }}
									whileInView={{ opacity: 1, scale: 1 }}
									viewport={{ once: true }}
									transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
									className="lg:hidden flex justify-center mt-8"
								>
									<div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
										<BrandIcons.ArrowRight className="w-4 h-4 text-zinc-400" />
									</div>
								</motion.div>
							)}
						</motion.div>
					))}
				</div>

				{/* Bottom CTA */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="text-center mt-16"
				>
					<div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
						<div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
						<span className="text-emerald-400 font-medium text-sm">
							Ready to find your perfect graduate role?
						</span>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
