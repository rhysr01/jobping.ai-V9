"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

const badges = [
	{
		icon: BrandIcons.Shield,
		label: "GDPR Compliant",
		description: "Your data is protected",
	},
	{
		icon: BrandIcons.Zap,
		label: "No Credit Card Required",
		description: "Start free, upgrade anytime",
	},
	{
		icon: BrandIcons.CheckCircle,
		label: "Cancel Anytime",
		description: "No commitments",
	},
];

export default function TrustBadges() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.6 }}
			className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-6"
		>
			{badges.map((badge, index) => {
				const Icon = badge.icon;
				return (
					<motion.div
						key={badge.label}
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: index * 0.1 }}
						className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/20 bg-white/[0.1] backdrop-blur-md hover:bg-white/[0.15] hover:border-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
					>
						<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
							<Icon className="h-4 w-4 text-brand-300" />
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-xs font-bold text-white leading-tight">
								{badge.label}
							</span>
							<span className="text-[10px] text-zinc-400 leading-tight">
								{badge.description}
							</span>
						</div>
					</motion.div>
				);
			})}
		</motion.div>
	);
}
