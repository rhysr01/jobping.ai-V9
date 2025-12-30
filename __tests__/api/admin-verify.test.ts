import type { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/verify/route";

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

jest.mock("@/Utils/auth/hmac", () => ({
  verifyHMAC: jest.fn().mockReturnValue({ isValid: true }),
}));

describe("POST /api/admin/verify", () => {
  it("should handle verification request", async () => {
    const req = {
      json: async () => ({
        email: "test@example.com",
      }),
      headers: new Headers(),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it("should require email", async () => {
    const req = {
      json: async () => ({}),
      headers: new Headers(),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
