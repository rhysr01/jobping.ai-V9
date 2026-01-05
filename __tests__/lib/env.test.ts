import { ENV, isDevelopment, isProduction, isTest } from "@/lib/env";

// Mock the env module to avoid parsing errors in tests
jest.mock("@/lib/env", () => {
  const originalModule = jest.requireActual("@/lib/env");
  return {
    ...originalModule,
    ENV: {
      NODE_ENV: process.env.NODE_ENV || "test",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key-12345678901234567890",
      OPENAI_API_KEY: "sk-test123",
      RESEND_API_KEY: "re_test123",
      INTERNAL_API_HMAC_SECRET: "test-secret-123456789012345678901234567890",
      SYSTEM_API_KEY: "test-system-key",
    },
  };
});

describe("env", () => {
  it("should export ENV object", () => {
    expect(ENV).toBeDefined();
    expect(typeof ENV).toBe("object");
  });

  it("should export environment helper functions", () => {
    expect(typeof isDevelopment).toBe("function");
    expect(typeof isProduction).toBe("function");
    expect(typeof isTest).toBe("function");
  });

  it("should correctly identify test environment", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    expect(isTest()).toBe(true);
    process.env.NODE_ENV = originalEnv;
  });
});
