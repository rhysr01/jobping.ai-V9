/**
 * Tests for Email Sender
 * Tests email sending functionality with Resend integration
 */

import { getResendClient } from "@/Utils/email/clients";
import {
  createJobMatchesEmail,
  createWelcomeEmail,
} from "@/Utils/email/productionReadyTemplates";
import {
  EMAIL_PERFORMANCE_METRICS,
  sendBatchEmails,
  sendMatchedJobsEmail,
  sendWelcomeEmail,
} from "@/Utils/email/sender";

// Mock dependencies
jest.mock("@/Utils/email/clients");
jest.mock("@/Utils/email/productionReadyTemplates");
jest.mock("@/lib/api-logger", () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Email Sender", () => {
  let mockResendClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    EMAIL_PERFORMANCE_METRICS.reset();

    mockResendClient = {
      emails: {
        send: jest.fn(),
      },
    };

    (getResendClient as jest.Mock).mockReturnValue(mockResendClient);
    (createWelcomeEmail as jest.Mock).mockReturnValue("<html>Welcome</html>");
    (createJobMatchesEmail as jest.Mock).mockReturnValue("<html>Jobs</html>");

    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email successfully", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      const result = await sendWelcomeEmail({
        to: "user@example.com",
        userName: "John",
        matchCount: 5,
        tier: "free",
      });

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user@example.com"],
          subject: expect.stringContaining("Welcome"),
        }),
      );
      expect(result).toBeDefined();
      expect(EMAIL_PERFORMANCE_METRICS.getTotalSent()).toBe(1);
    });

    it("should throw error when API key is missing", async () => {
      delete process.env.RESEND_API_KEY;

      await expect(
        sendWelcomeEmail({
          to: "user@example.com",
          matchCount: 5,
        }),
      ).rejects.toThrow("RESEND_API_KEY");
    });

    it("should throw error when API key format is invalid", async () => {
      process.env.RESEND_API_KEY = "invalid_key";

      await expect(
        sendWelcomeEmail({
          to: "user@example.com",
          matchCount: 5,
        }),
      ).rejects.toThrow("Invalid RESEND_API_KEY format");
    });

    it("should handle Resend API errors", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: null,
        error: { message: "Rate limit exceeded" },
      });

      await expect(
        sendWelcomeEmail({
          to: "user@example.com",
          matchCount: 5,
        }),
      ).rejects.toThrow("Resend API error");
      expect(EMAIL_PERFORMANCE_METRICS.getTotalFailed()).toBe(1);
    });

    it("should handle timeout errors", async () => {
      jest.useFakeTimers();
      mockResendClient.emails.send.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 20000)),
      );

      const promise = sendWelcomeEmail({
        to: "user@example.com",
        matchCount: 5,
      });

      jest.advanceTimersByTime(16000);

      await expect(promise).rejects.toThrow("timeout");
      jest.useRealTimers();
    });

    it("should track metrics correctly", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-123" },
        error: null,
      });

      await sendWelcomeEmail({
        to: "user@example.com",
        matchCount: 5,
      });

      expect(EMAIL_PERFORMANCE_METRICS.getTotalSent()).toBe(1);
      expect(EMAIL_PERFORMANCE_METRICS.getTotalFailed()).toBe(0);
      expect(EMAIL_PERFORMANCE_METRICS.getSuccessRate()).toBe("100.0%");
    });
  });

  describe("sendMatchedJobsEmail", () => {
    it("should send matched jobs email successfully", async () => {
      const mockJobs = [
        {
          id: 1,
          title: "Software Engineer",
          company: "Tech Corp",
          location: "London",
          job_url: "https://example.com/job/1",
          match_score: 85,
        },
      ];

      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-456" },
        error: null,
      });

      const result = await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs: mockJobs,
        userName: "John",
        subscriptionTier: "premium",
      });

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user@example.com"],
          subject: expect.stringContaining("Job Matches"),
        }),
      );
      expect(result).toBeDefined();
    });

    it("should use custom subject when provided", async () => {
      const mockJobs = [buildMockJob()];
      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-789" },
        error: null,
      });

      await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs: mockJobs,
        subjectOverride: "Custom Subject",
      });

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Custom Subject",
        }),
      );
    });

    it("should handle empty jobs array", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-999" },
        error: null,
      });

      await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs: [],
      });

      expect(mockResendClient.emails.send).toHaveBeenCalled();
    });

    it("should handle job data with missing fields", async () => {
      const mockJobs = [
        {
          id: null,
          title: null,
          company: null,
        },
      ];

      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-111" },
        error: null,
      });

      await expect(
        sendMatchedJobsEmail({
          to: "user@example.com",
          jobs: mockJobs,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("sendBatchEmails", () => {
    it("should send batch emails with concurrency control", async () => {
      const emails = [
        { to: "user1@example.com", jobs: [buildMockJob()] },
        { to: "user2@example.com", jobs: [buildMockJob()] },
        { to: "user3@example.com", jobs: [buildMockJob()] },
      ];

      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-batch" },
        error: null,
      });

      const results = await sendBatchEmails(emails, 2);

      expect(results).toHaveLength(3);
      expect(mockResendClient.emails.send).toHaveBeenCalledTimes(3);
    });

    it("should handle rate limiting in batch", async () => {
      const emails = [
        { to: "user1@example.com", jobs: [buildMockJob()] },
        { to: "user2@example.com", jobs: [buildMockJob()] },
      ];

      let callCount = 0;
      mockResendClient.emails.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: { message: "rate limit exceeded" },
          });
        }
        return Promise.resolve({
          data: { id: "email-success" },
          error: null,
        });
      });

      const results = await sendBatchEmails(emails, 1);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("error");
    });

    it("should respect concurrency limit", async () => {
      const emails = Array.from({ length: 10 }, (_, i) => ({
        to: `user${i}@example.com`,
        jobs: [buildMockJob()],
      }));

      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-batch" },
        error: null,
      });

      const startTime = Date.now();
      await sendBatchEmails(emails, 3);
      const duration = Date.now() - startTime;

      // Should take some time due to concurrency limit and delays
      expect(duration).toBeGreaterThan(100);
      expect(mockResendClient.emails.send).toHaveBeenCalledTimes(10);
    });
  });

  describe("EMAIL_PERFORMANCE_METRICS", () => {
    beforeEach(() => {
      EMAIL_PERFORMANCE_METRICS.reset();
    });

    it("should track sent emails", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: { id: "email-1" },
        error: null,
      });

      await sendWelcomeEmail({ to: "user@example.com", matchCount: 5 });

      expect(EMAIL_PERFORMANCE_METRICS.getTotalSent()).toBe(1);
      expect(EMAIL_PERFORMANCE_METRICS.getTotalFailed()).toBe(0);
    });

    it("should track failed emails", async () => {
      mockResendClient.emails.send.mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });

      try {
        await sendWelcomeEmail({ to: "user@example.com", matchCount: 5 });
      } catch {
        // Expected to throw
      }

      expect(EMAIL_PERFORMANCE_METRICS.getTotalFailed()).toBe(1);
    });

    it("should calculate success rate", async () => {
      mockResendClient.emails.send
        .mockResolvedValueOnce({ data: { id: "1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "2" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "Error" } });

      await sendWelcomeEmail({ to: "user1@example.com", matchCount: 5 });
      await sendWelcomeEmail({ to: "user2@example.com", matchCount: 5 });
      try {
        await sendWelcomeEmail({ to: "user3@example.com", matchCount: 5 });
      } catch {
        // Expected
      }

      expect(EMAIL_PERFORMANCE_METRICS.getSuccessRate()).toBe("66.7%");
    });

    it("should reset metrics", () => {
      EMAIL_PERFORMANCE_METRICS.reset();
      expect(EMAIL_PERFORMANCE_METRICS.getTotalSent()).toBe(0);
      expect(EMAIL_PERFORMANCE_METRICS.getTotalFailed()).toBe(0);
    });

    it("should return all metrics", () => {
      const metrics = EMAIL_PERFORMANCE_METRICS.getMetrics();
      expect(metrics).toHaveProperty("totalSent");
      expect(metrics).toHaveProperty("totalFailed");
      expect(metrics).toHaveProperty("averageResponseTime");
    });
  });
});

// Helper function
function buildMockJob() {
  return {
    id: 1,
    title: "Software Engineer",
    company: "Tech Corp",
    location: "London",
    job_url: "https://example.com/job/1",
    description: "Great job",
    match_score: 85,
  };
}
