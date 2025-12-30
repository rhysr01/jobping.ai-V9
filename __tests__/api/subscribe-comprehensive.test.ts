/**
 * Tests for Subscribe API Route
 * Tests user subscription functionality
 */

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/subscribe/route";

jest.mock("@supabase/supabase-js");
jest.mock("@/lib/errors", () => ({
  asyncHandler: (fn: any) => fn,
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValidationError";
    }
  },
  AppError: class extends Error {
    constructor(message: string, status: number, code: string, details?: any) {
      super(message);
      this.name = "AppError";
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

describe("Subscribe API Route", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      formData: jest.fn(),
      headers: new Headers(),
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: "1", email: "user@example.com" }],
        error: null,
      }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      }),
    };

    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  describe("POST /api/subscribe", () => {
    it("should create new user subscription", async () => {
      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("name", "John Doe");
      formData.append("plan", "premium");

      mockRequest.formData.mockResolvedValue(formData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe("1");
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should validate email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("name", "John Doe");
      formData.append("plan", "premium");

      mockRequest.formData.mockResolvedValue(formData);

      await expect(POST(mockRequest)).rejects.toThrow("Invalid email format");
    });

    it("should reject duplicate email", async () => {
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("name", "John Doe");
      formData.append("plan", "premium");

      mockRequest.formData.mockResolvedValue(formData);

      mockSupabase.single.mockResolvedValue({
        data: { email: "existing@example.com" },
        error: null,
      });

      await expect(POST(mockRequest)).rejects.toThrow(
        "Email already registered",
      );
    });

    it("should handle free tier subscription", async () => {
      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("name", "John Doe");
      formData.append("plan", "free");

      mockRequest.formData.mockResolvedValue(formData);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("name", "John Doe");
      formData.append("plan", "premium");

      mockRequest.formData.mockResolvedValue(formData);

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it("should require database configuration", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("name", "John Doe");
      formData.append("plan", "premium");

      mockRequest.formData.mockResolvedValue(formData);

      await expect(POST(mockRequest)).rejects.toThrow(
        "Database configuration error",
      );
    });
  });
});
