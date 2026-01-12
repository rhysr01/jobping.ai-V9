"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandIcons } from "../../components/ui/BrandIcons";
import { SuccessAnimation } from "../../components/ui/SuccessAnimation";

function SuccessContent() {
	const [showSuccess, setShowSuccess] = useState(true);
	const searchParams = useSearchParams();
	const checkoutId = searchParams?.get("checkout_id") || "";

	useEffect(() => {
		const timer = setTimeout(() => setShowSuccess(false), 2000);
		return () => clearTimeout(timer);
	}, []);

	return (
		<>
			<AnimatePresence>
				{showSuccess && (
					<SuccessAnimation
						message="Payment successful! Welcome to Premium."
						onComplete={() => setShowSuccess(false)}
					/>
				)}
			</AnimatePresence>
			<div className="min-h-screen bg-black text-white flex items-center justify-center py-16 sm:py-24">
				<div className="container-page max-w-3xl text-center px-6 sm:px-8">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="space-y-8"
					>
						{/* Success Icon */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								delay: 0.2,
								type: "spring",
								stiffness: 200,
								damping: 15,
							}}
							className="mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.6)] border-4 border-emerald-500/30"
						>
							<motion.svg
								initial={{ pathLength: 0, opacity: 0 }}
								animate={{ pathLength: 1, opacity: 1 }}
								transition={{ delay: 0.4, duration: 0.6 }}
								className="w-14 h-14 sm:w-16 sm:h-16 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth="3"
							>
								<title>Success Icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M5 13l4 4L19 7"
								/>
							</motion.svg>
						</motion.div>

						{/* Main Message */}
						<div className="space-y-4">
							<h1 className="text-4xl font-black text-white sm:text-5xl md:text-6xl leading-tight">
								Payment Successful!
							</h1>

							<p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-zinc-100 sm:text-xl">
								Your premium subscription is now active. You'll receive enhanced
								job matches starting with your next email.
							</p>
						</div>

						{checkoutId && (
							<div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/8 px-5 py-2.5 text-sm font-medium text-zinc-100 backdrop-blur-sm">
								<BrandIcons.Mail className="h-4 w-4 text-brand-300" />
								Order ID: {checkoutId}
							</div>
						)}

						<div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-8 sm:p-10 md:p-12 text-left backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
							<h2 className="text-2xl font-bold text-white mb-8 text-center sm:text-3xl">
								What's Next?
							</h2>

							<div className="space-y-6 sm:space-y-8">
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.3 }}
									className="flex gap-5 sm:gap-6"
								>
									<div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-brand-500/25 to-purple-600/20 flex items-center justify-center text-brand-200 font-bold text-lg sm:text-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] border-2 border-brand-500/30">
										1
									</div>
									<div className="flex-1">
										<div className="font-bold text-white text-lg sm:text-xl mb-2">
											Premium activated
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											Your subscription is active and you'll receive premium job
											matches in your next email.
										</div>
									</div>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.4 }}
									className="flex gap-5 sm:gap-6"
								>
									<div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-brand-500/25 to-purple-600/20 flex items-center justify-center text-brand-200 font-bold text-lg sm:text-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] border-2 border-brand-500/30">
										2
									</div>
									<div className="flex-1">
										<div className="font-bold text-white text-lg sm:text-xl mb-2">
											Enhanced matches
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											You'll get more jobs per week, early access to new
											listings, and hot match alerts.
										</div>
									</div>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.5 }}
									className="flex gap-5 sm:gap-6"
								>
									<div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-brand-500/25 to-purple-600/20 flex items-center justify-center text-brand-200 font-bold text-lg sm:text-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] border-2 border-brand-500/30">
										3
									</div>
									<div className="flex-1">
										<div className="font-bold text-white text-lg sm:text-xl mb-2">
											Manage your subscription
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											You can update your payment method or cancel anytime from
											your billing page.
										</div>
									</div>
								</motion.div>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
							<Link
								href="/billing"
								className="inline-block bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-0.5"
							>
								Manage Subscription
							</Link>
							<Link
								href="/"
								className="inline-block border-2 border-white/25 bg-white/[0.08] text-white font-semibold px-8 py-4 rounded-2xl hover:border-brand-500/50 hover:bg-white/12 transition-all"
							>
								Back to Home
							</Link>
						</div>

						<p className="mt-10 text-sm font-medium text-zinc-300">
							Questions? Email{" "}
							<a
								href="mailto:hello@getjobping.com"
								className="text-brand-200 hover:text-brand-100 underline"
							>
								hello@getjobping.com
							</a>
							.
						</p>
					</motion.div>
				</div>
			</div>
		</>
	);
}

export default function SuccessPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-black flex items-center justify-center">
					<div className="text-white text-xl">Loading...</div>
				</div>
			}
		>
			<SuccessContent />
		</Suspense>
	);
}
