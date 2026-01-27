import { useEffect, useRef, useCallback } from "react";
import { showToast } from "../lib/toast";
import { TIMING } from "../lib/constants";

const STORAGE_VERSION = 1;
const EXPIRATION_MS = TIMING.FORM_PREFERENCES_EXPIRATION_MS;

interface BaseFormData {
	email?: string;
	fullName?: string;
	cities?: string[];
	careerPath?: string;
	visaSponsorship?: string;
	gdprConsent?: boolean;
	// GDPR compliance fields
	birthYear?: number;
	ageVerified?: boolean;
	termsAccepted?: boolean;
}

interface PremiumFormData extends BaseFormData {
	// Premium-specific fields
	visaStatus?: string;
	entryLevelPreferences?: string[];
	roles?: string[];
	keywords?: string[];
	industries?: string[];
	companySizePreferences?: string[];
	workEnvironment?: string[];
	salaryExpectations?: string;
	[key: string]: unknown; // Allow additional fields
}

interface FreeFormData extends BaseFormData {
	cities: string[];
	email: string;
	fullName: string;
	visaSponsorship: string;
	gdprConsent: boolean;
}

export type FormDataType = PremiumFormData | FreeFormData;

interface SavedFormState {
	version: number;
	formData: FormDataType;
	step?: number; // Only for premium
	timestamp: number;
}

interface UseFormPersistenceOptions {
	tier: "premium" | "free";
	hasStep?: boolean; // Whether to track step changes
	minStepForSave?: number; // Minimum step to start saving (premium only)
}

/**
 * Unified custom hook for persisting signup form state to localStorage
 * Handles both premium and free signup flows with different requirements
 */
