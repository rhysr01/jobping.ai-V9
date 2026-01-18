import * as Sentry from "@sentry/node";

export class SentryMCP {
  private authToken: string;
  private org: string;
  private project: string;

  constructor() {
    this.authToken = process.env.SENTRY_AUTH_TOKEN || "";
    this.org = process.env.SENTRY_ORG || "";
    this.project = process.env.SENTRY_PROJECT || "";

    if (!this.authToken || !this.org || !this.project) {
      console.warn("⚠️  Sentry MCP: Missing environment variables. Sentry tools will not be available.");
      console.warn("Required: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT");
      return;
    }
  }

  async getRecentErrors(args: any) {
    const { hours = 24, limit = 50 } = args;

    try {
      if (!this.authToken) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️  Sentry MCP not configured. Please set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT environment variables.\n\nTo get these:\n1. Go to https://sentry.io/settings/tokens/\n2. Create a new token with 'Read' permissions\n3. Set SENTRY_ORG to your organization slug\n4. Set SENTRY_PROJECT to your project slug`,
            },
          ],
        };
      }

      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const url = `https://sentry.io/api/0/organizations/${this.org}/issues/?statsPeriod=${hours}h`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      // Note: Project filtering disabled due to environment variable mismatch
      // TODO: Fix SENTRY_PROJECT environment variable to match actual project slug
      const recentIssues = issues.slice(0, limit);

      const formattedIssues = recentIssues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        level: issue.level,
        status: issue.status,
        count: issue.count,
        userCount: issue.userCount,
        lastSeen: new Date(issue.lastSeen).toLocaleString(),
        firstSeen: new Date(issue.firstSeen).toLocaleString(),
        url: `https://sentry.io/organizations/${this.org}/issues/${issue.id}/`,
      }));

      return {
        content: [
          {
            type: "text",
            text: `🚨 Recent Sentry errors (last ${hours} hours):\n\n${formattedIssues.length === 0 ? "✅ No errors found in the specified time period." :
              formattedIssues.map((issue: any) =>
                `• **${issue.title}**\n  📊 Count: ${issue.count} | Users: ${issue.userCount}\n  🏷️ Level: ${issue.level} | Status: ${issue.status}\n  📅 Last seen: ${issue.lastSeen}\n  🔗 ${issue.url}\n`
              ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to fetch Sentry errors: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async analyzeErrorPatterns(args: any) {
    const { days = 7 } = args;

    try {
      if (!this.authToken) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Sentry MCP not configured. Please set environment variables first.",
            },
          ],
        };
      }

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const url = `https://sentry.io/api/0/organizations/${this.org}/issues/?statsPeriod=${days * 24}h`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      // Note: Project filtering disabled due to environment variable mismatch
      // TODO: Fix SENTRY_PROJECT environment variable to match actual project slug

      // Analyze patterns
      const patterns = {
        totalIssues: issues.length,
        byLevel: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        topErrors: [] as Array<{ title: string; count: number; level: string }>,
        trending: [] as Array<{ title: string; change: string }>,
      };

      issues.forEach((issue: any) => {
        // Count by level
        patterns.byLevel[issue.level] = (patterns.byLevel[issue.level] || 0) + 1;

        // Count by status
        patterns.byStatus[issue.status] = (patterns.byStatus[issue.status] || 0) + 1;

        // Track top errors
        patterns.topErrors.push({
          title: issue.title,
          count: issue.count,
          level: issue.level,
        });
      });

      // Sort top errors
      patterns.topErrors.sort((a, b) => b.count - a.count);
      patterns.topErrors = patterns.topErrors.slice(0, 10);

      return {
        content: [
          {
            type: "text",
            text: `📊 Sentry Error Analysis (last ${days} days):\n\n**Summary:**\n• Total issues: ${patterns.totalIssues}\n\n**By Severity:**\n${Object.entries(patterns.byLevel).map(([level, count]) =>
              `• ${level}: ${count}`
            ).join('\n')}\n\n**By Status:**\n${Object.entries(patterns.byStatus).map(([status, count]) =>
              `• ${status}: ${count}`
            ).join('\n')}\n\n**Top 10 Errors:**\n${patterns.topErrors.map((error, i) =>
              `${i + 1}. ${error.title}\n   Count: ${error.count} (${error.level})`
            ).join('\n')}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to analyze Sentry patterns: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getErrorDetails(args: any) {
    const { errorId } = args;

    try {
      if (!this.authToken) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Sentry MCP not configured. Please set environment variables first.",
            },
          ],
        };
      }

      const url = `https://sentry.io/api/0/issues/${errorId}/`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issue = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `🔍 Sentry Error Details: ${issue.title}\n\n**Basic Info:**\n• ID: ${issue.id}\n• Level: ${issue.level}\n• Status: ${issue.status}\n• First seen: ${new Date(issue.firstSeen).toLocaleString()}\n• Last seen: ${new Date(issue.lastSeen).toLocaleString()}\n\n**Stats:**\n• Total events: ${issue.count}\n• Affected users: ${issue.userCount}\n• Tags: ${Object.entries(issue.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}\n\n**URL:** https://sentry.io/organizations/${this.org}/issues/${issue.id}/`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to get Sentry error details: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
