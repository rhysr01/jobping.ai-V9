import { getDatabaseClient } from "@/Utils/databasePool";
import { getSupabaseClient } from "@/Utils/supabase";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(() => ({
		from: jest.fn(),
	})),
}));

describe("database clients", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
			SUPABASE_SERVICE_ROLE_KEY: "test-key",
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("getDatabaseClient", () => {
		it("should return database client", () => {
			const client = getDatabaseClient();
			expect(client).toBeDefined();
		});

		it("should return same client instance", () => {
			const client1 = getDatabaseClient();
			const client2 = getDatabaseClient();
			expect(client1).toBe(client2);
		});

		it("should throw error if URL not configured", () => {
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;
			expect(() => getDatabaseClient()).toThrow();
			process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		});

		it("should throw error if key not configured", () => {
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;
			expect(() => getDatabaseClient()).toThrow();
			process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
		});
	});

	describe("getSupabaseClient (deprecated, delegates to getDatabaseClient)", () => {
		it("should return supabase client (delegates to getDatabaseClient)", () => {
			const client = getSupabaseClient();
			expect(client).toBeDefined();
		});

		it("should return same instance as getDatabaseClient", () => {
			const dbClient = getDatabaseClient();
			const supabaseClient = getSupabaseClient();
			// Both should return the same instance since getSupabaseClient delegates
			expect(supabaseClient).toBe(dbClient);
		});

		it("should return client with from method", () => {
			const client = getSupabaseClient();
			expect(client).toHaveProperty("from");
			expect(typeof client.from).toBe("function");
		});

		it("should handle missing URL gracefully (delegates to getDatabaseClient)", () => {
			const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;
			process.env.SUPABASE_URL = undefined;
			expect(() => getSupabaseClient()).toThrow();
			process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
		});

		it("should handle missing key gracefully (delegates to getDatabaseClient)", () => {
			const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;
			delete process.env.SUPABASE_KEY;
			delete process.env.SUPABASE_ANON_KEY;
			expect(() => getSupabaseClient()).toThrow();
			process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
		});
	});
});
