import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SignupFormData } from "../components/signup/types";

interface UseFreeSignupNavigationProps {
	step: number;
	formData: SignupFormData;
	setStep: (step: number) => void;
	emailValidation: { isValid: boolean };
	announce: (message: string, priority?: "polite" | "assertive") => void;
}

export function useFreeSignupNavigation({
	step,
	formData,
	setStep,
	emailValidation,
	announce,
}: UseFreeSignupNavigationProps) {
	const router = useRouter();

	const isStepValid = useCallback(
		(stepNumber: number): boolean => {
			switch (stepNumber) {
				case 1:
					// Basic email regex check as fallback if validation is still debouncing
					const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
					const emailLooksValid = basicEmailRegex.test(formData.email.trim());
					return (
						formData.fullName.trim() !== "" &&
						formData.email.trim() !== "" &&
						(emailValidation.isValid || emailLooksValid)
					);
				case 2:
					return formData.cities.length > 0;
				case 3:
					return formData.cities.length > 0; // Basic validation for final step
				default:
					return false;
			}
		},
		[
			formData.fullName,
			formData.email,
			formData.cities,
			emailValidation.isValid,
		],
	);

	const canNavigateTo = useCallback(
		(targetStep: number): boolean => {
			if (targetStep < step) return true;
			if (targetStep > step) {
				return isStepValid(step);
			}
			return true;
		},
		[step, isStepValid],
	);

	const navigateToStep = useCallback(
		(targetStep: number) => {
			if (!canNavigateTo(targetStep)) {
				// Simple error handling for free signup
				if (step === 1) {
					if (!formData.fullName.trim()) {
						announce("Please enter your full name", "assertive");
					} else if (!formData.email.trim() || !emailValidation.isValid) {
						announce("Please enter a valid email address", "assertive");
					}
				} else if (step === 2) {
					if (formData.cities.length === 0) {
						announce("Please select at least one city", "assertive");
					}
				}
				return;
			}

			setStep(targetStep);

			// Update URL
			const url = new URL(window.location.href);
			url.searchParams.set("step", targetStep.toString());

			if (targetStep > step) {
				router.push(url.toString());
			} else {
				window.history.replaceState({ step: targetStep }, "", url.toString());
			}
		},
		[canNavigateTo, step, formData, emailValidation, announce, setStep, router],
	);

	return {
		isStepValid,
		canNavigateTo,
		navigateToStep,
	};
}
