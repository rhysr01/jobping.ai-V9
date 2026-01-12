"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "./BrandIcons";
import { trackEvent } from "../../lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	TRUST_TEXT_NO_CARD_SETUP,
} from "../../lib/copy";

export default function ScrollCTA() {
	const [isVisible, setIsVisible] = useState(false);
	const [hasShown, setHasShown] = useState(false);
	const [opacity, setOpacity] = useState(1);

	useEffect(() => {
		// Don't show on mobile - let sticky mobile CTA handle it
		if (typeof window !== "undefined" && window.innerWidth <= 1024) {
			return;
		}

		const handleScroll = () => {
			const scrollY = window.scrollY;
			const documentHeight = document.documentElement.scrollHeight;
			const windowHeight = window.innerHeight;
			const scrollPercentage =
				(scrollY / (documentHeight - windowHeight)) * 100;

			// Check if Pricing section is within 200px of viewport bottom
			const pricingSection =
				document.getElementById("pricing") ||
				document.querySelector('[data-section="pricing"]');
			let shouldHide = false;

			if (pricingSection) {
				const rect = pricingSection.getBoundingClientRect();
				// Hide if Pricing section top is within 200px of viewport bottom
				const distanceFromBottom = windowHeight - rect.top;
				shouldHide = distanceFromBottom < 200 && rect.top < windowHeight;
			}

			// Show after scrolling 50% of page
			if (scrollPercentage >= 50 && !hasShown) {
				setIsVisible(true);
				setHasShown(true);
				setOpacity(shouldHide ? 0 : 1);
			} else if (scrollPercentage < 50) {
				setIsVisible(false);
				setOpacity(0);
				setHasShown(false);
			} else if (shouldHide) {
				// Smooth fade out when near pricing section
				setOpacity(0);
			} else if (isVisible && !shouldHide) {
				// Fade back in if moved away from pricing section
				setOpacity(1);
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [hasShown, isVisible]);

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity }}
					exit={{ y: 16, opacity: 0 }}
					transition={{
						opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
						y: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
					}}
					style={{
						pointerEvents: opacity === 0 ? "none" : "auto",
					}}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 hidden lg:block lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
				>
					<motion.div
						initial={{ scale: 0.9 }}
						animate={{ scale: 1 }}
						className="group relative bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl hover:border-emerald-500/30 transition-all duration-300"
					>
						{/* Emerald glow on hover */}
						<div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300" />
						
						<div className="relative flex items-center gap-4">
							<div className="flex-1">
								<p className="font-display text-sm font-semibold text-white mb-1">
									{CTA_GET_MY_5_FREE_MATCHES}
								</p>
								<p className="text-xs text-zinc-400 hidden md:flex">
									{TRUST_TEXT_NO_CARD_SETUP}
								</p>
							</div>
							<Link
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", {
										type: "free",
										location: "scroll_cta",
									});
									setIsVisible(false);
								}}
								className="font-display group/btn relative px-5 py-2.5 rounded-xl font-semibold text-white overflow-hidden min-h-[48px] flex items-center gap-2"
							>
								{/* Gradient background */}
								<div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover/btn:from-emerald-600 group-hover/btn:to-emerald-700 transition-all duration-300" />
								
								{/* Shine effect on hover */}
								<div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500">
									<div className="absolute inset-0 translate-x-[-100%] group-hover/btn:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
								</div>
								
								{/* Shadow */}
								<div className="absolute inset-0 shadow-lg shadow-emerald-500/30 group-hover/btn:shadow-xl group-hover/btn:shadow-emerald-500/40 rounded-xl transition-all" />
								
								{/* Text */}
								<span className="relative z-10 group-hover/btn:-translate-y-0.5 inline-flex items-center gap-2 transition-transform">
									{CTA_GET_MY_5_FREE_MATCHES}
									<BrandIcons.ArrowRight className="h-4 w-4" />
								</span>
								
								{/* Border glow */}
								<div className="absolute inset-0 rounded-xl border border-emerald-400/50 group-hover/btn:border-emerald-300 transition-colors" />
							</Link>
							<button
								type="button"
								onClick={() => setIsVisible(false)}
								className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
								aria-label="Close"
							>
								<BrandIcons.X className="h-4 w-4" />
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
