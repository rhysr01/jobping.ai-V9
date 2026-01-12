import { apiCall } from "../lib/api-client";
import { SignupFormData } from "@/hooks/useSignupForm";

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
			throw new Error("You've already tried Free! Want 10 more jobs this week? Upgrade to Premium for 15 jobs/week (3x more).");
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