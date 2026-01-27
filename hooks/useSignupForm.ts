import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	trackEvent,
	trackSignupNoMatches,
	trackSignupCompleted,
	trackSignupStarted,
	trackSignupFailed,
} from "../lib/analytics";
import { apiCallJson } from "../lib/api-client";
import { useEmailValidation, useRequiredValidation } from "./useFormValidation";
import { useFormPersistence } from "./useFormPersistence";
import { signupService } from "../services/signupService";
import type { SignupFormData } from "../components/signup/types";

export interface JobCountMetadata {
	isLowCount?: boolean;
	suggestion?: string;
}

export interface UseSignupFormReturn {
	// Form state
	formData: SignupFormData;
	setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
	touchedFields: Set<string>;
	setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;

	// Validation
	emailValidation: ReturnType<typeof useEmailValidation>;
	nameValidation: ReturnType<typeof useRequiredValidation>;
	citiesValidation: ReturnType<typeof useRequiredValidation>;
	visaStatusValidation: ReturnType<typeof useRequiredValidation>;
	isFormValid: boolean;
	formProgress: number;
	shouldShowError: (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => boolean;

	// Job count preview
	jobCount: number | null;
	jobCountMetadata: JobCountMetadata | null;
	isLoadingJobCount: boolean;
	previewError: string | null;

	// Submission
	isSubmitting: boolean;
	error: string;
	setError: React.Dispatch<React.SetStateAction<string>>;
	showLiveMatching: boolean;
	matchCount: number;
	setMatchCount: React.Dispatch<React.SetStateAction<number>>;
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;

	// Form persistence
	clearProgress: () => void;

	// Utility functions
	toggleArray: (arr: string[], value: string) => string[];
}

export function useSignupForm(): UseSignupFormReturn {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

	const [formData, setFormData] = useState<SignupFormData>({
		cities: [],
		careerPath: [],
		email: "",
		fullName: "",
		university: "",
		visaStatus: "",
		languages: [],
		workEnvironment: [],
		entryLevelPreferences: [],
		targetCompanies: [],
		roles: [],
		industries: [],
		companySizePreference: "",
		skills: [],
		careerKeywords: "",
		gdprConsent: false,
		birthYear: undefined,
		ageVerified: false,
		termsAccepted: false,
	});

	const [jobCount, setJobCount] = useState<number | null>(null);
	const [jobCountMetadata, setJobCountMetadata] =
		useState<JobCountMetadata | null>(null);
	const [isLoadingJobCount, setIsLoadingJobCount] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [previewTimeoutId, setPreviewTimeoutId] =
		useState<NodeJS.Timeout | null>(null);
	const [matchCount, setMatchCount] = useState<number>(0);
	const [showLiveMatching, setShowLiveMatching] = useState(false);
	const [overlayStartTime, setOverlayStartTime] = useState<number | null>(null);

	// Ensure overlay shows for minimum time to prevent flash
	const dismissOverlayWithMinimumTime = useCallback(
		(callback?: () => void) => {
			const elapsed = Date.now() - (overlayStartTime || 0);
			const remainingTime = Math.max(0, 2000 - elapsed); // Minimum 2s display

			setTimeout(() => {
				setShowLiveMatching(false);
				setOverlayStartTime(null);
				callback?.();
			}, remainingTime);
		},
		[overlayStartTime],
	);

	// Form persistence
	const { clearProgress } = useFormPersistence(
		formData as any,
		setFormData as any,
		{ tier: "free", hasStep: false },
	);

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);
	const nameValidation = useRequiredValidation(formData.fullName, "Full name");
	const citiesValidation = useRequiredValidation(
		formData.cities,
		"Preferred cities",
	);
	const visaStatusValidation = useRequiredValidation(
		formData.visaStatus,
		"Visa status",
	);

	// Memoized helper functions
	const toggleArray = useCallback((arr: string[], value: string) => {
		return arr.includes(value)
			? arr.filter((v) => v !== value)
			: [...arr, value];
	}, []);

	const shouldShowError = useCallback(
		(fieldName: string, hasValue: boolean, isValid: boolean) => {
			// Show error if:
			// 1. Field was touched (blurred at least once)
			// 2. Field has value AND is invalid
			// OR
			// 3. Field has value longer than 3 chars and is invalid (show during typing)

			if (fieldName === "email" && hasValue && !isValid) {
				// For email, show error after @ is typed
				return formData.email.includes("@") && formData.email.length > 3;
			}

			if (fieldName === "fullName" && hasValue && !isValid) {
				// For name, show error after 3 characters typed
				return formData.fullName.length > 3;
			}

			if (fieldName === "visaStatus" && hasValue && !isValid) {
				return formData.visaStatus.length > 0;
			}

			return touchedFields.has(fieldName) && hasValue && !isValid;
		},
		[touchedFields, formData.email, formData.fullName, formData.visaStatus],
	);

	// Track when user completes step 1 (cities + career path selected)
	useEffect(() => {
		if (formData.cities.length > 0 && formData.careerPath) {
			trackEvent("signup_step_completed", {
				step: 1,
				cities: formData.cities.length,
				career_path: formData.careerPath,
			});
		}
	}, [formData.cities.length, formData.careerPath]);

