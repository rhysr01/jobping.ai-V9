#!/usr/bin/env tsx
/**
 * Extract and categorize all TODO/FIXME/HACK comments from the codebase
 * 
 * Usage:
 *   tsx scripts/extract-todos.ts > todos.json
 *   tsx scripts/extract-todos.ts --summary
 */

import { readFileSync } from "fs";
import { glob } from "glob";

interface TODO {
	file: string;
	line: number;
	content: string;
	type: "TODO" | "FIXME" | "HACK" | "XXX";
	priority: "critical" | "high" | "medium" | "low" | "unknown";
}

const todos: TODO[] = [];
const ignorePatterns = [
	"node_modules/**",
	".next/**",
	"coverage/**",
	"dist/**",
	"out/**",
	"playwright-report/**",
	"test-results/**",
];

const files = glob.sync("**/*.{ts,tsx,js,jsx,cjs}", {
	ignore: ignorePatterns,
});

files.forEach((file) => {
	try {
		const content = readFileSync(file, "utf-8");
		const lines = content.split("\n");

		lines.forEach((line, index) => {
			const todoMatch = line.match(/TODO[:\s]+(.+)/i);
			const fixmeMatch = line.match(/FIXME[:\s]+(.+)/i);
			const hackMatch = line.match(/HACK[:\s]+(.+)/i);
			const xxxMatch = line.match(/XXX[:\s]+(.+)/i);

			const match = todoMatch || fixmeMatch || hackMatch || xxxMatch;
			if (match) {
				const content = match[1]?.trim() || "";
				const type = todoMatch
					? "TODO"
					: fixmeMatch
						? "FIXME"
						: hackMatch
							? "HACK"
							: "XXX";
				const priority = determinePriority(content);

				todos.push({
					file,
					line: index + 1,
					content,
					type,
					priority,
				});
			}
		});
	} catch (error) {
		console.error(`Error reading ${file}:`, error);
	}
});

function determinePriority(content: string): TODO["priority"] {
	const lower = content.toLowerCase();
	if (
		lower.includes("critical") ||
		lower.includes("security") ||
		lower.includes("bug") ||
		lower.includes("must fix") ||
		lower.includes("blocker")
	) {
		return "critical";
	}
	if (
		lower.includes("high") ||
		lower.includes("important") ||
		lower.includes("should fix")
	) {
		return "high";
	}
	if (lower.includes("low") || lower.includes("nice") || lower.includes("maybe")) {
		return "low";
	}
	if (lower.includes("medium")) {
		return "medium";
	}
	return "unknown";
}

// Output based on command line arguments
const args = process.argv.slice(2);
const summaryOnly = args.includes("--summary");

if (summaryOnly) {
	// Output summary only
	const byPriority = todos.reduce(
		(acc, todo) => {
			acc[todo.priority] = (acc[todo.priority] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const byType = todos.reduce(
		(acc, todo) => {
			acc[todo.type] = (acc[todo.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	console.log("📋 TODO Summary");
	console.log("==============\n");
	console.log("By Priority:");
	Object.entries(byPriority)
		.sort(([, a], [, b]) => b - a)
		.forEach(([priority, count]) => {
			console.log(`  ${priority.padEnd(10)}: ${count}`);
		});

	console.log("\nBy Type:");
	Object.entries(byType)
		.sort(([, a], [, b]) => b - a)
		.forEach(([type, count]) => {
			console.log(`  ${type.padEnd(10)}: ${count}`);
		});

	console.log(`\nTotal: ${todos.length} TODOs found`);

	// Show critical/high priority items
	const criticalHigh = todos.filter(
		(t) => t.priority === "critical" || t.priority === "high",
	);
	if (criticalHigh.length > 0) {
		console.log(`\n⚠️  Critical/High Priority (${criticalHigh.length}):`);
		criticalHigh.forEach((todo) => {
			console.log(`  ${todo.file}:${todo.line} - ${todo.content.substring(0, 60)}`);
		});
	}
} else {
	// Output full JSON
	console.log(JSON.stringify(todos, null, 2));
}

