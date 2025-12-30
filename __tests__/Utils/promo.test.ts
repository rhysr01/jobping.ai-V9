import { validatePromoCode } from "@/Utils/promo";

describe("promo", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validatePromoCode", () => {
    it("should accept valid promo code", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode("test123", "user@example.com");
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should use default code if not configured", () => {
      delete process.env.PROMO_CODE;
      const result = validatePromoCode("rhys", "user@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should be case insensitive", () => {
      process.env.PROMO_CODE = "TEST123";
      const result = validatePromoCode("test123", "user@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should reject missing code", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode(undefined, "user@example.com");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("missing_code");
    });

    it("should reject null code", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode(null, "user@example.com");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("missing_code");
    });

    it("should reject empty code", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode("", "user@example.com");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("missing_code");
    });

    it("should reject invalid code", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode("wrong", "user@example.com");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("invalid_code");
    });

    it("should trim whitespace", () => {
      process.env.PROMO_CODE = "test123";
      const result = validatePromoCode("  test123  ", "user@example.com");
      expect(result.isValid).toBe(true);
    });

    describe("email allowlist", () => {
      it("should accept email matching allowlist regex", () => {
        process.env.PROMO_CODE = "test123";
        process.env.PROMO_EMAIL_ALLOWLIST = "^test@";
        const result = validatePromoCode("test123", "test@example.com");
        expect(result.isValid).toBe(true);
      });

      it("should reject email not matching allowlist", () => {
        process.env.PROMO_CODE = "test123";
        process.env.PROMO_EMAIL_ALLOWLIST = "^test@";
        const result = validatePromoCode("test123", "other@example.com");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("email_not_allowed");
      });

      it("should reject invalid regex", () => {
        process.env.PROMO_CODE = "test123";
        process.env.PROMO_EMAIL_ALLOWLIST = "[invalid";
        const result = validatePromoCode("test123", "test@example.com");
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe("invalid_allowlist_regex");
      });

      it("should work without allowlist", () => {
        process.env.PROMO_CODE = "test123";
        delete process.env.PROMO_EMAIL_ALLOWLIST;
        const result = validatePromoCode("test123", "any@example.com");
        expect(result.isValid).toBe(true);
      });
    });
  });
});
