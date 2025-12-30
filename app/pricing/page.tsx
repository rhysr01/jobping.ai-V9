import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcons } from "@/components/ui/BrandIcons";
import * as Copy from "@/lib/copy";

export const metadata: Metadata = {
	title: "Pricing | JobPing",
	description:
		"Start free. Unlock 10 more jobs per week with Premium (3x more).",
};

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-black">
			<div className="container-page py-16 md:py-24">
				<div className="mx-auto max-w-4xl">
					<div className="text-center mb-12">
						<h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
							Pricing
						</h1>
						<p className="text-xl text-zinc-300">{Copy.PRICING_TITLE}</p>
						<p className="text-base text-zinc-400 mt-2">
							{Copy.PRICING_SUBTITLE}
						</p>
					</div>

					<div className="grid gap-6 md:grid-cols-2 mb-12">
						{/* Free Plan */}
						<div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-pricing px-6 py-8">
							<div className="mb-6">
								<p className="text-xs uppercase tracking-wider text-zinc-300 mb-2">
									{Copy.FREE_PLAN_TITLE}
								</p>
								<div className="flex items-baseline gap-2 mb-4">
									<span className="text-4xl font-semibold text-white">€0</span>
									<span className="text-base text-zinc-300">forever</span>
								</div>
								<h3 className="text-xl font-semibold text-white mb-2">
									Kickstart in under 2 minutes
								</h3>
								<p className="text-base text-zinc-300/90">
									{Copy.FREE_PLAN_DESCRIPTION}
								</p>
							</div>

							<ul className="space-y-3 mb-8">
								<li className="flex items-start gap-3 text-sm text-zinc-300">
									<BrandIcons.Check className="h-5 w-5 text-brand-200 flex-shrink-0 mt-0.5" />
									<span>See 5 instant job matches</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-zinc-300">
									<BrandIcons.Check className="h-5 w-5 text-brand-200 flex-shrink-0 mt-0.5" />
									<span>Test our AI matching quality</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-zinc-300">
									<BrandIcons.Check className="h-5 w-5 text-brand-200 flex-shrink-0 mt-0.5" />
									<span>Zero emails sent (spam-free)</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-zinc-500 opacity-50">
									<span className="h-5 w-5 flex-shrink-0 mt-0.5">✗</span>
									<span>No email delivery</span>
								</li>
								<li className="flex items-start gap-3 text-sm text-zinc-500 opacity-50">
									<span className="h-5 w-5 flex-shrink-0 mt-0.5">✗</span>
									<span>Limited to 5 jobs</span>
								</li>
							</ul>

							<Link
								href="/signup/free"
								className="block w-full text-center h-11 rounded-full border border-white/15 bg-white/5 text-white font-medium transition-all duration-200 hover:border-brand-500/40 hover:bg-brand-500/10"
							>
								Try Free
							</Link>
						</div>

						{/* Premium Plan */}
						<div className="relative rounded-xl bg-zinc-900 border border-violet-500/60 shadow-[0_24px_60px_rgba(129,140,248,0.35)] px-6 py-8 md:scale-[1.02] md:-translate-y-1">
							<div className="pointer-events-none absolute inset-0 -z-10 rounded-[1.75rem] bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.4),_transparent_70%)] blur-[70px]" />
							<span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/40 text-purple-200">
								Most popular
							</span>

							<div className="mb-6">
								<p className="text-xs uppercase tracking-wider text-zinc-300 mb-2">
									{Copy.PREMIUM_PLAN_TITLE}
								</p>
								<div className="flex items-baseline gap-2 mb-4">
									<span className="text-4xl font-semibold text-white">
										{Copy.PREMIUM_PLAN_PRICE}
									</span>
									<span className="text-base text-zinc-300">
										{Copy.PREMIUM_PLAN_PRICE_UNIT}
									</span>
								</div>
								<h3 className="text-xl font-semibold text-white mb-2">
									Stay ahead of every opening
								</h3>
								<p className="text-base text-zinc-300/90">
									{Copy.PREMIUM_PLAN_DESCRIPTION}
								</p>
							</div>

							<ul className="space-y-3 mb-8">
								{Copy.PREMIUM_PLAN_FEATURES.map((feature) => (
									<li
										key={feature}
										className="flex items-start gap-3 text-sm text-zinc-300"
									>
										<BrandIcons.Check className="h-5 w-5 text-brand-200 flex-shrink-0 mt-0.5" />
										<span>{feature}</span>
									</li>
								))}
							</ul>

							<Link
								href="/signup"
								className="block w-full text-center h-11 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-medium shadow-md shadow-purple-900/40 transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
							>
								Start Premium - €5/month
							</Link>

							<p className="text-xs text-zinc-400 text-center mt-4">
								{Copy.PREMIUM_PLAN_ANNUAL}
							</p>
						</div>
					</div>

					<div className="text-center text-sm text-zinc-400">
						<p>{Copy.PRICING_BADGE}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
