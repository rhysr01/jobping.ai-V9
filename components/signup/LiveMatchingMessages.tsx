"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const SCANNING_MESSAGES = [
	"Scanning 4,200+ active jobs...",
	"Filtering by your cities...",
	"Matching career paths...",
	"Checking visa requirements...",
	"Calculating match scores...",
	"Finding your top 5 matches...",
];

export function LiveMatchingMessages() {
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length);
		}, 1500);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="h-12 flex items-center justify-center">
			<AnimatePresence mode="wait">
				<motion.p
					key={currentIndex}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ duration: 0.3 }}
					className="text-lg text-content-secondary"
				>
					{SCANNING_MESSAGES[currentIndex]}
				</motion.p>
			</AnimatePresence>
		</div>
	);
}

