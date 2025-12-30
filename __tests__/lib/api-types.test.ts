import {
  type BaseApiResponse,
  createErrorResponse,
  createSuccessResponse,
  type ErrorResponse,
  type SuccessResponse,
} from "@/lib/api-types";

describe("api-types helpers", () => {
  describe("createSuccessResponse", () => {
    it("should create success response", () => {
      const data = { userId: "123" };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it("should include optional message", () => {
      const response = createSuccessResponse({}, "Success message");
      expect(response.message).toBe("Success message");
    });

    it("should include request ID", () => {
      const response = createSuccessResponse({}, undefined, "req-123");
      expect(response.requestId).toBe("req-123");
    });

    it("should have valid timestamp", () => {
      const response = createSuccessResponse({});
      expect(typeof response.timestamp).toBe("string");
      expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response", () => {
      const response = createErrorResponse("Error message");

      expect(response.success).toBe(false);
      expect(response.error).toBe("Error message");
      expect(response.timestamp).toBeDefined();
    });

    it("should include error code", () => {
      const response = createErrorResponse("Error", "ERROR_CODE");
      expect(response.code).toBe("ERROR_CODE");
    });

    it("should include details", () => {
      const details = { field: "email" };
      const response = createErrorResponse("Error", undefined, details);
      expect(response.details).toEqual(details);
    });

    it("should include field", () => {
      const response = createErrorResponse(
        "Error",
        undefined,
        undefined,
        "email",
      );
      expect(response.field).toBe("email");
    });

    it("should include request ID", () => {
      const response = createErrorResponse(
        "Error",
        undefined,
        undefined,
        undefined,
        "req-123",
      );
      expect(response.requestId).toBe("req-123");
    });
  });

  describe("type exports", () => {
    it("should export SuccessResponse type", () => {
      const response: SuccessResponse = {
        success: true,
        data: {},
        timestamp: new Date().toISOString(),
      };
      expect(response).toBeDefined();
    });

    it("should export ErrorResponse type", () => {
      const response: ErrorResponse = {
        success: false,
        error: "Error",
        timestamp: new Date().toISOString(),
      };
      expect(response).toBeDefined();
    });

    it("should export BaseApiResponse type", () => {
      const response: BaseApiResponse = {
        success: true,
        timestamp: new Date().toISOString(),
      };
      expect(response).toBeDefined();
    });
  });
});
