/**
 * API client with network error handling, retry logic, and user-friendly error messages
 */

export interface ApiCallOptions extends RequestInit {
	retries?: number;
	retryDelay?: number;
	timeout?: number;
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public retryable: boolean = false,
	) {
		super(message);
		this.name = "ApiError";
	}
}

/**
 * Check if the user is online
 */
function isOnline(): boolean {
	if (typeof navigator === "undefined") return true; // Server-side, assume online
	return navigator.onLine;
}

/**
 * Wait for a specified duration
 */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * API call wrapper with error handling, retry logic, and timeout
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus retry configuration
 * @returns Promise<Response>
 * @throws ApiError with user-friendly messages
 */
export async function apiCall(
	url: string,
	options: ApiCallOptions = {},
): Promise<Response> {
	const {
		retries = 2,
		retryDelay = 1000,
		timeout = 30000,
		...fetchOptions
	} = options;

	// Check if online
	if (!isOnline()) {
		throw new ApiError(
			"No internet connection. Please check your network.",
			undefined,
			true,
		);
	}

	let lastError: Error | null = null;

	// Retry loop
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			// Create abort controller for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			try {
				// Add CSRF token to all requests
				const headers = {
					...fetchOptions.headers,
					"x-csrf-token": "jobping-request",
				};

				const response = await fetch(url, {
					...fetchOptions,
					headers,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// Handle common HTTP errors
				if (response.status === 429) {
					throw new ApiError(
						"Too many requests. Please wait a minute and try again.",
						429,
						true,
					);
				}

				if (response.status >= 500) {
					throw new ApiError(
						"Server error. Please try again in a moment.",
						response.status,
						true,
					);
				}

				// For 4xx errors (except 429), don't retry
				if (response.status >= 400 && response.status < 500) {
					// Try to get error message from response
					let errorMessage = "Request failed. Please try again.";
					try {
						const data = await response
							.clone()
							.json()
							.catch(() => null);
						if (data?.error) {
							errorMessage = data.error;
						}
					} catch {
						// Ignore JSON parse errors
					}
					throw new ApiError(errorMessage, response.status, false);
				}

				return response;
			} catch (error) {
				clearTimeout(timeoutId);

				if (error instanceof ApiError) {
					throw error;
				}

				if (error instanceof Error) {
					if (error.name === "AbortError") {
						throw new ApiError(
							"Request timed out. Please try again.",
							undefined,
							true,
						);
					}

					// Network errors are retryable
					if (
						error.message.includes("fetch") ||
						error.message.includes("network")
					) {
						throw new ApiError(
							"Network error. Please check your connection and try again.",
							undefined,
							true,
						);
					}

					throw error;
				}

				throw new Error("Unknown error occurred");
			}
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Unknown error");

			// Don't retry if:
			// 1. It's not retryable (4xx errors except 429)
			// 2. We've exhausted retries
			// 3. User is offline
			if (
				(error instanceof ApiError && !error.retryable) ||
				attempt === retries ||
				!isOnline()
			) {
				throw error;
			}

			// Wait before retrying (exponential backoff)
			const delay = retryDelay * 2 ** attempt;
			await wait(delay);
		}
	}

	// This should never be reached, but TypeScript needs it
	throw lastError || new Error("Request failed after retries");
}

/**
 * Convenience function for JSON API calls
 */
export async function apiCallJson<T = unknown>(
	url: string,
	options: ApiCallOptions = {},
): Promise<T> {
	const response = await apiCall(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	return response.json();
}
