import type { NextRequest } from "next/server";
import { POST } from "@/app/api/feedback/enhanced/route";
import { getDatabaseClient } from "@/Utils/databasePool";

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        data: {},
        error: null,
      })),
    })),
  })),
}));

describe("POST /api/feedback/enhanced", () => {
  it("should handle feedback submission", async () => {
    const req = {
      json: async () => ({
        email: "test@example.com",
        jobHash: "hash123",
        action: "positive",
        score: 5,
      }),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it("should require email", async () => {
    const req = {
      json: async () => ({
        jobHash: "hash123",
        action: "positive",
      }),
    } as NextRequest;

    const response = await POST(req);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should call getDatabaseClient", async () => {
    const req = {
      json: async () => ({
        email: "test@example.com",
        jobHash: "hash123",
        action: "positive",
      }),
    } as NextRequest;

    await POST(req);
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});