export function useFormPersistence(
	formData: FormDataType,
	setFormData: React.Dispatch<React.SetStateAction<FormDataType>>,
	options: UseFormPersistenceOptions,
	setStep?: (step: number) => void,
	currentStep?: number,
) {
	const { tier, hasStep = false, minStepForSave = 1 } = options;
	const STORAGE_KEY = `jobping_${tier}_signup_v${STORAGE_VERSION}`;

	const hasRestoredRef = useRef(false);
	const hasUserDataRef = useRef(false);

	// Check if user has entered any data (for free tier)
	const checkHasUserData = useCallback(
		(data: FormDataType) => {
			if (tier === "free") {
				const freeData = data as FreeFormData;
				return !!(
					freeData.email ||
					freeData.fullName ||
					freeData.cities?.length ||
					freeData.careerPath ||
					freeData.visaSponsorship
				);
			}
			return true; // Premium always saves after minStepForSave
		},
		[tier],
	);

	// Update hasUserData ref when formData changes
	useEffect(() => {
		hasUserDataRef.current = checkHasUserData(formData);
	}, [formData, checkHasUserData]);

	// Save progress based on tier-specific logic
	useEffect(() => {
		// SSR safety: Only run in browser
		if (typeof window === "undefined") return;
		
		const shouldSave =
			tier === "premium"
				? currentStep && currentStep >= minStepForSave
				: hasUserDataRef.current;

		if (!shouldSave) return;

		try {
			let formDataToSave = formData;

			// Convert SignupFormData to FreeFormData for free tier
			if (tier === "free") {
				const signupData = formData as any; // SignupFormData
				formDataToSave = {
					email: signupData.email,
					fullName: signupData.fullName,
					cities: signupData.cities,
					careerPath: signupData.careerPath?.[0] || "", // Convert array to string
					visaSponsorship: signupData.visaSponsorship,
					gdprConsent: signupData.gdprConsent,
					birthYear: signupData.birthYear,
					ageVerified: signupData.ageVerified,
					termsAccepted: signupData.termsAccepted,
				} as FreeFormData;
			}

			const state: SavedFormState = {
				version: STORAGE_VERSION,
				formData: formDataToSave,
				timestamp: Date.now(),
			};

			if (hasStep && currentStep !== undefined) {
				(state as any).step = currentStep;
			}

			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			// localStorage might be disabled or full - fail silently
			console.warn("Failed to save form progress:", error);
		}
	}, [formData, currentStep, hasStep, minStepForSave, tier]);

	// Restore progress on mount (only once)
	useEffect(() => {
		if (hasRestoredRef.current) return;
		
		// SSR safety: Only run in browser
		if (typeof window === "undefined") return;
		
		hasRestoredRef.current = true;

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			const parsed: SavedFormState = JSON.parse(saved);

			// Validate version and expiration
			if (parsed.version !== STORAGE_VERSION) {
				localStorage.removeItem(STORAGE_KEY);
				return;
			}

			if (Date.now() - parsed.timestamp > EXPIRATION_MS) {
				localStorage.removeItem(STORAGE_KEY);
				return;
			}

			// Restore data based on tier
			if (tier === "premium") {
				// Premium: restore formData and step
				setFormData(parsed.formData);
				if (hasStep && setStep && parsed.step !== undefined) {
					setStep(parsed.step);
				}
				showToast.success("Welcome back! Your progress has been restored.");
			} else {
				// Free: Auto-restore silently (non-blocking)
				// Removed blocking confirm() dialog that was causing errors
				const freeData = parsed.formData as FreeFormData;
				const signupData = {
					fullName: freeData.fullName || "",
					email: freeData.email || "",
					cities: freeData.cities || [],
					languages: [],
					workEnvironment: [],
					visaStatus:
						freeData.visaSponsorship === "yes"
							? "Non-EU (require sponsorship)"
							: "EU citizen",
					entryLevelPreferences: [],
					targetCompanies: [],
					careerPath: freeData.careerPath ? [freeData.careerPath] : [], // Convert string to array
					roles: [],
					industries: [],
					companySizePreference: "",
					skills: [],
					careerKeywords: "",
					gdprConsent: freeData.gdprConsent || false,
					birthYear: freeData.birthYear,
					ageVerified: freeData.ageVerified || false,
					termsAccepted: freeData.termsAccepted || false,
				};
				setFormData(signupData as any);
				// Show non-blocking toast notification instead of blocking confirm
				showToast.success("Your previous progress has been restored.");
			}
		} catch (error) {
			// Corrupted data or parsing error - remove it
			console.warn("Failed to restore form progress:", error);
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch (removeError) {
				// localStorage might be disabled - fail silently
				console.warn("Failed to remove corrupted form data:", removeError);
			}
		}
	}, [setFormData, setStep, hasStep, tier]);

	/**
	 * Get stored user preferences for matches page
	 */
	const getStoredUserPreferences = useCallback(() => {
		// SSR safety: Only run in browser
		if (typeof window === "undefined") return null;
		
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;

			const parsed: SavedFormState = JSON.parse(stored);

			// Check if data is not too old (24 hours)
			const age = Date.now() - parsed.timestamp;
			if (age > EXPIRATION_MS) {
				localStorage.removeItem(STORAGE_KEY);
				return null;
			}

			// Return user preferences for matches page
			const data = parsed.formData;
			return {
				cities: tier === 'free' ? (data as FreeFormData).cities : (data as PremiumFormData).cities || [],
				careerPath: tier === 'free' ? [(data as FreeFormData).careerPath] : (data as PremiumFormData).careerPath || [],
				tier: tier,
			};
		} catch (error) {
			console.warn('Failed to retrieve stored user preferences:', error);
			return null;
		}
	}, [tier]);

	/**
	 * Save user preferences for matches page (separate from form progress)
	 * This persists even after clearProgress() is called
	 */
	const savePreferencesForMatches = useCallback((formData: FormDataType) => {
		// SSR safety: Only run in browser
		if (typeof window === "undefined") return;
		
		try {
			const PREFERENCES_KEY = `jobping_${tier}_preferences_v${STORAGE_VERSION}`;
			let preferencesToSave: { cities: string[]; careerPath: string[]; tier: 'free' | 'premium' };
			
			if (tier === "free") {
				const freeData = formData as FreeFormData;
				preferencesToSave = {
					cities: freeData.cities || [],
					careerPath: freeData.careerPath ? [freeData.careerPath] : [],
					tier: 'free' as const,
				};
			} else {
				const premiumData = formData as PremiumFormData;
				preferencesToSave = {
					cities: premiumData.cities || [],
					careerPath: Array.isArray(premiumData.careerPath) ? premiumData.careerPath : [],
					tier: 'premium' as const,
				};
			}

			const state = {
				...preferencesToSave,
				timestamp: Date.now(),
			};

			localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state));
		} catch (error) {
			console.warn("Failed to save preferences for matches:", error);
		}
	}, [tier]);

	return {
		clearProgress: () => {
			if (typeof window !== "undefined") {
				try {
					localStorage.removeItem(STORAGE_KEY);
				} catch (error) {
					console.warn("Failed to clear form progress:", error);
				}
			}
		},
		getStoredUserPreferences,
		savePreferencesForMatches,
	};
}

