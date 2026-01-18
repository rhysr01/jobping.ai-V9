// Human-friendly error message utilities
// Converts technical errors into user-friendly messages

export interface ErrorContext {
	code?: string;
	status?: number;
	message?: string;
	field?: string;
}

export function getHumanErrorMessage(error: ErrorContext | string): string {
	// Handle string errors directly
	if (typeof error === 'string') {
		return getMessageForCode(error);
	}

	const { code, status, message, field } = error;

	// Network errors
	if (status === 0 || code === 'NETWORK_ERROR' || message?.includes('fetch')) {
		return "Looks like you're offline. Check your connection and try again.";
	}

	if (status === 408 || code === 'TIMEOUT') {
		return "The request is taking longer than expected. Please try again.";
	}

	// Authentication errors
	if (status === 401 || code === 'UNAUTHORIZED') {
		return "Please sign in to continue.";
	}

	if (status === 403 || code === 'FORBIDDEN') {
		return "You don't have permission to perform this action.";
	}

	// Client errors (400-499)
	if (status === 400 || code === 'VALIDATION_ERROR') {
		if (field) {
			return getFieldSpecificMessage(field);
		}
		return "Please check your information and try again.";
	}

	if (status === 404 || code === 'NOT_FOUND') {
		return "The page or resource you're looking for doesn't exist.";
	}

	if (status === 409 || code === 'CONFLICT') {
		return "This action conflicts with existing data. Please refresh and try again.";
	}

	if (status === 422 || code === 'UNPROCESSABLE_ENTITY') {
		return "The information provided isn't quite right. Please check and try again.";
	}

	if (status === 429 || code === 'RATE_LIMITED') {
		return "You're doing that too quickly! Please wait a moment and try again.";
	}

	// Server errors (500-599)
	if (status && status >= 500) {
		return "We're experiencing some technical difficulties. Please try again in a few moments.";
	}

	// Generic fallback - try to extract useful info from the message
	if (message) {
		return getMessageForCode(message);
	}

	return "Something went wrong. We're looking into it!";
}

function getMessageForCode(code: string): string {
	const lowerCode = code.toLowerCase();

	// Database/connection errors
	if (lowerCode.includes('connection') || lowerCode.includes('database')) {
		return "We're having trouble connecting right now. Please try again.";
	}

	// Email errors
	if (lowerCode.includes('email') || lowerCode.includes('mail')) {
		return "There was an issue with the email. Please check the address and try again.";
	}

	// File upload errors
	if (lowerCode.includes('file') || lowerCode.includes('upload')) {
		return "The file couldn't be uploaded. Please check the size and format.";
	}

	// Permission errors
	if (lowerCode.includes('permission') || lowerCode.includes('access')) {
		return "You don't have permission to do that. Please contact support if you need access.";
	}

	// Validation errors
	if (lowerCode.includes('required') || lowerCode.includes('missing')) {
		return "Some required information is missing. Please fill in all fields.";
	}

	if (lowerCode.includes('invalid') || lowerCode.includes('format')) {
		return "The information isn't in the right format. Please check and try again.";
	}

	if (lowerCode.includes('duplicate') || lowerCode.includes('exists')) {
		return "This already exists. Please try a different value.";
	}

	// Length/size errors
	if (lowerCode.includes('too long') || lowerCode.includes('maximum')) {
		return "The text is too long. Please shorten it and try again.";
	}

	if (lowerCode.includes('too short') || lowerCode.includes('minimum')) {
		return "The text is too short. Please add more details.";
	}

	// Generic fallbacks
	if (lowerCode.includes('server') || lowerCode.includes('internal')) {
		return "We're experiencing some technical difficulties. Please try again.";
	}

	return "Something went wrong. We're looking into it!";
}

function getFieldSpecificMessage(field: string): string {
	const lowerField = field.toLowerCase();

	if (lowerField.includes('email')) {
		return "Please enter a valid email address.";
	}

	if (lowerField.includes('password')) {
		return "Password must be at least 8 characters long.";
	}

	if (lowerField.includes('name') || lowerField.includes('first') || lowerField.includes('last')) {
		return "Please enter a valid name.";
	}

	if (lowerField.includes('phone') || lowerField.includes('mobile')) {
		return "Please enter a valid phone number.";
	}

	if (lowerField.includes('url') || lowerField.includes('website')) {
		return "Please enter a valid website URL.";
	}

	if (lowerField.includes('age') || lowerField.includes('birth')) {
		return "Please enter a valid date of birth.";
	}

	return "Please check this field and try again.";
}

// Utility for handling API errors in components
export function handleApiError(error: any): string {
	if (error?.response?.data?.message) {
		return getHumanErrorMessage(error.response.data.message);
	}

	if (error?.message) {
		return getHumanErrorMessage(error.message);
	}

	if (error?.code) {
		return getHumanErrorMessage({ code: error.code });
	}

	return getHumanErrorMessage("An unexpected error occurred");
}