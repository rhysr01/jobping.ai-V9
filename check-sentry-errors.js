// Check Sentry errors for the last 7 days
import { config as dotenvConfig } from "dotenv";
import { SentryMCP } from "./scripts/mcps/sentry-mcp.ts";

// Load environment variables
dotenvConfig({ path: "./.env.local" });

async function checkErrors() {
  console.log("🔍 Checking Sentry errors for the last 7 days...");
  const sentry = new SentryMCP();

  try {
    const result = await sentry.getRecentErrors({ hours: 168, limit: 20 }); // 7 days
    console.log(result.content[0].text);
  } catch (error) {
    console.error("❌ Failed to check Sentry errors:", error.message);
  }
}

checkErrors();