/**
 * Email System Type Definitions
 * Types related to email processing, webhooks, and delivery
 */

// ================================
// Email System Types
// ================================

export interface EmailWebhookEvent {
	type: "bounce" | "complaint" | "delivery" | "open" | "click";
	email: string;
	timestamp: string;
	details: EmailWebhookDetails;
}

export interface EmailWebhookDetails {
	reason?: string;
	bounce_type?: "hard" | "soft";
	bounceType?: "Permanent" | "Temporary"; // Legacy support
	complaint_type?: "spam" | "abuse";
	user_agent?: string;
	ip_address?: string;
	url?: string;
	messageId?: string; // Legacy support
	metadata?: Record<string, unknown>;
}

// Resend webhook event types (raw webhook payload)
export interface ResendWebhookEvent {
	type:
		| "email.bounced"
		| "email.complained"
		| "email.delivered"
		| "email.opened"
		| "email.clicked";
	created_at: string;
	data: {
		email_id: string;
		to: string;
		from: string;
		subject: string;
		bounce?: {
			bounce_type: "permanent" | "temporary";
			diagnostic_code?: string;
		};
		complaint?: {
			complaint_type: string;
			feedback_type?: string;
		};
	};
}

// ================================
// Type Guards
// ================================

export function isEmailWebhookEvent(obj: unknown): obj is EmailWebhookEvent {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"type" in obj &&
		"email" in obj &&
		"timestamp" in obj
	);
}