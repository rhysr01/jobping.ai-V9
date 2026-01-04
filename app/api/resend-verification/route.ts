import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";
import { sendVerificationEmail } from "@/Utils/emailVerification";

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json();

		if (!email) {
			return NextResponse.json({ error: "Email required" }, { status: 400 });
		}

		const supabase = getDatabaseClient();

		// Verify user exists
		const { data: user, error: userError } = await supabase
			.from("users")
			.select("email, email_verified")
			.eq("email", email)
			.single();

		if (userError || !user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Check if already verified
		if (user.email_verified) {
			return NextResponse.json({
				success: true,
				message: "Email already verified",
				alreadyVerified: true,
			});
		}

		// Send verification email
		await sendVerificationEmail(email);

		apiLogger.info("Verification email resent", { email });

		return NextResponse.json({
			success: true,
			message: "Verification email sent successfully",
		});
	} catch (error) {
		apiLogger.error("Resend verification email error:", error as Error);
		apiLogger.error("Resend verification email failed", error as Error);
		return NextResponse.json(
			{ error: "Failed to resend verification email" },
			{ status: 500 },
		);
	}
}
