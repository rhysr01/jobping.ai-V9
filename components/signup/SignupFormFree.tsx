"use client";

import * as Sentry from "@sentry/nextjs";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import type { FormDataType } from "@/hooks/useFormPersistence";
import { useEmailValidation } from "@/hooks/useFormValidation";
import { useFreeSignupNavigation } from "@/hooks/useFreeSignupNavigation";
import { useSignupState } from "@/hooks/useSignupState";
import { ApiError, apiCallJson } from "@/lib/api-client";
import { TIMING } from "@/lib/constants";
import { debugLogger } from "@/lib/debug-logger";
import { showToast } from "@/lib/toast";
import ErrorBoundary from "../../components/error-boundary";
import { useAriaAnnounce } from "../ui/AriaLiveRegion";
import { PageLoading } from "../ui/skeletons";
import { HeroSectionFree } from "./HeroSectionFree";
import { Step1FreeBasics } from "./Step1FreeBasics";
import { Step2FreeCities } from "./Step2FreeCities";
import { Step3FreeCareer } from "./Step3FreeCareer";
import { TrustSignals } from "./TrustSignals";

function SignupFormFree() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Initialize step from URL
	const urlStep = searchParams.get("step");
	const initialStep = urlStep
		? Math.max(1, Math.min(3, parseInt(urlStep, 10)))
		: 1;

	// Log initialization
	debugLogger.step("INIT", "SignupFormFree component mounting", {
		initialStep,
		urlStep,
	});

	// Use our custom hooks for state management
	const signupState = useSignupState(initialStep);
	const {
		step,
		loading,
		activeJobs,
		totalUsers,
		isLoadingStats,
		formData,
		error: signupError, // Extract error to monitor it
		setStep,
		setLoading,
		setError,
		setSuccessState,
		setFormData,
		updateFormData,
	} = signupState;

	// Guard against undefined functions during SSR or initialization
	// This prevents "setFormData is not defined" and "updateFormData is not defined" errors
	if (typeof window !== "undefined" && (!setFormData || !updateFormData)) {
		debugLogger.error("INIT", "Critical: setFormData or updateFormData is undefined", {
			hasSetFormData: !!setFormData,
			hasUpdateFormData: !!updateFormData,
			signupStateKeys: Object.keys(signupState),
		});
		// Don't throw - let component render and hook will initialize
	}

	const { announce, Announcement } = useAriaAnnounce();

	// Enhanced submission progress state
	const [submissionProgress, setSubmissionProgress] = useState(0);
	const [submissionStage, setSubmissionStage] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});
	const [isMounted, setIsMounted] = useState(false);
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

	// Form persistence hook
	// SignupFormData is compatible with FormDataType since it contains all required fields
	const { clearProgress, savePreferencesForMatches } = useFormPersistence(
		formData as unknown as FormDataType,
		updateFormData as unknown as React.Dispatch<React.SetStateAction<FormDataType>>,
		{ tier: "free", hasStep: true, minStepForSave: 1 },
		setStep,
		step,
	);

	// Ref to track redirect timeout for cleanup
	const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (redirectTimeoutRef.current) {
				clearTimeout(redirectTimeoutRef.current);
			}
		};
	}, []);

	// Clear validation errors and signup errors when navigating to a new step
	// This prevents errors from previous steps or failed submissions from persisting
	// Following production-first approach: only show errors when they're relevant to current step
	useEffect(() => {
		debugLogger.step("STEP_CHANGE", "Step navigation", {
			newStep: step,
			isSubmitting,
			hasError: !!signupError,
		});

		// Clear validation errors when step changes (unless currently submitting)
		if (!isSubmitting) {
			setValidationErrors({});
			// Also clear signup state error when navigating to a new step
			if (signupError) {
				debugLogger.debug("STEP_CHANGE", "Clearing previous errors");
				setError("");
			}
			// Clear touched fields when changing steps to prevent stale error states
			setTouchedFields(new Set());
		}
	}, [step, isSubmitting, signupError]); // Clear errors whenever step changes

	// Mark component as mounted to prevent hydration mismatches
	useEffect(() => {
		setIsMounted(true);
		debugLogger.step("MOUNT", "Component mounted successfully", {
			step,
			hasFormData: !!formData,
		});
	}, []);

	// Clear errors on initial mount - always clear to prevent stale errors from persisting
	// This handles cases where users navigate directly to /signup/free?step=2 with stale errors
	// Also handles race conditions where errors might persist from previous sessions
	useEffect(() => {
		// Always clear errors on mount - defensive approach to prevent phantom errors
		setValidationErrors({});
		setError("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount - clear any stale errors from previous sessions

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);

	// Use free signup navigation hook
	const navigation = useFreeSignupNavigation({
		step,
		formData,
		setStep,
		emailValidation,
		announce,
	});

	// Enhanced submit handler with validation and loading states
	const handleSubmit = useCallback(async () => {
		if (loading || isSubmitting) {
			debugLogger.warning("SUBMIT", "Submit already in progress");
			return;
		}

		const submitTracker = debugLogger.createTracker("FORM_SUBMIT");

		// Client-side validation
		const errors: Record<string, string> = {};

		debugLogger.step("VALIDATION", "Starting client-side validation", {
			hasFullName: !!formData.fullName?.trim(),
			hasEmail: !!formData.email?.trim(),
			emailValid: emailValidation.isValid,
			citiesCount: formData.cities?.length || 0,
			careerPathCount: formData.careerPath?.length || 0,
			gdprConsent: formData.gdprConsent,
		});

		if (!formData.fullName?.trim()) {
			errors.fullName = "Full name is required";
		}
		if (!formData.email?.trim()) {
			errors.email = "Email is required";
		} else if (!emailValidation.isValid) {
			errors.email = emailValidation.error;
		}
		if (!formData.cities?.length) {
			errors.cities = "Please select at least one city";
		}
		if (!formData.careerPath?.length) {
			errors.careerPath = "Please select at least one career path";
		}
		if (!formData.gdprConsent) {
			errors.gdprConsent = "Please accept the Terms of Service and Privacy Policy";
		}

		setValidationErrors(errors);

		if (Object.keys(errors).length > 0) {
			debugLogger.error("VALIDATION", "Client-side validation failed", { errors });
			submitTracker.error("Validation failed", { errorCount: Object.keys(errors).length });
			return;
		}

		debugLogger.success("VALIDATION", "All client-side validations passed");
		submitTracker.checkpoint("Validation complete");

		setIsSubmitting(true);
		setLoading(true);
		setError("");
		setValidationErrors({});
		setSubmissionProgress(0);
		setSubmissionStage("Validating your details...");

		// Enhanced progress tracking with visual feedback
		setTimeout(() => setSubmissionProgress(10), 100);

		try {
			debugLogger.step("SUBMIT_START", "Starting form submission", {
				email: formData.email,
				cities: formData.cities,
				careerPath: formData.careerPath,
				visaStatus: formData.visaStatus,
			});
			submitTracker.checkpoint("Form submission started");

			// Stage 1: Validation (10% - 30%)
			setSubmissionProgress(10);
			await new Promise((resolve) => setTimeout(resolve, 300));
			setSubmissionProgress(30);
			setSubmissionStage("Finding your perfect matches...");
			debugLogger.step("SUBMIT_STAGE", "Stage 1: Validation", {
				progress: "30%",
			});

			// Stage 2: API Call (30% - 70%)
			setSubmissionProgress(40);

			// Transform form data to match API expectations
			// CRITICAL: API requires age_verified and terms_accepted to be exactly true (not just truthy)
			// If gdprConsent is true, both must be true for validation to pass
			const apiData = {
				email: formData.email,
				full_name: formData.fullName,
				cities: formData.cities || [],
				careerPath: formData.careerPath || [],
				entryLevelPreferences: formData.entryLevelPreferences || [],
				visaStatus: formData.visaStatus || "",
				birth_year: formData.birthYear,
				// Map gdprConsent to terms_accepted (required by API)
				// API validation requires exactly true, not just truthy
				terms_accepted: formData.gdprConsent === true,
				// Set age_verified to true when user accepts terms (accepting terms implies age verification)
				// API validation requires exactly true, not just truthy
				age_verified: formData.gdprConsent === true,
			};

			debugLogger.debug("SUBMIT_API_DATA", "Prepared API payload", {
				email: apiData.email,
				citiesLength: apiData.cities?.length,
				careerPathLength: apiData.careerPath?.length,
				visaStatus: apiData.visaStatus,
				termsAccepted: apiData.terms_accepted,
				ageVerified: apiData.age_verified,
			});

			// Validate critical fields before sending
			if (!apiData.cities || apiData.cities.length === 0) {
				throw new Error("Please select at least one city");
			}
			if (!apiData.careerPath || apiData.careerPath.length === 0) {
				throw new Error("Please select at least one career path");
			}
			if (!apiData.visaStatus || apiData.visaStatus.trim() === "") {
				throw new Error("Please select your visa status");
			}
			if (!apiData.terms_accepted) {
				throw new Error("Please accept the Terms of Service and Privacy Policy");
			}
			if (!apiData.age_verified) {
				throw new Error("Age verification is required");
			}

			debugLogger.step("SUBMIT_STAGE", "Stage 2: API Call", {
				progress: "40%",
				endpoint: "/api/signup/free",
				method: "POST",
			});
			submitTracker.checkpoint("API call starting");

			const response = await apiCallJson<{
				userId: string;
				email: string;
				matchesCount: number;
				success?: boolean;
				error?: string;
				details?: any;
			}>("/api/signup/free", {
				method: "POST",
				body: JSON.stringify(apiData),
			});

			debugLogger.success("SUBMIT_API_RESPONSE", "API response received", {
				userId: response?.userId,
				matchCount: response?.matchesCount,
				email: response?.email,
				status: "success",
			});
			submitTracker.checkpoint("API response successful", {
				matchCount: response?.matchesCount,
			});

			if (!response) {
				throw new Error("No response from server");
			}

			setSubmissionProgress(70);
			setSubmissionStage("Preparing your matches...");

			// Stage 3: Success (70% - 100%)
			setSubmissionProgress(90);

			setSuccessState({
				show: true,
				matchesCount: response.matchesCount,
			});

			setSubmissionProgress(100);
			setSubmissionStage("Complete! Redirecting...");

			debugLogger.success("SUBMIT_SUCCESS", "Signup successful!", {
				email: response.email,
				userId: response.userId,
				matchCount: response.matchesCount,
			});

			// Save preferences for matches page before clearing form progress
			// This allows PremiumJobsPreview to access user preferences
			savePreferencesForMatches(formData as unknown as FormDataType);
			clearProgress();

			// Store timeout ref for cleanup
			redirectTimeoutRef.current = setTimeout(() => {
				debugLogger.step("REDIRECT", "Redirecting to matches page", {
					email: response.email,
					tier: "free",
				});
				submitTracker.complete("Form submission complete - redirecting", {
					redirectUrl: `/matches?tier=free&email=${response.email}`,
				});
				router.push(
					`/matches?tier=free&email=${encodeURIComponent(response.email)}`,
				);
			}, TIMING.REDIRECT_DELAY_MS);
		} catch (error) {
			debugLogger.error("SUBMIT_ERROR", "Error during submission", {
				errorType: error instanceof ApiError ? "ApiError" : typeof error,
				message: error instanceof Error ? error.message : String(error),
				status: error instanceof ApiError ? error.status : undefined,
			});
			submitTracker.error("Submission failed", {
				errorType: error instanceof ApiError ? "ApiError" : typeof error,
				message: error instanceof Error ? error.message : String(error),
			});

			setSubmissionProgress(0);
			setSubmissionStage("");

			// Enhanced error handling for debugging
			let errorMessage = "Unable to connect. Please check your internet connection and try again.";
			let errorDetails = {};

			if (error instanceof ApiError) {
				debugLogger.error("SUBMIT_API_ERROR", "API error details", {
					status: error.status,
					message: error.message,
					response: error.response,
				});
				errorMessage = error.message;

			// If it's a validation error, show the details
			if (error.status === 400 && error.response?.details) {
				debugLogger.error('SUBMIT_VALIDATION_ERROR', 'API Validation Error Details:', error.response.details);
				errorDetails = error.response.details;
				
				// Parse zod validation errors into user-friendly messages
				if (Array.isArray(error.response.details)) {
					const fieldErrors: Record<string, string> = {};
					error.response.details.forEach((detail: any) => {
						if (detail.path && detail.path.length > 0) {
							const fieldName = detail.path[0];
							fieldErrors[fieldName] = detail.message || "Invalid value";
						}
					});
					
					// Map API field names to form field names
					const mappedErrors: Record<string, string> = {};
					if (fieldErrors.full_name) mappedErrors.fullName = fieldErrors.full_name;
					if (fieldErrors.careerPath) mappedErrors.careerPath = fieldErrors.careerPath;
					if (fieldErrors.terms_accepted) mappedErrors.gdprConsent = fieldErrors.terms_accepted;
					if (fieldErrors.age_verified) mappedErrors.ageVerified = fieldErrors.age_verified;
					if (fieldErrors.visaStatus) mappedErrors.visaStatus = fieldErrors.visaStatus;
					if (fieldErrors.cities) mappedErrors.cities = fieldErrors.cities;
					
					setValidationErrors(mappedErrors);
					debugLogger.debug("SUBMIT_MAPPED_ERRORS", "Mapped error fields", mappedErrors);
					
					// Update error message to be more helpful
					const errorMessages = Object.values(mappedErrors);
					if (errorMessages.length > 0) {
						errorMessage = errorMessages[0];
					}
				}
				
				// Track validation errors in Sentry for monitoring
				Sentry.captureMessage("Free signup API validation error", {
					level: "warning",
					tags: { 
						endpoint: "signup-free", 
						error_type: "api_validation",
						status_code: error.status 
					},
					extra: {
						errorMessage,
						validationDetails: errorDetails,
						formData: {
							email: formData.email,
							fullName: formData.fullName,
							cities: formData.cities,
							citiesLength: formData.cities?.length,
							careerPath: formData.careerPath,
							careerPathLength: formData.careerPath?.length,
							gdprConsent: formData.gdprConsent,
							ageVerified: formData.ageVerified,
							termsAccepted: formData.gdprConsent, // Map to terms_accepted
							visaStatus: formData.visaStatus,
						},
						apiResponse: error.response,
					},
				});
				} else {
					// Track other API errors (network, server errors, etc.)
					Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
						tags: { 
							endpoint: "signup-free", 
							error_type: "api_error",
							status_code: error.status 
						},
						extra: {
							errorMessage,
							status: error.status,
							formData: {
								email: formData.email,
								fullName: formData.fullName,
								cities: formData.cities,
								citiesLength: formData.cities?.length,
								careerPath: formData.careerPath,
								careerPathLength: formData.careerPath?.length,
							},
							apiResponse: error.response,
						},
					});
				}
			} else {
				// Track unexpected errors (not ApiError instances)
				Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
					tags: { 
						endpoint: "signup-free", 
						error_type: "unexpected_error" 
					},
					extra: {
						errorMessage: String(error),
						formData: {
							email: formData.email,
							fullName: formData.fullName,
							cities: formData.cities,
							careerPath: formData.careerPath,
						},
					},
				});
			}

			debugLogger.error('SUBMIT_FINAL_ERROR', 'Signup submission error:', {
				error: error instanceof ApiError ? error.message : String(error),
				status: error instanceof ApiError ? error.status : undefined,
				details: errorDetails,
				formData: {
					email: formData.email,
					fullName: formData.fullName,
					cities: formData.cities,
					careerPath: formData.careerPath,
					gdprConsent: formData.gdprConsent
				}
			});

			setError(errorMessage);
			
			// Convert zod validation errors array to a proper string map
			// Ensure all values are strings to prevent React rendering errors
			const validationErrorsMap: Record<string, string> = { general: errorMessage };
			if (errorDetails && Array.isArray(errorDetails)) {
				errorDetails.forEach((detail: any) => {
					if (detail && typeof detail === 'object') {
						if (detail.path && Array.isArray(detail.path)) {
							const field = detail.path.join('.');
							const message = typeof detail.message === 'string' 
								? detail.message 
								: 'Invalid value';
							validationErrorsMap[field] = message;
						} else if (typeof detail.message === 'string') {
							// Handle case where detail is a simple object with message
							validationErrorsMap[detail.path || 'unknown'] = detail.message;
						}
					}
				});
			} else if (errorDetails && typeof errorDetails === 'object' && !Array.isArray(errorDetails)) {
				// If errorDetails is already an object, merge it properly but ensure all values are strings
				Object.entries(errorDetails).forEach(([key, value]) => {
					if (typeof value === 'string') {
						validationErrorsMap[key] = value;
					} else if (value && typeof value === 'object' && 'message' in value) {
						validationErrorsMap[key] = String((value as any).message || 'Invalid value');
					} else {
						validationErrorsMap[key] = String(value || 'Invalid value');
					}
				});
			}
			
			// Final safety check: ensure all values are strings
			const safeValidationErrors: Record<string, string> = {};
			Object.entries(validationErrorsMap).forEach(([key, value]) => {
				safeValidationErrors[key] = typeof value === 'string' ? value : String(value || '');
			});
			
			setValidationErrors(safeValidationErrors);
			showToast.error(errorMessage);
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
	}, [
		loading,
		formData,
		router,
		setLoading,
		setError,
		setSuccessState,
		clearProgress,
		emailValidation,
	]);

	// Helper functions
	const shouldShowError = useCallback(
		(_fieldName: string, hasValue: boolean, isValid: boolean) => {
			return hasValue && !isValid;
		},
		[],
	);

	const getDisabledMessage = useCallback(
		(stepNumber: number) => {
			switch (stepNumber) {
				case 1:
					return !formData.fullName.trim() ||
						!formData.email.trim() ||
						!emailValidation.isValid
						? "Enter your details"
						: "Continue";
				case 2:
					return formData.cities.length === 0 ? "Select cities" : "Continue";
				default:
					return "Continue";
			}
		},
		[formData, emailValidation],
	);

	return (
		<div className="min-h-screen bg-black relative overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]">
			{/* Background Effects - Simplified for mobile */}
			<div
				className="absolute inset-0 enhanced-grid opacity-30 pointer-events-none"
				aria-hidden="true"
			/>
			{/* Remove performance-killing infinite animation */}
			<div
				className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block opacity-30 pointer-events-none"
				aria-hidden="true"
			/>

			{/* Hero Section */}
			<HeroSectionFree
				activeJobs={activeJobs}
				totalUsers={totalUsers}
				isLoadingStats={isLoadingStats}
			/>

			{/* Progress Bar */}
			<div className="sticky top-[-1px] z-40 bg-black/90 backdrop-blur-md border-b border-white/10 mb-6 shadow-lg">
				<div className="h-1.5 bg-zinc-800/80 relative overflow-hidden">
					<motion.div
						className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
						initial={{ width: 0 }}
						animate={{ width: `${(step / 3) * 100}%` }}
						transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
					/>
				</div>
			</div>

			{/* Form Steps Container */}
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="w-full max-w-2xl">
					{/* Enhanced Submission Progress with Loading States */}
					{isSubmitting && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
						>
							<div className="bg-slate-900/95 border border-white/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
								{/* Animated loading spinner */}
								<div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6"></div>

								<h3 className="text-xl font-bold text-white mb-2">
									{submissionStage || "Processing..."}
								</h3>
								<p className="text-zinc-300 text-sm mb-6">
									We're finding your perfect matches across Europe
								</p>

								{/* Enhanced progress bar */}
								<div className="space-y-3">
									<div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
										<div
											className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
											style={{ width: `${submissionProgress}%` }}
										></div>
									</div>
									<p className="text-xs text-zinc-400">
										{submissionProgress}% complete
									</p>
								</div>

								{/* Animated dots */}
								<div className="flex justify-center gap-1 mt-4">
									<div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
									<div
										className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.1s" }}
									></div>
									<div
										className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}
									></div>
								</div>
							</div>
						</motion.div>
					)}

					{/* Form Validation Errors */}
					{/* Only show errors if mounted, not currently submitting, and errors are relevant to current step */}
					{isMounted && Object.keys(validationErrors).length > 0 && !isSubmitting && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
						>
							<div className="flex items-start gap-3">
								<div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center mt-0.5">
									<span className="text-red-400 text-sm">⚠️</span>
								</div>
								<div>
									<h4 className="text-red-400 font-medium mb-2">
										Please check your information:
									</h4>
									<ul className="space-y-1">
										{Object.entries(validationErrors)
											.filter(([_, error]) => error && typeof error === 'string')
											.map(([field, error]) => (
												<li
													key={field}
													className="text-red-300 text-sm flex items-center gap-2"
												>
													<span className="w-1 h-1 bg-red-400 rounded-full"></span>
													{error as string}
												</li>
											))}
									</ul>
								</div>
							</div>
						</motion.div>
					)}

					{/* Step content */}
					<div className="text-white text-center">
						{step === 1 && (
							<Step1FreeBasics
								key="step1"
								formData={formData}
								setFormData={setFormData}
								touchedFields={new Set()}
								setTouchedFields={() => {}}
								fieldErrors={{}}
								setFieldErrors={() => {}}
								announce={announce}
								loading={loading}
								setStep={navigation.navigateToStep}
								emailValidation={emailValidation}
								shouldShowError={shouldShowError}
								getDisabledMessage={getDisabledMessage}
							/>
						)}
						{step === 2 && (
							<Step2FreeCities
								key="step2"
								formData={formData}
								setFormData={setFormData}
								touchedFields={touchedFields}
								setTouchedFields={setTouchedFields}
								loading={loading}
								setStep={navigation.navigateToStep}
							/>
						)}
						{step === 3 && (
							<Step3FreeCareer
								key="step3"
								formData={formData}
								setFormData={setFormData}
								touchedFields={new Set()}
								setTouchedFields={() => {}}
								loading={loading}
								setStep={navigation.navigateToStep}
								handleSubmit={handleSubmit}
							/>
						)}
					</div>
				</div>
			</div>

			{/* Trust Signals */}
			<TrustSignals activeJobs={activeJobs} isLoadingStats={isLoadingStats} />

			{/* Announcement for screen readers */}
			{Announcement}
		</div>
	);
}

export default function SignupFormFreeWrapper() {
	return (
		<ErrorBoundary>
			<Suspense
				fallback={
					<PageLoading
						title="Finding your perfect matches"
						subtitle="This takes just a moment..."
					/>
				}
			>
				<SignupFormFree />
			</Suspense>
		</ErrorBoundary>
	);
}
