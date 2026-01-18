import { useEffect, useRef, useCallback } from "react";
import { showToast } from "../lib/toast";

const STORAGE_VERSION = 1;
const EXPIRATION_MS = 86400000; // 24 hours

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

type FormDataType = PremiumFormData | FreeFormData;

interface SavedFormState {
	version: number;
	formData: FormDataType;
	step?: number; // Only for premium
	timestamp: number;
}

interface UseFormPersistenceOptions {
	tier: 'premium' | 'free';
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
	const checkHasUserData = useCallback((data: FormDataType) => {
		if (tier === 'free') {
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
	}, [tier]);

	// Update hasUserData ref when formData changes
	useEffect(() => {
		hasUserDataRef.current = checkHasUserData(formData);
	}, [formData, checkHasUserData]);

	// Save progress based on tier-specific logic
	useEffect(() => {
		const shouldSave = tier === 'premium'
			? (currentStep && currentStep >= minStepForSave)
			: hasUserDataRef.current;

		if (!shouldSave) return;

		try {
			let formDataToSave = formData;

			// Convert SignupFormData to FreeFormData for free tier
			if (tier === 'free') {
				const signupData = formData as any; // SignupFormData
				formDataToSave = {
					email: signupData.email,
					fullName: signupData.fullName,
					cities: signupData.cities,
					careerPath: signupData.careerPath?.[0] || '', // Convert array to string
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
	}, [formData, currentStep, hasStep, minStepForSave, STORAGE_KEY, tier]);

	// Restore progress on mount (only once)
	useEffect(() => {
		if (hasRestoredRef.current) return;
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
			if (tier === 'premium') {
				// Premium: restore formData and step
				setFormData(parsed.formData);
				if (hasStep && setStep && parsed.step !== undefined) {
					setStep(parsed.step);
				}
				showToast.success("Welcome back! Your progress has been restored.");
			} else {
				// Free: convert FreeFormData back to SignupFormData and restore if user confirms
				const shouldRestore = confirm(
					"We found your previous progress. Would you like to restore it?"
				);
				if (shouldRestore) {
					const freeData = parsed.formData as FreeFormData;
					const signupData = {
						fullName: freeData.fullName || '',
						email: freeData.email || '',
						cities: freeData.cities || [],
						languages: [],
						workEnvironment: [],
						visaStatus: freeData.visaSponsorship === 'yes' ? 'Non-EU (require sponsorship)' : 'EU citizen',
						entryLevelPreferences: [],
						targetCompanies: [],
						careerPath: freeData.careerPath ? [freeData.careerPath] : [], // Convert string to array
						roles: [],
						industries: [],
						companySizePreference: '',
						skills: [],
						careerKeywords: '',
						gdprConsent: freeData.gdprConsent || false,
						birthYear: freeData.birthYear,
						ageVerified: freeData.ageVerified || false,
						termsAccepted: freeData.termsAccepted || false,
					};
					setFormData(signupData as any);
				}
			}
		} catch (error) {
			// Corrupted data or parsing error - remove it
			localStorage.removeItem(STORAGE_KEY);
		}
	}, [STORAGE_KEY, setFormData, setStep, hasStep, tier]);

	return {
		// Could add utility functions here if needed
		clearProgress: () => localStorage.removeItem(STORAGE_KEY),
	};
}