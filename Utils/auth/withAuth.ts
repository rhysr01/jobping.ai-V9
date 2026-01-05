// Utils/auth/withAuth.ts
import { type NextRequest, NextResponse } from "next/server";

export interface AuthConfig {
  requireSystemKey?: boolean;
  requireUserAuth?: boolean;
  allowedMethods?: string[];
}

export function requireSystemKey(req: NextRequest): void {
  const apiKey = req.headers.get("x-api-key")?.trim();
  const systemKey = process.env.SYSTEM_API_KEY?.trim();

  if (!systemKey) {
    throw new Error("SYSTEM_API_KEY not configured");
  }

  if (!apiKey || apiKey !== systemKey) {
    throw new Error("Unauthorized: Invalid or missing system API key");
  }
}

export function withAuth(
  handler: (_req: NextRequest) => Promise<NextResponse>,
  config: AuthConfig = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Method validation
      if (
        config.allowedMethods &&
        !config.allowedMethods.includes(req.method)
      ) {
        return NextResponse.json(
          { error: "Method not allowed" },
          { status: 405 },
        );
      }

      // System key validation
      if (config.requireSystemKey) {
        requireSystemKey(req);
      }

      // Call the actual handler
      return await handler(req);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";

      if (message.includes("Unauthorized") || message.includes("Invalid")) {
        return NextResponse.json({ error: message }, { status: 401 });
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