/**
 * Utility function to retrieve stored user preferences for matches page
 * Used when user navigates to /matches after signup
 */
export function getStoredUserPreferencesForMatches(): {
	cities: string[];
	careerPath: string[];
	tier: 'free' | 'premium';
} | null {
	// SSR safety: Only run in browser
	if (typeof window === "undefined") return null;
	
	const STORAGE_VERSION = 1;
	const EXPIRATION_MS = TIMING.FORM_PREFERENCES_EXPIRATION_MS;

	// Try preferences key first (persists after signup)
	const freePrefsKey = `jobping_free_preferences_v${STORAGE_VERSION}`;
	try {
		const stored = localStorage.getItem(freePrefsKey);
		if (stored) {
			const parsed = JSON.parse(stored);
			const age = Date.now() - parsed.timestamp;
			if (age <= EXPIRATION_MS) {
				return {
					cities: parsed.cities || [],
					careerPath: parsed.careerPath || [],
					tier: 'free' as const,
				};
			}
		}
	} catch (error) {
		console.warn('Failed to retrieve free preferences:', error);
	}

	// Try premium preferences
	const premiumPrefsKey = `jobping_premium_preferences_v${STORAGE_VERSION}`;
	try {
		const stored = localStorage.getItem(premiumPrefsKey);
		if (stored) {
			const parsed = JSON.parse(stored);
			const age = Date.now() - parsed.timestamp;
			if (age <= EXPIRATION_MS) {
				return {
					cities: parsed.cities || [],
					careerPath: parsed.careerPath || [],
					tier: 'premium' as const,
				};
			}
		}
	} catch (error) {
		console.warn('Failed to retrieve premium preferences:', error);
	}

	// Fallback: Try form progress keys (for backward compatibility)
	const freeKey = `jobping_free_signup_v${STORAGE_VERSION}`;
	try {
		const stored = localStorage.getItem(freeKey);
		if (stored) {
			const parsed: SavedFormState = JSON.parse(stored);
			const age = Date.now() - parsed.timestamp;
			if (age <= EXPIRATION_MS) {
				const data = parsed.formData as FreeFormData;
				return {
					cities: data.cities || [],
					careerPath: data.careerPath ? [data.careerPath] : [],
					tier: 'free' as const,
				};
			}
		}
	} catch (error) {
		console.warn('Failed to retrieve free tier preferences:', error);
	}

	// Try premium tier form progress
	const premiumKey = `jobping_premium_signup_v${STORAGE_VERSION}`;
	try {
		const stored = localStorage.getItem(premiumKey);
		if (stored) {
			const parsed: SavedFormState = JSON.parse(stored);
			const age = Date.now() - parsed.timestamp;
			if (age <= EXPIRATION_MS) {
				const data = parsed.formData as PremiumFormData;
				return {
					cities: data.cities || [],
					careerPath: Array.isArray(data.careerPath) ? data.careerPath : [],
					tier: 'premium' as const,
				};
			}
		}
	} catch (error) {
		console.warn('Failed to retrieve premium tier preferences:', error);
	}

	return null;
}
