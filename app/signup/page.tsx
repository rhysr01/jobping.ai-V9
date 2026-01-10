"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef } from "react";
import ErrorBoundary from "@/components/error-boundary";
import { CAREER_PATHS } from "@/components/signup/constants";
import { HeroSection } from "@/components/signup/HeroSection";
import { ProgressBar } from "@/components/signup/ProgressBar";
import { Step1Basics } from "@/components/signup/Step1Basics";
import { Step2Preferences } from "@/components/signup/Step2Preferences";
import { Step3CareerPath } from "@/components/signup/Step3CareerPath";
import { Step4MatchingPreferences } from "@/components/signup/Step4MatchingPreferences";
import { TrustSignals } from "@/components/signup/TrustSignals";
import {
	FormFieldError,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
import { useAriaAnnounce } from "@/components/ui/AriaLiveRegion";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
	useEmailValidation,
	useRequiredValidation,
} from "@/hooks/useFormValidation";
import { ApiError, apiCallJson } from "@/lib/api-client";
import { TIMING } from "@/lib/constants";
import { logger } from "@/lib/monitoring";
import { showToast } from "@/lib/toast";
import { useSignupState } from "@/hooks/useSignupState";
import { useSignupNavigation } from "@/hooks/useSignupNavigation";
import { SignupStats } from "@/components/signup/SignupStats";

function SignupForm() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Initialize step from URL
	const urlStep = searchParams.get("step");
	const initialStep = urlStep
		? Math.max(1, Math.min(4, parseInt(urlStep, 10)))
		: 1;

	// Use our custom hooks for state management
	const signupState = useSignupState(initialStep);
	const {
		step,
		loading,
		error,
		fieldErrors,
		touchedFields,
		successState,
		activeJobs,
		totalUsers,
		isLoadingStats,
		formData,
		setStep,
		setLoading,
		setError,
		setSuccessState,
		updateFormData,
		setFormData,
		toggleArrayValue,
	} = signupState;

	const prefersReduced = useReducedMotion();
	const { announce, Announcement } = useAriaAnnounce();
	const formRefs = {
		fullName: useRef<HTMLInputElement>(null),
		email: useRef<HTMLInputElement>(null),
	};

	// Form persistence hook
	const { clearProgress } = useFormPersistence(
		formData,
		setFormData,
		{ tier: 'premium', hasStep: true, minStepForSave: 1 },
		setStep,
		step,
	);

	// Use navigation hook
	const { isStepValid, navigateToStep } = useSignupNavigation({
		step,
		formData,
		setStep,
		emailValidation: { isValid: true }, // Will be set below
		announce,
		formRefs,
	});

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

	// Update navigation hook with proper email validation
	const navigation = useSignupNavigation({
		step,
		formData,
		setStep,
		emailValidation,
		announce,
		formRefs,
	});

	// Submit handler
	const handleSubmit = useCallback(async () => {
		if (loading) return;

		setLoading(true);
		setError("");

		try {
			const response = await apiCallJson<{
				userId: string;
				email: string;
				matchesCount: number;
			}>("/api/signup", {
				method: "POST",
				body: JSON.stringify(formData),
			});

			if (!response) {
				throw new Error("No response from server");
			}

			setSuccessState({
				show: true,
				matchesCount: response.matchesCount,
			});

			clearProgress();

			setTimeout(() => {
				router.push(`/success?matches=${response.matchesCount}&email=${encodeURIComponent(response.email)}`);
			}, TIMING.REDIRECT_DELAY_MS);
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
		setLoading,
		setError,
		setSuccessState,
		clearProgress,
	]);

	// Helper functions
	const getDisabledMessage = useCallback((stepNumber: number) => {
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
	}, [formData, emailValidation.isValid, nameValidation.isValid, citiesValidation.isValid, languagesValidation.isValid]);

	const shouldShowError = useCallback((
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => {
		return (touchedFields.has(fieldName) || step === 1) && hasValue && !isValid;
	}, [touchedFields, step]);

	const selectAllRoles = useCallback((careerPath: string) => {
		const career = CAREER_PATHS.find((c) => c.value === careerPath);
		if (career) {
			setFormData({ ...formData, roles: career.popularRoles || career.roles });
		}
	}, [formData, setFormData]);

	const clearAllRoles = useCallback(() => {
		setFormData({ ...formData, roles: [] });
	}, [setFormData]);

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

			{/* Stats fetching component */}
			<SignupStats
				activeJobs={activeJobs}
				totalUsers={totalUsers}
				isLoadingStats={isLoadingStats}
				setActiveJobs={(jobs) => signupState.setActiveJobs(jobs)}
				setTotalUsers={(users) => signupState.setTotalUsers(users)}
				setIsLoadingStats={(loading) => signupState.setIsLoadingStats(loading)}
			/>

			{/* Main form content - simplified for now */}
			<div className="relative z-10 flex flex-col min-h-screen">
				{/* Hero Section */}
				<HeroSection
					activeJobs={activeJobs}
					totalUsers={totalUsers}
					isLoadingStats={isLoadingStats}
				/>

				{/* Progress Bar */}
				<ProgressBar step={step} />

				{/* Form Steps Container */}
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="w-full max-w-2xl">
						{/* Step content will be added here */}
						<div className="text-white text-center">
							{step === 1 && <Step1Basics key="step1" formData={formData} setFormData={setFormData} touchedFields={new Set()} setTouchedFields={() => {}} fieldErrors={{}} setFieldErrors={() => {}} announce={announce} loading={loading} setStep={navigation.navigateToStep} emailValidation={emailValidation} nameValidation={nameValidation} citiesValidation={citiesValidation} languagesValidation={languagesValidation} shouldShowError={() => false} getDisabledMessage={() => "Continue"} toggleArray={toggleArrayValue} />} {step === 2 && <Step2Preferences key="step2" formData={formData} setFormData={setFormData} touchedFields={new Set()} setTouchedFields={() => {}} loading={loading} setStep={navigation.navigateToStep} shouldShowError={() => false} getDisabledMessage={() => "Continue"} toggleArray={toggleArrayValue} />} {step === 3 && <Step3CareerPath key="step3" formData={formData} setFormData={setFormData} touchedFields={new Set()} setTouchedFields={() => {}} loading={loading} setStep={navigation.navigateToStep} shouldShowError={() => false} getDisabledMessage={() => "Continue"} toggleArray={toggleArrayValue} selectAllRoles={selectAllRoles} clearAllRoles={clearAllRoles} />} {step === 4 && <Step4MatchingPreferences key="step4" formData={formData} setFormData={setFormData} loading={loading} setStep={navigation.navigateToStep} toggleArray={toggleArrayValue} handleSubmit={handleSubmit} />} 
						</div>
					</div>
				</div>

				{/* Trust Signals */}
				<TrustSignals activeJobs={activeJobs} isLoadingStats={isLoadingStats} />
			</div>

			{/* Announcement for screen readers */}
			<Announcement />
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
