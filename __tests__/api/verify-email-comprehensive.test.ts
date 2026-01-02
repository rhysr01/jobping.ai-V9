import { NextRequest } from "next/server";

jest.mock("@/Utils/emailVerification", () => ({
	verifyVerificationToken: jest.fn(),
	markUserVerified: jest.fn(),
}));

describe("Verify Email API Route – Comprehensive", () => {
	const {
		verifyVerificationToken,
		markUserVerified,
	} = require("@/Utils/emailVerification");
	const { GET } = require("@/app/api/verify-email/route");

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("verifies email with valid token", async () => {
		verifyVerificationToken.mockResolvedValue({ valid: true });
		const request = new NextRequest(
			"http://localhost/api/verify-email?email=user@example.com&token=token123",
		);

		const response = await GET(request);

		// Behavior: GET should redirect to success page (for email link clicks)
		expect(response.status).toBeGreaterThanOrEqual(300);
		expect(response.status).toBeLessThan(400);
		expect(response.headers.get("location")).toContain("signup/success");
		expect(response.headers.get("location")).toContain("verified=true");
		// ✅ Tests outcome (redirect to success), not implementation
	});

	it("rejects requests missing the email parameter", async () => {
		const request = new NextRequest(
			"http://localhost/api/verify-email?token=token123",
		);
		// GET throws ValidationError which asyncHandler converts to 400
		await expect(GET(request)).rejects.toThrow();
	});

	it("rejects requests missing the token parameter", async () => {
		const request = new NextRequest(
			"http://localhost/api/verify-email?email=user@example.com",
		);
		// GET throws ValidationError which asyncHandler converts to 400
		await expect(GET(request)).rejects.toThrow();
	});

	it("propagates verification errors", async () => {
		verifyVerificationToken.mockResolvedValue({
			valid: false,
			reason: "Token expired",
		});
		const request = new NextRequest(
			"http://localhost/api/verify-email?email=user@example.com&token=expired",
		);

		const response = await GET(request);

		// Behavior: Should redirect to error page for invalid/expired tokens
		expect(response.status).toBeGreaterThanOrEqual(300);
		expect(response.status).toBeLessThan(400);
		expect(response.headers.get("location")).toContain("signup/success");
		expect(response.headers.get("location")).toContain("verified=false");
		expect(response.headers.get("location")).toContain("Token expired");
		// ✅ Tests outcome (redirect with error), not implementation
	});
});
