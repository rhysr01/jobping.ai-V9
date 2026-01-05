import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";

// Resend webhook event types we care about
interface ResendWebhookEvent {
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

// Verify Resend webhook signature
function verifyResendWebhook(
  payload: string,
  signature: string | null,
): boolean {
  if (!signature) return false;

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    apiLogger.warn(
      "RESEND_WEBHOOK_SECRET not configured - webhook verification disabled",
    );
    return true; // Allow in dev/test if secret not set
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    // Resend sends signature as "sha256=<hash>"
    const receivedSignature = signature.replace("sha256=", "");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature),
    );
  } catch (error) {
    apiLogger.error("Webhook signature verification failed", error as Error);
    return false;
  }
}

// Add email to suppression list
async function suppressEmail(
  email: string,
  reason: string,
  eventData?: any,
): Promise<void> {
  const supabase = getDatabaseClient();

  try {
    // First create the table if it doesn't exist
    await supabase.rpc("create_email_suppression_table_if_not_exists");
  } catch (_error) {
    // If the RPC doesn't exist, create the table manually
    apiLogger.debug("Creating email_suppression table...");
    const { error: insertError } = await supabase
      .from("email_suppression")
      .insert({
        user_email: email,
        reason,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.message?.includes("does not exist")) {
        // Table doesn't exist, we'll handle this gracefully
        apiLogger.warn("email_suppression table does not exist yet");
      }
    }
    return;
  }

  // Insert suppression record
  const { error } = await supabase.from("email_suppression").upsert({
    user_email: email,
    reason,
    created_at: new Date().toISOString(),
    event_data: eventData,
  });

  if (error) {
    apiLogger.error("Failed to insert email suppression", error as Error, {
      email,
    });
    throw error;
  }

  apiLogger.info(`Email suppressed`, { email, reason });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("resend-signature");
    const payload = await req.text();

    // Verify webhook signature
    if (!verifyResendWebhook(payload, signature)) {
      apiLogger.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);

    apiLogger.info(`Resend webhook received`, {
      eventType: event.type,
      recipient: event.data.to,
    });

    // Handle different event types
    switch (event.type) {
      case "email.bounced": {
        const bounceType = event.data.bounce?.bounce_type || "unknown";
        const bounceReason =
          event.data.bounce?.diagnostic_code || "No diagnostic code";

        // Suppress on permanent bounces
        if (bounceType === "permanent") {
          await suppressEmail(event.data.to, `bounce_${bounceType}`, {
            email_id: event.data.email_id,
            bounce_type: bounceType,
            diagnostic_code: bounceReason,
            timestamp: event.created_at,
          });
        } else {
          apiLogger.debug(
            `Temporary bounce for ${event.data.to}, not suppressing`,
            { recipient: event.data.to },
          );
        }
        break;
      }

      case "email.complained": {
        const complaintType = event.data.complaint?.complaint_type || "spam";

        await suppressEmail(event.data.to, `complaint_${complaintType}`, {
          email_id: event.data.email_id,
          complaint_type: complaintType,
          feedback_type: event.data.complaint?.feedback_type,
          timestamp: event.created_at,
        });
        break;
      }

      case "email.delivered":
      case "email.opened":
      case "email.clicked":
        // These are positive signals - we might want to track them but not suppress
        apiLogger.debug(`Positive signal received`, {
          eventType: event.type,
          recipient: event.data.to,
        });
        break;

      default:
        apiLogger.debug(`Unhandled webhook event type`, {
          eventType: event.type,
        });
    }

    return NextResponse.json({ success: true, processed: event.type });
  } catch (error) {
    apiLogger.error("Resend webhook processing failed", error as Error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed. This endpoint accepts POST requests only.",
    },
    { status: 405 },
  );
}
