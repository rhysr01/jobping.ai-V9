/**
 * Comprehensive tests for HMAC Auth
 * Tests HMAC generation, verification, signature validation
 */

import { generateHMAC, isHMACRequired, verifyHMAC } from "@/Utils/auth/hmac";

describe("HMAC Auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERNAL_API_HMAC_SECRET = "test-secret-key";
  });

  describe("generateHMAC", () => {
    it("should generate HMAC signature", () => {
      const message = "test-message";
      const timestamp = Date.now();

      const signature = generateHMAC(message, timestamp);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
    });
  });

  describe("verifyHMAC", () => {
    it("should verify valid HMAC signature", () => {
      const message = "test-message";
      const timestamp = Date.now();
      const signature = generateHMAC(message, timestamp);

      const result = verifyHMAC(message, signature, timestamp);

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const message = "test-message";
      const timestamp = Date.now();

      const result = verifyHMAC(message, "invalid-signature", timestamp);

      expect(result.isValid).toBe(false);
    });

    it("should reject expired timestamp", () => {
      const message = "test-message";
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      const signature = generateHMAC(message, oldTimestamp);

      const result = verifyHMAC(message, signature, oldTimestamp, 5);

      expect(result.isValid).toBe(false);
    });
  });

  describe("isHMACRequired", () => {
    it("should check if HMAC required", () => {
      const required = isHMACRequired();

      expect(typeof required).toBe("boolean");
    });
  });
});
