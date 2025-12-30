import { type NextRequest, NextResponse } from "next/server";
import { AppError, asyncHandler, ValidationError } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

export const POST = asyncHandler(async (request: NextRequest) => {
	const formData = await request.formData();
	const email = formData.get("email") as string;
	const name = formData.get("name") as string;
	const plan = formData.get("plan") as string;

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		throw new ValidationError("Invalid email format");
	}

	// Use centralized database client
	const supabase = getDatabaseClient();

	// Check if user already exists
	const { data: existingUser } = await supabase
		.from("users")
		.select("email")
		.eq("email", email)
		.single();

	if (existingUser) {
		throw new AppError("Email already registered", 409, "DUPLICATE_EMAIL");
	}

	// Insert new user
	const { data: newUser, error } = await supabase
		.from("users")
		.insert([
			{
				email,
				full_name: name,
				subscription_tier: plan,
				active: true,
				email_verified: false,
				created_at: new Date().toISOString(),
			},
		])
		.select()
		.single();

	if (error) {
		console.error("Database error:", error);
		throw new AppError("Database error", 500, "DB_ERROR", {
			error: error.message,
		});
	}

	return NextResponse.json({
		success: true,
		message: "Subscription successful",
		userId: newUser.id,
	});
});
