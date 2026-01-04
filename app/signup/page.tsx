"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CAREER_PATHS, COMPANIES } from "@/components/signup/constants";
import { HeroSection } from "@/components/signup/HeroSection";
import { ProgressBar } from "@/components/signup/ProgressBar";
import { Step1Basics } from "@/components/signup/Step1Basics";
import { Step2Preferences } from "@/components/signup/Step2Preferences";
import { Step3CareerPath } from "@/components/signup/Step3CareerPath";
import { Step4MatchingPreferences } from "@/components/signup/Step4MatchingPreferences";
import { TrustSignals } from "@/components/signup/TrustSignals";
import { useAriaAnnounce } from "@/components/ui/AriaLiveRegion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import EntryLevelSelector from "@/components/ui/EntryLevelSelector";
import {
	FormFieldError,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import WorkEnvironmentSelector from "@/components/ui/WorkEnvironmentSelector";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
	useEmailValidation,
	useRequiredValidation,
} from "@/hooks/useFormValidation";
import { ApiError, apiCall, apiCallJson } from "@/lib/api-client";
import { TIMING } from "@/lib/constants";
import { logger } from "@/lib/monitoring";
import { showToast } from "@/lib/toast";

function SignupForm() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Initialize step from URL or default to 1
	const initialStep = useRef<number | null>(null);
	if (initialStep.current === null) {
		const urlStep = searchParams.get("step");
		initialStep.current = urlStep
			? Math.max(1, Math.min(4, parseInt(urlStep, 10)))
			: 1;
	}

	const [step, setStep] = useState(initialStep.current);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
	const [successState, setSuccessState] = useState<{
		show: boolean;
		matchesCount?: number;
	}>({ show: false });
	const [activeJobs, setActiveJobs] = useState("Updating…");
	const [totalUsers, setTotalUsers] = useState("");
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [_statsStale, setStatsStale] = useState(true);
	const prefersReduced = useReducedMotion();
	const { announce, Announcement } = useAriaAnnounce();
	const formRefs = {
		fullName: useRef<HTMLInputElement>(null),
		email: useRef<HTMLInputElement>(null),
	};

	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		cities: [] as string[],
		languages: [] as string[],
		workEnvironment: [] as string[],
		visaStatus: "",
		entryLevelPreferences: [] as string[], // Changed to array for multiple selections
		targetCompanies: [] as string[],
		careerPath: "",
		roles: [] as string[],
		// NEW FIELDS FOR BETTER MATCHING
		industries: [] as string[],
		companySizePreference: "",
		skills: [] as string[],
		careerKeywords: "", // NEW: Free-form career keywords
		gdprConsent: false, // GDPR: Must explicitly agree
	});

	// Form persistence hook - saves progress and offers to restore
	const { clearProgress } = useFormPersistence(
		step,
		formData,
		setFormData,
		setStep,
	);

	useEffect(() => {
		const normalize = (value: unknown): number => {
			if (typeof value === "number" && !Number.isNaN(value)) return value;
			if (typeof value === "string") {
				const numeric = Number(value.replace(/,/g, ""));
				if (!Number.isNaN(numeric)) return numeric;
			}
			return 0;
		};

		apiCallJson<{
			activeJobs?: number;
			activeJobsFormatted?: string;
			totalUsers?: number;
			totalUsersFormatted?: string;
		}>("/api/stats")
			.then((data) => {
				if (!data) {
					setActiveJobs("~12,000");
					setTotalUsers("3,400");
					setStatsStale(true);
					return;
				}

				const activeValue = normalize(
					data.activeJobs ?? data.activeJobsFormatted,
				);
				const totalValue = normalize(
					data.totalUsers ?? data.totalUsersFormatted,
				);
				const hasFreshStats = activeValue > 0 && totalValue > 0;

				setActiveJobs(
					hasFreshStats ? activeValue.toLocaleString("en-US") : "~12,000",
				);
				setTotalUsers(
					hasFreshStats ? totalValue.toLocaleString("en-US") : "3,400",
				);
				setStatsStale(!hasFreshStats);
			})
			.catch((err) => {
				logger.error("Failed to fetch stats", {
					error: err,
					component: "signup-stats",
					metadata: {
						fallbackValues: { activeJobs: "~12,000", totalUsers: "3,400" },
					},
				});
				setActiveJobs("~12,000");
				setTotalUsers("3,400");
				setStatsStale(true);
			})
			.finally(() => setIsLoadingStats(false));
	}, []);

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);
	const nameValidation = useRequiredValidation(formData.fullName, "Full name");
	const citiesValidation = useRequiredValidation(
		formData.cities,
		"Preferred cities",
	);
	const languagesValidation = useRequiredValidation(
		formData.languages,
		"Languages",
	);

	// Step validation - checks if a step is complete and valid
	const isStepValid = useCallback(
		(stepNumber: number): boolean => {
			// Step 1 validation
			const step1Valid =
				formData.fullName.trim() !== "" &&
				formData.email.trim() !== "" &&
				emailValidation.isValid &&
				formData.cities.length > 0 &&
				formData.languages.length > 0 &&
				formData.gdprConsent;

			switch (stepNumber) {
				case 1:
					return step1Valid;
				case 2:
					return (
						step1Valid &&
						!!formData.visaStatus &&
						formData.entryLevelPreferences.length > 0
					);
				case 3:
					return (
						step1Valid &&
						!!formData.visaStatus &&
						formData.entryLevelPreferences.length > 0 &&
						!!formData.careerPath &&
						formData.roles.length > 0
					);
				case 4:
					return (
						step1Valid &&
						!!formData.visaStatus &&
						formData.entryLevelPreferences.length > 0 &&
						!!formData.careerPath &&
						formData.roles.length > 0
					); // Step 4 is optional, but requires previous steps
				default:
					return false;
			}
		},
		[
			formData.fullName,
			formData.email,
			formData.cities,
			formData.languages,
			formData.gdprConsent,
			formData.visaStatus,
			formData.entryLevelPreferences,
			formData.careerPath,
			formData.roles,
			emailValidation.isValid,
		],
	);

	// Step navigation guard - determines if user can navigate to a target step
	const canNavigateTo = useCallback(
		(targetStep: number): boolean => {
			// Can always go backwards
			if (targetStep < step) return true;

			// Can only go forwards if current step is valid
			if (targetStep > step) {
				return isStepValid(step);
			}

			return true; // Same step
		},
		[step, isStepValid],
	);

	// Safe step navigation with validation
	const navigateToStep = useCallback(
		(targetStep: number) => {
			if (!canNavigateTo(targetStep)) {
				// Find first invalid field in current step and focus it
				let firstErrorField: HTMLElement | null = null;

				if (step === 1) {
					if (!formData.fullName.trim()) {
						firstErrorField = formRefs.fullName.current;
					} else if (!formData.email.trim() || !emailValidation.isValid) {
						firstErrorField = formRefs.email.current;
					} else if (formData.cities.length === 0) {
						firstErrorField = document.getElementById("cities-field");
					} else if (formData.languages.length === 0) {
						firstErrorField = document.getElementById("languages-field");
					} else if (!formData.gdprConsent) {
						firstErrorField = document.getElementById("gdpr-consent");
					}
				} else if (step === 2) {
					if (!formData.visaStatus) {
						firstErrorField = document.getElementById("visa-field");
					} else if (formData.entryLevelPreferences.length === 0) {
						firstErrorField = document.getElementById("entry-level-field");
					}
				} else if (step === 3) {
					if (!formData.careerPath) {
						firstErrorField = document.getElementById("career-path-field");
					} else if (formData.roles.length === 0) {
						firstErrorField = document.getElementById("roles-field");
					}
				}

				if (firstErrorField) {
					firstErrorField.focus();
					firstErrorField.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
					announce(
						"Please complete all required fields before continuing",
						"assertive",
					);
				}
				return;
			}

			// Update step state
			setStep(targetStep);

			// Update URL with proper history management
			const url = new URL(window.location.href);
			url.searchParams.set("step", targetStep.toString());

			if (targetStep > step) {
				// Forward navigation - add to history (allows back button to work)
				router.push(url.toString());
			} else {
				// Backward navigation - replace to avoid cluttering history
				window.history.replaceState({ step: targetStep }, "", url.toString());
			}
		},
		[
			canNavigateTo,
			step,
			formData,
			emailValidation.isValid,
			announce,
			router,
			formRefs.email.current,
			formRefs.fullName.current,
		],
	);

	const handleSubmit = useCallback(async () => {
		// CRITICAL FIX: Loading lock - prevent spam-clicking and duplicate submissions
		if (loading) {
			return; // Already submitting, ignore additional clicks
		}

		// Validate form before submitting
		if (
			!formData.fullName.trim() ||
			!formData.email.trim() ||
			!emailValidation.isValid ||
			formData.cities.length === 0 ||
			formData.languages.length === 0 ||
			!formData.gdprConsent ||
			(step === 2 &&
				(!formData.visaStatus ||
					formData.entryLevelPreferences.length === 0)) ||
			(step === 3 && (!formData.careerPath || formData.roles.length === 0))
		) {
			// Find first invalid field and focus it
			const firstErrorField = !formData.fullName.trim()
				? formRefs.fullName.current
				: !formData.email.trim() || !emailValidation.isValid
					? formRefs.email.current
					: formData.cities.length === 0
						? document.getElementById("cities-field")
						: formData.languages.length === 0
							? document.getElementById("languages-field")
							: !formData.gdprConsent
								? document.getElementById("gdpr-consent")
								: step === 2 && !formData.visaStatus
									? document.getElementById("visa-field")
									: step === 2 && formData.entryLevelPreferences.length === 0
										? document.getElementById("entry-level-field")
										: step === 3 && !formData.careerPath
											? document.getElementById("career-path-field")
											: step === 3 && formData.roles.length === 0
												? document.getElementById("roles-field")
												: null;

			if (firstErrorField) {
				firstErrorField.focus();
				// Fallback scrollIntoView for browsers that don't support scroll-margin
				firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return;
		}

		setLoading(true);
		setError("");
		setFieldErrors({});

		try {
			const response = await apiCall("/api/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...formData, tier: "premium" }),
			});

			const result = await response.json();

			if (response.ok) {
				// Clear saved progress immediately after successful API response, before redirect
				// This prevents "Resume Signup" loop if success page crashes
				clearProgress();
				// Show success state before redirect
				setSuccessState({ show: true, matchesCount: result.matchesCount || 0 });
				showToast.success("Account created successfully! Redirecting...");
				const redirectUrl =
					result.redirectUrl || `/signup/success?tier=premium`;
				setTimeout(() => router.push(redirectUrl), TIMING.REDIRECT_DELAY_MS);
			} else {
				// Handle field-specific errors
				if (result.field && result.error) {
					setFieldErrors({ [result.field]: result.error });
					// Focus the problematic field
					if (result.field === "email" && formRefs.email.current) {
						formRefs.email.current.focus();
						navigateToStep(1); // Navigate to step with the field
					} else if (result.field === "fullName" && formRefs.fullName.current) {
						formRefs.fullName.current.focus();
						navigateToStep(1);
					}
					announce(result.error, "assertive");
				} else {
					const errorMessage =
						result.error ||
						"Unable to create account. Please check that your email is correct and try again. If the problem persists, contact support.";
					setError(errorMessage);
					showToast.error(errorMessage, {
						label: "Retry",
						onClick: () => handleSubmit(),
					});
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Unable to connect. Please check your internet connection and try again.";
			setError(errorMessage);
			showToast.error(errorMessage, {
				label: "Retry",
				onClick: () => handleSubmit(),
			});
		} finally {
			setLoading(false);
		}
	}, [
		loading,
		formData,
		router,
		announce,
		formRefs.email,
		formRefs.fullName,
		emailValidation.isValid,
		step,
		clearProgress,
		navigateToStep,
	]);

	// Keyboard shortcuts for power users
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl/Cmd + Enter to submit
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				if (step === 4 && formData.gdprConsent && !loading) {
					handleSubmit();
				}
			}
			// Escape to go back (with validation - can always go back)
			if (e.key === "Escape" && step > 1) {
				e.preventDefault();
				navigateToStep(step - 1);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [step, formData.gdprConsent, loading, handleSubmit, navigateToStep]);

	// Announce validation errors to screen readers
	useEffect(() => {
		if (emailValidation.error) {
			announce(emailValidation.error, "assertive");
		}
	}, [emailValidation.error, announce]);

	// Sync step state with URL query parameter (one-way: step -> URL)
	// Note: This effect only handles initial mount and external URL changes
	// Actual navigation is handled in navigateToStep to properly manage history
	useEffect(() => {
		// Only update URL if we're in the browser (client-side)
		if (typeof window === "undefined") return;

		const url = new URL(window.location.href);
		const currentStepParam = url.searchParams.get("step");
		const currentStep = currentStepParam
			? Math.max(1, Math.min(4, parseInt(currentStepParam, 10)))
			: null;

		// Only update URL if step changed and doesn't match URL (avoid unnecessary updates)
		// This handles cases where step changes outside of navigateToStep (e.g., form persistence restore)
		if (currentStep !== step && currentStep !== null) {
			// If URL has a different step, sync it (but don't add to history - that's handled by navigateToStep)
			url.searchParams.set("step", step.toString());
			window.history.replaceState({ step }, "", url.toString());
		}
	}, [step]);

	// Hardware back button handling - sync step from URL on browser navigation
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handlePopState = (_e: PopStateEvent) => {
			const url = new URL(window.location.href);
			const urlStep = url.searchParams.get("step");

			if (urlStep) {
				const parsedStep = Math.max(1, Math.min(4, parseInt(urlStep, 10)));
				// Only navigate if step actually changed (prevents loops)
				if (parsedStep !== step) {
					// Browser navigation - URL already changed, just sync step state
					// Backward navigation always allowed, forward requires validation
					if (parsedStep < step) {
						// Going back - always allowed, just update state
						setStep(parsedStep);
					} else {
						// Going forward - use navigateToStep to respect validation
						// But don't update URL (it's already correct from browser)
						if (canNavigateTo(parsedStep)) {
							setStep(parsedStep);
						} else {
							// Can't go forward - revert URL to current step
							const currentUrl = new URL(window.location.href);
							currentUrl.searchParams.set("step", step.toString());
							window.history.replaceState({ step }, "", currentUrl.toString());
						}
					}
				}
			} else if (step > 1) {
				// If no step param but we're past step 1, go back to step 1
				setStep(1);
			}
		};

		// Initialize URL with current step on mount
		const url = new URL(window.location.href);
		if (!url.searchParams.has("step")) {
			url.searchParams.set("step", step.toString());
			window.history.replaceState({ step }, "", url.toString());
		}

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [step, canNavigateTo]);

	const toggleArray = (arr: string[], value: string) => {
		return arr.includes(value)
			? arr.filter((v) => v !== value)
			: [...arr, value];
	};

	// Helper to determine if field error should be shown
	const shouldShowError = (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => {
		return (touchedFields.has(fieldName) || step === 1) && hasValue && !isValid;
	};

	// Helper to get disabled button message
	const getDisabledMessage = (stepNumber: number) => {
		if (stepNumber === 1) {
			const missing = [];
			if (!formData.fullName.trim()) missing.push("Full Name");
			if (!formData.email.trim() || !emailValidation.isValid)
				missing.push("Email");
			if (formData.cities.length === 0) missing.push("Preferred Cities");
			if (formData.languages.length === 0) missing.push("Languages");
			if (!formData.gdprConsent) missing.push("GDPR Consent");
			if (missing.length === 0) return "Continue to Preferences →";
			return `Complete: ${missing.join(", ")}`;
		} else if (stepNumber === 2) {
			const missing = [];
			if (!formData.visaStatus) missing.push("Visa Sponsorship");
			if (formData.entryLevelPreferences.length === 0)
				missing.push("Role Type");
			if (missing.length === 0) return "Continue to Career Path →";
			return `Complete: ${missing.join(", ")}`;
		} else if (stepNumber === 3) {
			const missing = [];
			if (!formData.careerPath) missing.push("Career Path");
			if (formData.roles.length === 0) missing.push("Role Selection");
			if (missing.length === 0) return "Complete Signup";
			return `Complete: ${missing.join(", ")}`;
		}
		return "";
	};

	const selectAllRoles = (careerPath: string) => {
		const career = CAREER_PATHS.find((c) => c.value === careerPath);
		if (career) {
			setFormData({ ...formData, roles: career.roles });
		}
	};

	const clearAllRoles = () => {
		setFormData({ ...formData, roles: [] });
	};

	return (
		<div className="min-h-screen bg-black relative overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]">
			{/* Background Effects */}
			<div
				className="absolute inset-0 enhanced-grid opacity-30"
				aria-hidden="true"
			/>
			<motion.div
				className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block"
				animate={
					prefersReduced
						? { scale: 1, opacity: 0.3 }
						: { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }
				}
				transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
				aria-hidden="true"
			/>
			<motion.div
				className="absolute bottom-20 left-10 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl hidden sm:block"
				animate={
					prefersReduced
						? { scale: 1, opacity: 0.3 }
						: { scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }
				}
				transition={{ duration: 10, repeat: prefersReduced ? 0 : Infinity }}
				aria-hidden="true"
			/>

			<div className="relative z-10 container-page max-w-5xl py-4 px-4 sm:py-8 sm:px-6 md:py-16">
				<HeroSection
					activeJobs={activeJobs}
					totalUsers={totalUsers}
					isLoadingStats={isLoadingStats}
				/>

				<ProgressBar step={step} />

				{/* Form Abandonment Recovery Message */}

				{/* Success Message */}
				<AnimatePresence>
					{successState.show && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-6 p-6 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 border-2 border-green-500/50 rounded-xl text-center"
							role="alert"
							aria-live="assertive"
						>
							<div className="flex items-center justify-center gap-3 mb-2">
								<BrandIcons.Check className="h-6 w-6 text-green-400" />
								<h3 className="text-xl font-bold text-green-400">
									Account Created Successfully!
								</h3>
							</div>
							<p className="text-green-300 text-base mb-2">
								{successState.matchesCount && successState.matchesCount > 0
									? `🎯 We found ${successState.matchesCount} perfect matches for you!`
									: "🎯 We're finding your perfect matches now..."}
							</p>
							<p className="text-green-200 text-sm">
								Check your email in the next few minutes for your first job
								matches.
							</p>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Error Message */}
				<AnimatePresence>
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-center"
							role="alert"
							aria-live="assertive"
						>
							{error}
						</motion.div>
					)}
				</AnimatePresence>

				{/* ARIA Live Region for form validation */}
				{Announcement}

				{/* Form Container */}
				<div className="glass-card rounded-2xl sm:rounded-3xl border-2 border-white/20 p-4 sm:p-6 md:p-8 lg:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
					<AnimatePresence mode="wait">
						{step === 1 && (
							<Step1Basics
								key="step1"
								formData={formData}
								setFormData={setFormData}
								touchedFields={touchedFields}
								setTouchedFields={setTouchedFields}
								fieldErrors={fieldErrors}
								setFieldErrors={setFieldErrors}
								announce={announce}
								loading={loading}
								setStep={navigateToStep}
								emailValidation={emailValidation}
								nameValidation={nameValidation}
								citiesValidation={citiesValidation}
								languagesValidation={languagesValidation}
								shouldShowError={shouldShowError}
								getDisabledMessage={getDisabledMessage}
								toggleArray={toggleArray}
							/>
						)}

						{step === 2 && (
							<Step2Preferences
								key="step2"
								formData={formData}
								setFormData={setFormData}
								touchedFields={touchedFields}
								setTouchedFields={setTouchedFields}
								loading={loading}
								setStep={navigateToStep}
								shouldShowError={shouldShowError}
								getDisabledMessage={getDisabledMessage}
								toggleArray={toggleArray}
							/>
					)}

					{step === 3 && (
							<motion.div
								key="step2-old"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="relative"
							>
								<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#12002b]/40 to-brand-700/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
									<div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl hidden sm:block" />
									<div className="pointer-events-none absolute -bottom-28 left-12 h-56 w-56 bg-brand-700/20 blur-[120px] hidden sm:block" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,106,255,0.15),transparent_55%)]" />
									<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
										<div>
											<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
												Your preferences
											</h2>
											<p className="text-base sm:text-lg font-medium text-zinc-100">
												Help us match you perfectly
											</p>
											<p className="text-sm font-medium text-zinc-300 mt-2">
												These fields improve the quality of your first 5 jobs.
											</p>

											{/* Progress Helper */}
											<div className="mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-700/10 to-brand-500/10 p-4 shadow-glow-subtle">
												<h3 className="text-sm font-bold text-white/80 mb-2">
													Required for next step:
												</h3>
												<div className="space-y-1 text-sm">
													<div
														className={`flex items-center gap-2 ${formData.visaStatus ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.visaStatus ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Visa Status
													</div>
													<div
														className={`flex items-center gap-2 ${formData.entryLevelPreferences.length > 0 ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.entryLevelPreferences.length > 0 ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Role Type ({formData.entryLevelPreferences.length}
														/1+ selected)
													</div>
												</div>
											</div>
										</div>

										<div>
											<label className="block text-base font-bold text-white mb-3">
												Work Environment
											</label>
											<p className="text-sm text-zinc-200 mb-4">
												Where would you like to work?
											</p>
											<WorkEnvironmentSelector
												selected={formData.workEnvironment}
												onChange={(env) =>
													setFormData({
														...formData,
														workEnvironment: toggleArray(
															formData.workEnvironment,
															env,
														),
													})
												}
											/>
										</div>

										<div>
											<label
												id="visa-label"
												htmlFor="visa-field"
												className="block text-base font-bold text-white mb-3"
											>
												Do you require visa sponsorship? *
											</label>
											<p className="text-sm text-zinc-200 mb-3">
												We ask this so we can filter for companies that provide
												visa sponsorship for your specific region
											</p>
											<div
												id="visa-field"
												role="group"
												aria-labelledby="visa-label"
												aria-describedby={
													shouldShowError(
														"visaStatus",
														!!formData.visaStatus,
														!!formData.visaStatus,
													)
														? "visa-error"
														: undefined
												}
												className="space-y-2"
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("visaStatus"),
													)
												}
											>
												{[
													"EU citizen",
													"EEA citizen (Iceland, Liechtenstein, Norway)",
													"Swiss citizen",
													"UK citizen",
													"Dual EU & UK citizenship",
													"Student Visa (EU)",
													"Student Visa (Non-EU)",
													"Non-EU (require sponsorship)",
													"Non-UK (require sponsorship)",
												].map((visa) => (
													<motion.button
														key={visa}
														type="button"
														onClick={() => {
															setFormData({ ...formData, visaStatus: visa });
															setTouchedFields((prev) =>
																new Set(prev).add("visaStatus"),
															);
														}}
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
														className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 transition-all font-medium text-left touch-manipulation min-h-[48px] ${
															formData.visaStatus === visa
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
																: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
														}`}
													>
														{visa}
													</motion.button>
												))}
											</div>
											{shouldShowError(
												"visaStatus",
												!formData.visaStatus,
												!!formData.visaStatus,
											) && (
												<FormFieldError
													error="Please select whether you require visa sponsorship"
													id="visa-error"
												/>
											)}
										</div>

										<div>
											<label
												id="entry-level-label"
												htmlFor="entry-level-field"
												className="block text-base font-bold text-white mb-3"
											>
												What type of roles are you looking for? *
											</label>
											<p className="text-sm text-zinc-200 mb-4">
												Select the experience levels you're interested in
												(internships, graduate roles, junior positions)
											</p>
											<div
												id="entry-level-field"
												aria-labelledby="entry-level-label"
												aria-describedby={
													shouldShowError(
														"entryLevelPreferences",
														formData.entryLevelPreferences.length > 0,
														formData.entryLevelPreferences.length > 0,
													)
														? "entry-level-error"
														: formData.entryLevelPreferences.length > 0
															? "entry-level-success"
															: undefined
												}
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("entryLevelPreferences"),
													)
												}
											>
												<EntryLevelSelector
													selected={formData.entryLevelPreferences}
													onChange={(pref) => {
														setFormData({
															...formData,
															entryLevelPreferences: toggleArray(
																formData.entryLevelPreferences,
																pref,
															),
														});
														setTouchedFields((prev) =>
															new Set(prev).add("entryLevelPreferences"),
														);
													}}
												/>
											</div>
											{formData.entryLevelPreferences.length > 0 && (
												<>
													<FormFieldSuccess
														message={`${formData.entryLevelPreferences.length} preference${formData.entryLevelPreferences.length > 1 ? "s" : ""} selected`}
														id="entry-level-success"
													/>
													<p className="text-sm text-zinc-200 mt-2">
														<span className="font-bold text-brand-200">
															{formData.entryLevelPreferences.length}
														</span>{" "}
														selected
													</p>
												</>
											)}
											{shouldShowError(
												"entryLevelPreferences",
												formData.entryLevelPreferences.length === 0,
												formData.entryLevelPreferences.length > 0,
											) && (
												<FormFieldError
													error="Please select at least one entry level preference"
													id="entry-level-error"
												/>
											)}
										</div>

										<div>
											<label className="block text-base font-bold text-white mb-3">
												Target Companies
											</label>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{COMPANIES.map((company) => (
													<motion.button
														key={company}
														type="button"
														onClick={() =>
															setFormData({
																...formData,
																targetCompanies: toggleArray(
																	formData.targetCompanies,
																	company,
																),
															})
														}
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
														className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-left text-sm ${
															formData.targetCompanies.includes(company)
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white"
																: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
														}`}
													>
														{company}
													</motion.button>
												))}
											</div>
										</div>

										{/* Spacer for sticky button */}
										<div className="h-32 sm:h-0" aria-hidden="true" />

										{/* Sticky Submit Button */}
										<div className="sticky bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
											<div className="flex gap-3 sm:gap-4">
												<motion.button
													type="button"
													onClick={() => setStep(1)}
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
													className="flex-1 py-4 sm:py-5 text-base sm:text-lg font-bold border-2 border-white/25 bg-white/[0.08] text-white rounded-xl sm:rounded-2xl hover:border-brand-500/50 hover:bg-white/12 transition-all touch-manipulation min-h-[56px]"
												>
													← Back
												</motion.button>
												<motion.button
													type="button"
													onClick={() => setStep(3)}
													disabled={
														loading ||
														!formData.visaStatus ||
														formData.entryLevelPreferences.length === 0
													}
													whileHover={{ scale: loading ? 1 : 1.02 }}
													whileTap={{ scale: loading ? 1 : 0.98 }}
													className={`relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden transition-all touch-manipulation min-h-[56px] ${
														loading ||
														!formData.visaStatus ||
														formData.entryLevelPreferences.length === 0
															? "opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-400"
															: "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] hover:scale-105"
													}`}
												>
													{loading ? (
														<span className="flex items-center justify-center gap-2">
															<svg
																className="w-5 h-5 animate-spin"
																viewBox="0 0 24 24"
																fill="none"
															>
																<circle
																	className="opacity-25"
																	cx="12"
																	cy="12"
																	r="10"
																	stroke="currentColor"
																	strokeWidth="4"
																/>
																<path
																	className="opacity-75"
																	fill="currentColor"
																	d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																/>
															</svg>
															Loading...
														</span>
													) : (
														getDisabledMessage(2)
													)}
												</motion.button>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{step === 3 && (
							<Step3CareerPath
								key="step3"
								formData={formData}
								setFormData={setFormData}
								touchedFields={touchedFields}
								setTouchedFields={setTouchedFields}
								loading={loading}
								setStep={navigateToStep}
								shouldShowError={shouldShowError}
								getDisabledMessage={getDisabledMessage}
								toggleArray={toggleArray}
								selectAllRoles={selectAllRoles}
								clearAllRoles={clearAllRoles}
							/>
					)}

					{step === 4 && (
							<motion.div
								key="step3-old"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="relative"
							>
								<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#130433]/45 to-brand-700/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
									<div className="pointer-events-none absolute -top-24 left-6 h-48 w-48 rounded-full bg-brand-700/25 blur-3xl hidden sm:block" />
									<div className="pointer-events-none absolute -bottom-28 right-0 h-56 w-56 bg-brand-500/25 blur-[120px] hidden sm:block" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_60%)]" />
									<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
										<div>
											<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
												Your career path
											</h2>
											<p className="text-base sm:text-lg font-medium text-zinc-100">
												What type of roles interest you?
											</p>

											{/* Progress Helper */}
											<div className="mt-6 rounded-2xl border-2 border-brand-500/40 bg-gradient-to-r from-brand-500/15 via-brand-700/15 to-brand-500/15 p-5 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
												<h3 className="text-sm font-bold text-white/80 mb-2">
													Required for next step:
												</h3>
												<div className="space-y-1 text-sm">
													<div
														className={`flex items-center gap-2 ${formData.careerPath ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.careerPath ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Career Path Selection
													</div>
													<div
														className={`flex items-center gap-2 ${formData.roles.length > 0 ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.roles.length > 0 ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Role Selection ({formData.roles.length}/1+ selected)
													</div>
												</div>
											</div>
										</div>

										<div>
											<label
												id="career-path-label"
												htmlFor="career-path-field"
												className="block text-base font-bold text-white mb-4"
											>
												Select Your Career Path *
											</label>
											<p className="text-sm text-zinc-400 mb-6">
												Choose the career path that interests you most
											</p>
											<div
												id="career-path-field"
												role="group"
												aria-labelledby="career-path-label"
												aria-describedby={
													shouldShowError(
														"careerPath",
														!!formData.careerPath,
														!!formData.careerPath,
													)
														? "career-path-error"
														: undefined
												}
												className="grid grid-cols-1 sm:grid-cols-2 gap-4"
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("careerPath"),
													)
												}
											>
												{CAREER_PATHS.map((path) => (
													<motion.button
														key={path.value}
														type="button"
														onClick={() => {
															const newCareer = CAREER_PATHS.find(
																(c) => c.value === path.value,
															);
															if (newCareer) {
																const validRoles = formData.roles.filter(
																	(role) => newCareer.roles.includes(role),
																);
																setFormData({
																	...formData,
																	careerPath: path.value,
																	roles: validRoles,
																});
															}
														}}
														whileHover={{ scale: 1.02, y: -3 }}
														whileTap={{ scale: 0.98 }}
														className={`relative px-4 sm:px-6 py-4 sm:py-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left overflow-hidden group touch-manipulation min-h-[80px] sm:min-h-[100px] ${
															formData.careerPath === path.value
																? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-brand-700/15 shadow-glow-signup"
																: "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
														}`}
													>
														{/* Background gradient on select */}
														{formData.careerPath === path.value && (
															<motion.div
																className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-brand-700/5"
																initial={{ opacity: 0 }}
																animate={{ opacity: 1 }}
																transition={{ duration: 0.3 }}
															/>
														)}

														<div className="relative flex items-start gap-4">
															{/* Large emoji icon */}
															<motion.div
																className={`text-4xl sm:text-5xl ${
																	formData.careerPath === path.value
																		? "scale-110"
																		: ""
																}`}
																animate={
																	formData.careerPath === path.value
																		? { scale: 1.1 }
																		: { scale: 1 }
																}
																transition={{ duration: 0.2 }}
															>
																{path.emoji}
															</motion.div>

															{/* Content */}
															<div className="flex-1 min-w-0">
																<div
																	className={`font-bold text-lg mb-1 ${
																		formData.careerPath === path.value
																			? "text-white"
																			: "text-zinc-200"
																	}`}
																>
																	{path.label}
																</div>
																<div className="flex items-center gap-2 text-xs text-zinc-400">
																	<BrandIcons.Briefcase className="w-3.5 h-3.5" />
																	<span>
																		{path.roles.length} roles available
																	</span>
																</div>
															</div>

															{/* Selection indicator */}
															{formData.careerPath === path.value && (
																<motion.div
																	initial={{ scale: 0, rotate: -180 }}
																	animate={{ scale: 1, rotate: 0 }}
																	className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-glow-subtle"
																>
																	<BrandIcons.Check className="w-5 h-5 text-white" />
																</motion.div>
															)}
														</div>

														{/* Glow effect on hover */}
														{formData.careerPath !== path.value && (
															<div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-700/0 group-hover:from-brand-500/5 group-hover:to-brand-700/5 transition-all duration-300" />
														)}
													</motion.button>
												))}
											</div>
											{shouldShowError(
												"careerPath",
												!formData.careerPath,
												!!formData.careerPath,
											) && (
												<FormFieldError
													error="Please select a career path"
													id="career-path-error"
												/>
											)}
										</div>

										{(() => {
											const selectedCareer = CAREER_PATHS.find(
												(c) => c.value === formData.careerPath,
											);
											if (!selectedCareer) return null;

											// TypeScript narrowing: selectedCareer is guaranteed to be defined here
											// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
											const career = selectedCareer!;

											return (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.2 }}
													className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-brand-700/5"
												>
													<label
														id="roles-label"
														htmlFor="roles-field"
														className="block text-lg font-black text-white mb-4"
													>
														<span className="text-2xl mr-2">
															{career.emoji}
														</span>
														{career.label} Roles
														<span className="text-zinc-400 font-normal text-base ml-2">
															(Select at least one - required)
														</span>
													</label>

													{/* Select All / Clear All Controls */}
													<div className="flex flex-col sm:flex-row gap-2 mb-4">
														<motion.button
															type="button"
															onClick={() =>
																selectAllRoles(formData.careerPath)
															}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															className="px-4 py-3 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-glow-subtle hover:shadow-glow-medium touch-manipulation min-h-[48px]"
															title={`Select all ${career.roles.length} roles in ${career.label}`}
														>
															Select All {career.roles.length} Roles
														</motion.button>
														<motion.button
															type="button"
															onClick={clearAllRoles}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															className="px-4 py-3 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-semibold rounded-lg transition-colors touch-manipulation min-h-[48px]"
															title="Clear all selected roles"
														>
															Clear All
														</motion.button>
													</div>

													<div
														id="roles-field"
														role="group"
														aria-labelledby="roles-label"
														aria-describedby={
															shouldShowError(
																"roles",
																formData.roles.length > 0,
																formData.roles.length > 0,
															)
																? "roles-error"
																: formData.roles.length > 0
																	? "roles-success"
																	: undefined
														}
														className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2"
														onBlur={() =>
															setTouchedFields((prev) =>
																new Set(prev).add("roles"),
															)
														}
													>
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
															{career.roles.map(
																(role: string, idx: number) => (
																	<motion.button
																		key={role}
																		type="button"
																		onClick={() =>
																			setFormData({
																				...formData,
																				roles: toggleArray(
																					formData.roles,
																					role,
																				),
																			})
																		}
																		initial={{ opacity: 0, x: -10 }}
																		animate={{ opacity: 1, x: 0 }}
																		transition={{ delay: idx * 0.02 }}
																		whileHover={{ scale: 1.02, x: 2 }}
																		whileTap={{ scale: 0.98 }}
																		className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border-2 transition-all font-semibold text-left text-sm relative overflow-hidden touch-manipulation min-h-[48px] ${
																			formData.roles.includes(role)
																				? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
																				: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
																		}`}
																	>
																		{formData.roles.includes(role) && (
																			<motion.div
																				layoutId="selected-role"
																				className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-brand-700/10 -z-10"
																				initial={{ opacity: 0 }}
																				animate={{ opacity: 1 }}
																				exit={{ opacity: 0 }}
																			/>
																		)}
																		<span className="flex items-center justify-between">
																			{role}
																			{formData.roles.includes(role) && (
																				<svg
																					className="w-5 h-5 text-brand-400"
																					fill="none"
																					viewBox="0 0 24 24"
																					stroke="currentColor"
																					role="img"
																					aria-label="Selected"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth={2}
																						d="M5 13l4 4L19 7"
																					/>
																				</svg>
																			)}
																		</span>
																	</motion.button>
																),
															)}
														</div>
													</div>
													{formData.roles.length > 0 && (
														<FormFieldSuccess
															message={`${formData.roles.length} role${formData.roles.length > 1 ? "s" : ""} selected`}
															id="roles-success"
														/>
													)}
													{shouldShowError(
														"roles",
														formData.roles.length === 0,
														formData.roles.length > 0,
													) && (
														<FormFieldError
															error="Please select at least one role"
															id="roles-error"
														/>
													)}
												</motion.div>
											);
										})()}

										{/* Spacer for sticky button */}
										<div className="h-32 sm:h-0" aria-hidden="true" />

										{/* Sticky Submit Button */}
										<div className="sticky bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
											<div className="flex gap-3 sm:gap-4">
												<motion.button
													type="button"
													onClick={() => setStep(2)}
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
													className="btn-secondary flex-1 py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[56px]"
													disabled={loading}
												>
													← Back
												</motion.button>
												<motion.button
													type="button"
													onClick={() => setStep(4)}
													disabled={
														loading ||
														!formData.careerPath ||
														formData.roles.length === 0
													}
													whileHover={{ scale: loading ? 1 : 1.03 }}
													whileTap={{ scale: loading ? 1 : 0.97 }}
													className="relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden touch-manipulation min-h-[56px]"
													style={{
														background: loading
															? "linear-gradient(to right, #6366F1, #7C3AED, #8B5CF6)"
															: "linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)",
														boxShadow:
															"0 0 60px rgba(99,102,241,0.8), 0 20px 60px -18px rgba(99,102,241,0.9), inset 0 1px 0 rgba(255,255,255,0.3)",
														textShadow: "0 2px 8px rgba(0,0,0,0.4)",
														transition: "all 0.3s ease",
													}}
												>
													{!loading && (
														<motion.div
															className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
															animate={{
																x: ["-200%", "200%"],
															}}
															transition={{
																duration: 2,
																repeat: Infinity,
																repeatDelay: 1,
																ease: "easeInOut",
															}}
														/>
													)}
													<span className="relative z-10 text-white flex items-center justify-center gap-3">
														{loading ? (
															<>
																<svg
																	className="w-6 h-6 animate-spin"
																	viewBox="0 0 24 24"
																	fill="none"
																>
																	<circle
																		className="opacity-25"
																		cx="12"
																		cy="12"
																		r="10"
																		stroke="currentColor"
																		strokeWidth="4"
																	></circle>
																	<path
																		className="opacity-75"
																		fill="currentColor"
																		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																	></path>
																</svg>
																<span>Finding Matches...</span>
															</>
														) : (
															<>
																<span>→</span>
																<span>{getDisabledMessage(3)}</span>
																<motion.span
																	animate={{ x: [0, 4, 0] }}
																	transition={{
																		duration: 1,
																		repeat: Infinity,
																		repeatDelay: 0.5,
																	}}
																>
																	→
																</motion.span>
															</>
														)}
													</span>
												</motion.button>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{step === 4 && (
							<Step4MatchingPreferences
								key="step4"
								formData={formData}
								setFormData={setFormData}
								loading={loading}
								setStep={navigateToStep}
								toggleArray={toggleArray}
								handleSubmit={handleSubmit}
							/>
						)}
					</AnimatePresence>
				</div>

				<TrustSignals activeJobs={activeJobs} isLoadingStats={isLoadingStats} />
			</div>
		</div>
	);
}

// Wrap in Suspense to handle useSearchParams
export default function SignupPage() {
	return (
		<ErrorBoundary>
			<Suspense
				fallback={
					<div className="min-h-screen bg-black flex items-center justify-center">
						<div className="text-white text-xl">Loading...</div>
					</div>
				}
			>
				<SignupForm />
			</Suspense>
		</ErrorBoundary>
	);
}
