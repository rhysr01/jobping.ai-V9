/**
 * Comprehensive tests for Supabase Utilities
 * Tests client creation, configuration
 */

import { createSupabaseClient, getSupabaseClient } from "@/Utils/supabase";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));
jest.mock("@/Utils/databasePool");

describe("Supabase Utilities", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
	});

	describe("getSupabaseClient", () => {
		it("should get Supabase client", () => {
			const { getDatabaseClient } = require("@/Utils/databasePool");
			const mockClient = { from: jest.fn() };
			getDatabaseClient.mockReturnValue(mockClient);

			const client = getSupabaseClient();

			expect(client).toBeDefined();
			expect(client).toBe(mockClient); // Should delegate to getDatabaseClient
		});

		it("should throw if config missing", () => {
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;

			expect(() => {
				getSupabaseClient();
			}).toThrow();
		});
	});

	describe("createSupabaseClient", () => {
		it("should create Supabase client", () => {
			const { getDatabaseClient } = require("@/Utils/databasePool");
			const mockClient = { from: jest.fn() };
			getDatabaseClient.mockReturnValue(mockClient);

			// createSupabaseClient now delegates to getDatabaseClient (deprecated function)
			const client = createSupabaseClient();

			expect(client).toBeDefined();
			expect(client).toBe(mockClient); // Should delegate to getDatabaseClient
		});
	});
});