	// Fetch job count when both cities and career path are selected (with debouncing)
	useEffect(() => {
		// Clear existing timeout
		if (previewTimeoutId) {
			clearTimeout(previewTimeoutId);
		}

		const fetchJobCount = async () => {
			if (formData.cities.length > 0 && formData.careerPath) {
				setIsLoadingJobCount(true);
				setPreviewError(null); // Clear previous errors
				try {
					const data = await apiCallJson<{
						count?: number;
						isLowCount?: boolean;
						suggestion?: string;
					}>("/api/preview-matches", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							cities: formData.cities,
							careerPath: formData.careerPath,
							visaStatus: formData.visaStatus || undefined,
						}),
					});
					setJobCount(data.count || 0);
					setJobCountMetadata({
						isLowCount: data.isLowCount,
						suggestion: data.suggestion,
					});
					setPreviewError(null); // Clear any previous errors
				} catch (error) {
					setJobCount(null);
					setJobCountMetadata(null);
					setPreviewError("Unable to check job availability right now");
				} finally {
					setIsLoadingJobCount(false);
				}
			} else {
				setJobCount(null);
				setJobCountMetadata(null);
				setPreviewError(null);
			}
		};

		// Debounce for 500ms to avoid excessive API calls
		const newTimeoutId = setTimeout(fetchJobCount, 500);
		setPreviewTimeoutId(newTimeoutId);

		return () => {
			if (newTimeoutId) {
				clearTimeout(newTimeoutId);
			}
		};
	}, [formData.cities, formData.careerPath, formData.visaStatus]);

	// Calculate form completion percentage
	const formProgress = useMemo(() => {
		let completed = 0;
		if (formData.cities.length > 0) completed++;
		if (formData.careerPath) completed++;
		if (formData.email && emailValidation.isValid) completed++;
		if (formData.fullName && nameValidation.isValid) completed++;
		if (formData.visaStatus && visaStatusValidation.isValid) completed++;
		return (completed / 5) * 100;
	}, [
		formData,
		emailValidation.isValid,
		nameValidation.isValid,
		visaStatusValidation.isValid,
	]);

	// Memoized computed values
	const isFormValid = useMemo<boolean>(
		() =>
			Boolean(formData.cities.length > 0) &&
			Boolean(formData.careerPath) &&
			Boolean(emailValidation.isValid) &&
			Boolean(nameValidation.isValid) &&
			Boolean(visaStatusValidation.isValid) &&
			Boolean(formData.ageVerified) &&
			Boolean(formData.termsAccepted) &&
			Boolean(formData.gdprConsent),
		[
			formData.cities.length,
			formData.careerPath,
			emailValidation.isValid,
			nameValidation.isValid,
			visaStatusValidation.isValid,
			formData.ageVerified,
			formData.termsAccepted,
			formData.gdprConsent,
		],
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			if (isSubmitting) return;

			if (!isFormValid) {
				setTouchedFields(
					new Set([
						"cities",
						"careerPath",
						"email",
						"fullName",
						"visaSponsorship",
						"gdprConsent",
					]),
				);
				return;
			}

		setIsSubmitting(true);
		setError("");
		setShowLiveMatching(true);
		setOverlayStartTime(Date.now());

		const signupStartTime = Date.now();
		trackSignupStarted("free");

		try {
			const result = await signupService.submitFreeSignup(formData);

			if (result.redirectToMatches) {
				dismissOverlayWithMinimumTime(() => {
					setTimeout(() => {
						router.push(
							`/matches?justSignedUp=true&matchCount=${result.matchCount || 5}`,
						);
					}, 500); // Small delay after overlay disappears
				});
				return;
			}

			setMatchCount(result.matchCount || 0);

			if ((result.matchCount || 0) === 0) {
				setError(
					"We couldn't find any matches for your preferences. Try selecting different cities or career paths.",
				);
				// ENHANCED: Track with more context for debugging
				trackSignupNoMatches({
					tier: "free",
					cities: formData.cities,
					career_path: formData.careerPath,
					available_jobs_count: 0,
					filter_stage: "city_career",
					duration_ms: Date.now() - signupStartTime,
					reason: "no_matches_found",
				});
				return;
			}

			// ENHANCED: Track completion with full context
			trackSignupCompleted({
				tier: "free",
				matchCount: result.matchCount || 0,
				cities: formData.cities.length,
				career_path: formData.careerPath,
				duration_ms: Date.now() - signupStartTime,
			});

			clearProgress();
			dismissOverlayWithMinimumTime(() => {
				router.push(
					`/matches?justSignedUp=true&matchCount=${result.matchCount}`,
				);
			});
		} catch (err) {
			dismissOverlayWithMinimumTime();
			const errorMessage =
				err instanceof Error
					? err.message
					: "Something went wrong. Please try again.";
			trackSignupFailed(errorMessage, {
				tier: "free",
				cities: formData.cities,
				career_path: formData.careerPath,
				duration_ms: Date.now() - signupStartTime,
			});
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
		},
		[
			isFormValid,
			formData,
			router,
			isSubmitting,
			emailValidation.isValid,
			clearProgress,
		],
	);

	return {
		formData,
		setFormData,
		touchedFields,
		setTouchedFields,
		emailValidation,
		nameValidation,
		citiesValidation,
		visaStatusValidation,
		isFormValid,
		formProgress,
		shouldShowError,
		jobCount,
		jobCountMetadata,
		isLoadingJobCount,
		previewError,
		isSubmitting,
		error,
		setError,
		showLiveMatching,
		matchCount,
		setMatchCount,
		handleSubmit,
		clearProgress,
		toggleArray,
	};
}
