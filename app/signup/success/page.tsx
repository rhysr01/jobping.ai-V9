"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { SuccessAnimation } from "@/components/ui/SuccessAnimation";
import { ApiError, apiCall } from "@/lib/api-client";
import {
	PREMIUM_ROLES_PER_WEEK,
	PREMIUM_SEND_DAYS_LABEL,
	PREMIUM_SENDS_PER_WEEK,
} from "@/lib/productMetrics";

function SignupSuccessContent() {
	const [showSuccess, setShowSuccess] = useState(true);
	const [emailSentAt, setEmailSentAt] = useState<string>("");
	const [resending, setResending] = useState(false);
	const [verificationStatus, setVerificationStatus] = useState<
		"pending" | "verified" | "error"
	>("pending");
	const searchParams = useSearchParams();
	// This is the premium success page - free users go directly to /matches
	const _tier: "premium" = "premium";
	const email = searchParams?.get("email") || "";
	const verified = searchParams?.get("verified");
	const verificationError = searchParams?.get("error");

	useEffect(() => {
		setEmailSentAt(
			new Date().toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		);
		const timer = setTimeout(() => setShowSuccess(false), 2000);

		// Check verification status from URL params
		if (verified === "true") {
			setVerificationStatus("verified");
		} else if (verified === "false" || verificationError) {
			setVerificationStatus("error");
		}

		return () => clearTimeout(timer);
	}, [verified, verificationError]);

	const handleResendEmail = async () => {
		if (!email) {
			alert("Email address not found. Please contact support.");
			return;
		}

		setResending(true);
		try {
			const response = await apiCall("/api/resend-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const result = await response.json();
			if (response.ok) {
				alert("Email resent successfully! Check your inbox.");
			} else {
				alert(
					result.error || "Failed to resend email. Please try again later.",
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Failed to resend email. Please try again later.";
			alert(errorMessage);
		} finally {
			setResending(false);
		}
	};

	const handleResendVerification = async () => {
		if (!email) {
			alert("Email address not found. Please contact support.");
			return;
		}

		setResending(true);
		try {
			const response = await apiCall("/api/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const result = await response.json();
			if (response.ok) {
				alert("Verification email sent! Check your inbox.");
				setVerificationStatus("pending");
			} else {
				alert(
					result.error ||
						"Failed to resend verification email. Please try again later.",
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Failed to resend verification email. Please try again later.";
			alert(errorMessage);
		} finally {
			setResending(false);
		}
	};

	return (
		<>
			<AnimatePresence>
				{showSuccess && (
					<SuccessAnimation
						message="Signup complete! Your first matches are on the way."
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
							className={`mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-4 ${
								verificationStatus === "verified"
									? "bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 shadow-[0_0_80px_rgba(16,185,129,0.6)] border-emerald-500/30"
									: verificationStatus === "error"
										? "bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-[0_0_80px_rgba(239,68,68,0.6)] border-red-500/30"
										: "bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 shadow-[0_0_80px_rgba(16,185,129,0.6)] border-emerald-500/30"
							}`}
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
								{verificationStatus === "error" ? (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M6 18L18 6M6 6l12 12"
									/>
								) : (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								)}
							</motion.svg>
						</motion.div>

						{/* Main Message */}
						<div className="space-y-4">
							<h1 className="text-4xl font-black text-white sm:text-5xl md:text-6xl leading-tight">
								{verificationStatus === "verified"
									? "Email Verified!"
									: verificationStatus === "error"
										? "Verification Issue"
										: "You're in."}
							</h1>

							<p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-zinc-100 sm:text-xl">
								{verificationStatus === "verified"
									? "Your email has been verified successfully! Your job matches are on the way."
									: verificationStatus === "error"
										? verificationError
											? `Verification failed: ${decodeURIComponent(verificationError)}. Please check your email for a new verification link.`
											: "There was an issue verifying your email. Please check your email for a verification link."
										: "We've queued your welcome email and job matches. They usually arrive within a few minutes (or within 48 hours at the latest)."}
							</p>

							{verificationStatus === "error" && (
								<div className="mx-auto max-w-md rounded-lg border-2 border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
									<p className="font-semibold mb-2">Need help?</p>
									<p className="mb-3">
										Check your email for a verification link, or click the
										button below to resend it.
									</p>
									<motion.button
										onClick={handleResendVerification}
										disabled={resending || !email}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="w-full px-4 py-2 bg-red-500/20 border-2 border-red-500/50 hover:border-red-400/70 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all"
									>
										{resending ? "Sending..." : "Resend Verification Email"}
									</motion.button>
								</div>
							)}
						</div>

						<div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/8 px-5 py-2.5 text-sm font-medium text-zinc-100 backdrop-blur-sm">
							<BrandIcons.Mail className="h-4 w-4 text-brand-300" />
							hello@getjobping.com · add us to contacts
						</div>

						<div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-8 sm:p-10 md:p-12 text-left backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
							<h2 className="text-2xl font-bold text-white mb-8 text-center sm:text-3xl">
								What Happens Next?
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
									<div className="flex-1 space-y-3">
										<div className="font-bold text-white text-lg sm:text-xl">
											Check your inbox
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											Your first drop includes 10 jobs plus your premium welcome
											email. If you don't see it after a few minutes, peek at
											spam.
										</div>
										<div className="mt-3 text-xs sm:text-sm text-zinc-300 font-medium">
											We retry delivery automatically. Add{" "}
											<strong className="text-white">
												hello@getjobping.com
											</strong>{" "}
											to stay out of spam.
										</div>
										<motion.button
											onClick={handleResendEmail}
											disabled={resending || !email}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className="mt-4 px-5 py-2.5 bg-white/[0.08] border-2 border-white/20 hover:border-brand-500/50 hover:bg-white/12 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
										>
											{resending ? "Sending..." : "Resend Email"}
										</motion.button>
										{emailSentAt && (
											<p className="mt-2 text-xs text-zinc-400 font-medium">
												Email sent at {emailSentAt}
											</p>
										)}
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
											Review & apply
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											Each email takes under a minute to scan and links straight
											to the application.
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
											Stay in sync
										</div>
										<div className="text-zinc-100 text-sm sm:text-base font-medium leading-relaxed">
											{`You'll receive ${PREMIUM_ROLES_PER_WEEK} jobs each week (${PREMIUM_SENDS_PER_WEEK} drops: ${PREMIUM_SEND_DAYS_LABEL}). Fresh matches delivered to your inbox every Monday, Wednesday, and Friday.`}
										</div>
									</div>
								</motion.div>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
							<Link
								href="/"
								className="inline-block border-2 border-white/25 bg-white/[0.08] text-white font-semibold px-8 py-4 rounded-2xl hover:border-brand-500/50 hover:bg-white/12 transition-all"
							>
								Back to Home
							</Link>
						</div>

						<p className="mt-10 text-sm font-medium text-zinc-300">
							Still nothing? Tap resend above or email{" "}
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

export default function SignupSuccess() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-black flex items-center justify-center">
					<div className="text-white text-xl">Loading...</div>
				</div>
			}
		>
			<SignupSuccessContent />
		</Suspense>
	);
}
