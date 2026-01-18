"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useEmailValidation } from "@/hooks/useFormValidation";
import { useSignupNavigation } from "@/hooks/useSignupNavigation";
import { useSignupState } from "@/hooks/useSignupState";
import { ApiError, apiCallJson } from "@/lib/api-client";
import { TIMING } from "@/lib/constants";
import { showToast } from "@/lib/toast";
import ErrorBoundary from "../../components/error-boundary";
import { useAriaAnnounce } from "../ui/AriaLiveRegion";
import { Progress } from "../ui/progress";
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
		toggleArrayValue,
	} = signupState;

	const { announce, Announcement } = useAriaAnnounce();
	const formRefs = {
		fullName: useRef<HTMLInputElement>(null),
		email: useRef<HTMLInputElement>(null),
	};

	// Submission progress state
	const [submissionProgress, setSubmissionProgress] = useState(0);
	const [submissionStage, setSubmissionStage] = useState<string>("");

	// Form persistence hook
	const { clearProgress } = useFormPersistence(
		formData as any,
		setFormData as any,
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

	// Use navigation hook
	useSignupNavigation({
		step,
		formData,
		setStep,
		emailValidation: { isValid: true }, // Will be set below
		announce,
		formRefs,
	});

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);

	// Update navigation hook with proper email validation
	const navigation = useSignupNavigation({
		step,
		formData,
		setStep,
		emailValidation,
		announce,
		formRefs,
	});

	// Submit handler with progress tracking
	const handleSubmit = useCallback(async () => {
		if (loading) return;

		setLoading(true);
		setError("");
		setSubmissionProgress(0);
		setSubmissionStage("Validating your details...");

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
			showToast.error(errorMessage);
		} finally {
			setLoading(false);
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
				className="absolute inset-0 enhanced-grid opacity-30"
				aria-hidden="true"
			/>
			{/* Remove performance-killing infinite animation */}
			<div
				className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block opacity-30"
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
					{/* Submission Progress */}
					{loading && submissionProgress > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="mb-6 glass-card elevation-1 p-6 text-center"
						>
							<div className="mb-4">
								<Progress value={submissionProgress} className="h-2" />
							</div>
							<p className="text-white font-medium text-lg">
								{submissionStage}
							</p>
							<p className="text-zinc-400 text-sm mt-1">
								Finding your perfect job matches...
							</p>
							<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
								<span className="text-sm font-medium text-emerald-200">
									🚀 Searching 847+ jobs in your selected cities
								</span>
							</div>
						</motion.div>
					)}

					{/* Step content */}
					<div className="text-white text-center">
						{step === 1 && (
							<Step1FreeBasics
								key="step1"
								formData={formData}
								setFormData={setFormData as any}
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
								setFormData={setFormData as any}
								touchedFields={new Set()}
								setTouchedFields={() => {}}
								loading={loading}
								setStep={navigation.navigateToStep}
								shouldShowError={shouldShowError}
								getDisabledMessage={getDisabledMessage}
								toggleArray={toggleArrayValue as any}
							/>
						)}
						{step === 3 && (
							<Step3FreeCareer
								key="step3"
								formData={formData}
								setFormData={setFormData as any}
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
