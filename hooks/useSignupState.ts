import { useState } from "react";

export interface SignupFormData {
	fullName: string;
	email: string;
	cities: string[];
	languages: string[];
	workEnvironment: string[];
	visaStatus: string;
	entryLevelPreferences: string[];
	targetCompanies: string[];
	careerPath: string[];
	roles: string[];
	industries: string[];
	companySizePreference: string;
	skills: string[];
	careerKeywords: string;
	university?: string;
	gdprConsent: boolean;
	// GDPR compliance fields
	birthYear?: number;
	ageVerified: boolean;
	termsAccepted: boolean;
}

export interface SignupState {
	step: number;
	loading: boolean;
	error: string;
	fieldErrors: Record<string, string>;
	touchedFields: Set<string>;
	successState: {
		show: boolean;
		matchesCount?: number;
	};
	activeJobs: string;
	totalUsers: string;
	isLoadingStats: boolean;
	formData: SignupFormData;
}

const initialFormData: SignupFormData = {
	fullName: "",
	email: "",
	cities: [],
	languages: [],
	workEnvironment: [],
	visaStatus: "",
	entryLevelPreferences: [],
	targetCompanies: [],
	careerPath: [],
	roles: [],
	industries: [],
	companySizePreference: "",
	skills: [],
	careerKeywords: "",
	gdprConsent: false,
	// GDPR compliance defaults
	birthYear: undefined,
	ageVerified: false,
	termsAccepted: false,
};

const initialState: SignupState = {
	step: 1,
	loading: false,
	error: "",
	fieldErrors: {},
	touchedFields: new Set(),
	successState: { show: false },
	activeJobs: "~12,000",
	totalUsers: "3,400",
	isLoadingStats: true,
	formData: initialFormData,
};

export function useSignupState(initialStep?: number) {
	const [state, setState] = useState<SignupState>({
		...initialState,
		step: initialStep || 1,
	});

	const setStep = (step: number) => {
		setState(prev => ({ ...prev, step }));
	};

	const setLoading = (loading: boolean) => {
		setState(prev => ({ ...prev, loading }));
	};

	const setError = (error: string) => {
		setState(prev => ({ ...prev, error }));
	};

	const setSuccessState = (successState: SignupState["successState"]) => {
		setState(prev => ({ ...prev, successState }));
	};

	const setActiveJobs = (activeJobs: string) => {
		setState(prev => ({ ...prev, activeJobs }));
	};

	const setTotalUsers = (totalUsers: string) => {
		setState(prev => ({ ...prev, totalUsers }));
	};

	const setIsLoadingStats = (isLoadingStats: boolean) => {
		setState(prev => ({ ...prev, isLoadingStats }));
	};

	const updateFormData = (updates: Partial<SignupFormData>) => {
		setState(prev => ({
			...prev,
			formData: { ...prev.formData, ...updates }
		}));
	};

	const setFormData = (formData: SignupFormData) => {
		setState(prev => ({ ...prev, formData }));
	};

	const toggleArrayValue = (field: keyof SignupFormData, value: string) => {
		if (!Array.isArray(state.formData[field])) return;
		const currentArray = state.formData[field] as string[];
		const newArray = currentArray.includes(value)
			? currentArray.filter(v => v !== value)
			: [...currentArray, value];
		updateFormData({ [field]: newArray });
	};

	return {
		...state,
		setStep,
		setLoading,
		setError,
		setSuccessState,
		setActiveJobs,
		setTotalUsers,
		setIsLoadingStats,
		updateFormData,
		setFormData,
		toggleArrayValue,
	};
}
