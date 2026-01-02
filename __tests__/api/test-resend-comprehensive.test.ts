/**
 * Comprehensive tests for Test Resend API Route
 * Tests Resend API key validation, test email sending
 */

import { NextRequest } from "next/server";

jest.mock("@/Utils/email/clients", () => ({
	getResendClient: jest.fn(),
	EMAIL_CONFIG: { from: "JobPing <noreply@getjobping.com>" },
	assertValidFrom: jest.fn(),
}));

describe("Test Resend API Route", () => {
	let GET: any;
	let mockResend: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockResend = {
			domains: {
				list: jest.fn().mockResolvedValue({ data: [] }),
			},
			emails: {
				send: jest
					.fn()
					.mockResolvedValue({ data: { id: "test_email_123" }, error: null }),
			},
		};

		const { getResendClient } = require("@/Utils/email/clients");
		getResendClient.mockReturnValue(mockResend);

		GET = require("@/app/api/test-resend/route").GET;
	});

	describe("GET /api/test-resend", () => {
		it("should report configuration error when API key missing", async () => {
			delete process.env.RESEND_API_KEY;

			const req = new NextRequest("http://localhost/api/test-resend");
			const response = await GET(req);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("RESEND_API_KEY not configured");
		});

		it("should send diagnostics when configured", async () => {
			process.env.RESEND_API_KEY = "re_test_key";

			const req = new NextRequest("http://localhost/api/test-resend");
			const response = await GET(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.summary).toBeDefined();
			expect(mockResend.domains.list).toHaveBeenCalled();
			expect(mockResend.emails.send).toHaveBeenCalled();
		});
	});

	afterEach(() => {
		delete process.env.RESEND_API_KEY;
	});
});
