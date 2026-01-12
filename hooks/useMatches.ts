import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiCall } from "../lib/api-client";
import { TIMING } from "../lib/constants";
import { trackEvent } from "../lib/analytics";
import { showToast } from "../lib/toast";
import { apiCallJson } from "../lib/api-client";

export interface Job {
	id: number;
	title: string;
	company: string;
	company_name?: string;
	location: string;
	city: string;
	country: string;
	description: string;
	url: string;
	job_url?: string;
	work_environment: string;
	match_score?: number;
	match_reason?: string;
	visa_confidence?: "verified" | "likely" | "local-only" | "unknown";
	visa_confidence_label?: string;
	visa_confidence_reason?: string;
	visa_confidence_percentage?: number;
	job_hash?: string;
}

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

export interface UseMatchesReturn {
	// Data state
	jobs: Job[];
	targetCompanies: TargetCompany[] | null;
	customScan: CustomScan | null;
	loading: boolean;
	error: string;
	loadingMessage: string;

	// UI state
	showUpgradeBanner: boolean;
	jobsViewed: number;
	clickedJobId: number | null;
	dismissedJobIds: Set<number>;
	dismissingJobId: number | null;
	jobsContainerRef: React.RefObject<HTMLDivElement>;

	// Job closed modal state
	showJobClosedModal: boolean;
	jobClosedData: {
		originalJob: { title: string; company: string; location: string };
		similarMatches: Array<{
			job_hash: string;
			title: string;
			company: string;
			location: string;
			job_url: string;
			match_score: number;
			match_reason: string;
		}>;
		message: string;
	} | null;

	// Actions
	fetchMatches: () => Promise<void>;
	handleJobDismiss: (job: Job) => void;
	handleJobClick: (jobId: number, company: string, position: number, job?: Job) => void;
	handleScroll: () => void;
	setShowJobClosedModal: (show: boolean) => void;
}

