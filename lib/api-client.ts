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
		public response?: any,
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

				// Log signup requests for debugging
				if (url.includes("/api/signup/free")) {
					const useGroup = typeof window !== "undefined" && process.env.NODE_ENV === "development";
					if (useGroup) {
						console.group(`🌐 [API CLIENT] Request attempt ${attempt + 1}/${retries + 1}`);
					}
					console.log(`🌐 [API CLIENT] Request attempt ${attempt + 1}/${retries + 1} - Details:`, {
						url,
						method: fetchOptions.method || "GET",
						hasBody: !!fetchOptions.body,
						bodySize: fetchOptions.body ? String(fetchOptions.body).length : 0,
					});
					if (fetchOptions.body && typeof fetchOptions.body === "string") {
						try {
							const bodyObj = JSON.parse(fetchOptions.body);
							console.log("Request body:", bodyObj);
						} catch {
							console.log("Request body (raw):", fetchOptions.body.substring(0, 200));
						}
					}
					if (useGroup) {
						console.groupEnd();
					}
				}

				const response = await fetch(url, {
					...fetchOptions,
					headers,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				// Log signup responses for debugging
				if (url.includes("/api/signup/free")) {
					const statusEmoji = response.ok ? "✅" : response.status >= 500 ? "🔥" : "⚠️";
					const useGroup = typeof window !== "undefined" && process.env.NODE_ENV === "development";
					if (useGroup) {
						console.group(`${statusEmoji} [API CLIENT] Response received`);
					}
					console.log(`${statusEmoji} [API CLIENT] Response received - Status:`, {
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
						headers: Object.fromEntries(response.headers.entries()),
					});
					if (useGroup) {
						console.groupEnd();
					}
				}

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
					// Try to get error message and details from response
					let errorMessage = "Request failed. Please try again.";
					let responseData = null;
					try {
						const data = await response
							.clone()
							.json()
							.catch(() => null);
						if (data?.error) {
							errorMessage = data.error;
						}
						responseData = data;
						
						// Log signup error details
						if (url.includes("/api/signup/free")) {
							const useGroup = typeof window !== "undefined" && process.env.NODE_ENV === "development";
							if (useGroup) {
								console.group("❌ [API CLIENT] Error response");
							}
							console.error("❌ [API CLIENT] Error response - Details:", {
								url,
								status: response.status,
								errorMessage,
							});
							if (useGroup) {
								console.error("Full error response:", responseData);
								console.groupEnd();
							}
						}
					} catch {
						// Ignore JSON parse errors
					}
					throw new ApiError(errorMessage, response.status, false, responseData);
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

	const jsonData = await response.json();
	
	// Log signup JSON responses for debugging
	if (url.includes("/api/signup/free")) {
		const useGroup = typeof window !== "undefined" && process.env.NODE_ENV === "development";
		if (useGroup) {
			console.group("📦 [API CLIENT] JSON response parsed");
		}
		console.log("📦 [API CLIENT] JSON response parsed - Summary:", {
			url,
			hasData: !!jsonData,
			success: jsonData?.success,
			matchCount: jsonData?.matchCount,
			userId: jsonData?.userId,
			error: jsonData?.error,
		});
		if (useGroup) {
			console.log("Full JSON response:", jsonData);
			console.groupEnd();
		}
	}

	return jsonData;
}
