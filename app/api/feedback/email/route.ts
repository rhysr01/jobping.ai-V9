import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { apiLogger } from "../../../../lib/api-logger";

// Email feedback interface removed - not currently used

// POST endpoint for email feedback
export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get("action") as
			| "positive"
			| "negative"
			| "neutral";
		const score = parseInt(searchParams.get("score") || "0", 10);
		const email = searchParams.get("email");

		if (!action || !email || Number.isNaN(score)) {
			return NextResponse.json(
				{
					error: "Missing required parameters: action, score, email",
				},
				{ status: 400 },
			);
		}

		if (!["positive", "negative", "neutral"].includes(action)) {
			return NextResponse.json(
				{
					error: "Invalid action. Must be: positive, negative, or neutral",
				},
				{ status: 400 },
			);
		}

		if (score < 1 || score > 5) {
			return NextResponse.json(
				{
					error: "Score must be between 1 and 5",
				},
				{ status: 400 },
			);
		}

		const supabase = getDatabaseClient();

		// Record feedback to user_feedback table
		const { error: feedbackError } = await supabase
			.from("user_feedback")
			.insert({
				user_email: email,
				job_hash: "email_feedback", // Special identifier for email-level feedback
				feedback_type: "match_quality",
				verdict: action,
				relevance_score: score,
				match_quality_score: score,
				explanation: `Email feedback: ${action} (${score}/5)`,
				created_at: new Date().toISOString(),
			});

		if (feedbackError) {
			apiLogger.error("Error recording email feedback:", feedbackError);
			return NextResponse.json(
				{
					error: "Failed to record feedback",
				},
				{ status: 500 },
			);
		}

		// Also record to match_logs for analytics
		const { error: logError } = await supabase.from("match_logs").insert({
			user_email: email,
			success: action === "positive",
			fallback_used: false,
			jobs_processed: 0,
			matches_generated: 0,
			match_type: "email_feedback",
			error_message:
				action === "negative" ? "User provided negative feedback" : null,
			ai_cost_usd: 0,
			ai_model: "email_feedback",
			matches_count: 0,
			processing_time_ms: 0,
			session_id: `email_${Date.now()}`,
			created_at: new Date().toISOString(),
		});

		if (logError) {
			apiLogger.error("Error recording to match_logs:", logError);
			// Don't fail the request - feedback was recorded successfully
		}

		// Return success page
		return new NextResponse(
			`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thank You!</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #0a0a0a; 
            color: #ffffff; 
            text-align: center; 
            padding: 40px 20px;
            margin: 0;
          }
          .container { 
            max-width: 400px; 
            margin: 0 auto; 
            background: #111111; 
            padding: 40px; 
            border-radius: 12px; 
            border: 1px solid rgba(99,102,241,0.2);
          }
          .success { 
            color: #10b981; 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 20px;
          }
          .message { 
            color: #a1a1aa; 
            font-size: 16px; 
            line-height: 1.5;
          }
          .emoji { 
            font-size: 48px; 
            margin-bottom: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">${action === "positive" ? "🎉" : action === "negative" ? "😔" : "👍"}</div>
          <div class="success">Thank You!</div>
          <div class="message">
            Your feedback has been recorded and will help us improve your job matches.
            ${
							action === "positive"
								? "We're glad you found the matches useful!"
								: action === "negative"
									? "We'll work on better matches for you."
									: "Thanks for letting us know!"
						}
          </div>
        </div>
      </body>
      </html>
    `,
			{
				status: 200,
				headers: {
					"Content-Type": "text/html",
				},
			},
		);
	} catch (error) {
		apiLogger.error("Error processing email feedback:", error as Error);
		return NextResponse.json(
			{
				error: "Failed to process feedback",
			},
			{ status: 500 },
		);
	}
}

// GET endpoint for feedback stats (optional)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email");

		if (!email) {
			return NextResponse.json(
				{
					error: "Email parameter required",
				},
				{ status: 400 },
			);
		}

		const supabase = getDatabaseClient();

		// Get feedback stats for the user
		const { data: feedback, error } = await supabase
			.from("user_feedback")
			.select("verdict, relevance_score, created_at")
			.eq("user_email", email)
			.eq("job_hash", "email_feedback")
			.order("created_at", { ascending: false })
			.limit(10);

		if (error) {
			apiLogger.error("Error fetching feedback stats:", error as Error);
			return NextResponse.json(
				{
					error: "Failed to fetch feedback stats",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			feedback: feedback || [],
			count: feedback?.length || 0,
		});
	} catch (error) {
		apiLogger.error("Error fetching feedback stats:", error as Error);
		return NextResponse.json(
			{
				error: "Failed to fetch feedback stats",
			},
			{ status: 500 },
		);
	}
}
