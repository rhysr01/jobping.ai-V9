#!/usr/bin/env tsx

import { spawn } from "child_process";
import { config as dotenvConfig } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

async function startMCPServer() {
	try {
		// Load environment variables from .env.local
		dotenvConfig({ path: resolve(process.cwd(), ".env.local") });
		// Load environment variables from config
		const configPath = resolve(process.cwd(), "scripts", "mcp-config.json");

		if (!existsSync(configPath)) {
			console.error("❌ MCP config file not found at:", configPath);
			console.error("Please ensure scripts/mcp-config.json exists");
			process.exit(1);
		}

		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		const serverConfig = config.mcpServers["jobping-mcp"];

		if (!serverConfig) {
			console.error(
				"❌ JobPing MCP server configuration not found in config file",
			);
			process.exit(1);
		}

		// Merge environment variables (config values can reference env vars)
		const env = { ...process.env };

		// Replace ${VAR} placeholders with actual environment values
		Object.entries(serverConfig.env).forEach(([key, value]) => {
			if (
				typeof value === "string" &&
				value.startsWith("${") &&
				value.endsWith("}")
			) {
				const envVar = value.slice(2, -1);
				const actualValue = process.env[envVar];
				if (actualValue) {
					env[key] = actualValue;
				} else {
					console.warn(
						`⚠️  Environment variable ${envVar} not set, ${key} will be undefined`,
					);
				}
			} else {
				env[key] = value as string;
			}
		});

		// Check for required environment variables
		const requiredVars = [
			"GITHUB_TOKEN",
			"GITHUB_REPO",
			"SENTRY_AUTH_TOKEN",
			"SENTRY_ORG",
			"SENTRY_PROJECT",
			"VERCEL_ACCESS_TOKEN",
			"NEXT_PUBLIC_SUPABASE_URL",
			"SUPABASE_SERVICE_ROLE_KEY",
			"BRAVE_API_KEY",
		];

		const missingVars = requiredVars.filter((varName) => !env[varName]);
		if (missingVars.length > 0) {
			console.warn("⚠️  Missing environment variables:");
			missingVars.forEach((varName) => {
				console.warn(`   - ${varName}`);
			});
			console.warn(
				"Some MCP features may not work. Please set these in your environment.",
			);
		}

		// Start the MCP server
		const serverPath = resolve(process.cwd(), serverConfig.args[0]);
		if (!existsSync(serverPath)) {
			console.error("❌ MCP server file not found at:", serverPath);
			console.error("Please ensure the MCP server files are properly created");
			process.exit(1);
		}

		const child = spawn(serverConfig.command, [serverPath], {
			stdio: ["pipe", "pipe", "pipe"],
			env,
			cwd: process.cwd(),
		});

		console.log("🚀 JobPing MCP Server starting...");
		console.log("📍 Config file:", configPath);
		console.log("📁 Working directory:", process.cwd());
		console.log("");

		// Display available tools
		console.log("🔧 Available MCP Tools:");
		console.log("");

		console.log("📋 GitHub Tools:");
		console.log(
			"  • github_create_issue - Create GitHub issues with error details",
		);
		console.log("  • github_get_recent_issues - Get recent GitHub issues");
		console.log("  • github_search_issues - Search GitHub issues by query");
		console.log("");

		console.log("🚨 Sentry Tools:");
		console.log("  • sentry_get_recent_errors - Get recent Sentry errors");
		console.log("  • sentry_analyze_error_patterns - Analyze error patterns");
		console.log(
			"  • sentry_get_error_details - Get detailed error information",
		);
		console.log("");

		console.log("🚀 Vercel Tools:");
		console.log("  • vercel_get_deployments - Get recent Vercel deployments");
		console.log("  • vercel_check_deployment_status - Check deployment status");
		console.log("  • vercel_get_logs - Get deployment logs");
		console.log("");

		console.log("💾 Supabase Tools:");
		console.log("  • supabase_query_users - Query users from database");
		console.log(
			"  • supabase_get_user_details - Get detailed user information",
		);
		console.log("  • supabase_query_jobs - Query jobs from database");
		console.log("  • supabase_get_table_stats - Get database table statistics");
		console.log("  • supabase_run_maintenance_migrations - Execute database maintenance");
		console.log("");

		console.log("🔍 BraveSearch Tools:");
		console.log("  • bravesearch_web_search - Search the web for information");
		console.log(
			"  • bravesearch_research_topic - Comprehensive topic research",
		);
		console.log("  • bravesearch_find_solutions - Find technical solutions");
		console.log(
			"  • bravesearch_tech_documentation - Find official documentation",
		);
		console.log("");

		console.log("🤖 Automation Workflows:");
		console.log(
			"  • daily_health_summary - Get comprehensive daily health report",
		);
		console.log("");

		console.log("🎨 Puppeteer Tools:");
		console.log("  • puppeteer_take_screenshot - Capture webpage screenshots");
		console.log("  • puppeteer_analyze_design - Analyze page design and UX");
		console.log("  • puppeteer_compare_pages - Compare two webpages");
		console.log("");

		console.log("✅ Server started successfully (PID:", child.pid, ")");
		console.log("💡 Configure Claude Desktop to connect to this MCP server");
		console.log("");

		// Handle process termination
		process.on("SIGINT", () => {
			console.log("\n🛑 Shutting down MCP server...");
			child.kill("SIGINT");
			process.exit(0);
		});

		process.on("SIGTERM", () => {
			console.log("\n🛑 Shutting down MCP server...");
			child.kill("SIGTERM");
			process.exit(0);
		});

		// Forward child process output
		child.stdout.on("data", (data) => {
			const output = data.toString();
			if (!output.includes("JobPing MCP Server started")) {
				console.log("📤", output.trim());
			}
		});

		child.stderr.on("data", (data) => {
			console.error("📥", data.toString().trim());
		});

		child.on("close", (code) => {
			console.log(`\n🛑 MCP server exited with code ${code}`);
			process.exit(code || 0);
		});

		child.on("error", (error) => {
			console.error("❌ Failed to start MCP server:", error);
			process.exit(1);
		});
	} catch (error) {
		console.error("❌ Failed to start MCP server:", error);
		process.exit(1);
	}
}

startMCPServer();
