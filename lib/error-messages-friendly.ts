/**
 * Centralized Error Messages
 * User-friendly, contextual error messages for better UX
 */

export const ERROR_MESSAGES = {
	// Email validation
	email_required: "We need your email to send you job matches 📧",
	email_invalid:
		"Hmm, that doesn't look like a valid email. Double-check it?",
	email_already_exists:
		"This email is already registered. Try logging in instead!",

	// Location validation
	cities_required: "Pick at least one city where you'd love to work 🌍",
	cities_max: "You can select up to 10 cities",
	invalid_city: "That city isn't available in our current regions",

	// Career path validation
	career_required:
		"Select your career path so we can find relevant roles 🎯",
	career_invalid: "That career path isn't available",

	// Experience level
	experience_required:
		"Let us know your experience level so we can match appropriately",

	// Visa status
	visa_required:
		"Your visa status helps us find sponsored opportunities 📝",

	// Form submission
	form_submission_error:
		"Oops! Something went wrong. Please try again in a moment",
	form_submission_timeout: "Request took too long. Please try again",

	// Network errors
	network_error:
		"Network error. Check your connection and try again 🌐",
	server_error:
		"Server error. Our team has been notified. Please try again later",

	// Authentication
	unauthorized: "Your session expired. Please sign in again",
	forbidden: "You don't have permission to do that",

	// Rate limiting
	rate_limited:
		"You're sending requests too quickly. Please wait a moment",

	// Generic
	unknown_error: "Something went wrong. Please try again later",
	try_again: "Try again",
	contact_support: "Contact support if this persists",
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Get user-friendly error message based on error code or key
 */
export function getUserFriendlyErrorMessage(
	errorKey: ErrorMessageKey | string,
	fallback = "Something went wrong. Please try again."
): string {
	return (
		ERROR_MESSAGES[errorKey as ErrorMessageKey] || fallback
	);
}

