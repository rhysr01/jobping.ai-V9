"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { Check, Zap, Mail, Star, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";
import ErrorBoundary from "@/components/error-boundary";
import SocialProofTicker from "@/components/ui/SocialProofTicker";
import { TiltCard } from "@/components/ui/TiltCard";
import { useStats } from "@/hooks/useStats";
import * as Copy from "@/lib/copy";
import { trackEvent } from "@/lib/analytics";

const TIERS = [
	{
		name: Copy.FREE_PLAN_TITLE,
		price: "0",
		tagline: "Test the waters",
		description: "Perfect for exploring how JobPing works",
		features: Copy.FREE_PLAN_FEATURES,
		cta: "Get 5 Free Matches",
		href: "/signup/free",
		popular: false,
		icon: Zap,
	},
	{
		name: Copy.PREMIUM_PLAN_TITLE,
		price: "5",
		tagline: "Less than 2 coffees per month",
		description: "Built by a student, priced for students",
		features: Copy.PREMIUM_PLAN_FEATURES,
		cta: "Get Premium Access",
		href: "/signup",
		popular: true,
		icon: Star,
		badge: "🔥 Most Popular",
		savings: "Save 15+ hours per week",
	},
];

function Pricing() {
	const { stats } = useStats();

	return (
		<section
			id="pricing"
			className="py-32 md:py-40 relative overflow-hidden bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50 scroll-snap-section"
		>
			{/* Visual Depth Gradients */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
			<div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-brand-600/20 to-transparent" />
			
			{/* Animated gradient orb - Brand purple only */}
			<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/15 rounded-full blur-[120px] pointer-events-none" />

			<div className="container-page relative z-10">
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				className="mx-auto max-w-3xl text-center mb-10 sm:mb-12 px-4 sm:px-6"
			>
				<span className="font-display inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 sm:px-4 py-1.5 text-xs font-bold tracking-wide text-emerald-300 mb-4">
					<TrendingUp size={14} />
					Join 1,000+ Students Landing EU Roles
				</span>
				<h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white mt-4 mb-4 sm:mb-6 leading-tight">
					Stop Scrolling LinkedIn.
					<br />
					<span className="bg-gradient-to-r from-brand-300 via-white to-brand-300 bg-clip-text text-transparent">
						Let AI Find Your Jobs.
					</span>
				</h2>
				<p className="text-zinc-400 text-base sm:text-lg md:text-xl">
					Stop wasting hours scrolling job boards.
					<br />
					<span className="font-display text-emerald-400 font-semibold">We do it in seconds.</span>
				</p>
			</motion.div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto px-4 sm:px-6 mb-12 sm:mb-16">
					{TIERS.map((tier, index) => {
						const Icon = tier.icon;
						return (
							<motion.div
								key={tier.name}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1 }}
								className={tier.popular ? "md:scale-105 md:-mt-4 relative" : ""}
							>
								{/* Premium Card Glow Effect */}
								{tier.popular && (
									<div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 via-brand-500/30 to-purple-500/20 rounded-3xl blur-2xl opacity-75" />
								)}
						<TiltCard>
							<div
								className={`relative flex flex-col h-full rounded-3xl border p-6 sm:p-8 transition-all ${
									tier.popular
										? "border-brand-500/30 bg-gradient-to-b from-zinc-900 to-black shadow-[0_20px_50px_rgba(139,92,246,0.15)]"
										: "border-border-subtle bg-white/[0.02] backdrop-blur-xl hover:border-white/20"
								}`}
							>
						{tier.popular && (
							<>
								{/* Popular badge with emerald gradient */}
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
									<div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
										<span className="font-display text-xs font-bold text-white uppercase tracking-wider">
											🔥 Most Popular
										</span>
									</div>
								</div>
							</>
						)}

						<div className="relative z-10">
							{/* Icon */}
							<div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mb-4 sm:mb-6 ${
								tier.popular
									? "bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 shadow-lg shadow-brand-500/20"
									: "bg-white/5 border border-white/10"
							}`}>
								<Icon size={20} className={`sm:w-6 sm:h-6 ${tier.popular ? "text-brand-400" : "text-zinc-400"}`} />
							</div>

							<div className="mb-4 sm:mb-6">
								<h3 className="font-display text-xl sm:text-2xl font-black text-white mb-1">
													{tier.name}
												</h3>
												<p className={`text-sm font-medium mb-3 ${
													tier.popular ? "text-emerald-300" : "text-zinc-500"
												}`}>
													{tier.tagline}
												</p>
												<p className="text-zinc-400 text-sm leading-relaxed">
													{tier.description}
												</p>
											</div>

											{/* Price */}
											<div className="mb-8 pb-8 border-b border-white/10">
												<div className="flex items-baseline gap-2">
													<span className={`text-5xl font-black ${
														tier.popular
															? "bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent"
															: "text-white"
													}`}>
														€{tier.price}
													</span>
													<span className="text-zinc-400 text-lg font-medium">/month</span>
												</div>
												{tier.savings && (
													<p className="font-display text-sm text-emerald-400 mt-2 font-medium">
														{tier.savings}
													</p>
												)}
											</div>

											{/* Features */}
											<ul className="space-y-3.5 mb-8 flex-1">
												{tier.features.map((feature) => (
													<li
														key={feature}
														className="flex items-start gap-3 text-sm"
													>
														<div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
															tier.popular
																? "bg-brand-500/20 border border-brand-500/50"
																: "bg-white/5 border border-white/10"
														}`}>
															<Check
																size={14}
																className={tier.popular ? "text-brand-400" : "text-zinc-400"}
																strokeWidth={3}
															/>
														</div>
														<span className="text-zinc-300 leading-relaxed">{feature}</span>
													</li>
												))}
											</ul>

							{/* CTA Button */}
							<Link
								href={tier.href}
								onClick={() =>
									trackEvent("cta_clicked", {
										type: tier.popular ? "premium" : "free",
										location: "pricing",
									})
								}
								className={`font-display block w-full py-3.5 sm:py-4 rounded-xl font-bold text-center transition-all overflow-hidden relative group text-base sm:text-base ${
									tier.popular
										? "btn-cta-enhanced"
										: "btn-cta-secondary"
								}`}
							>
												{tier.popular && (
													<div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
												)}
												<span className="relative z-10 flex items-center justify-center gap-2">
													{tier.cta}
													<span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
												</span>
											</Link>

											{/* Guarantee badge for premium */}
											{tier.popular && (
												<div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
													<Shield size={14} className="text-brand-500" />
													<span>Cancel anytime • No questions asked</span>
												</div>
											)}
										</div>
									</div>
								</TiltCard>
							</motion.div>
						);
					})}
				</div>

				{/* Value Props - Updated colors */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="max-w-3xl mx-auto mb-16"
				>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 mb-3">
								<Mail className="text-brand-300" size={24} />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">3× Per Week</h4>
							<p className="text-xs text-zinc-500">Mon, Wed, Fri delivery</p>
						</div>
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 mb-3">
								<TrendingUp className="text-brand-400" size={24} />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">95%+ Match Rate</h4>
							<p className="text-xs text-zinc-500">AI-powered accuracy</p>
						</div>
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 mb-3">
								<Shield className="text-brand-300" size={24} />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">Zero Risk</h4>
							<p className="text-xs text-zinc-500">Cancel anytime</p>
						</div>
					</div>
				</motion.div>

				{/* Social Proof Section */}
				<div className="mt-16 text-center">
					<ErrorBoundary fallback={null}>
						<div className="space-y-6">
							{stats && stats.totalUsers > 0 && (
								<p className="text-base text-zinc-400">
									Join{" "}
									<span className="text-white font-black text-xl">
										{stats.totalUsers.toLocaleString()}+
									</span>{" "}
									students who stopped wasting time on job boards
								</p>
							)}
							<SocialProofTicker />
						</div>
					</ErrorBoundary>
					<div className="mt-10 inline-flex items-center gap-3 text-xs text-zinc-500 font-medium">
						<span className="flex items-center gap-1.5">
							<Shield size={14} className="text-emerald-500" />
							Secure payment via Stripe
						</span>
						<span className="text-zinc-700">•</span>
						<span>No hidden fees</span>
						<span className="text-zinc-700">•</span>
						<span>Cancel anytime</span>
					</div>
				</div>
			</div>
		</section>
	);
}

export default memo(Pricing);
