import { NextResponse } from "next/server";
import { logger } from "../lib/monitoring";
import { matchUsersRequestSchema } from "../app/api/match-users/handlers/validation";

export interface ValidatedMatchUsersRequest {
	userLimit: number;
	jobLimit: number;
	signature?: string;
	timestamp?: number;
}

export function validateMatchUsersRequest(body: any): {
	isValid: boolean;
	data?: ValidatedMatchUsersRequest;
	error?: NextResponse;
} {
	try {
		const parseResult = matchUsersRequestSchema.safeParse(body);

		if (!parseResult.success) {
			logger.warn("Invalid request parameters", {
				metadata: { errors: parseResult.error.issues },
			});

			return {
				isValid: false,
				error: NextResponse.json(
					{
						error: "Invalid request parameters",
						details: parseResult.error.issues,
					},
					{ status: 400 },
				),
			};
		}

		return {
			isValid: true,
			data: parseResult.data,
		};
	} catch (error) {
		logger.error("Request validation error", {
			error: error as Error,
		});

		return {
			isValid: false,
			error: NextResponse.json(
				{
					error: "Validation failed",
					code: "VALIDATION_ERROR",
				},
				{ status: 400 },
			),
		};
	}
}