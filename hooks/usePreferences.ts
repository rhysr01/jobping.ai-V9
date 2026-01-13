import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiCallJson } from "../lib/api-client";
import { showToast } from "../lib/toast";

export interface PreferencesFormData {
	cities: string[];
	languages: string[];
	startDate: string;
	experience: string;
	workEnvironment: string[];
	visaStatus: string;
	entryLevelPreferences: string[];
	targetCompanies: string[];
	careerPath: string[];
	roles: string[];
}

export interface UsePreferencesReturn {
	// State
	loading: boolean;
	saving: boolean;
	error: string;
	success: boolean;
	userData: any;
	formData: PreferencesFormData;

	// URL params
	token: string | null;
	email: string | null;

	// Actions
	updateFormData: (updates: Partial<PreferencesFormData>) => void;
	handleSubmit: (e: React.FormEvent) => Promise<void>;
	resetForm: () => void;
}

// Constants
export const LANGUAGES = [
	// Most common EU languages
	"English",
	"French",
	"German",
	"Spanish",
	"Italian",
	"Dutch",
	"Portuguese",
	// Additional EU languages
	"Polish",
	"Swedish",
	"Danish",
	"Finnish",
	"Czech",
	"Romanian",
	"Hungarian",
	"Greek",
	"Bulgarian",
	"Croatian",
	"Serbian",
	"Slovak",
	"Slovenian",
	"Estonian",
	"Latvian",
	"Lithuanian",
	"Ukrainian",
	// Middle Eastern & Central Asian (common visa seekers)
	"Arabic",
	"Turkish",
	"Hebrew",
	"Persian",
	"Farsi",
	"Urdu",
	// Asian languages (common visa seekers)
	"Japanese",
	"Chinese",
	"Mandarin",
	"Cantonese",
	"Korean",
	"Hindi",
	"Bengali",
	"Tamil",
	"Thai",
	"Vietnamese",
	"Indonesian",
	"Malay",
	// Other common languages
	"Russian",
	"Hungarian",
	"Norwegian",
];

export const EXPERIENCE_LEVELS = [
	"Entry Level (0-2 years)",
	"Junior (2-4 years)",
	"Mid Level (4-7 years)",
	"Senior (7-10 years)",
	"Lead/Principal (10+ years)",
	"Executive/C-Suite",
];

export const WORK_ENVIRONMENTS = [
	"Startup (1-50 employees)",
	"Small Company (51-200 employees)",
	"Medium Company (201-1000 employees)",
	"Large Company (1000+ employees)",
	"Enterprise (5000+ employees)",
];

export const VISA_STATUSES = [
	"No visa needed (EU/UK/US citizen)",
	"On student visa",
	"On work visa",
	"Visa expired/expiring soon",
	"Seeking visa sponsorship",
	"Other",
];

export const ENTRY_LEVEL_PREFERENCES = [
	"Strong training programs",
	"Mentorship available",
	"Clear career progression",
	"Work-life balance",
	"Company culture fit",
	"Location flexibility",
	"Remote work options",
	"Competitive compensation",
];

export const CAREER_PATHS = [
	"Individual Contributor",
	"Technical Lead",
	"Engineering Manager",
	"Product Manager",
	"Engineering Director",
	"VP Engineering",
	"CTO",
	"Other",
];

export const INITIAL_FORM_DATA: PreferencesFormData = {
	cities: [],
	languages: [],
	startDate: "",
	experience: "",
	workEnvironment: [],
	visaStatus: "",
	entryLevelPreferences: [],
	targetCompanies: [],
	careerPath: [],
	roles: [],
};

export function usePreferences(): UsePreferencesReturn {
	const searchParams = useSearchParams();
	const token = searchParams?.get("token");
	const email = searchParams?.get("email");

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [userData, setUserData] = useState<any>(null);
	const [formData, setFormData] = useState<PreferencesFormData>(INITIAL_FORM_DATA);

	// Load user preferences
	useEffect(() => {
		const loadPreferences = async () => {
			if (!token || !email) {
				setLoading(false);
				return;
			}

			try {
				const data = await apiCallJson<{
					cities?: string[];
					languages?: string[];
					start_date?: string;
					experience?: string;
					work_environment?: string[];
					visa_status?: string;
					entry_level_preferences?: string[];
					target_companies?: string[];
					career_path?: string | string[];
					roles?: string[];
				}>("/api/preferences", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token, email }),
				});

				setUserData(data);
				setFormData({
					cities: data.cities || [],
					languages: data.languages || [],
					startDate: data.start_date || "",
					experience: data.experience || "",
					workEnvironment: data.work_environment || [],
					visaStatus: data.visa_status || "",
					entryLevelPreferences: data.entry_level_preferences || [],
					targetCompanies: data.target_companies || [],
					careerPath: Array.isArray(data.career_path) ? data.career_path : data.career_path ? [data.career_path] : [],
					roles: data.roles || [],
				});
			} catch (error) {
				console.error("Failed to load preferences:", error);
				setError("Failed to load your preferences. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		loadPreferences();
	}, [token, email]);

	const updateFormData = useCallback((updates: Partial<PreferencesFormData>) => {
		setFormData(prev => ({ ...prev, ...updates }));
	}, []);

	const handleSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();

		if (!token || !email) {
			setError("Missing authentication. Please use the link from your email.");
			return;
		}

		setSaving(true);
		setError("");
		setSuccess(false);

		try {
			const response = await fetch("/api/preferences", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token,
					email,
					...formData,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to save preferences");
			}

			setSuccess(true);
			showToast.success("Preferences saved successfully!");

			// Redirect to matches after a delay
			setTimeout(() => {
				window.location.href = "/matches";
			}, 2000);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to save preferences";
			setError(message);
			showToast.error(message);
		} finally {
			setSaving(false);
		}
	}, [token, email, formData]);

	const resetForm = useCallback(() => {
		setFormData(INITIAL_FORM_DATA);
		setError("");
		setSuccess(false);
	}, []);

	return {
		loading,
		saving,
		error,
		success,
		userData,
		formData,
		token,
		email,
		updateFormData,
		handleSubmit,
		resetForm,
	};
}