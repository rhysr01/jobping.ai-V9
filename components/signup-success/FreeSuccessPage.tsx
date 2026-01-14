"use client";

import { useState } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import { SuccessAnimation } from "../ui/SuccessAnimation";
import Link from "next/link";
import { TrendingUp, Sparkles } from "lucide-react";

interface FreeSuccessPageProps {
	matchCount: number;
	email: string;
}

export function FreeSuccessPage({ matchCount, email: userEmail }: FreeSuccessPageProps) {
	const [isResending, setIsResending] = useState(false);
	const [resendMessage, setResendMessage] = useState("");
	return (
		<div className="min-h-screen bg-black text-white py-8">
			<div className="container mx-auto px-4 max-w-4xl">
				{/* Success Hero - matches premium layout */}
				<div className="text-center mb-8">
					<SuccessAnimation message="Your Matches Are Ready!" />

					{/* Badge - consistent with premium */}
					<div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">
						<BrandIcons.Zap className="h-3 w-3" />
						Free Tier Activated
					</div>

					{/* Headline - matches premium size */}
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
						Your {matchCount} Matches Are Ready!
					</h1>

					{/* Subheading - matches premium style */}
					<p className="text-lg text-content-secondary mb-8 max-w-2xl mx-auto">
						We've sent your personalized job matches to your inbox.
						<br />
						Check your email to start applying!
					</p>

					{/* Email Confirmation - matches premium card style */}
					<div className="bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/20 max-w-md mx-auto">
						<div className="flex items-center justify-center gap-3 mb-4">
							<BrandIcons.Mail className="w-6 h-6 text-emerald-400" />
							<span className="text-lg font-semibold text-white">Check Your Email</span>
						</div>
						<p className="text-sm text-content-secondary mb-4">
							We've sent your first {matchCount} job matches to:
						</p>
						<p className="text-emerald-400 font-medium">{userEmail}</p>
					</div>
				</div>

				{/* What's Next Section - matches premium grid layout */}
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
						<Sparkles className="w-6 h-6 text-emerald-400" />
						What's Next?
					</h2>

					<div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
						{/* Step 1 */}
						<div className="bg-white/5 rounded-xl p-6 border border-white/10">
							<div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4 mx-auto">
								<span className="text-emerald-400 font-bold text-lg">1</span>
							</div>
							<h3 className="text-lg font-semibold text-white mb-2 text-center">
								Check Your Email
							</h3>
							<p className="text-sm text-content-secondary text-center">
								Your {matchCount} personalized matches are waiting in your inbox
							</p>
						</div>

						{/* Step 2 */}
						<div className="bg-white/5 rounded-xl p-6 border border-white/10">
							<div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4 mx-auto">
								<span className="text-emerald-400 font-bold text-lg">2</span>
							</div>
							<h3 className="text-lg font-semibold text-white mb-2 text-center">
								Review Your Matches
							</h3>
							<p className="text-sm text-content-secondary text-center">
								Each job is hand-picked for your visa status, location, and career path
							</p>
						</div>

						{/* Step 3 */}
						<div className="bg-white/5 rounded-xl p-6 border border-white/10">
							<div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4 mx-auto">
								<span className="text-emerald-400 font-bold text-lg">3</span>
							</div>
							<h3 className="text-lg font-semibold text-white mb-2 text-center">
								Apply Directly
							</h3>
							<p className="text-sm text-content-secondary text-center">
								Click the apply links to submit your applications in minutes
							</p>
						</div>
					</div>
				</div>

				{/* Premium Upsell - styled consistently with rest of page */}
				<div className="bg-white/5 rounded-2xl p-8 border border-white/10 mb-8">
					<div className="text-center mb-6">
						{/* Badge */}
						<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/40 mb-4">
							<TrendingUp className="w-4 h-4 text-brand-400" />
							<span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
								Upgrade to Premium
							</span>
						</div>

						<h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
							Want 3× More Matches Every Week?
						</h3>

						<p className="text-lg text-content-secondary mb-6">
							Premium users get 15 curated matches delivered Mon/Wed/Fri
						</p>
					</div>

					{/* Benefits Grid - matches premium layout */}
					<div className="grid md:grid-cols-3 gap-4 mb-6">
						<div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
							<BrandIcons.Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
							<span className="text-sm font-medium text-white">45 matches/month</span>
						</div>
						<div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
							<BrandIcons.Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
							<span className="text-sm font-medium text-white">3× weekly delivery</span>
						</div>
						<div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
							<BrandIcons.Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
							<span className="text-sm font-medium text-white">Cancel anytime</span>
						</div>
					</div>

					{/* CTA Button - matches premium button style */}
					<div className="text-center">
						<Link
							href="/signup?tier=premium"
							className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5"
						>
							Upgrade to Premium - €5/month
							<BrandIcons.ArrowRight className="w-5 h-5" />
						</Link>

						<p className="text-xs text-content-secondary mt-4">
							Less than 2 coffees per month • Save 10 hours per week
						</p>
					</div>
				</div>

				{/* Help Section - matches premium spacing */}
				<div className="text-center">
					<p className="text-sm text-content-secondary">
						{resendMessage && (
							<span className="block mb-2 text-emerald-400 font-medium">
								{resendMessage}
							</span>
						)}
						Didn't receive the email?{" "}
						<button
							type="button"
							className="text-emerald-400 hover:text-emerald-300 font-medium underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={async () => {
								try {
									setIsResending(true);
									const response = await fetch("/api/signup/free/resend", {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											email: userEmail,
											matchCount: matchCount,
										}),
									});

									if (response.ok) {
										setResendMessage("Email sent! Check your inbox.");
										setTimeout(() => setResendMessage(""), 5000);
									} else {
										const error = await response.json();
										setResendMessage(error.message || "Failed to resend email.");
									}
								} catch (error) {
									setResendMessage("Network error. Please try again.");
								} finally {
									setIsResending(false);
								}
							}}
							disabled={isResending}
						>
							{isResending ? "Sending..." : "Resend it"}
						</button>{" "}
						or check your spam folder
					</p>
				</div>
			</div>
		</div>
	);
}
