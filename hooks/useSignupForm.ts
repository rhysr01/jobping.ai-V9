import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/analytics";
import { apiCallJson } from "../lib/api-client";
import { useEmailValidation, useRequiredValidation } from "./useFormValidation";
import { useFormPersistence } from "./useFormPersistence";
import { signupService } from "../services/signupService";

export interface SignupFormData {
	cities: string[];
	careerPath: string;
	email: string;
	fullName: string;
	university?: string;
	visaSponsorship: string;
	gdprConsent: boolean;
	birthYear?: number;
	ageVerified: boolean;
	termsAccepted: boolean;
}

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
	visaSponsorshipValidation: ReturnType<typeof useRequiredValidation>;
	isFormValid: boolean;
	formProgress: number;
	shouldShowError: (fieldName: string, hasValue: boolean, isValid: boolean) => boolean;

	// Job count preview
	jobCount: number | null;
	jobCountMetadata: JobCountMetadata | null;
	isLoadingJobCount: boolean;

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
		careerPath: "",
		email: "",
		fullName: "",
		university: "",
		visaSponsorship: "",
		gdprConsent: false,
		birthYear: undefined,
		ageVerified: false,
		termsAccepted: false,
	});

	const [jobCount, setJobCount] = useState<number | null>(null);
	const [jobCountMetadata, setJobCountMetadata] = useState<JobCountMetadata | null>(null);
	const [isLoadingJobCount, setIsLoadingJobCount] = useState(false);
	const [matchCount, setMatchCount] = useState<number>(0);
	const [showLiveMatching, setShowLiveMatching] = useState(false);

	// Form persistence
	const { clearProgress } = useFormPersistence(
		formData,
		setFormData as any,
		{ tier: 'free', hasStep: false },
	);

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);
	const nameValidation = useRequiredValidation(formData.fullName, "Full name");
	const citiesValidation = useRequiredValidation(formData.cities, "Preferred cities");
	const visaSponsorshipValidation = useRequiredValidation(formData.visaSponsorship, "Visa sponsorship");

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

			if (fieldName === "visaSponsorship" && hasValue && !isValid) {
				return formData.visaSponsorship.length > 0;
			}

			return touchedFields.has(fieldName) && hasValue && !isValid;
		},
		[
			touchedFields,
			formData.email,
			formData.fullName,
			formData.visaSponsorship,
		],
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

	// Fetch job count when both cities and career path are selected
	useEffect(() => {
		const fetchJobCount = async () => {
			if (formData.cities.length > 0 && formData.careerPath) {
				setIsLoadingJobCount(true);
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
							visaSponsorship: formData.visaSponsorship || undefined,
						}),
					});
					setJobCount(data.count || 0);
					setJobCountMetadata({
						isLowCount: data.isLowCount,
						suggestion: data.suggestion,
					});
				} catch (error) {
					setJobCount(null);
					setJobCountMetadata(null);
				} finally {
					setIsLoadingJobCount(false);
				}
			} else {
				setJobCount(null);
				setJobCountMetadata(null);
			}
		};

		const timeoutId = setTimeout(fetchJobCount, 300);
		return () => clearTimeout(timeoutId);
	}, [formData.cities, formData.careerPath, formData.visaSponsorship]);

	// Calculate form completion percentage
	const formProgress = useMemo(() => {
		let completed = 0;
		if (formData.cities.length > 0) completed++;
		if (formData.careerPath) completed++;
		if (formData.email && emailValidation.isValid) completed++;
		if (formData.fullName && nameValidation.isValid) completed++;
		if (formData.visaSponsorship && visaSponsorshipValidation.isValid) completed++;
		return (completed / 5) * 100;
	}, [
		formData,
		emailValidation.isValid,
		nameValidation.isValid,
		visaSponsorshipValidation.isValid,
	]);

	// Memoized computed values
	const isFormValid = useMemo<boolean>(
		() =>
			Boolean(formData.cities.length > 0) &&
			Boolean(formData.careerPath) &&
			Boolean(emailValidation.isValid) &&
			Boolean(nameValidation.isValid) &&
			Boolean(visaSponsorshipValidation.isValid) &&
			Boolean(formData.ageVerified) &&
			Boolean(formData.termsAccepted) &&
			Boolean(formData.gdprConsent),
		[
			formData.cities.length,
			formData.careerPath,
			emailValidation.isValid,
			nameValidation.isValid,
			visaSponsorshipValidation.isValid,
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

			trackEvent("signup_started", { tier: "free" });

			try {
				const result = await signupService.submitFreeSignup(formData);

				if (result.redirectToMatches) {
					setTimeout(() => {
						router.push(`/matches?justSignedUp=true&matchCount=${result.matchCount || 5}`);
					}, 1000);
					return;
				}

				setMatchCount(result.matchCount || 0);

				if ((result.matchCount || 0) === 0) {
					setError("We couldn't find any matches for your preferences. Try selecting different cities or career paths.");
					trackEvent("signup_failed", { tier: "free", error: "no_matches" });
					return;
				}

				trackEvent("signup_completed", {
					tier: "free",
					cities: formData.cities.length,
					career_path: formData.careerPath,
					matchCount: result.matchCount,
				});

				clearProgress();
				setShowLiveMatching(false);

				router.push(`/matches?justSignedUp=true&matchCount=${result.matchCount}`);
			} catch (err) {
				setShowLiveMatching(false);
				const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
				trackEvent("signup_failed", { tier: "free", error: errorMessage });
				setError(errorMessage);
			} finally {
				setIsSubmitting(false);
			}
		},
		[isFormValid, formData, router, isSubmitting, emailValidation.isValid, clearProgress],
	);

	return {
		formData,
		setFormData,
		touchedFields,
		setTouchedFields,
		emailValidation,
		nameValidation,
		citiesValidation,
		visaSponsorshipValidation,
		isFormValid,
		formProgress,
		shouldShowError,
		jobCount,
		jobCountMetadata,
		isLoadingJobCount,
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