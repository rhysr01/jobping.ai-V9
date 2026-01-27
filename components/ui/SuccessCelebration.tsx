"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessCelebrationProps {
	matchCount: number;
	isVisible: boolean;
	onComplete?: () => void;
	autoHide?: boolean;
	autoHideDelay?: number;
}

// Simple confetti particles
function Confetti() {
	const particles = Array.from({ length: 50 }, (_, i) => ({
		id: i,
		left: Math.random() * 100,
		delay: Math.random() * 0.2,
		duration: 2 + Math.random() * 1,
	}));

	return (
		<div className="fixed inset-0 pointer-events-none overflow-hidden">
			{particles.map((particle) => (
				<motion.div
					key={particle.id}
					initial={{
						top: "-10px",
						left: `${particle.left}%`,
						opacity: 1,
						rotate: 0,
					}}
					animate={{
						top: "100vh",
						opacity: 0,
						rotate: 360,
					}}
					transition={{
						duration: particle.duration,
						delay: particle.delay,
						ease: "easeIn",
					}}
					className="fixed w-2 h-2 bg-emerald-400 rounded-full"
				/>
			))}
		</div>
	);
}

export function SuccessCelebration({
	matchCount,
	isVisible,
	onComplete,
	autoHide = true,
	autoHideDelay = 3000,
}: SuccessCelebrationProps) {
	const [show, setShow] = useState(isVisible);

	useEffect(() => {
		setShow(isVisible);

		if (isVisible && autoHide) {
			const timer = setTimeout(() => {
				setShow(false);
				onComplete?.();
			}, autoHideDelay);

			return () => clearTimeout(timer);
		}
		// Explicit return for all code paths
		return undefined;
	}, [isVisible, autoHide, autoHideDelay, onComplete]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
				>
					{/* Confetti Animation */}
					<Confetti />

					{/* Main Content */}
					<div className="text-center relative z-10">
						{/* Success Icon */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								type: "spring",
								stiffness: 100,
								damping: 15,
								delay: 0.1,
							}}
							className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/50"
						>
							<CheckCircle className="w-12 h-12 text-white" />
						</motion.div>

						{/* Success Message */}
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ delay: 0.2 }}
						>
							<h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
								You're All Set! 🎉
							</h2>
							<p className="text-lg text-zinc-300 mb-2">
								We found{" "}
								<span className="text-emerald-400 font-bold text-xl">
									{matchCount} job{matchCount !== 1 ? "s" : ""}
								</span>{" "}
								perfect for you
							</p>
							<p className="text-sm text-zinc-500">
								Check your inbox for your matches
							</p>
						</motion.div>

						{/* CTA Button */}
						<motion.button
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							transition={{ delay: 0.3 }}
							onClick={() => {
								setShow(false);
								onComplete?.();
							}}
							className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl text-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all hover:scale-105"
						>
							View My Matches →
						</motion.button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export default SuccessCelebration;

