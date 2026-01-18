import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SignupFormData } from "../components/signup/types";

interface UseSignupNavigationProps {
	step: number;
	formData: SignupFormData;
	setStep: (step: number) => void;
	emailValidation: { isValid: boolean };
	announce: (message: string, priority?: "polite" | "assertive") => void;
	formRefs: {
		fullName: React.RefObject<HTMLInputElement | null>;
		email: React.RefObject<HTMLInputElement | null>;
	};
}

export function useSignupNavigation({
	step,
	formData,
	setStep,
	emailValidation,
	announce,
	formRefs,
}: UseSignupNavigationProps) {
	const router = useRouter();

	const isStepValid = useCallback(
		(stepNumber: number): boolean => {
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
					);
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
				let firstErrorField: HTMLElement | null = null;

				if (step === 1) {
					if (!formData.fullName.trim()) {
						firstErrorField = formRefs.fullName.current || null;
					} else if (!formData.email.trim() || !emailValidation.isValid) {
						firstErrorField = formRefs.email.current || null;
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

			setStep(targetStep);

			const url = new URL(window.location.href);
			url.searchParams.set("step", targetStep.toString());

			if (targetStep > step) {
				router.push(url.toString());
			} else {
				window.history.replaceState({ step: targetStep }, "", url.toString());
			}
		},
		[
			canNavigateTo,
			step,
			formData,
			emailValidation.isValid,
			announce,
			formRefs.fullName,
			formRefs.email,
			router,
			setStep,
		],
	);

	return {
		isStepValid,
		canNavigateTo,
		navigateToStep,
	};
}
