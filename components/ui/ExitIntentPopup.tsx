"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	TRUST_TEXT_INSTANT_SETUP,
} from "@/lib/copy";

export default function ExitIntentPopup() {
	const [showPopup, setShowPopup] = useState(false);
	const [hasShown, setHasShown] = useState(false);
	const [timeOnPage, setTimeOnPage] = useState(0);
	const containerRef = useFocusTrap(showPopup);

	useEffect(() => {
		// Check if already shown in this session
		if (typeof window !== "undefined") {
			const shown = sessionStorage.getItem("exit_intent_shown");
			if (shown === "true") {
				setHasShown(true);
				return undefined;
			}

			// Track time on page
			const startTime = Date.now();
			const interval = setInterval(() => {
				setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
			}, 1000);

			return () => clearInterval(interval);
		}
		return undefined;
	}, []);

	useEffect(() => {
		// Don't show on mobile - let sticky mobile CTA handle it
		if (typeof window !== "undefined" && window.innerWidth <= 1024) {
			return;
		}

		// Only show after 30+ seconds on page
		if (timeOnPage < 30) {
			return;
		}

		const handleMouseLeave = (e: MouseEvent) => {
			// Only trigger if mouse is moving upward (leaving top of page)
			if (e.clientY <= 0 && !hasShown) {
				setShowPopup(true);
				setHasShown(true);
				if (typeof window !== "undefined") {
					sessionStorage.setItem("exit_intent_shown", "true");
				}
			}
		};

		document.addEventListener("mouseleave", handleMouseLeave);
		return () => document.removeEventListener("mouseleave", handleMouseLeave);
	}, [hasShown, timeOnPage]);

	if (!showPopup) return null;

	return (
		<AnimatePresence mode="wait">
			{showPopup && (
				<motion.div
					key="exit-popup"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
					onClick={() => setShowPopup(false)}
					role="dialog"
					aria-modal="true"
					aria-labelledby="exit-popup-title"
					aria-describedby="exit-popup-description"
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setShowPopup(false);
						}
					}}
				>
					<motion.div
						ref={containerRef as React.RefObject<HTMLDivElement>}
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						onClick={(e) => e.stopPropagation()}
						className="relative bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 sm:mx-0 shadow-feature elevation-3"
					>
						<button
							type="button"
							onClick={() => setShowPopup(false)}
							className="absolute top-3 right-3 sm:top-4 sm:right-4 text-content-secondary hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2"
							aria-label="Close popup"
						>
							<svg
								className="w-5 h-5 sm:w-6 sm:h-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>

						<div className="text-center">
							<BrandIcons.Zap
								className="w-5 h-5 sm:w-[20.8px] sm:h-[20.8px] mx-auto mb-3 sm:mb-4 text-emerald-400"
								aria-hidden="true"
							/>
							<h3
								id="exit-popup-title"
								className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 leading-tight px-2 sm:px-0"
							>
								{CTA_GET_MY_5_FREE_MATCHES}
							</h3>
							<p
								id="exit-popup-description"
								className="text-sm sm:text-base text-content-heading mb-4 sm:mb-5 leading-relaxed px-1 sm:px-0"
							>
								See <strong className="text-white">5 hand-picked jobs</strong>{" "}
								matched to your city, visa status, and career path. Instant
								results - no credit card needed.
							</p>
							<div className="mb-5 sm:mb-6 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 sm:px-3 py-1 text-xs font-semibold text-emerald-200">
								<BrandIcons.Zap className="h-3 w-3 shrink-0" />
								<span className="whitespace-nowrap">{TRUST_TEXT_INSTANT_SETUP.replace("⚡ ", "")}</span>
							</div>
							<Link
								href="/signup/free"
								onClick={() => setShowPopup(false)}
								className="btn-primary w-full text-sm sm:text-base py-3 sm:py-3.5 min-h-[44px] sm:min-h-[48px]"
							>
								{CTA_GET_MY_5_FREE_MATCHES} →
							</Link>
							<button
								type="button"
								onClick={() => setShowPopup(false)}
								className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 opacity-50 hover:opacity-75 min-h-[44px] min-w-[44px] px-4 py-2"
							>
								No thanks
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
