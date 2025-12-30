/**
 * Tests for Scraping Orchestrator
 * Tests job scraping orchestration
 */

import { ScrapingOrchestrator } from "@/Utils/scraping-orchestrator";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/matching/job-enrichment.service");

describe("ScrapingOrchestrator", () => {
  let orchestrator: ScrapingOrchestrator;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);

    orchestrator = new ScrapingOrchestrator();
  });

  describe("orchestrateScraping", () => {
    it("should orchestrate scraping job", async () => {
      const result = await orchestrator.orchestrateScraping({
        source: "reed",
        location: "London",
      });

      expect(result).toBeDefined();
    });

    it("should handle scraping errors", async () => {
      const result = await orchestrator.orchestrateScraping({
        source: "invalid",
        location: "London",
      });

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });
});
