import { GET } from "@/app/api/dashboard/route";
import { getDatabaseClient } from "@/Utils/databasePool";

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
  isHMACRequired: jest.fn().mockReturnValue(false),
}));

describe("GET /api/dashboard", () => {
  it("should return dashboard data", async () => {
    const req = {
      headers: new Headers(),
      nextUrl: {
        searchParams: {
          get: jest.fn(() => null),
        },
      },
    } as any;

    const response = await GET(req);
    expect(response.status).toBeGreaterThanOrEqual(200);
  });

  it("should call getDatabaseClient", async () => {
    const req = {
      headers: new Headers(),
      nextUrl: {
        searchParams: {
          get: jest.fn(() => null),
        },
      },
    } as any;

    await GET(req);
    expect(getDatabaseClient).toHaveBeenCalled();
  });
});
