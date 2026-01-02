import { useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "jobping_free_signup_v1";
const STORAGE_VERSION = 1;
const EXPIRATION_MS = 86400000; // 24 hours

interface SavedFormState {
	version: number;
	formData: {
		cities: string[];
		careerPath: string;
		email: string;
		fullName: string;
		visaSponsorship: string;
		gdprConsent: boolean;
	};
	timestamp: number;
}

/**
 * Custom hook for persisting free signup form state to localStorage
 * Automatically saves on form changes and offers to restore on mount
 */
export function useFormPersistenceFree(
	formData: SavedFormState["formData"],
	setFormData: React.Dispatch<React.SetStateAction<SavedFormState["formData"]>>,
) {
	const hasRestoredRef = useRef(false);
	const hasUserDataRef = useRef(false);

	// Check if user has entered any data
	useEffect(() => {
		if (
			formData.email ||
			formData.fullName ||
			formData.cities.length > 0 ||
			formData.careerPath ||
			formData.visaSponsorship
		) {
			hasUserDataRef.current = true;
		}
	}, [formData]);

	// Save progress whenever formData changes (if user has entered data)
	useEffect(() => {
		if (!hasUserDataRef.current) return;

		try {
			const state: SavedFormState = {
				version: STORAGE_VERSION,
				formData,
				timestamp: Date.now(),
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			// localStorage might be disabled or full - fail silently
			console.warn("Failed to save form progress:", error);
		}
	}, [formData]);

	// Restore progress on mount (only once)
	useEffect(() => {
		if (hasRestoredRef.current) return;
		hasRestoredRef.current = true;

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			let parsed: SavedFormState;
			try {
				parsed = JSON.parse(saved);
			} catch (parseError) {
				console.error(
					"Failed to parse form persistence data (corrupted localStorage):",
					parseError,
				);
				try {
					localStorage.removeItem(STORAGE_KEY);
				} catch {
					// Ignore cleanup errors
				}
				return;
			}

			const { version, formData: savedData, timestamp } = parsed;

			// Check version compatibility
			if (version !== STORAGE_VERSION) {
				console.warn(
					`Form data version mismatch (${version} vs ${STORAGE_VERSION}), clearing storage`,
				);
				try {
					localStorage.removeItem(STORAGE_KEY);
				} catch {
					// Ignore cleanup errors
				}
				return;
			}

			// Check if expired (24 hours)
			const isExpired = Date.now() - timestamp > EXPIRATION_MS;

			if (isExpired) {
				localStorage.removeItem(STORAGE_KEY);
				return;
			}

			// Only restore if there's meaningful data
			if (
				savedData &&
				(savedData.email ||
					savedData.fullName ||
					savedData.cities.length > 0 ||
					savedData.careerPath ||
					savedData.visaSponsorship)
			) {
				// Ask user if they want to restore
				if (
					typeof window !== "undefined" &&
					window.confirm(
						"We found a saved signup. Would you like to restore it?",
					)
				) {
					setFormData(savedData);
				}
			}
		} catch (error) {
			console.error("Failed to restore form progress:", error);
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Ignore cleanup errors
			}
		}
	}, [setFormData]);

	// Clear saved progress (call this on successful submission)
	const clearProgress = useCallback(() => {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.warn("Failed to clear form progress:", error);
		}
	}, []);

	return { clearProgress };
}

