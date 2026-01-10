"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";

export default function TrustBadges() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.6 }}
			className="mt-6 flex flex-wrap items-center justify-center gap-3"
		>
			{[
				{ icon: BrandIcons.CheckCircle, text: "100% Free", glowClass: "from-emerald-500/20 to-teal-500/20" },
				{ icon: BrandIcons.Shield, text: "Privacy-First", glowClass: "from-blue-500/20 to-cyan-500/20" },
				{ icon: BrandIcons.Zap, text: "No Credit Card", glowClass: "from-purple-500/20 to-purple-500/20" },
			].map((badge, index) => (
				<motion.div
					key={index}
					initial={{ opacity: 0, scale: 0.9 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					transition={{ delay: index * 0.1, duration: 0.4 }}
					className="group relative"
				>
					{/* Glow effect on hover */}
					<div className={`absolute inset-0 bg-gradient-to-r ${badge.glowClass} rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
					
					{/* Badge */}
					<div className="relative px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300 cursor-default">
						<span className="font-display flex items-center gap-2 text-xs font-medium text-white/90">
							<badge.icon className="h-4 w-4 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
							{badge.text}
						</span>
					</div>
				</motion.div>
			))}
		</motion.div>
	);
}
