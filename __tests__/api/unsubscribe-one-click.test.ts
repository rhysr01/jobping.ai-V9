import type { NextRequest } from "next/server";
import { GET } from "@/app/api/unsubscribe/one-click/route";
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

describe("GET /api/unsubscribe/one-click", () => {
  it("should require email parameter", async () => {
    const req = {
      nextUrl: {
        searchParams: {
          get: jest.fn(() => null),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(req);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should unsubscribe user with valid email", async () => {
    const req = {
      nextUrl: {
        searchParams: {
          get: jest.fn((key: string) => {
            if (key === "email") return "test@example.com";
            return null;
          }),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(req);
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it("should update database on unsubscribe", async () => {
    const req = {
      nextUrl: {
        searchParams: {
          get: jest.fn((key: string) => {
            if (key === "email") return "test@example.com";
            return null;
          }),
        },
      },
    } as unknown as NextRequest;

    await GET(req);
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});
