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
			className="mt-6 px-4 py-4 rounded-xl glass-card elevation-1 border border-white/5"
		>
			<div className="flex flex-col items-center gap-3 text-center">
				{/* Main trust line - premium typography */}
				<p className="text-sm font-medium text-white leading-relaxed tracking-tight">
					100% free to start • Real entry-level roles • No spam
				</p>

				{/* Divider */}
				<div className="w-full h-px bg-white/10" />

				{/* Trust badges grid - with improved spacing for small screens */}
				<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-content-secondary leading-relaxed tracking-tight">
					<span className="flex items-center gap-1.5">
						<BrandIcons.Shield className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
						GDPR Compliant • Your data is protected
					</span>
					<span className="flex items-center gap-1.5">
						<BrandIcons.Zap className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
						No Credit Card Required • Start free, upgrade anytime
					</span>
					<span className="flex items-center gap-1.5">
						<BrandIcons.CheckCircle className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
						Cancel Anytime • No commitments
					</span>
				</div>
			</div>
		</motion.div>
	);
}
