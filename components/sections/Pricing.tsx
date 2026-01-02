"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import ErrorBoundary from "@/components/ErrorBoundary";
import SocialProofTicker from "@/components/ui/SocialProofTicker";
import { TiltCard } from "@/components/ui/TiltCard";
import { useStats } from "@/hooks/useStats";
import * as Copy from "@/lib/copy";
import { trackEvent } from "@/lib/analytics";

const TIERS = [
	{
		name: Copy.FREE_PLAN_TITLE,
		price: "0",
		description: Copy.FREE_PLAN_SUBTITLE,
		features: Copy.FREE_PLAN_FEATURES,
		cta: "Get Started",
		href: "/signup/free",
		popular: false,
	},
	{
		name: Copy.PREMIUM_PLAN_TITLE,
		price: "5",
		description: "The closest thing to a personal headhunter.",
		features: Copy.PREMIUM_PLAN_FEATURES,
		cta: "Get Premium Access",
		href: "/signup",
		popular: true,
	},
];

export default function Pricing() {
	const { stats } = useStats();

	return (
		<section
			id="pricing"
			className="py-32 md:py-40 relative overflow-hidden bg-black scroll-snap-section"
		>
			{/* Visual Depth Gradients */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
			<div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-purple-900/20 to-transparent" />

			<div className="container-page relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="mx-auto max-w-3xl text-center mb-16 px-6"
				>
					<span className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-purple-200">
						Pricing
					</span>
					<h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">
						Simple, Transparent Pricing
					</h2>
					<p className="text-content-secondary text-lg">
						Free for everyone. Specialized for those who want an edge.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-6">
					{TIERS.map((tier, index) => (
						<motion.div
							key={tier.name}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 }}
						>
							<TiltCard>
								<div
									className={`relative flex flex-col h-full rounded-3xl border p-8 transition-all ${
										tier.popular
											? "border-purple-500/50 bg-surface-elevated/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]"
											: "border-border-subtle bg-surface-base"
									}`}
								>
									{tier.popular && (
										<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 px-5 py-2 rounded-full text-xs font-black text-white uppercase tracking-[0.15em] z-20 shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/50">
											Most Popular
										</div>
									)}

									<div className="mb-8">
										<h3 className="text-xl font-bold text-white">
											{tier.name}
										</h3>
										<p className="text-content-muted text-sm mt-2">
											{tier.description}
										</p>
										<div className="mt-6 flex items-baseline gap-1">
											<span className="text-4xl font-bold text-white">
												€{tier.price}
											</span>
											<span className="text-content-muted text-sm">/month</span>
										</div>
									</div>

									<ul className="space-y-4 mb-10 flex-1">
										{tier.features.map((feature) => (
											<li
												key={feature}
												className="flex items-start gap-3 text-sm text-content-secondary"
											>
												<Check
													size={18}
													className={
														tier.popular
															? "text-purple-500"
															: "text-content-disabled"
													}
												/>
												<span>{feature}</span>
											</li>
										))}
									</ul>

									<Link
										href={tier.href}
										onClick={() =>
											trackEvent("cta_clicked", {
												type: tier.popular ? "premium" : "free",
												location: "pricing",
											})
										}
										className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
											tier.popular
												? "bg-purple-600 text-white hover:bg-purple-500 shadow-lg"
												: "bg-white text-black hover:bg-zinc-200"
										}`}
									>
										{tier.cta}
									</Link>
								</div>
							</TiltCard>
						</motion.div>
					))}
				</div>

				{/* Social Proof Section */}
				<div className="mt-16 text-center">
					<ErrorBoundary fallback={null}>
						<div className="space-y-4">
							{stats && stats.totalUsers > 0 && (
								<p className="text-sm text-content-muted">
									Join{" "}
									<span className="text-white font-bold">
										{stats.totalUsers.toLocaleString()}+
									</span>{" "}
									students landing EU roles
								</p>
							)}
							<SocialProofTicker />
						</div>
					</ErrorBoundary>
					<p className="text-xs text-content-secondary font-medium uppercase tracking-[0.2em] mt-10">
						Secure payment via Stripe • Cancel anytime
					</p>
				</div>
			</div>
		</section>
	);
}
