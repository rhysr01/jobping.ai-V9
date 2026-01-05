/**
 * Match Users API Route
 * Main entry point for batch user matching
 *
 * This file now re-exports from the refactored handlers
 * for backward compatibility.
 */

import { type NextRequest, NextResponse } from "next/server";
// import { withAxiom } from "next-axiom"; // Temporarily disabled due to Axiom URL configuration issue
import { matchUsersHandler } from "./handlers";

// Export handlers with Axiom logging
export const POST = matchUsersHandler;

// Enhanced GET endpoint with tier analytics
export async function GET(_req: NextRequest) {
  // Return 405 for GET method as this endpoint is primarily for POST
  return NextResponse.json(
    {
      error:
        "Method not allowed. This endpoint is designed for POST requests only.",
    },
    { status: 405 },
  );
}
