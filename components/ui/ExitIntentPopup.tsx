"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcons } from "./BrandIcons";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	CTA_GET_MY_5_FREE_MATCHES,
	TRUST_TEXT_INSTANT_SETUP,
} from "../../lib/copy";

export default function ExitIntentPopup() {
	const [showPopup, setShowPopup] = useState(false);
	const [hasShown, setHasShown] = useState(false);
	const [timeOnPage, setTimeOnPage] = useState(0);
	const [scrollDepth, setScrollDepth] = useState(0);

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
			const timeInterval = setInterval(() => {
				setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
			}, 1000);

			// Track scroll depth
			const handleScroll = () => {
				const scrollTop = window.scrollY;
				const docHeight = document.documentElement.scrollHeight - window.innerHeight;
				const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
				setScrollDepth(scrollPercent);
			};

			window.addEventListener('scroll', handleScroll);
			handleScroll(); // Initial check

			return () => {
				clearInterval(timeInterval);
				window.removeEventListener('scroll', handleScroll);
			};
		}
		return undefined;
	}, []);

	useEffect(() => {
		// Don't show on mobile - let sticky mobile CTA handle it
		if (typeof window !== "undefined" && window.innerWidth <= 768) {
			return;
		}

		// Only show after 20+ seconds on page AND 50%+ scroll depth
		if (timeOnPage < 20 || scrollDepth < 50) {
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
	}, [hasShown, timeOnPage, scrollDepth]);

	return (
		<Sheet open={showPopup} onOpenChange={setShowPopup}>
			<SheetContent
				side="bottom"
				className="bg-zinc-900/95 border-zinc-800 backdrop-blur-xl"
			>
				<SheetHeader className="text-center">
					<div className="flex justify-center mb-4">
						<BrandIcons.Zap className="w-6 h-6 text-emerald-400" />
					</div>
					<SheetTitle className="text-xl sm:text-2xl font-black text-white mb-3">
						{CTA_GET_MY_5_FREE_MATCHES}
					</SheetTitle>
					<SheetDescription className="text-sm sm:text-base text-zinc-300 mb-5 max-w-md mx-auto">
						See <strong className="text-white">5 hand-picked jobs</strong>{" "}
						matched to your city, visa status, and career path. Instant
						results - no credit card needed.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col items-center space-y-6">
					<div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
						<BrandIcons.Zap className="h-3 w-3 shrink-0" />
						<span className="whitespace-nowrap">
							{TRUST_TEXT_INSTANT_SETUP.replace("⚡ ", "")}
						</span>
					</div>

					<Link
						href="/signup/free"
						onClick={() => setShowPopup(false)}
						className="btn-primary w-full max-w-sm text-sm sm:text-base py-3 sm:py-3.5 min-h-[48px] text-center"
					>
						{CTA_GET_MY_5_FREE_MATCHES} →
					</Link>

					<button
						type="button"
						onClick={() => setShowPopup(false)}
						className="text-xs sm:text-sm text-zinc-500 opacity-50 hover:opacity-75 min-h-[48px] px-4 py-2"
					>
						No thanks
					</button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
