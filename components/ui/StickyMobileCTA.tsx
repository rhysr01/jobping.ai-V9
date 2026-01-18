"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "./BrandIcons";
import { trackEvent } from "../../lib/analytics";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	CTA_GET_MY_5_FREE_MATCHES_ARIA,
} from "../../lib/copy";

// Scroll trigger constants for better maintainability
const SCROLL_TRIGGERS = {
	SHOW_CTA_THRESHOLD: 0.8,    // Show CTA after scrolling 80% of viewport height
	HIDE_CTA_THRESHOLD: 3.0,    // Hide CTA when scrolling beyond 3x viewport height
	RESET_CTA_THRESHOLD: 0.5,   // Reset CTA visibility when scrolling above 50% of viewport
} as const;

export default function StickyMobileCTA() {
	const [isVisible, setIsVisible] = useState(false);
	const [isUnderLarge, setIsUnderLarge] = useState(false);

	useEffect(() => {
		// Check if mobile on mount and resize
		const updateBreakpoint = () => {
			setIsUnderLarge(window.innerWidth <= 768);
		};

		updateBreakpoint();
		window.addEventListener("resize", updateBreakpoint);

		const handleScroll = () => {
			if (!isUnderLarge) return;

			const scrollY = window.scrollY;
			const windowHeight = window.innerHeight;

			// Show CTA after scrolling past hero section and hide when near top
			if (scrollY > windowHeight * SCROLL_TRIGGERS.SHOW_CTA_THRESHOLD &&
				scrollY < windowHeight * SCROLL_TRIGGERS.HIDE_CTA_THRESHOLD) {
				setIsVisible(true);
			} else if (scrollY < windowHeight * SCROLL_TRIGGERS.RESET_CTA_THRESHOLD) {
				setIsVisible(false);
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", updateBreakpoint);
		};
	}, [isUnderLarge]);

	if (!isUnderLarge) return null;

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black to-transparent pointer-events-none lg:hidden"
				>
					<Link
						href="/signup/free"
						onClick={() => {
							trackEvent("cta_clicked", {
								type: "free",
								location: "sticky_mobile",
							});
						}}
						aria-label={CTA_GET_MY_5_FREE_MATCHES_ARIA}
						className="pointer-events-auto w-full block"
					>
						<motion.div
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="font-display group relative w-full min-h-[48px] px-6 py-3 rounded-xl font-semibold text-white overflow-hidden flex items-center justify-center gap-2"
						>
							{/* Gradient background */}
							<div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-emerald-600 group-hover:to-emerald-700 transition-all duration-300" />
							
							{/* Shine effect on hover */}
							<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
								<div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
							</div>
							
							{/* Shadow */}
							<div className="absolute inset-0 shadow-lg shadow-emerald-500/30 group-hover:shadow-xl group-hover:shadow-emerald-500/40 rounded-xl transition-all" />
							
							{/* Content */}
							<span className="relative z-10 flex items-center gap-2">
								<BrandIcons.Mail className="w-5 h-5" />
								<span>{CTA_GET_MY_5_FREE_MATCHES}</span>
								<BrandIcons.ArrowRight className="w-5 h-5" />
							</span>
							
							{/* Border glow */}
							<div className="absolute inset-0 rounded-xl border border-emerald-400/50 group-hover:border-emerald-300 transition-colors" />
						</motion.div>
					</Link>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
