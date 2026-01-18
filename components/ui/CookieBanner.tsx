"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import CustomButton from "./CustomButton";

// Mobile CTA visibility constants
const MOBILE_CTA_TRIGGERS = {
	SHOW_THRESHOLD: 0.8,  // Show mobile CTA after scrolling 80% of viewport height
} as const;

export default function CookieBanner() {
	const [isVisible, setIsVisible] = useState(false);
	const [mobileCTAVisible, setMobileCTAVisible] = useState(false);

	useEffect(() => {
		// Check if user has already made a choice
		const consent = localStorage.getItem("cookie-consent");
		if (!consent) {
			// Show banner after a short delay for better UX
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 500);
			return () => clearTimeout(timer);
		}
		// Return undefined cleanup function if consent exists
		return undefined;
	}, []);

	// Detect when mobile CTA should be visible to avoid overlap
	useEffect(() => {
		if (typeof window === "undefined") return;

		const checkMobileCTA = () => {
			if (window.innerWidth <= 768) {
				// Show mobile CTA after scrolling past hero section
				const scrollY = window.scrollY;
				const windowHeight = window.innerHeight;
				setMobileCTAVisible(scrollY > windowHeight * MOBILE_CTA_TRIGGERS.SHOW_THRESHOLD);
			} else {
				setMobileCTAVisible(false);
			}
		};

		window.addEventListener("scroll", checkMobileCTA, { passive: true });
		window.addEventListener("resize", checkMobileCTA, { passive: true });

		// Initial check
		checkMobileCTA();

		return () => {
			window.removeEventListener("scroll", checkMobileCTA);
			window.removeEventListener("resize", checkMobileCTA);
		};
	}, []);

	const handleAccept = () => {
		localStorage.setItem("cookie-consent", "accepted");
		setIsVisible(false);

		// Enable PostHog tracking
		if (typeof window !== "undefined" && (window as any).posthog) {
			(window as any).posthog.opt_in_capturing();
			// Enable session recording if user accepted
			(window as any).posthog.startSessionRecording();
		}

		// Enable Google Analytics
		if (typeof window !== "undefined" && (window as any).gtag) {
			(window as any).gtag("consent", "update", {
				analytics_storage: "granted",
				ad_storage: "denied", // We don't use ads
			});
		}
	};

	const handleReject = () => {
		localStorage.setItem("cookie-consent", "rejected");
		setIsVisible(false);

		// Disable PostHog tracking
		if (typeof window !== "undefined" && (window as any).posthog) {
			(window as any).posthog.opt_out_capturing();
			(window as any).posthog.stopSessionRecording();
		}

		// Disable Google Analytics
		if (typeof window !== "undefined" && (window as any).gtag) {
			(window as any).gtag("consent", "update", {
				analytics_storage: "denied",
				ad_storage: "denied",
			});
		}
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					transition={{ type: "spring", damping: 25, stiffness: 200 }}
					className={`fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none ${
						mobileCTAVisible ? 'pb-24' : ''
					}`}
					role="dialog"
					aria-label="Cookie consent"
					aria-modal="true"
				>
					<div className="max-w-6xl mx-auto pointer-events-auto">
						<div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 sm:p-8">
							<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
								<div className="flex-1 space-y-3">
									<p className="text-sm sm:text-base text-white font-medium leading-relaxed">
										We use cookies to improve your experience and analyze site
										usage.{" "}
										<span className="text-zinc-400">
											Essential cookies are always active.
										</span>
									</p>
									<p className="text-xs sm:text-sm text-zinc-500">
										Learn more in our{" "}
										<Link
											href="/legal/privacy"
											className="text-brand-500 hover:text-brand-600 underline decoration-brand-500/30 underline-offset-4 hover:decoration-brand-600/50 transition-colors"
										>
											Privacy Policy
										</Link>
									</p>
								</div>
								<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
									<CustomButton
										variant="secondary"
										size="md"
										onClick={handleReject}
										className="w-full sm:w-auto whitespace-nowrap"
									>
										Reject Non-Essential
									</CustomButton>
									<CustomButton
										variant="primary"
										size="md"
										onClick={handleAccept}
										className="w-full sm:w-auto whitespace-nowrap"
									>
										Accept All Cookies
									</CustomButton>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
