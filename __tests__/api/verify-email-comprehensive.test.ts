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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(verifyVerificationToken).toHaveBeenCalledWith(
      "user@example.com",
      "token123",
    );
    expect(markUserVerified).toHaveBeenCalledWith("user@example.com");
  });

  it("rejects requests missing the email parameter", async () => {
    const request = new NextRequest(
      "http://localhost/api/verify-email?token=token123",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("rejects requests missing the token parameter", async () => {
    const request = new NextRequest(
      "http://localhost/api/verify-email?email=user@example.com",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
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
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.reason).toBe("Token expired");
    expect(markUserVerified).not.toHaveBeenCalled();
  });
});
