import { NextRequest, NextResponse } from "next/server";
import { logger } from "../lib/monitoring";
import { verifyHMACAuth } from "../app/api/match-users/handlers/validation";

export interface AuthenticatedRequest extends NextRequest {
	_rawBody?: string;
}

export async function authenticateRequest(req: NextRequest): Promise<{
	isAuthenticated: boolean;
	error?: NextResponse;
	authenticatedReq?: AuthenticatedRequest;
}> {
	try {
		// HMAC verification
		const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;
		if (!HMAC_SECRET) {
			return {
				isAuthenticated: true, // Allow requests without HMAC in development
			};
		}

		const raw = await req.text();
		const sig = req.headers.get("x-jobping-signature");
		const timestampHeader = req.headers.get("x-jobping-timestamp");
		const timestamp = timestampHeader
			? parseInt(timestampHeader, 10)
			: Date.now();

		const hmacResult = verifyHMACAuth(raw, sig || "", timestamp);
		if (!hmacResult.isValid) {
			logger.warn("HMAC authentication failed", {
				metadata: { error: hmacResult.error },
			});

			return {
				isAuthenticated: false,
				error: NextResponse.json(
					{
						error: "Invalid signature",
						code: "INVALID_SIGNATURE",
						details: hmacResult.error,
					},
					{ status: 401 },
				),
			};
		}

		// Create authenticated request with raw body
		const authenticatedReq: AuthenticatedRequest = Object.assign(req, {
			_rawBody: raw,
		});

		return {
			isAuthenticated: true,
			authenticatedReq,
		};
	} catch (error) {
		logger.error("Authentication middleware error", {
			error: error as Error,
		});

		return {
			isAuthenticated: false,
			error: NextResponse.json(
				{
					error: "Authentication failed",
					code: "AUTH_ERROR",
				},
				{ status: 401 },
			),
		};
	}
}