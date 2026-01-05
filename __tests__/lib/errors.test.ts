import { type NextRequest, NextResponse } from "next/server";
import {
  AppError,
  asyncHandler,
  handleError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

describe("errors", () => {
  describe("AppError", () => {
    it("should create error with message", () => {
      const error = new AppError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
    });

    it("should create error with custom status code", () => {
      const error = new AppError("Not found", 404);
      expect(error.statusCode).toBe(404);
    });

    it("should create error with code", () => {
      const error = new AppError("Test", 400, "TEST_CODE");
      expect(error.code).toBe("TEST_CODE");
    });

    it("should create error with details", () => {
      const details = { field: "email" };
      const error = new AppError("Test", 400, "TEST", details);
      expect(error.details).toEqual(details);
    });
  });

  describe("ValidationError", () => {
    it("should create validation error", () => {
      const error = new ValidationError("Invalid input");
      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("should include details", () => {
      const error = new ValidationError("Invalid", { field: "email" });
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error", () => {
      const error = new NotFoundError("User");
      expect(error.message).toBe("User not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create unauthorized error", () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe("Unauthorized");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Custom message");
      expect(error.message).toBe("Custom message");
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error", () => {
      const error = new RateLimitError();
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT");
    });

    it("should include retry after", () => {
      const error = new RateLimitError(60);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe("handleError", () => {
    it("should handle AppError", () => {
      const error = new ValidationError("Invalid input");
      const response = handleError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle unknown errors", () => {
      const error = new Error("Unknown error");
      const response = handleError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle non-Error objects", () => {
      const response = handleError("String error");
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe("asyncHandler", () => {
    it("should execute handler successfully", async () => {
      const handler = asyncHandler(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const mockReq = {} as NextRequest;
      const response = await handler(mockReq);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should catch and handle errors", async () => {
      const handler = asyncHandler(async (req: NextRequest) => {
        throw new ValidationError("Test error");
      });

      const mockReq = {
        headers: new Headers(),
      } as NextRequest;
      const response = await handler(mockReq);
      expect(response.status).toBe(400);
    });

    it("should handle thrown errors", async () => {
      const handler = asyncHandler(async (req: NextRequest) => {
        throw new Error("Thrown error");
      });

      const mockReq = {
        headers: new Headers(),
      } as NextRequest;
      const response = await handler(mockReq);
      expect(response.status).toBe(500);
    });
  });
});
