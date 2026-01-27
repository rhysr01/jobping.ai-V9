//  EMAIL SENDER - PRODUCTION READY

import { apiLogger } from "../../lib/api-logger";
import { getBaseUrl } from "../url-helpers";
import { assertValidFrom, EMAIL_CONFIG, getResendClient } from "./clients";
import {
	createJobMatchesEmail,
	createWelcomeEmail,
} from "./productionReadyTemplates";
import type { EmailJobCard } from "./types";

// Subscription confirmation email sender
export async function sendSubscriptionConfirmationEmail(args: {
	to: string;
	userName?: string;
	subscriptionId: string;
}) {
	const startTime = Date.now();

	apiLogger.info("sendSubscriptionConfirmationEmail called", {
		to: args.to,
		subscriptionId: args.subscriptionId,
	});
	console.log(`[EMAIL] sendSubscriptionConfirmationEmail called for ${args.to}`);

	// Check API key BEFORE creating client
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		const error = new Error("RESEND_API_KEY environment variable is not set");
		console.error(`[EMAIL] ❌ Missing API key`);
		apiLogger.error("RESEND_API_KEY missing", error);
		throw error;
	}

	if (!apiKey.startsWith("re_")) {
		const error = new Error(
			`Invalid RESEND_API_KEY format: must start with "re_"`,
		);
		console.error(`[EMAIL] ❌ Invalid API key format`);
		apiLogger.error("Invalid RESEND_API_KEY format", error);
		throw error;
	}

	try {
		const resend = getResendClient();
		console.log(
			`[EMAIL] Resend client initialized for subscription confirmation. API Key present: true`,
		);

		const baseUrl = getBaseUrl();
		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Subscription Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${args.userName || "there"},</p>
      <p>Great news! Your premium subscription to JobPing has been successfully activated.</p>
      
      <div class="success-badge">Premium Plan Active</div>
      
      <h3>What's Included:</h3>
      <ul>
        <li>15 personalized job matches every week</li>
        <li>Delivery on Monday, Wednesday, and Friday mornings</li>
        <li>Advanced filtering and preferences</li>
        <li>Priority support</li>
      </ul>
      
      <p>Your first batch of matches will arrive on your next scheduled delivery day.</p>
      
      <p><a href="${baseUrl}/preferences" class="cta-button">Manage Preferences</a></p>
      
      <div class="footer">
        <p>Thank you for supporting JobPing! If you have any questions, reply to this email or visit our <a href="${baseUrl}">homepage</a>.</p>
        <p>- The JobPing Team</p>
      </div>
    </div>
  </div>
</body>
</html>
		`;

		const textContent = `Hi ${args.userName || "there"},

Your premium subscription to JobPing has been successfully activated!

What's Included:
- 15 personalized job matches every week
- Delivery on Monday, Wednesday, and Friday mornings
- Advanced filtering and preferences
- Priority support

Your first batch of matches will arrive on your next scheduled delivery day.

Manage your preferences: ${baseUrl}/preferences

Thank you for supporting JobPing!
- The JobPing Team`;

		apiLogger.info("Email content generated for subscription confirmation", {
			from: EMAIL_CONFIG.from,
		});
		assertValidFrom(EMAIL_CONFIG.from);

		apiLogger.info("Attempting to send subscription confirmation email", {
			to: args.to,
			from: EMAIL_CONFIG.from,
		});
		console.log(
			`[EMAIL] Attempting to send subscription confirmation email from ${EMAIL_CONFIG.from} to ${args.to}`,
		);

		// Add timeout to prevent hanging
		const sendPromise = resend.emails.send({
			from: EMAIL_CONFIG.from,
			to: [args.to],
			subject: "Welcome to JobPing Premium – Your subscription is active",
			text: textContent,
			html: htmlContent,
		});

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Email send timeout after 15 seconds")),
				15000,
			),
		);

		const result = (await Promise.race([sendPromise, timeoutPromise])) as any;

		// Handle Resend response format
		if (result?.error) {
			throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
		}

		const emailId = result?.data?.id || result?.id || "unknown";

		// Track successful send
		trackEmailSend(true, Date.now() - startTime);
		apiLogger.info("Subscription confirmation email sent successfully", {
			to: args.to,
			emailId,
			duration: Date.now() - startTime,
		});
		console.log(
			`[EMAIL] ✅ Subscription confirmation email sent successfully to ${args.to}. Email ID: ${emailId}`,
		);
		return result;
	} catch (error) {
		// Track failed send
		trackEmailSend(false, Date.now() - startTime);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 10) || "none";
		console.error(
			`[EMAIL] ❌ sendSubscriptionConfirmationEmail failed for ${args.to}:`,
			errorMessage,
		);
		console.error(`[EMAIL] API Key prefix: ${apiKeyPrefix}...`);
		console.error(`[EMAIL] Error stack:`, errorStack);
		apiLogger.error("sendSubscriptionConfirmationEmail failed", error as Error, {
			to: args.to,
			errorMessage,
			errorStack,
			errorType: error?.constructor?.name,
			apiKeyPrefix,
			duration: Date.now() - startTime,
		});
		throw error;
	}
}

// Welcome email sender using production templates
export async function sendWelcomeEmail(args: {
	to: string;
	userName?: string;
	matchCount: number;
	tier?: "free" | "premium";
}) {
	const startTime = Date.now();

	apiLogger.info("sendWelcomeEmail called", {
		to: args.to,
		userName: args.userName,
		matchCount: args.matchCount,
		tier: args.tier,
	});
	console.log(`[EMAIL] sendWelcomeEmail called for ${args.to}`);

	// Check API key BEFORE creating client
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		const error = new Error("RESEND_API_KEY environment variable is not set");
		console.error(`[EMAIL] ❌ Missing API key`);
		apiLogger.error("RESEND_API_KEY missing", error);
		throw error;
	}

	if (!apiKey.startsWith("re_")) {
		const error = new Error(
			`Invalid RESEND_API_KEY format: must start with "re_"`,
		);
		console.error(`[EMAIL] ❌ Invalid API key format`);
		apiLogger.error("Invalid RESEND_API_KEY format", error);
		throw error;
	}

	try {
		const resend = getResendClient();
		console.log(`[EMAIL] Resend client initialized. API Key present: true`);

		// Use production template
		const matchesLabel = args.matchCount === 1 ? "match" : "matches";
		const htmlContent = createWelcomeEmail(
			args.userName,
			args.matchCount,
			args.to,
		);
		const baseUrl = getBaseUrl();
		const textContent = `Welcome to JobPing!

We've already queued your first ${args.matchCount} ${matchesLabel}. Expect them within the next 24 hours, followed by fresh drops each week.

Tip: add hello@getjobping.com to your contacts so nothing hits spam. Need to tweak your preferences? Visit ${baseUrl}/preferences or reply to this email and we'll help.

- The JobPing Team`;

		apiLogger.info("Email content generated", { from: EMAIL_CONFIG.from });
		assertValidFrom(EMAIL_CONFIG.from);

		apiLogger.info("Attempting to send welcome email", {
			to: args.to,
			from: EMAIL_CONFIG.from,
		});
		console.log(
			`[EMAIL] Attempting to send welcome email from ${EMAIL_CONFIG.from} to ${args.to}`,
		);

		// Add timeout to prevent hanging
		const sendPromise = resend.emails.send({
			from: EMAIL_CONFIG.from,
			to: [args.to],
			subject: `Welcome to JobPing – ${args.matchCount} ${matchesLabel} already in progress`,
			text: textContent,
			html: htmlContent,
		});

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Email send timeout after 15 seconds")),
				15000,
			),
		);

		const result = (await Promise.race([sendPromise, timeoutPromise])) as any;

		// Handle Resend response format
		if (result?.error) {
			throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
		}

		const emailId = result?.data?.id || result?.id || "unknown";

		// Track successful send
		trackEmailSend(true, Date.now() - startTime);
		apiLogger.info("Welcome email sent successfully", {
			to: args.to,
			emailId,
			duration: Date.now() - startTime,
		});
		console.log(
			`[EMAIL] ✅ Welcome email sent successfully to ${args.to}. Email ID: ${emailId}`,
		);
		return result;
	} catch (error) {
		// Track failed send
		trackEmailSend(false, Date.now() - startTime);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 10) || "none";
		console.error(
			`[EMAIL] ❌ sendWelcomeEmail failed for ${args.to}:`,
			errorMessage,
		);
		console.error(`[EMAIL] API Key prefix: ${apiKeyPrefix}...`);
		console.error(`[EMAIL] Error stack:`, errorStack);
		apiLogger.error("sendWelcomeEmail failed", error as Error, {
			to: args.to,
			errorMessage,
			errorStack,
			errorType: error?.constructor?.name,
			apiKeyPrefix,
			duration: Date.now() - startTime,
		});
		throw error;
	}
}

// Type for sendMatchedJobsEmail arguments
export interface SendMatchedJobsEmailArgs {
	to: string;
	jobs: any[];
	userName?: string;
	subscriptionTier?: "free" | "premium";
	isSignupEmail?: boolean;
	subjectOverride?: string;
	userPreferences?: {
		career_path?: string | string[];
		target_cities?: string[];
		visa_status?: string;
		entry_level_preference?: string;
		work_environment?: string | string[];
	};
}

// Job matches email sender using production templates
export async function sendMatchedJobsEmail(args: SendMatchedJobsEmailArgs) {
	const startTime = Date.now();

	apiLogger.info("sendMatchedJobsEmail called", {
		to: args.to,
		jobsCount: args.jobs.length,
		userName: args.userName,
		isSignupEmail: args.isSignupEmail,
	});
	console.log(
		`[EMAIL] sendMatchedJobsEmail called for ${args.to} with ${args.jobs.length} jobs`,
	);

	// Check API key BEFORE creating client
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		const error = new Error("RESEND_API_KEY environment variable is not set");
		console.error(`[EMAIL] ❌ Missing API key`);
		apiLogger.error("RESEND_API_KEY missing", error);
		throw error;
	}

	if (!apiKey.startsWith("re_")) {
		const error = new Error(
			`Invalid RESEND_API_KEY format: must start with "re_"`,
		);
		console.error(`[EMAIL] ❌ Invalid API key format`);
		apiLogger.error("Invalid RESEND_API_KEY format", error);
		throw error;
	}

	try {
		const resend = getResendClient();
		console.log(
			`[EMAIL] Resend client initialized for matched jobs. API Key present: true`,
		);

		// Convert jobs to EmailJobCard format for template
		// Include ALL fields needed for email template (tags, formatting, etc.)
		const jobCards: EmailJobCard[] = args.jobs.map((job) => ({
			job: {
				id: job.id || "",
				title: job.title || "Job Title",
				company: job.company || "Company",
				location: job.location || "Location",
				description: job.description || "",
				job_url: job.job_url || job.jobUrl || "",
				job_hash: job.job_hash || job.jobHash || "", // Explicitly include job_hash for feedback
				user_email: args.to,
				// Fields needed for formatJobTags
				career_path: job.career_path,
				careerPath: job.careerPath,
				primary_category:
					job.primary_category ||
					(Array.isArray(job.categories) ? job.categories[0] : undefined),
				categories: job.categories || [],
				career_paths: job.career_paths || job.categories || [],
				work_environment: job.work_environment,
				work_arrangement: job.work_arrangement,
				work_mode: job.work_mode,
				employment_type: job.employment_type,
				job_type: job.job_type,
				contract_type: job.contract_type,
				source: job.source,
				language_requirement: job.language_requirement,
				language: job.language,
				primary_language: job.primary_language,
				salary_min: job.salary_min,
				salary_max: job.salary_max,
				salary: job.salary,
				salary_currency: job.salary_currency,
				currency: job.currency,
				compensation_min: job.compensation_min,
				compensation_max: job.compensation_max,
				// Include any other fields that might be present
				...(job as any),
			},
			matchResult: {
				match_score: job.match_score || 85,
				reasoning:
					job.reasoning ||
					job.match_reason ||
					"AI-matched based on your preferences",
			},
			isConfident: (job.match_score || 85) >= 80,
			isPromising: (job.match_score || 85) >= 70,
			hasManualLocator: false,
			searchHint: job.search_hint || "",
		}));

		const subject =
			args.subjectOverride ||
			`Your ${args.jobs.length} New Job Matches - JobPing`;

		// Use production template
		// Note: createJobMatchesEmail accepts 6 parameters: jobCards, userName, subscriptionTier, isSignupEmail, userEmail, userPreferences
		// Pass all parameters explicitly to ensure TypeScript recognizes all 6 parameters
		const htmlContent = createJobMatchesEmail(
			jobCards,
			args.userName ?? undefined,
			args.subscriptionTier ?? "free",
			args.isSignupEmail ?? false,
			args.to ?? undefined,
			args.userPreferences ?? undefined,
		);

		const textContent = `Hi ${args.userName || "there"},\n\nHere are your latest job matches:\n\n${args.jobs.map((job, i) => `${i + 1}. ${job.title} at ${job.company}`).join("\n")}`;

		apiLogger.info("Email content generated for matched jobs", {
			from: EMAIL_CONFIG.from,
			subject,
		});
		assertValidFrom(EMAIL_CONFIG.from);

		apiLogger.info("Attempting to send matched jobs email", {
			to: args.to,
			from: EMAIL_CONFIG.from,
		});
		console.log(
			`[EMAIL] Attempting to send matched jobs email from ${EMAIL_CONFIG.from} to ${args.to}`,
		);

		// Add timeout to prevent hanging
		const sendPromise = resend.emails.send({
			from: EMAIL_CONFIG.from,
			to: [args.to],
			subject,
			text: textContent,
			html: htmlContent,
		});

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Email send timeout after 15 seconds")),
				15000,
			),
		);

		const result = (await Promise.race([sendPromise, timeoutPromise])) as any;

		// Handle Resend response format
		if (result?.error) {
			throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
		}

		const emailId = result?.data?.id || result?.id || "unknown";

		// Track successful send
		trackEmailSend(true, Date.now() - startTime);
		apiLogger.info("Matched jobs email sent successfully", {
			to: args.to,
			emailId,
			jobsCount: args.jobs.length,
			duration: Date.now() - startTime,
		});
		console.log(
			`[EMAIL] ✅ Matched jobs email sent successfully to ${args.to}. Email ID: ${emailId}`,
		);
		return result;
	} catch (error) {
		// Track failed send
		trackEmailSend(false, Date.now() - startTime);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 10) || "none";
		console.error(
			`[EMAIL] ❌ sendMatchedJobsEmail failed for ${args.to}:`,
			errorMessage,
		);
		console.error(`[EMAIL] API Key prefix: ${apiKeyPrefix}...`);
		console.error(`[EMAIL] Error stack:`, errorStack);
		apiLogger.error("sendMatchedJobsEmail failed", error as Error, {
			to: args.to,
			jobsCount: args.jobs.length,
			errorMessage,
			errorStack,
			errorType: error?.constructor?.name,
			apiKeyPrefix,
			duration: Date.now() - startTime,
		});
		throw error;
	}
}

// Retry configuration
const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	backoffMultiplier: 2,
};

// Exponential backoff retry function
async function withRetry<T>(
	operation: () => Promise<T>,
	maxRetries: number = RETRY_CONFIG.maxRetries,
): Promise<T> {
	let lastError: Error;
	// let _retryCount = 0; // Kept for future use
	// let _rateLimited = false; // Kept for future use

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;
			// _retryCount = attempt; // Kept for future use

			// Check for rate limiting
			if (error instanceof Error && error.message.includes("rate limit")) {
				// _rateLimited = true; // Kept for future use
			}

			if (attempt === maxRetries) {
				throw lastError;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(
				RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffMultiplier ** attempt,
				RETRY_CONFIG.maxDelay,
			);

			apiLogger.warn(
				`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms`,
				error as Error,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}

// Batch email sender with retry logic and rate limiting
export async function sendBatchEmails(
	emails: Array<{
		to: string;
		jobs: any[];
		userName?: string;
		subscriptionTier?: "free" | "premium";
		isSignupEmail?: boolean;
	}>,
	concurrency: number = 3,
): Promise<any[]> {
	const results: any[] = [];
	let rateLimitDelay = 0;

	// Process emails in batches for controlled concurrency
	for (let i = 0; i < emails.length; i += concurrency) {
		const batch = emails.slice(i, i + concurrency);

		// Apply rate limiting delay if needed
		if (rateLimitDelay > 0) {
			await new Promise((resolve) => setTimeout(resolve, rateLimitDelay));
			rateLimitDelay = 0; // Reset after applying delay
		}

		const batchPromises = batch.map(async (emailData) => {
			const startTime = Date.now();
			const retryCount = 0;
			let rateLimited = false;

			try {
				return await withRetry(() => sendMatchedJobsEmail(emailData));
			} catch (error) {
				// Check for rate limiting errors
				if (error instanceof Error && error.message.includes("rate limit")) {
					rateLimitDelay = 5000; // 5 second delay for next batch
					rateLimited = true;
				}

				// Track failed send with retry info
				trackEmailSend(false, Date.now() - startTime, retryCount, rateLimited);

				return {
					error: error instanceof Error ? error.message : "Unknown error",
					email: emailData.to,
					status: "failed",
				};
			}
		});

		const batchResults = await Promise.allSettled(batchPromises);
		results.push(
			...batchResults.map((result) =>
				result.status === "fulfilled" ? result.value : result.reason,
			),
		);

		// Adaptive delay between batches (longer if we hit rate limits)
		const delay = rateLimitDelay > 0 ? 2000 : 500; // 2s if rate limited, 500ms otherwise
		if (i + concurrency < emails.length) {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return results;
}

// Real performance monitoring
interface EmailMetrics {
	totalSent: number;
	totalFailed: number;
	retryAttempts: number;
	rateLimitHits: number;
	averageResponseTime: number;
	lastReset: Date;
}

const emailMetrics: EmailMetrics = {
	totalSent: 0,
	totalFailed: 0,
	retryAttempts: 0,
	rateLimitHits: 0,
	averageResponseTime: 0,
	lastReset: new Date(),
};

// Track email send attempt
function trackEmailSend(
	success: boolean,
	responseTime: number,
	retries: number = 0,
	rateLimited: boolean = false,
) {
	if (success) {
		emailMetrics.totalSent++;
	} else {
		emailMetrics.totalFailed++;
	}

	emailMetrics.retryAttempts += retries;
	if (rateLimited) {
		emailMetrics.rateLimitHits++;
	}

	// Update average response time
	const totalAttempts = emailMetrics.totalSent + emailMetrics.totalFailed;
	emailMetrics.averageResponseTime =
		(emailMetrics.averageResponseTime * (totalAttempts - 1) + responseTime) /
		totalAttempts;
}

export const EMAIL_PERFORMANCE_METRICS = {
	getTotalSent: () => emailMetrics.totalSent,
	getTotalFailed: () => emailMetrics.totalFailed,
	getSuccessRate: () => {
		const total = emailMetrics.totalSent + emailMetrics.totalFailed;
		return total > 0
			? `${((emailMetrics.totalSent / total) * 100).toFixed(1)}%`
			: "0%";
	},
	getRetryAttempts: () => emailMetrics.retryAttempts,
	getRateLimitHits: () => emailMetrics.rateLimitHits,
	getAverageResponseTime: () =>
		`${emailMetrics.averageResponseTime.toFixed(0)}ms`,
	getMetrics: () => ({ ...emailMetrics }),
	reset: () => {
		emailMetrics.totalSent = 0;
		emailMetrics.totalFailed = 0;
		emailMetrics.retryAttempts = 0;
		emailMetrics.rateLimitHits = 0;
		emailMetrics.averageResponseTime = 0;
		emailMetrics.lastReset = new Date();
	},
};

// Export tracking function for internal use
export { trackEmailSend };
