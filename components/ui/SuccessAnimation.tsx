"use client";

import { motion } from "framer-motion";

interface SuccessAnimationProps {
	message: string;
	onComplete?: () => void;
}

/**
 * Success animation component for form submissions and actions
 */
export function SuccessAnimation({
	message,
	onComplete,
}: SuccessAnimationProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			transition={{ duration: 0.3 }}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="success-title"
		>
			<motion.div
				initial={{ y: 20 }}
				animate={{ y: 0 }}
				className="bg-glass-default border border-border-default rounded-lg p-8 text-center max-w-md mx-4"
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
					className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4"
				>
					<svg
						className="w-8 h-8 text-success"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
						role="img"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</motion.div>
				<h2 id="success-title" className="text-2xl font-bold text-white mb-2">
					{message}
				</h2>
				<p className="text-content-muted text-sm">Redirecting you now...</p>
				{onComplete && (
					<motion.button
						type="button"
						onClick={onComplete}
						className="mt-6 btn-primary"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						Continue
					</motion.button>
				)}
			</motion.div>
		</motion.div>
	);
}
