import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { ApiError, apiCall, apiCallJson } from "../lib/api-client";
import { showToast } from "../lib/toast";

export interface TargetCompany {
	company: string;
	lastMatchedAt: string;
	matchCount: number;
	roles: string[];
}

export interface CustomScan {
	scanId: string;
	estimatedTime: string;
	message: string;
}

export interface SignupSuccessMetadata {
	targetCompanies: TargetCompany[];
	customScan: CustomScan | null;
	relaxationLevel: number | null;
}

export interface EmailStatus {
	sent: boolean;
	sentAt?: string;
	error?: string;
	retrying?: boolean;
}

export interface UseSignupSuccessReturn {
	// State
	showSuccess: boolean;
	emailSentAt: string;
	resending: boolean;
	emailStatus: EmailStatus;
	metadata: SignupSuccessMetadata | null;
	metadataLoading: boolean;

	// URL params
	email: string;
	matchCount: number;
	tier: string;
	isFree: boolean;
	isPremium: boolean;

	// Actions
	handleSetAlert: (company: string) => Promise<void>;
	handleResendEmail: () => Promise<void>;
}

export function useSignupSuccess(): UseSignupSuccessReturn {
	const searchParams = useSearchParams();
	const [showSuccess, setShowSuccess] = useState(true);
	const [emailSentAt, setEmailSentAt] = useState<string>("");
	const [resending, setResending] = useState(false);
	const [emailStatus, setEmailStatus] = useState<EmailStatus>({ sent: false });
	const [metadata, setMetadata] = useState<SignupSuccessMetadata | null>(null);
	const [metadataLoading, setMetadataLoading] = useState(true);

	// URL parameters
	const email = searchParams?.get("email") || "";
	const matchCount = parseInt(searchParams?.get("matches") || "10", 10) || 10;
	const tier = searchParams?.get("tier") || "free"; // Default to free if not specified
	const isFree = tier === "free";
	const isPremium = tier === "premium";

	// Initialize email sent time
	useEffect(() => {
		setEmailSentAt(
			new Date().toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		);
		const timer = setTimeout(() => setShowSuccess(false), 2000);
		return () => clearTimeout(timer);
	}, []);

	// Premium confetti celebration
	useEffect(() => {
		const duration = 5000;
		const animationEnd = Date.now() + duration;
		const defaults = {
			startVelocity: 30,
			spread: 360,
			ticks: 60,
			zIndex: 9999,
		};

		function randomInRange(min: number, max: number) {
			return Math.random() * (max - min) + min;
		}

		const interval: NodeJS.Timeout = setInterval(function () {
			const timeLeft = animationEnd - Date.now();

			if (timeLeft <= 0) {
				clearInterval(interval);
				return;
			}

			const particleCount = 50 * (timeLeft / duration);

			confetti(
				Object.assign({}, defaults, {
					particleCount,
					origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
				}),
			);
			confetti(
				Object.assign({}, defaults, {
					particleCount,
					origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
				}),
			);
		}, 250);

		return () => clearInterval(interval);
	}, []);

	// Load metadata
	useEffect(() => {
		const loadMetadata = async () => {
			if (!email) {
				setMetadataLoading(false);
				return;
			}

			try {
				const response = await apiCallJson<{
					targetCompanies: TargetCompany[];
					customScan: CustomScan | null;
					relaxationLevel: number | null;
				}>("/api/signup/metadata", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email }),
				});

				setMetadata(response);
			} catch (error) {
				console.error("Failed to load metadata:", error);
				// Don't show error to user - metadata is not critical
			} finally {
				setMetadataLoading(false);
			}
		};

		loadMetadata();
	}, [email]);

	// Check email status
	useEffect(() => {
		if (!email) return;

		const checkEmailStatus = async () => {
			try {
				const response = await apiCall("/api/email-status", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email }),
				});

				if (response.ok) {
					const data = await response.json();
					setEmailStatus(data);
				}
			} catch (error) {
				console.error("Failed to check email status:", error);
			}
		};

		// Check immediately
		checkEmailStatus();

		// Then check every 30 seconds
		const interval = setInterval(checkEmailStatus, 30000);
		return () => clearInterval(interval);
	}, [email]);

	const handleSetAlert = useCallback(async (company: string) => {
		// Track the alert event
		console.log("Setting alert for company:", company);
		showToast.success(
			`Alert set for ${company}! We'll notify you when new roles appear.`,
		);
		// TODO: Implement actual alert setting API endpoint
	}, []);

	const handleResendEmail = useCallback(async () => {
		if (!email) {
			showToast.error("Email address not found. Please contact support.");
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
				showToast.success("Email resent successfully! Check your inbox.");
			} else {
				showToast.error(
					result.error || "Failed to resend email. Please try again later.",
				);
			}
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Failed to resend email. Please try again later.";
			showToast.error(errorMessage);
		} finally {
			setResending(false);
		}
	}, [email]);

	return {
		showSuccess,
		emailSentAt,
		resending,
		emailStatus,
		metadata,
		metadataLoading,
		email,
		matchCount,
		tier,
		isFree,
		isPremium,
		handleSetAlert,
		handleResendEmail,
	};
}