export function useMatches(): UseMatchesReturn {
	const searchParams = useSearchParams();
	const [jobs, setJobs] = useState<Job[]>([]);
	const [targetCompanies, setTargetCompanies] = useState<TargetCompany[] | null>(null);
	const [customScan, setCustomScan] = useState<CustomScan | null>(null);
	const [loading, setLoading] = useState(true);
	const loadingMessage = "Finding your perfect matches...";
	const [error, setError] = useState("");
	const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
	const [jobsViewed, setJobsViewed] = useState(0);
	const [clickedJobId, setClickedJobId] = useState<number | null>(null);
	const [dismissedJobIds, setDismissedJobIds] = useState<Set<number>>(new Set());
	const [dismissingJobId, setDismissingJobId] = useState<number | null>(null);
	const jobsContainerRef = useRef<HTMLDivElement>(null);
	const [showJobClosedModal, setShowJobClosedModal] = useState(false);
	const [jobClosedData] = useState<{
		originalJob: { title: string; company: string; location: string };
		similarMatches: Array<{
			job_hash: string;
			title: string;
			company: string;
			location: string;
			job_url: string;
			match_score: number;
			match_reason: string;
		}>;
		message: string;
	} | null>(null);

	const fetchMatches = useCallback(async () => {
		try {
			setError("");
			setLoading(true);

			// Add timeout wrapper - using constant from lib/constants
			const timeoutPromise = new Promise<Response>((_, reject) =>
				setTimeout(
					() => reject(new Error("Request timeout")),
					TIMING.API_TIMEOUT_MS,
				),
			);

			const response = (await Promise.race([
				apiCall("/api/matches/free"),
				timeoutPromise,
			])) as Response;

			// Handle 401 - Cookie expired or invalid
			if (response.status === 401) {
				setError(
					"Your session has expired. Please sign up again to see your matches.",
				);
				setLoading(false);
				// Optionally redirect after a delay
				setTimeout(() => {
					window.location.href = "/signup/free?expired=true";
				}, TIMING.SESSION_EXPIRED_REDIRECT_MS);
				return;
			}

			// Handle other errors
			if (!response.ok) {
				const data = await response
					.json()
					.catch(() => ({ error: "Failed to load matches" }));
				setError(data.error || "Failed to load matches. Please try again.");
				setLoading(false);
				return;
			}

			const data = await response.json();
			setJobs(data.jobs || []);
			setTargetCompanies(data.targetCompanies || null);
			setCustomScan(data.customScan || null);
			setLoading(false);
		} catch (err) {
			// Handle timeout specifically
			if (err instanceof Error && err.message === "Request timeout") {
				setError("Request took too long. Please try again.");
			} else {
				// ApiError provides user-friendly messages
				const errorMessage =
					err instanceof ApiError
						? err.message
						: "Failed to load matches. Please try signing up again.";
				setError(errorMessage);
			}
			setLoading(false);
		}
	}, []);

	// Get user email from cookie for feedback
	const getUserEmail = useCallback(() => {
		if (typeof document === "undefined") return null;
		const cookies = document.cookie.split(";");
		const emailCookie = cookies.find((c) =>
			c.trim().startsWith("free_user_email="),
		);
		if (emailCookie) {
			return decodeURIComponent(emailCookie.split("=")[1]).toLowerCase().trim();
		}
		return null;
	}, []);

	// Handle job dismissal with ghost state animation
	const handleJobDismiss = useCallback(
		async (job: Job) => {
			if (dismissingJobId === job.id) return;

			setDismissingJobId(job.id);

			// Start ghost animation (shrink and fade)
			setTimeout(() => {
				setDismissedJobIds((prev) => new Set(prev).add(job.id));
				setDismissingJobId(null);

				// Show toast notification
				showToast.success(`Got it. We won't show you ${job.company} again.`);

				// Track feedback
				trackEvent("job_dismissed", {
					job_id: job.id,
					company: job.company,
					title: job.title,
				});

				// Send feedback to API
				const email = getUserEmail();
				if (email) {
					// Use job_hash if available, otherwise generate from job data
					const jobHash =
						job.job_hash ||
						`job-${job.id}-${job.company.toLowerCase().replace(/\s+/g, "-")}`;

					apiCallJson("/api/feedback/enhanced", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							jobHash,
							email,
							feedbackType: "not_relevant",
							verdict: "negative",
							relevanceScore: 1,
							matchQualityScore: 1,
							reason: "User marked as not relevant",
							source: "web",
						}),
					}).catch((err) => {
						console.error("Failed to send feedback:", err);
						// Don't show error to user - feedback is non-critical
					});
				}
			}, 300); // Animation duration
		},
		[dismissingJobId, getUserEmail],
	);

	// Memoized job click handler to prevent re-creating on every render
	const handleJobClick = useCallback(
		(jobId: number, company: string, position: number, _job?: Job) => {
			// Track job view
			setJobsViewed((prev) => {
				const newCount = prev + 1;
				// Show upgrade banner after viewing 2 jobs
				if (newCount >= 2) {
					setShowUpgradeBanner(true);
				}
				return newCount;
			});

			// Track click using unified function
			trackEvent("job_clicked", {
				job_id: jobId,
				company,
				position,
			});

			setClickedJobId(jobId);

			// Clear clicked state after animation
			setTimeout(() => setClickedJobId(null), 1000);
		},
		[],
	);

	// Memoized scroll handler to prevent re-creating on every render
	const handleScroll = useCallback(() => {
		const container = jobsContainerRef.current;
		if (!container) return;

		const scrollPosition = window.scrollY + window.innerHeight;

		// Show banner after scrolling past first job
		if (scrollPosition > container.offsetTop + 200) {
			setShowUpgradeBanner(true);
		}
	}, []);

	// Auto-show upgrade banner for new users
	const justSignedUp = searchParams?.get("justSignedUp") === "true";

	useEffect(() => {
		if (justSignedUp && jobs.length > 0) {
			const delay = jobs.length >= 5 ? 3000 : 2000; // Shorter delay for fewer jobs
			const timer = setTimeout(() => {
				setShowUpgradeBanner(true);
			}, delay);

			return () => clearTimeout(timer);
		}
		return undefined;
	}, [jobs.length, justSignedUp]);

	// Load matches on mount
	useEffect(() => {
		fetchMatches();
	}, [fetchMatches]);

	return {
		jobs,
		targetCompanies,
		customScan,
		loading,
		error,
		loadingMessage,
		showUpgradeBanner,
		jobsViewed,
		clickedJobId,
		dismissedJobIds,
		dismissingJobId,
		jobsContainerRef,
		showJobClosedModal,
		jobClosedData,
		fetchMatches,
		handleJobDismiss,
		handleJobClick,
		handleScroll,
		setShowJobClosedModal,
	};
}