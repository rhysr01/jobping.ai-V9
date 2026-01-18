import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { GitHubMCP } from "./github-mcp.ts";
import { SentryMCP } from "./sentry-mcp.ts";
import { VercelMCP } from "./vercel-mcp.ts";
import { SupabaseMCP } from "./supabase-mcp.ts";
import { BraveSearchMCP } from "./bravesearch-mcp.ts";
import { PuppeteerMCP } from "./puppeteer-mcp.ts";

// Load environment variables from .env.local
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

class JobPingMCPServer {
  private server: Server;
  private github: GitHubMCP;
  private sentry: SentryMCP;
  private vercel: VercelMCP;
  private supabase: SupabaseMCP;
  private bravesearch: BraveSearchMCP;
  private puppeteer: PuppeteerMCP;

  constructor() {
    try {
      this.github = new GitHubMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize GitHub MCP:", error.message);
      this.github = null as any;
    }

    try {
      this.sentry = new SentryMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize Sentry MCP:", error.message);
      this.sentry = null as any;
    }

    try {
      this.vercel = new VercelMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize Vercel MCP:", error.message);
      this.vercel = null as any;
    }

    try {
      this.supabase = new SupabaseMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize Supabase MCP:", error.message);
      this.supabase = null as any;
    }

    try {
      this.bravesearch = new BraveSearchMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize BraveSearch MCP:", error.message);
      this.bravesearch = null as any;
    }

    try {
      this.puppeteer = new PuppeteerMCP();
    } catch (error) {
      console.warn("⚠️  Failed to initialize Puppeteer MCP:", error.message);
      this.puppeteer = null as any;
    }

    this.server = new Server(
      {
        name: "jobping-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // GitHub tools
          {
            name: "github_create_issue",
            description: "Create a GitHub issue with error details",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                body: { type: "string" },
                labels: { type: "array", items: { type: "string" } },
                assignees: { type: "array", items: { type: "string" } },
              },
              required: ["title", "body"],
            },
          },
          {
            name: "github_get_recent_issues",
            description: "Get recent GitHub issues",
            inputSchema: {
              type: "object",
              properties: {
                state: { type: "string", enum: ["open", "closed", "all"] },
                limit: { type: "number", default: 10 },
              },
            },
          },
          {
            name: "github_search_issues",
            description: "Search GitHub issues by query",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                limit: { type: "number", default: 10 },
              },
              required: ["query"],
            },
          },

          // Sentry tools
          {
            name: "sentry_get_recent_errors",
            description: "Get recent Sentry errors",
            inputSchema: {
              type: "object",
              properties: {
                hours: { type: "number", default: 24 },
                limit: { type: "number", default: 50 },
              },
            },
          },
          {
            name: "sentry_analyze_error_patterns",
            description: "Analyze error patterns in Sentry",
            inputSchema: {
              type: "object",
              properties: {
                days: { type: "number", default: 7 },
              },
            },
          },
          {
            name: "sentry_get_error_details",
            description: "Get detailed information about a specific Sentry error",
            inputSchema: {
              type: "object",
              properties: {
                errorId: { type: "string" },
              },
              required: ["errorId"],
            },
          },

          // Vercel tools
          {
            name: "vercel_get_deployments",
            description: "Get recent Vercel deployments",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", default: 10 },
              },
            },
          },
          {
            name: "vercel_check_deployment_status",
            description: "Check status of a specific deployment",
            inputSchema: {
              type: "object",
              properties: {
                deploymentId: { type: "string" },
              },
              required: ["deploymentId"],
            },
          },
          {
            name: "vercel_get_logs",
            description: "Get logs for a specific deployment",
            inputSchema: {
              type: "object",
              properties: {
                deploymentId: { type: "string" },
                limit: { type: "number", default: 100 },
              },
              required: ["deploymentId"],
            },
          },

          // Supabase tools
          {
            name: "supabase_query_users",
            description: "Query users from Supabase database",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", default: 10 },
                offset: { type: "number", default: 0 },
                filters: { type: "object" },
              },
            },
          },
          {
            name: "supabase_get_user_details",
            description: "Get detailed information about a specific user",
            inputSchema: {
              type: "object",
              properties: {
                userId: { type: "string" },
              },
              required: ["userId"],
            },
          },
          {
            name: "supabase_query_jobs",
            description: "Query jobs from Supabase database",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", default: 10 },
                offset: { type: "number", default: 0 },
                filters: { type: "object" },
              },
            },
          },
          {
            name: "supabase_get_table_stats",
            description: "Get statistics about database tables",
            inputSchema: {
              type: "object",
              properties: {
                tables: { type: "array", items: { type: "string" } },
              },
            },
          },
          {
            name: "supabase_run_maintenance_migrations",
            description: "Execute database maintenance migrations for data quality and filtering",
            inputSchema: {
              type: "object",
              properties: {
                run_all: {
                  type: "boolean",
                  default: false,
                  description: "Run all maintenance migrations (true) or just latest (false)"
                },
                specific_migration: {
                  type: "string",
                  enum: ["latest", "company_names", "location_extraction", "job_board_filter", "ceo_executive", "construction", "medical", "legal", "teaching", "rls_security"],
                  description: "Run a specific migration type instead of all"
                },
              },
            },
          },

          // Automation workflows
          {
            name: "daily_health_summary",
            description: "Get a comprehensive daily health report combining GitHub issues, Sentry errors, and system metrics",
            inputSchema: {
              type: "object",
              properties: {
                days: { type: "number", default: 1 },
                include_metrics: { type: "boolean", default: true },
              },
            },
          },

          // BraveSearch tools
          {
            name: "bravesearch_web_search",
            description: "Search the web using BraveSearch for information, documentation, or research",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                count: { type: "number", default: 10 },
                safesearch: { type: "string", enum: ["strict", "moderate", "off"], default: "moderate" },
              },
              required: ["query"],
            },
          },
          {
            name: "bravesearch_research_topic",
            description: "Research a topic with comprehensive web search including statistics and data",
            inputSchema: {
              type: "object",
              properties: {
                topic: { type: "string" },
                include_stats: { type: "boolean", default: true },
                count: { type: "number", default: 15 },
              },
              required: ["topic"],
            },
          },
          {
            name: "bravesearch_find_solutions",
            description: "Find solutions and fixes for technical problems or errors",
            inputSchema: {
              type: "object",
              properties: {
                problem: { type: "string" },
                technology: { type: "string" },
                count: { type: "number", default: 10 },
              },
              required: ["problem"],
            },
          },
          {
            name: "bravesearch_tech_documentation",
            description: "Find official documentation and guides for technologies",
            inputSchema: {
              type: "object",
              properties: {
                technology: { type: "string" },
                topic: { type: "string" },
                count: { type: "number", default: 8 },
              },
              required: ["technology", "topic"],
            },
          },

          // Puppeteer tools
          {
            name: "puppeteer_take_screenshot",
            description: "Take a screenshot of a webpage with customizable viewport and options",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string" },
                viewport: {
                  type: "object",
                  properties: {
                    width: { type: "number", default: 1280 },
                    height: { type: "number", default: 720 },
                  },
                  default: { width: 1280, height: 720 }
                },
                fullPage: { type: "boolean", default: false },
                selector: { type: "string" },
              },
              required: ["url"],
            },
          },
          {
            name: "puppeteer_analyze_design",
            description: "Analyze the design and UX of a webpage, providing detailed feedback",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string" },
                compareWith: { type: "string" },
              },
              required: ["url"],
            },
          },
          {
            name: "puppeteer_compare_pages",
            description: "Compare two webpages and analyze design differences",
            inputSchema: {
              type: "object",
              properties: {
                url1: { type: "string" },
                url2: { type: "string" },
                aspect: { type: "string", enum: ["design", "ux", "performance"], default: "design" },
              },
              required: ["url1", "url2"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "github_create_issue":
            return this.github ? await this.github.createIssue(args) : this.getServiceUnavailableResponse("GitHub");
          case "github_get_recent_issues":
            return this.github ? await this.github.getRecentIssues(args) : this.getServiceUnavailableResponse("GitHub");
          case "github_search_issues":
            return this.github ? await this.github.searchIssues(args) : this.getServiceUnavailableResponse("GitHub");
          case "sentry_get_recent_errors":
            return this.sentry ? await this.sentry.getRecentErrors(args) : this.getServiceUnavailableResponse("Sentry");
          case "sentry_analyze_error_patterns":
            return this.sentry ? await this.sentry.analyzeErrorPatterns(args) : this.getServiceUnavailableResponse("Sentry");
          case "sentry_get_error_details":
            return this.sentry ? await this.sentry.getErrorDetails(args) : this.getServiceUnavailableResponse("Sentry");
          case "vercel_get_deployments":
            return this.vercel ? await this.vercel.getDeployments(args) : this.getServiceUnavailableResponse("Vercel");
          case "vercel_check_deployment_status":
            return this.vercel ? await this.vercel.checkDeploymentStatus(args) : this.getServiceUnavailableResponse("Vercel");
          case "vercel_get_logs":
            return this.vercel ? await this.vercel.getLogs(args) : this.getServiceUnavailableResponse("Vercel");
          case "supabase_query_users":
            return this.supabase ? await this.supabase.queryUsers(args) : this.getServiceUnavailableResponse("Supabase");
          case "supabase_get_user_details":
            return this.supabase ? await this.supabase.getUserDetails(args) : this.getServiceUnavailableResponse("Supabase");
          case "supabase_query_jobs":
            return this.supabase ? await this.supabase.queryJobs(args) : this.getServiceUnavailableResponse("Supabase");
          case "supabase_get_table_stats":
            return this.supabase ? await this.supabase.getTableStats(args) : this.getServiceUnavailableResponse("Supabase");
          case "supabase_run_maintenance_migrations":
            return this.supabase ? await this.supabase.runMaintenanceMigrations(args) : this.getServiceUnavailableResponse("Supabase");
          case "daily_health_summary":
            return await this.getDailyHealthSummary(args);
          case "bravesearch_web_search":
            return this.bravesearch ? await this.bravesearch.webSearch(args) : this.getServiceUnavailableResponse("BraveSearch");
          case "bravesearch_research_topic":
            return this.bravesearch ? await this.bravesearch.researchTopic(args) : this.getServiceUnavailableResponse("BraveSearch");
          case "bravesearch_find_solutions":
            return this.bravesearch ? await this.bravesearch.findSolutions(args) : this.getServiceUnavailableResponse("BraveSearch");
          case "bravesearch_tech_documentation":
            return this.bravesearch ? await this.bravesearch.techDocumentation(args) : this.getServiceUnavailableResponse("BraveSearch");
          case "puppeteer_take_screenshot":
            return this.puppeteer ? await this.puppeteer.takeScreenshot(args) : this.getServiceUnavailableResponse("Puppeteer");
          case "puppeteer_analyze_design":
            return this.puppeteer ? await this.puppeteer.analyzePageDesign(args) : this.getServiceUnavailableResponse("Puppeteer");
          case "puppeteer_compare_pages":
            return this.puppeteer ? await this.puppeteer.comparePages(args) : this.getServiceUnavailableResponse("Puppeteer");
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getDailyHealthSummary(args: any) {
    const { days = 1, include_metrics = true } = args;

    try {
      const hours = days * 24;

      // Get recent GitHub issues
      const githubData = this.github
        ? (await this.github.getRecentIssues({ state: "open", limit: 20 })).content[0].text
        : "GitHub MCP not configured";

      // Get recent Sentry errors
      const sentryData = this.sentry
        ? (await this.sentry.getRecentErrors({ hours, limit: 50 })).content[0].text
        : "Sentry MCP not configured";

      // Get user metrics from Supabase
      const userData = this.supabase
        ? (await this.supabase.getTableStats({ tables: ["users"] })).content[0].text
        : "Supabase MCP not configured";

      // Analyze patterns
      const patternData = this.sentry
        ? (await this.sentry.analyzeErrorPatterns({ days })).content[0].text
        : "Sentry MCP not configured";

      // Generate comprehensive report
      const report = this.generateHealthReport({
        githubData,
        sentryData,
        userData,
        patternData,
        days,
        include_metrics
      });

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to generate daily health summary: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  private generateHealthReport(data: any) {
    const { githubData, sentryData, userData, patternData, days, include_metrics } = data;

    return `# 🏥 JobPing Daily Health Report (${days} day${days > 1 ? 's' : ''})

## 🚨 Critical Issues
${this.extractCriticalIssues(sentryData)}

## 📋 GitHub Status
${this.extractGitHubSummary(githubData)}

## 🔍 Error Analysis
${this.extractErrorSummary(patternData)}

${include_metrics ? `## 📊 System Metrics
${this.extractMetricsSummary(userData)}

## 🎯 Recommendations
${this.generateRecommendations(data)}
` : ''}

---
*Report generated by JobPing MCP Server*`;
  }

  private extractCriticalIssues(sentryData: string): string {
    // Extract fatal/critical errors from Sentry data
    if (sentryData.includes("No errors found")) {
      return "✅ **No critical errors detected** - System is healthy!";
    }

    const criticalPatterns = [
      /fatal|critical|FATAL|CRITICAL/gi,
      /error.*count:\s*\d+/gi,
      /users?:\s*\d+/gi
    ];

    let criticalSummary = "";
    criticalPatterns.forEach(pattern => {
      const matches = sentryData.match(pattern);
      if (matches) {
        criticalSummary += `• ${matches.join(', ')}\n`;
      }
    });

    return criticalSummary || "⚠️  Some errors detected - check details below";
  }

  private extractGitHubSummary(githubData: string): string {
    if (githubData.includes("No issues found")) {
      return "✅ **No open issues** - All good!";
    }

    const issueCount = (githubData.match(/• \*\*#/g) || []).length;
    const recentIssues = githubData.split('\n').slice(0, 5).join('\n');

    return `📊 **${issueCount} open issues**
${recentIssues}`;
  }

  private extractErrorSummary(patternData: string): string {
    const lines = patternData.split('\n');
    const summaryLines = lines.filter(line =>
      line.includes('Total issues:') ||
      line.includes('By Severity:') ||
      line.includes('By Status:')
    );

    return summaryLines.join('\n') || "📈 Error patterns analysis available";
  }

  private extractMetricsSummary(userData: string): string {
    return userData.includes('Count:') ?
      `👥 **User Metrics**\n${userData}` :
      "📊 User metrics available";
  }

  private generateRecommendations(data: any): string {
    const recommendations = [];

    // Check for high error rates
    if (data.sentryData.includes("Count:")) {
      recommendations.push("🔍 **Investigate high error rates** - Check error details for root causes");
    }

    // Check for many open issues
    if (data.githubData.includes("open issues") && !data.githubData.includes("No issues found")) {
      recommendations.push("🎯 **Review open GitHub issues** - Prioritize critical bugs");
    }

    // Check user growth
    if (data.userData.includes("Count:")) {
      recommendations.push("📈 **Monitor user growth** - System handling increased load well");
    }

    return recommendations.length > 0 ?
      recommendations.join('\n') :
      "✅ **All systems operating normally** - No immediate actions needed";
  }

  private getServiceUnavailableResponse(serviceName: string) {
    return {
      content: [
        {
          type: "text",
          text: `⚠️  ${serviceName} MCP not configured. This tool is not available.\n\nPlease check your environment variables and MCP configuration.`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("JobPing MCP Server started with GitHub, Sentry, Vercel, and Supabase support");
  }
}

// Start the server
const server = new JobPingMCPServer();
server.start().catch(console.error);
