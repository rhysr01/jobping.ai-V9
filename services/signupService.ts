import { apiCall } from "../lib/api-client";
import type { SignupFormData } from "../components/signup/types";

export interface SignupResult {
	matchCount?: number;
	redirectToMatches?: boolean;
}

export class SignupService {
	static async submitFreeSignup(formData: SignupFormData): Promise<SignupResult> {
		const response = await apiCall("/api/signup/free", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: formData.email,
				full_name: formData.fullName,
				preferred_cities: formData.cities,
				career_paths: [formData.careerPath],
				visa_sponsorship: formData.visaSponsorship,
				entry_level_preferences: ["graduate", "intern", "junior"],
				birth_year: formData.birthYear,
				age_verified: formData.ageVerified,
				terms_accepted: formData.termsAccepted,
			}),
		});

		const data = await response.json();

		if (response.status === 409) {
			if (data.redirectToMatches) {
				return {
					redirectToMatches: true,
					matchCount: data.matchCount || 5,
				};
			}
			// If 409 but no redirectToMatches, show the API error message
			const errorMsg = data.error || data.message || "Account already exists";
			throw new Error(errorMsg);
		}

		if (!response.ok) {
			const errorMsg = data.error || data.message || "Signup failed";
			throw new Error(errorMsg);
		}

		return {
			matchCount: data.matchCount || 0,
		};
	}
}

export const signupService = SignupService;