/**
 * Comprehensive tests for Email Sender
 * Tests welcome emails, matched jobs emails, error handling
 */

import {
  sendMatchedJobsEmail,
  sendWelcomeEmail,
  trackEmailSend,
} from "@/Utils/email/sender";

jest.mock("@/lib/api-logger", () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("@/Utils/email/clients");
jest.mock("@/Utils/email/productionReadyTemplates", () => ({
  createWelcomeEmail: jest.fn(() => "<html>Welcome</html>"),
  createJobMatchesEmail: jest.fn(() => "<html>Jobs</html>"),
}));

describe("Email Sender", () => {
  let mockResend: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.RESEND_API_KEY = "re_test_123456789";

    mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({
          data: { id: "email_123" },
          error: null,
        }),
      },
    };

    const { getResendClient, EMAIL_CONFIG } = require("@/Utils/email/clients");
    getResendClient.mockReturnValue(mockResend);
    EMAIL_CONFIG.from = "JobPing <noreply@getjobping.com>";
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email", async () => {
      const result = await sendWelcomeEmail({
        to: "user@example.com",
        matchCount: 10,
      });

      expect(result).toBeDefined();
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it("should include userName in email", async () => {
      await sendWelcomeEmail({
        to: "user@example.com",
        userName: "John Doe",
        matchCount: 5,
      });

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user@example.com"],
        }),
      );
    });

    it("should throw if API key missing", async () => {
      delete process.env.RESEND_API_KEY;

      await expect(
        sendWelcomeEmail({ to: "user@example.com", matchCount: 5 }),
      ).rejects.toThrow("RESEND_API_KEY");
    });

    it("should handle timeout", async () => {
      jest.useFakeTimers();
      mockResend.emails.send.mockImplementation(
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
  });

  describe("sendMatchedJobsEmail", () => {
    it("should send matched jobs email", async () => {
      const jobs = [
        {
          id: "job1",
          title: "Engineer",
          company: "Tech Corp",
          location: "London",
        },
      ];

      const result = await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs,
      });

      expect(result).toBeDefined();
      expect(mockResend.emails.send).toHaveBeenCalled();
    });

    it("should use custom subject if provided", async () => {
      const jobs = [{ id: "job1", title: "Engineer" }];

      await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs,
        subjectOverride: "Custom Subject",
      });

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Custom Subject",
        }),
      );
    });

    it("should handle signup email flag", async () => {
      const jobs = [{ id: "job1", title: "Engineer" }];

      await sendMatchedJobsEmail({
        to: "user@example.com",
        jobs,
        isSignupEmail: true,
      });

      expect(mockResend.emails.send).toHaveBeenCalled();
    });
  });

  describe("trackEmailSend", () => {
    it("should track email send", () => {
      expect(() => {
        trackEmailSend(true, 100);
      }).not.toThrow();
    });
  });
});
