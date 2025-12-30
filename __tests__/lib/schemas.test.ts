import { z } from "zod";
import {
  type FeedbackInput,
  feedbackSchema,
  type Job,
  jobSchema,
  type Match,
  matchSchema,
  type PromoCodeInput,
  promoCodeSchema,
  type SubscribeInput,
  subscribeSchema,
  type User,
  userSchema,
} from "@/lib/schemas";

describe("schemas", () => {
  describe("subscribeSchema", () => {
    it("should validate valid subscription", () => {
      const input = {
        email: "test@example.com",
        name: "Test User",
        plan: "free" as const,
      };
      const result = subscribeSchema.parse(input);
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(result.plan).toBe("free");
    });

    it("should default to free plan", () => {
      const input = {
        email: "test@example.com",
        name: "Test User",
      };
      const result = subscribeSchema.parse(input);
      expect(result.plan).toBe("free");
    });

    it("should reject invalid email", () => {
      const input = {
        email: "invalid-email",
        name: "Test User",
      };
      expect(() => subscribeSchema.parse(input)).toThrow();
    });

    it("should reject short name", () => {
      const input = {
        email: "test@example.com",
        name: "A",
      };
      expect(() => subscribeSchema.parse(input)).toThrow();
    });

    it("should accept premium plan", () => {
      const input = {
        email: "test@example.com",
        name: "Test User",
        plan: "premium" as const,
      };
      const result = subscribeSchema.parse(input);
      expect(result.plan).toBe("premium");
    });
  });

  describe("userSchema", () => {
    it("should validate valid user", () => {
      const user = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        full_name: "Test User",
        subscription_active: true,
        active: true,
        email_verified: true,
        target_cities: ["London"],
        roles_selected: ["engineer"],
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = userSchema.parse(user);
      expect(result.email).toBe("test@example.com");
      expect(result.active).toBe(true);
    });

    it("should require valid UUID", () => {
      const user = {
        id: "invalid-uuid",
        email: "test@example.com",
        full_name: "Test User",
        subscription_active: true,
        active: true,
        email_verified: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      expect(() => userSchema.parse(user)).toThrow();
    });

    it("should make arrays optional", () => {
      const user = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        full_name: "Test User",
        subscription_active: true,
        active: true,
        email_verified: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = userSchema.parse(user);
      expect(result.target_cities).toBeUndefined();
    });
  });

  describe("jobSchema", () => {
    it("should validate valid job", () => {
      const job = {
        id: 1,
        job_hash: "hash123",
        title: "Software Engineer",
        company: "Test Co",
        location: "London",
        description: "Test description",
        job_url: "https://example.com/job",
        source: "test",
        active: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = jobSchema.parse(job);
      expect(result.title).toBe("Software Engineer");
      expect(result.active).toBe(true);
    });

    it("should require valid URL", () => {
      const job = {
        id: 1,
        job_hash: "hash123",
        title: "Engineer",
        company: "Co",
        location: "London",
        job_url: "not-a-url",
        source: "test",
        active: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      expect(() => jobSchema.parse(job)).toThrow();
    });

    it("should make description optional", () => {
      const job = {
        id: 1,
        job_hash: "hash123",
        title: "Engineer",
        company: "Co",
        location: "London",
        job_url: "https://example.com/job",
        source: "test",
        active: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = jobSchema.parse(job);
      expect(result.description).toBeUndefined();
    });
  });

  describe("matchSchema", () => {
    it("should validate valid match", () => {
      const match = {
        id: 1,
        user_email: "test@example.com",
        job_hash: "hash123",
        match_score: 0.85,
        match_reason: "Good match",
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = matchSchema.parse(match);
      expect(result.match_score).toBe(0.85);
      expect(result.match_reason).toBe("Good match");
    });

    it("should enforce score range 0-1", () => {
      const match = {
        id: 1,
        user_email: "test@example.com",
        job_hash: "hash123",
        match_score: 1.5,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      expect(() => matchSchema.parse(match)).toThrow();
    });

    it("should make match_reason optional", () => {
      const match = {
        id: 1,
        user_email: "test@example.com",
        job_hash: "hash123",
        match_score: 0.85,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      const result = matchSchema.parse(match);
      expect(result.match_reason).toBeUndefined();
    });
  });

  describe("feedbackSchema", () => {
    it("should validate valid feedback", () => {
      const feedback = {
        action: "positive" as const,
        score: 5,
        job: "hash123",
        email: "test@example.com",
      };
      const result = feedbackSchema.parse(feedback);
      expect(result.action).toBe("positive");
      expect(result.score).toBe(5);
    });

    it("should make score optional", () => {
      const feedback = {
        action: "negative" as const,
        job: "hash123",
        email: "test@example.com",
      };
      const result = feedbackSchema.parse(feedback);
      expect(result.score).toBeUndefined();
    });

    it("should enforce score range 1-5", () => {
      const feedback = {
        action: "positive" as const,
        score: 0,
        job: "hash123",
        email: "test@example.com",
      };
      expect(() => feedbackSchema.parse(feedback)).toThrow();
    });

    it("should accept neutral action", () => {
      const feedback = {
        action: "neutral" as const,
        job: "hash123",
        email: "test@example.com",
      };
      const result = feedbackSchema.parse(feedback);
      expect(result.action).toBe("neutral");
    });
  });

  describe("promoCodeSchema", () => {
    it("should validate valid promo code", () => {
      const promo = {
        email: "test@example.com",
        code: "TEST123",
      };
      const result = promoCodeSchema.parse(promo);
      expect(result.code).toBe("TEST123");
      expect(result.email).toBe("test@example.com");
    });

    it("should enforce code length", () => {
      const promo = {
        email: "test@example.com",
        code: "AB",
      };
      expect(() => promoCodeSchema.parse(promo)).toThrow();
    });

    it("should reject long code", () => {
      const promo = {
        email: "test@example.com",
        code: "A".repeat(51),
      };
      expect(() => promoCodeSchema.parse(promo)).toThrow();
    });
  });

  describe("type exports", () => {
    it("should export SubscribeInput type", () => {
      const input: SubscribeInput = {
        email: "test@example.com",
        name: "Test",
        plan: "free",
      };
      expect(input).toBeDefined();
    });

    it("should export User type", () => {
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        full_name: "Test",
        subscription_active: true,
        active: true,
        email_verified: true,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      expect(user).toBeDefined();
    });
  });
});
