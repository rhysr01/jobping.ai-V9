// Jest setup for Node environment (API testing)
import { TextDecoder, TextEncoder } from "node:util";

// Polyfill for TextEncoder/TextDecoder (required for cheerio and other web APIs)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill for crypto.randomUUID (required for Node.js < 19)
if (!global.crypto) {
	(global as any).crypto = {
		randomUUID: () => require("node:crypto").randomUUID(),
	};
}

// Polyfill for setImmediate
if (typeof setImmediate === "undefined") {
	(global as any).setImmediate = (fn: Function) => setTimeout(fn, 0);
}

// Set test environment
(process.env as any).NODE_ENV = "test";

// Set HMAC secret for API testing
(process.env as any).INTERNAL_API_HMAC_SECRET =
	"test-hmac-secret-key-for-testing-only";

// Test-specific environment variables (must match validation schema)
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY =
	"test-service-role-key-12345678901234567890";
process.env.OPENAI_API_KEY =
	"sk-test-openai-api-key-123456789012345678901234567890123456789012345678901234567890";
process.env.MATCH_USERS_DISABLE_AI = "true";
process.env.RESEND_API_KEY =
	"re_test-resend-api-key-12345678901234567890123456789012345678901234567890";
process.env.SYSTEM_API_KEY = "test-system-api-key-12345678901234567890";
process.env.NEXT_PUBLIC_URL = "http://localhost:3000";
process.env.SCRAPE_API_KEY = "test-api-key";
process.env.BYPASS_RESERVATION = "1";
process.env.EMAIL_DOMAIN = "example.com";

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter() {
		return {
			push: jest.fn(),
			replace: jest.fn(),
			prefetch: jest.fn(),
			back: jest.fn(),
			forward: jest.fn(),
			refresh: jest.fn(),
		};
	},
	useSearchParams() {
		return new URLSearchParams();
	},
	usePathname() {
		return "/";
	},
}));

// OpenAI bypassed in tests via MATCH_USERS_DISABLE_AI=true

// Mock Redis (no-op in test mode)
jest.mock("redis", () => ({
	createClient: jest.fn(() => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		isOpen: true,
		on: jest.fn(),
		get: jest.fn(() => Promise.resolve(null)),
		set: jest.fn(() => Promise.resolve("OK")),
		del: jest.fn(() => Promise.resolve(1)),
		zAdd: jest.fn(() => Promise.resolve(1)),
		zCard: jest.fn(() => Promise.resolve(0)),
		zRemRangeByScore: jest.fn(() => Promise.resolve(0)),
	})),
}));

// Mock Resend (no-op in test mode)
jest.mock("resend", () => ({
	Resend: jest.fn(() => ({
		emails: {
			send: jest.fn(() => Promise.resolve({ id: "test-id" })),
		},
	})),
}));

// Sentry removed - using Axiom for error tracking

// EnhancedAIMatchingCache removed - no longer needed

// Global test utilities
global.fetch = jest.fn();

// Silence console methods in tests to reduce noise
const originalConsole = { ...console };
global.console = {
	...console,
	log: console.log, // Keep console.log for debugging
	warn: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};

// Restore console for debugging if needed
(global as any).__restoreConsole = () => {
	global.console = originalConsole;
};

// Global test cleanup to prevent resource leaks
afterEach(() => {
	// Ensure real timers are restored to prevent open handles
	jest.useRealTimers();

	// Clear any remaining timers
	jest.clearAllTimers();
});

// Global teardown to close all connections
afterAll(async () => {
	console.log(" Cleaning up test resources...");

	try {
		console.log(" Test cleanup completed");
	} catch (error) {
		console.error(" Error during test cleanup:", error);
	}
});
