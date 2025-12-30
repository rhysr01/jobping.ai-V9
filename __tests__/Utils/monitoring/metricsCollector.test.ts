/**
 * Tests for Metrics Collector
 * Tests system metrics collection
 */

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

import { MetricsCollector } from "@/Utils/monitoring/metricsCollector";

describe("MetricsCollector", () => {
  let collector: MetricsCollector;
  let mockSupabase: any;
  let mockCreateClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const { createClient } = require("@supabase/supabase-js");
    mockCreateClient = createClient;

    const makeCountResponse = (count: number) =>
      Promise.resolve({ count, error: null });
    const makeDataResponse = (data: any[]) =>
      Promise.resolve({ data, error: null });

    mockSupabase = {
      from: jest.fn((table: string) => {
        const count = table.includes("users")
          ? 25
          : table.includes("jobs")
            ? 40
            : 10;
        const queryObject: any = {
          select: jest.fn((_cols: any, options?: any) => {
            if (options?.head) {
              return {
                eq: jest.fn(() => makeCountResponse(count)),
                gte: jest.fn(() => makeCountResponse(count)),
              };
            }

            return {
              gte: jest.fn(() =>
                makeDataResponse([
                  { status: "pending" },
                  { status: "processing" },
                  { status: "completed" },
                ]),
              ),
            };
          }),
        };

        return queryObject;
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    collector = new MetricsCollector();
    (collector as any).supabase = mockSupabase;
  });

  describe("collectMetrics", () => {
    it("should collect system metrics", async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics).toHaveProperty("timestamp");
      expect(metrics).toHaveProperty("performance");
      expect(metrics).toHaveProperty("business");
      expect(metrics).toHaveProperty("queue");
      expect(metrics).toHaveProperty("errors");
    });

    it("should include performance metrics", async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.performance).toHaveProperty("response_time");
      expect(metrics.performance).toHaveProperty("memory_usage");
      expect(metrics.performance).toHaveProperty("uptime");
    });

    it("should include business metrics", async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.business).toHaveProperty("total_users");
      expect(metrics.business).toHaveProperty("active_users");
      expect(metrics.business).toHaveProperty("total_jobs");
    });

    it("should include queue metrics", async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.queue).toHaveProperty("pending_jobs");
      expect(metrics.queue).toHaveProperty("processing_jobs");
    });
  });
});
