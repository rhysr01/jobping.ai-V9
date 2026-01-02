/**
 * Mock Factories for Testing
 * Provides properly structured mocks for external services
 */

// ================================
// SUPABASE MOCK FACTORY
// ================================

export const createMockSupabaseClient = (overrides: any = {}) => {
	const mockData: any = {
		users: [],
		jobs: [],
		matches: [],
		match_logs: [],
		email_suppression: [],
		...overrides.mockData,
	};

	const chainMethods = {
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		upsert: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		neq: jest.fn().mockReturnThis(),
		gt: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lt: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		like: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		contains: jest.fn().mockReturnThis(),
		containedBy: jest.fn().mockReturnThis(),
		overlaps: jest.fn().mockReturnThis(),
		filter: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnValue({
			data: mockData.users || [],
			error: null,
		}),
		single: jest.fn().mockResolvedValue({
			data: mockData.users?.[0] || null,
			error: null,
		}),
		maybeSingle: jest.fn().mockResolvedValue({
			data: mockData.users?.[0] || null,
			error: null,
		}),
		rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
		auth: {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: null }, error: null }),
			signIn: jest
				.fn()
				.mockResolvedValue({ data: { user: null }, error: null }),
			signUp: jest
				.fn()
				.mockResolvedValue({ data: { user: null }, error: null }),
			signOut: jest.fn().mockResolvedValue({ error: null }),
		},
	};

	return {
		...chainMethods,
		...overrides,
	};
};

// ================================
// RESEND MOCK FACTORY
// ================================

export const createMockResendClient = (overrides: any = {}) => {
	return {
		emails: {
			send: jest.fn().mockResolvedValue({
				data: { id: "email-id-" + Math.random() },
				error: null,
			}),
		},
		...overrides,
	};
};

// ================================
// OPENAI MOCK FACTORY
// ================================

export const createMockOpenAIClient = (overrides: any = {}) => {
	const defaultResponse = {
		choices: [
			{
				message: {
					function_call: {
						name: "return_job_matches",
						arguments: JSON.stringify({
							matches: [
								{
									job_index: 1,
									job_hash: "test-hash-1",
									match_score: 85,
									match_reason: "Great match for your skills",
								},
							],
						}),
					},
				},
			},
		],
		usage: {
			prompt_tokens: 100,
			completion_tokens: 50,
			total_tokens: 150,
		},
	};

	return {
		chat: {
			completions: {
				create: jest.fn().mockResolvedValue(defaultResponse),
			},
		},
		...overrides,
	};
};

// ================================
// REDIS MOCK FACTORY
// ================================

export const createMockRedisClient = (overrides: any = {}) => {
	return {
		get: jest.fn().mockResolvedValue(null),
		set: jest.fn().mockResolvedValue("OK"),
		del: jest.fn().mockResolvedValue(1),
		incr: jest.fn().mockResolvedValue(1),
		expire: jest.fn().mockResolvedValue(1),
		ttl: jest.fn().mockResolvedValue(-1),
		exists: jest.fn().mockResolvedValue(0),
		...overrides,
	};
};

// ================================
// NEXT REQUEST MOCK FACTORY
// ================================

export const createMockNextRequest = (
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: any;
		url?: string;
	} = {},
) => {
	const {
		method = "GET",
		headers = {},
		body = {},
		url = "http://localhost:3000/api/test",
	} = options;

	const headersMap = new Map(Object.entries(headers));

	return {
		method,
		headers: {
			get: (key: string) => headersMap.get(key.toLowerCase()) || null,
			has: (key: string) => headersMap.has(key.toLowerCase()),
			entries: () => headersMap.entries(),
			forEach: (fn: any) => headersMap.forEach(fn),
		},
		url,
		json: jest.fn().mockResolvedValue(body),
		text: jest.fn().mockResolvedValue(JSON.stringify(body)),
		formData: jest.fn().mockResolvedValue(new FormData()),
		cookies: {
			get: jest.fn().mockReturnValue(null),
			set: jest.fn(),
			delete: jest.fn(),
		},
		nextUrl: {
			searchParams: new URLSearchParams(),
			pathname: new URL(url).pathname,
		},
		ip: "127.0.0.1",
	} as any;
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Reset all mocks in a Supabase client
 */
export const resetSupabaseMocks = (client: any) => {
	Object.keys(client).forEach((key) => {
		if (typeof client[key]?.mockClear === "function") {
			client[key].mockClear();
		}
	});
};

/**
 * Configure mock to return specific data
 */
export const configureMockData = (
	client: any,
	table: string,
	data: any[],
	error: any = null,
) => {
	client.from.mockImplementation((tableName: string) => {
		if (tableName === table) {
			return {
				...client,
				limit: jest.fn().mockReturnValue({ data, error }),
				single: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
			};
		}
		return client;
	});
};
