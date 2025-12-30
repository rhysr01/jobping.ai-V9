/**
 * Tests for Signup API Route
 * Tests user registration endpoint
 */

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/signup/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/email/sender");
jest.mock("@/Utils/emailVerification");

describe("Signup API Route", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      headers: new Headers(),
      json: jest.fn(),
    } as any;
  });

  it("should handle valid signup request", async () => {
    mockRequest.json.mockResolvedValue({
      email: "test@example.com",
      full_name: "Test User",
      target_cities: ["London"],
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBeLessThan(500);
  });

  it("should reject invalid email format", async () => {
    mockRequest.json.mockResolvedValue({
      email: "invalid-email",
      full_name: "Test User",
    });

    const response = await POST(mockRequest);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should reject missing required fields", async () => {
    mockRequest.json.mockResolvedValue({
      email: "test@example.com",
    });

    const response = await POST(mockRequest);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should handle database errors", async () => {
    mockRequest.json.mockResolvedValue({
      email: "test@example.com",
      full_name: "Test User",
      target_cities: ["London"],
    });

    const { getDatabaseClient } = require("@/Utils/databasePool");
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error("DB error")),
    };
    getDatabaseClient.mockReturnValue(mockSupabase);

    const response = await POST(mockRequest);

    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
