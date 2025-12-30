/**
 * Comprehensive tests for Email Index Module
 * Tests module exports, re-exports
 */

import * as emailModule from "@/Utils/email/index";

describe("Email Index Module", () => {
  it("should export sendWelcomeEmail", () => {
    expect(emailModule.sendWelcomeEmail).toBeDefined();
    expect(typeof emailModule.sendWelcomeEmail).toBe("function");
  });

  it("should export sendMatchedJobsEmail", () => {
    expect(emailModule.sendMatchedJobsEmail).toBeDefined();
    expect(typeof emailModule.sendMatchedJobsEmail).toBe("function");
  });

  it("should export getResendClient", () => {
    expect(emailModule.getResendClient).toBeDefined();
    expect(typeof emailModule.getResendClient).toBe("function");
  });

  it("should export EMAIL_CONFIG", () => {
    expect(emailModule.EMAIL_CONFIG).toBeDefined();
  });
});
