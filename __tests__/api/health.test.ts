import { GET } from "@/app/api/health/route";
import { getDatabaseClient } from "@/Utils/databasePool";

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

describe("GET /api/health", () => {
  it("should return health status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("checks");
  });

  it("should include database check", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.checks).toHaveProperty("database");
    expect(data.checks.database).toHaveProperty("status");
  });

  it("should call getDatabaseClient", async () => {
    await GET();
    expect(getDatabaseClient).toHaveBeenCalled();
  });

  it("should include timestamp", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("timestamp");
    expect(typeof data.timestamp).toBe("string");
  });
});
