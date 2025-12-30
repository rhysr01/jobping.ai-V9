import {
  checkDatabaseHealth,
  type DatabaseResponse,
  executeWithRetry,
  getSupabaseClient,
  wrapDatabaseResponse,
} from "@/Utils/supabase";

jest.mock("@/Utils/supabase", () => {
  const actual = jest.requireActual("@/Utils/supabase");
  return {
    ...actual,
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          data: [{ id: 1 }],
          error: null,
        })),
      })),
    })),
  };
});

describe("supabase utilities", () => {
  describe("wrapDatabaseResponse", () => {
    it("should wrap successful response", () => {
      const response = wrapDatabaseResponse({
        data: { id: 1 },
        error: null,
      });
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1 });
      expect(response.error).toBeNull();
    });

    it("should wrap error response", () => {
      const response = wrapDatabaseResponse({
        data: null,
        error: { message: "Database error" },
      });
      expect(response.success).toBe(false);
      expect(response.error).toBeInstanceOf(Error);
      expect(response.error?.message).toBe("Database error");
    });

    it("should handle null data", () => {
      const response = wrapDatabaseResponse({
        data: null,
        error: null,
      });
      expect(response.success).toBe(false);
    });
  });

  describe("executeWithRetry", () => {
    it("should execute function successfully", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await executeWithRetry(fn, 3);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce("success");
      const result = await executeWithRetry(fn, 3);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("fail"));
      await expect(executeWithRetry(fn, 2)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should respect timeout", async () => {
      const fn = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve("slow"), 10000)),
        );
      await expect(executeWithRetry(fn, 1, 100)).rejects.toThrow();
    });
  });

  describe("checkDatabaseHealth", () => {
    it("should check database health", async () => {
      const health = await checkDatabaseHealth();
      expect(health).toBeDefined();
      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("message");
      expect(typeof health.healthy).toBe("boolean");
    });

    it("should call getSupabaseClient", async () => {
      await checkDatabaseHealth();
      expect(getSupabaseClient).toHaveBeenCalled();
    });
  });
});
