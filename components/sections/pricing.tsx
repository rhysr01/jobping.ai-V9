"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { Star } from "lucide-react";
import { BrandIcons } from "../ui/BrandIcons";
import ErrorBoundary from "../error-boundary";
import SocialProofTicker from "../ui/SocialProofTicker";
import { TiltCard } from "../ui/TiltCard";
import CustomButton from "../ui/CustomButton";
import { useWindowSize } from "@/hooks/useWindowSize";
import * as Copy from "../../lib/copy";
import { trackEvent } from "../../lib/analytics";

const TIERS = [
	{
		name: Copy.FREE_PLAN_TITLE,
		price: "0",
		tagline: "Your first 5 matches",
		description:
			"5 instant matches to try JobPing (one-time preview, no ongoing emails)",
		features: Copy.FREE_PLAN_FEATURES,
		cta: "Get 5 Free Matches",
		href: "/signup/free",
		popular: false,
		icon: BrandIcons.Zap,
	},
	{
		name: Copy.PREMIUM_PLAN_TITLE,
		price: "5",
		tagline: "€5/month saves 40+ hours searching per month",
		description:
			"5 fresh matches 3× per week (Mon/Wed/Fri) from companies actively hiring visa-sponsored roles",
		features: Copy.PREMIUM_PLAN_FEATURES,
		cta: "Get Premium Access",
		href: "/signup",
		popular: true,
		icon: Star,
		badge: "Most Popular",
		savings: "Save 10 hours per week job searching",
	},
];

function Pricing() {
	const { isMobile } = useWindowSize();

	return (
		<section
			id="pricing"
			className="section-mobile-spacing relative overflow-hidden bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50 scroll-snap-section"
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
					<span className="font-display inline-flex items-center gap-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 sm:px-4 py-1.5 text-xs font-bold tracking-wide text-emerald-300 mb-4">
						<BrandIcons.TrendingUp className="w-3.5 h-3.5" />
						Join 1,000+ Students Landing EU Roles
					</span>
					<h2 className="font-display text-display-lg font-black text-white mt-4 mb-4 sm:mb-6 leading-tight">
						Stop Scrolling LinkedIn.
						<br />
						<span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
							Let AI Find Your Jobs.
						</span>
					</h2>
					<p className="text-zinc-300 text-base sm:text-lg md:text-xl">
						Stop wasting hours scrolling job boards.
						<br />
						<span className="font-display text-emerald-400 font-semibold">
							We do it in seconds.
						</span>
					</p>
				</motion.div>

				<div
					className={`${
						isMobile
							? "flex flex-col gap-6" // Simpler stacking on mobile
							: "grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
					} max-w-6xl mx-auto px-4 sm:px-6 mb-12 sm:mb-16`}
				>
					{TIERS.map((tier, index) => {
						const Icon = tier.icon;
						return (
							<motion.div
								key={tier.name}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1 }}
								className={`${tier.popular ? "lg:col-span-2 md:scale-105 md:-mt-4 relative" : "lg:col-span-1"}`}
							>
								{/* Premium Card Glow Effect */}
								{tier.popular && (
									<div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 via-brand-500/30 to-accent-500/20 rounded-2xl blur-2xl opacity-75" />
								)}
								<TiltCard>
									<div
										className={`relative flex flex-col h-full rounded-2xl border card-mobile-spacing transition-all ${
											tier.popular
												? "border-brand-500/30 bg-gradient-to-b from-zinc-900 to-black shadow-[0_20px_50px_rgba(20,184,166,0.15)]"
												: "border-border-subtle bg-white/[0.02] backdrop-blur-xl hover:border-white/20"
										}`}
									>
										<div className="relative z-10 p-8 sm:p-10">
											{/* Icon with more breathing room */}
											<div
												className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg mb-8 ${
													tier.popular
														? "bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 shadow-lg shadow-brand-500/20"
														: "bg-white/5 border border-white/10"
												}`}
											>
												<Icon
													size={20}
													className={`sm:w-6 sm:h-6 ${tier.popular ? "text-brand-400" : "text-zinc-400"}`}
												/>
											</div>

											<div className="mb-8">
												<h3 className="font-display text-display-sm font-black text-white mb-1">
													{tier.name}
												</h3>
												<p
													className={`text-sm font-medium mb-3 ${
														tier.popular ? "text-emerald-300" : "text-zinc-500"
													}`}
												>
													{tier.tagline}
												</p>
												<p className="text-zinc-300 text-sm leading-relaxed">
													{tier.description}
												</p>
											</div>

											{/* Price with more breathing room */}
											<div className="mb-10 pb-10 border-b border-white/10">
												<div className="flex items-baseline gap-2">
													<span
														className={`text-5xl font-black ${
															tier.popular
																? "bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent"
																: "text-white"
														}`}
													>
														€{tier.price}
													</span>
													<span className="text-zinc-400 text-lg font-medium">
														/month
													</span>
												</div>
												{tier.savings && (
													<p className="font-display text-sm text-emerald-400 mt-2 font-medium">
														{tier.savings}
													</p>
												)}
											</div>

											{/* Features with better spacing */}
											<ul className="space-y-4 mb-10 flex-1">
												{tier.features.map((feature) => (
													<li
														key={feature}
														className="flex items-start gap-3 text-sm"
													>
														<div
															className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
																tier.popular
																	? "bg-brand-500/20 border border-brand-500/50"
																	: "bg-white/5 border border-white/10"
															}`}
														>
															<BrandIcons.Check
																className={`w-3.5 h-3.5 ${tier.popular ? "text-brand-400" : "text-zinc-400"}`}
															/>
														</div>
														<span className="text-zinc-200 leading-relaxed font-medium">
															{feature}
														</span>
													</li>
												))}
											</ul>

											{/* CTA Button with top spacing */}
											<CustomButton
												href={tier.href}
												onClick={() =>
													trackEvent("cta_clicked", {
														type: tier.popular ? "premium" : "free",
														location: "pricing",
													})
												}
												variant={tier.popular ? "primary" : "secondary"}
												size="lg"
												fullWidth
												className="relative group overflow-hidden mt-2"
											>
												{tier.popular && (
													<div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/30 to-white/20 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
												)}
												<span className="relative z-10 flex items-center justify-center gap-2">
													{tier.cta}
													<span className="group-hover:translate-x-1 transition-transform inline-block">
														→
													</span>
												</span>
											</CustomButton>

											{/* Guarantee badge for premium */}
											{tier.popular && (
												<div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
													<BrandIcons.Shield className="w-3.5 h-3.5 text-brand-500" />
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
								<BrandIcons.Mail className="w-6 h-6 text-brand-300" />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">3× Per Week</h4>
							<p className="text-xs text-zinc-500">Mon, Wed, Fri delivery</p>
						</div>
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 mb-3">
								<BrandIcons.TrendingUp className="w-6 h-6 text-brand-400" />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">
								95%+ Match Rate
							</h4>
							<p className="text-xs text-zinc-500">AI-powered accuracy</p>
						</div>
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/30 mb-3">
								<BrandIcons.Shield className="w-6 h-6 text-brand-300" />
							</div>
							<h4 className="text-sm font-bold text-white mb-1">Zero Risk</h4>
							<p className="text-xs text-zinc-500">Cancel anytime</p>
						</div>
					</div>
				</motion.div>

				{/* Social Proof Section */}
				<div className="mt-16 text-center">
					<ErrorBoundary fallback={null}>
						<SocialProofTicker />
					</ErrorBoundary>
				</div>
			</div>
		</section>
	);
}

export default memo(Pricing);
