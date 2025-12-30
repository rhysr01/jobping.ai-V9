import type { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/resend/route";
import { getDatabaseClient } from "@/Utils/databasePool";

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: {},
          error: null,
        })),
      })),
      insert: jest.fn(() => ({
        data: {},
        error: null,
      })),
    })),
  })),
}));

jest.mock("@/Utils/auth/hmac", () => ({
  verifyHMAC: jest.fn().mockReturnValue({ isValid: true }),
}));

describe("POST /api/webhooks/resend", () => {
  it("should handle webhook request", async () => {
    const req = {
      json: async () => ({
        type: "email.opened",
        data: {
          email: "test@example.com",
        },
      }),
      headers: new Headers(),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it("should call getDatabaseClient", async () => {
    const req = {
      json: async () => ({
        type: "email.opened",
        data: {},
      }),
      headers: new Headers(),
    } as NextRequest;

    await POST(req);
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});
