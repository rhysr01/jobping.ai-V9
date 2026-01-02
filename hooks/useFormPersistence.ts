import { useEffect, useRef } from "react";
import { showToast } from "@/lib/toast";

const STORAGE_KEY = "jobping_premium_signup_v1";
const EXPIRATION_MS = 86400000; // 24 hours

interface SavedFormState {
	step: number;
	formData: any;
	timestamp: number;
}

/**
 * Custom hook for persisting premium signup form state to localStorage
 * Automatically saves on step changes and offers to restore on mount
 */
export function useFormPersistence(
	step: number,
	formData: any,
	setFormData: (data: any) => void,
	setStep: (step: number) => void,
) {
	const hasRestoredRef = useRef(false);

	// Save progress whenever step or formData changes
	useEffect(() => {
		// Only save if we're past step 1 (user has made progress)
		if (step > 1) {
			try {
				const state: SavedFormState = {
					step,
					formData,
					timestamp: Date.now(),
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch (error) {
				// localStorage might be disabled or full - fail silently
				console.warn("Failed to save form progress:", error);
			}
		}
	}, [step, formData]);

	// Restore progress on mount (only once)
	useEffect(() => {
		if (hasRestoredRef.current) return;
		hasRestoredRef.current = true;

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			const parsed: SavedFormState = JSON.parse(saved);
			const { step: savedStep, formData: savedData, timestamp } = parsed;

			// Check if expired (24 hours)
			const isExpired = Date.now() - timestamp > EXPIRATION_MS;

			if (isExpired) {
				// Clean up expired data
				localStorage.removeItem(STORAGE_KEY);
				return;
			}

			// Only restore if user was past step 1
			if (savedStep > 1 && savedData) {
				// Show toast notification
				showToast.info(
					`Welcome back! Resume from Step ${savedStep}?`,
					{
						label: "Resume",
						onClick: () => {
							setFormData(savedData);
							setStep(savedStep);
							showToast.success(`Resumed from Step ${savedStep}`);
						},
					},
					10000, // Show for 10 seconds
				);
			}
		} catch (error) {
			// Invalid JSON or other error - clear corrupted data
			console.warn("Failed to restore form progress:", error);
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Ignore cleanup errors
			}
		}
	}, [setFormData, setStep]);

	// Clear saved progress (call this on successful submission)
	const clearProgress = () => {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.warn("Failed to clear form progress:", error);
		}
	};

	return { clearProgress };
}

