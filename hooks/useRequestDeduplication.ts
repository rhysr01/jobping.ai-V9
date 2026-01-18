import { useCallback, useRef } from "react";

interface RequestState {
	promise: Promise<any> | null;
	timestamp: number;
}

interface UseRequestDeduplicationOptions {
	ttl?: number; // Time to live in milliseconds
	maxConcurrent?: number; // Maximum concurrent requests
}

interface UseRequestDeduplicationReturn {
	executeRequest: <T>(key: string, requestFn: () => Promise<T>) => Promise<T>;
	clearCache: (key?: string) => void;
	getActiveRequests: () => string[];
}

/**
 * Hook for deduplicating API requests and preventing race conditions
 * Prevents multiple identical requests from being fired simultaneously
 */
export function useRequestDeduplication(
	options: UseRequestDeduplicationOptions = {},
): UseRequestDeduplicationReturn {
	const { ttl = 30000, maxConcurrent = 3 } = options; // 30 second TTL

	const requestCache = useRef<Map<string, RequestState>>(new Map());
	const activeRequests = useRef<Set<string>>(new Set());

	const clearExpiredCache = useCallback(() => {
		const now = Date.now();
		for (const [key, state] of requestCache.current.entries()) {
			if (now - state.timestamp > ttl) {
				requestCache.current.delete(key);
			}
		}
	}, [ttl]);

	const executeRequest = useCallback(
		async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
			// Clean up expired cache entries
			clearExpiredCache();

			// Check if we have an active request for this key
			if (activeRequests.current.has(key)) {
				// Wait for the existing request to complete
				const cachedState = requestCache.current.get(key);
				if (cachedState?.promise) {
					return cachedState.promise;
				}
			}

			// Check cache for recent successful request
			const cached = requestCache.current.get(key);
			if (cached && Date.now() - cached.timestamp < ttl) {
				return cached.promise;
			}

			// Check concurrent request limit
			if (activeRequests.current.size >= maxConcurrent) {
				throw new Error("Too many concurrent requests. Please try again.");
			}

			// Mark as active
			activeRequests.current.add(key);

			try {
				// Execute the request
				const promise = requestFn();

				// Cache the promise
				requestCache.current.set(key, {
					promise,
					timestamp: Date.now(),
				});

				const result = await promise;

				// Update cache with successful result
				requestCache.current.set(key, {
					promise: Promise.resolve(result),
					timestamp: Date.now(),
				});

				return result;
			} finally {
				// Remove from active requests
				activeRequests.current.delete(key);
			}
		},
		[clearExpiredCache, ttl, maxConcurrent],
	);

	const clearCache = useCallback((key?: string) => {
		if (key) {
			requestCache.current.delete(key);
			activeRequests.current.delete(key);
		} else {
			requestCache.current.clear();
			activeRequests.current.clear();
		}
	}, []);

	const getActiveRequests = useCallback(() => {
		return Array.from(activeRequests.current);
	}, []);

	return {
		executeRequest,
		clearCache,
		getActiveRequests,
	};
}
