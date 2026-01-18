export interface SignupFormData {
	fullName: string;
	email: string;
	cities: string[];
	languages: string[];
	workEnvironment: string[];
	visaStatus: string;
	visaSponsorship?: string; // For backward compatibility with free signup
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
