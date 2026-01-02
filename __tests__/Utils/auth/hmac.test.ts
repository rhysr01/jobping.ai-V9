import {
	generateHMAC,
	type HMACVerificationResult,
	hmacSign,
	hmacVerify,
	isHMACRequired,
	verifyHMAC,
} from "@/Utils/auth/hmac";

describe("hmac", () => {
	const originalEnv = process.env;
	const testSecret = "test-secret-key-for-hmac-verification";

	beforeEach(() => {
		process.env = {
			...originalEnv,
			INTERNAL_API_HMAC_SECRET: testSecret,
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("hmacSign", () => {
		it("should generate HMAC signature", () => {
			const signature = hmacSign("test-data");
			expect(signature).toBeDefined();
			expect(typeof signature).toBe("string");
			expect(signature.length).toBeGreaterThan(0);
		});

		it("should generate consistent signatures", () => {
			const sig1 = hmacSign("test-data");
			const sig2 = hmacSign("test-data");
			expect(sig1).toBe(sig2);
		});

		it("should generate different signatures for different data", () => {
			const sig1 = hmacSign("data1");
			const sig2 = hmacSign("data2");
			expect(sig1).not.toBe(sig2);
		});

		it("should use custom secret when provided", () => {
			const sig1 = hmacSign("test", testSecret);
			const sig2 = hmacSign("test", "different-secret");
			expect(sig1).not.toBe(sig2);
		});

		it("should throw error when secret not configured", () => {
			delete process.env.INTERNAL_API_HMAC_SECRET;
			expect(() => hmacSign("test")).toThrow();
			process.env.INTERNAL_API_HMAC_SECRET = testSecret;
		});
	});

	describe("hmacVerify", () => {
		it("should verify valid signature", () => {
			const data = "test-data";
			const signature = hmacSign(data);
			expect(hmacVerify(data, signature)).toBe(true);
		});

		it("should reject invalid signature", () => {
			expect(hmacVerify("test-data", "invalid-signature")).toBe(false);
		});

		it("should reject null signature", () => {
			expect(hmacVerify("test-data", null)).toBe(false);
		});

		it("should verify with custom secret", () => {
			const data = "test-data";
			const signature = hmacSign(data, testSecret);
			expect(hmacVerify(data, signature, testSecret)).toBe(true);
		});

		it("should return false when secret not configured", () => {
			delete process.env.INTERNAL_API_HMAC_SECRET;
			expect(hmacVerify("test", "signature")).toBe(false);
			process.env.INTERNAL_API_HMAC_SECRET = testSecret;
		});
	});

	describe("verifyHMAC", () => {
		it("should verify valid HMAC in production", () => {
			process.env.NODE_ENV = "production";
			const data = "test-data";
			const timestamp = Date.now();
			const signature = hmacSign(`${data}:${timestamp}`);

			const result = verifyHMAC(`${data}:${timestamp}`, signature, timestamp);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should allow missing auth in test mode", () => {
			process.env.NODE_ENV = "test";
			const result = verifyHMAC("test", "", 0);
			expect(result.isValid).toBe(true);
		});

		it("should allow missing auth in development mode", () => {
			process.env.NODE_ENV = "development";
			const result = verifyHMAC("test", "", 0);
			expect(result.isValid).toBe(true);
		});

		it("should reject old timestamps", () => {
			process.env.NODE_ENV = "production";
			const data = "test-data";
			const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
			const signature = hmacSign(`${data}:${oldTimestamp}`);

			const result = verifyHMAC(
				`${data}:${oldTimestamp}`,
				signature,
				oldTimestamp,
				5,
			);
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("too old");
		});

		it("should reject missing signature in production", () => {
			process.env.NODE_ENV = "production";
			const result = verifyHMAC("test", "", Date.now());
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Missing");
		});

		it("should reject invalid signature", () => {
			process.env.NODE_ENV = "production";
			const result = verifyHMAC("test", "invalid", Date.now());
			expect(result.isValid).toBe(false);
			expect(result.error).toContain("Invalid");
		});
	});

	describe("generateHMAC", () => {
		it("should generate HMAC signature", () => {
			const signature = generateHMAC("test-data");
			expect(signature).toBeDefined();
			expect(typeof signature).toBe("string");
		});

		it("should use configured secret", () => {
			const sig1 = generateHMAC("test");
			const sig2 = hmacSign("test");
			expect(sig1).toBe(sig2);
		});
	});

	describe("isHMACRequired", () => {
		it("should require HMAC in production", () => {
			process.env.NODE_ENV = "production";
			expect(isHMACRequired()).toBe(true);
		});

		it("should not require HMAC in test", () => {
			process.env.NODE_ENV = "test";
			expect(isHMACRequired()).toBe(false);
		});

		it("should not require HMAC in development", () => {
			process.env.NODE_ENV = "development";
			expect(isHMACRequired()).toBe(false);
		});
	});
});
