"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useEmailValidation } from "@/hooks/useFormValidation";
import { useFreeSignupNavigation } from "@/hooks/useFreeSignupNavigation";
import { useSignupState } from "@/hooks/useSignupState";
import { ApiError, apiCallJson } from "@/lib/api-client";
import { TIMING } from "@/lib/constants";
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

	// Use our custom hooks for state management
	const signupState = useSignupState(initialStep);
	const {
		step,
		loading,
		activeJobs,
		totalUsers,
		isLoadingStats,
		formData,
		setStep,
		setLoading,
		setError,
		setSuccessState,
		setFormData,
		updateFormData,
	} = signupState;

	const { announce, Announcement } = useAriaAnnounce();

	// Enhanced submission progress state
	const [submissionProgress, setSubmissionProgress] = useState(0);
	const [submissionStage, setSubmissionStage] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Form persistence hook
	const { clearProgress } = useFormPersistence(
		formData as any,
		updateFormData as any,
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
		if (loading || isSubmitting) return;

		// Client-side validation
		const errors: Record<string, string> = {};

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

		setValidationErrors(errors);

		if (Object.keys(errors).length > 0) {
			return;
		}

		setIsSubmitting(true);
		setLoading(true);
		setError("");
		setValidationErrors({});
		setSubmissionProgress(0);
		setSubmissionStage("Validating your details...");

		// Enhanced progress tracking with visual feedback
		setTimeout(() => setSubmissionProgress(10), 100);

		try {
			// Stage 1: Validation (10% - 30%)
			setSubmissionProgress(10);
			await new Promise((resolve) => setTimeout(resolve, 300));
			setSubmissionProgress(30);
			setSubmissionStage("Finding your perfect matches...");

			// Stage 2: API Call (30% - 70%)
			setSubmissionProgress(40);
			const response = await apiCallJson<{
				userId: string;
				email: string;
				matchesCount: number;
			}>("/api/signup/free", {
				method: "POST",
				body: JSON.stringify(formData),
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

			clearProgress();

			// Store timeout ref for cleanup
			redirectTimeoutRef.current = setTimeout(() => {
				router.push(
					`/matches?tier=free&email=${encodeURIComponent(response.email)}`,
				);
			}, TIMING.REDIRECT_DELAY_MS);
		} catch (error) {
			setSubmissionProgress(0);
			setSubmissionStage("");
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Unable to connect. Please check your internet connection and try again.";
			setError(errorMessage);
			setValidationErrors({ general: errorMessage });
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
					{Object.keys(validationErrors).length > 0 && (
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
										{Object.entries(validationErrors).map(([field, error]) => (
											<li
												key={field}
												className="text-red-300 text-sm flex items-center gap-2"
											>
												<span className="w-1 h-1 bg-red-400 rounded-full"></span>
												{error}
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
								touchedFields={new Set()}
								setTouchedFields={() => {}}
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
