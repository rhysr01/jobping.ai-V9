#!/usr/bin/env node

/**
 * Fetch company logos from Simple Icons (free, open-source)
 * Simple Icons provides SVG logos for major brands
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, "../public/logos/companies");

// Company name to Simple Icons slug mapping
const COMPANY_SLUGS: Record<string, string> = {
	Spotify: "spotify",
	Revolut: "revolut",
	Monzo: "monzo",
	N26: "n26",
	Deliveroo: "deliveroo",
	McKinsey: "mckinseyandcompany",
	Google: "google",
	Amazon: "amazonaws",
	Microsoft: "microsoft",
	Meta: "meta",
	Apple: "apple",
	Stripe: "stripe",
	Notion: "notion",
	Vercel: "vercel",
	GitHub: "github",
	Netflix: "netflix",
	Uber: "uber",
	Airbnb: "airbnb",
	Tesla: "tesla",
	Shopify: "shopify",
	Adobe: "adobe",
	Salesforce: "salesforce",
	Oracle: "oracle",
	IBM: "ibm",
	Accenture: "accenture",
	Deloitte: "deloitte",
	PwC: "pwc",
	EY: "ernstandyoung",
	KPMG: "kpmg",
	BCG: "bostonconsultinggroup",
	// EU Companies
	Klarna: "klarna",
	Zalando: "zalando",
	Wise: "wise",
	SAP: "sap",
	Siemens: "siemens",
	BMW: "bmw",
	Volkswagen: "volkswagen",
	Volvo: "volvo",
	IKEA: "ikea",
	"Just Eat": "justeat",
	Glovo: "glovo",
};

// Simple Icons CDN URL
const SIMPLE_ICONS_CDN = "https://cdn.simpleicons.org";

async function fetchLogo(companyName: string, slug: string): Promise<void> {
	// Use brand color or no color parameter to get colored logos
	// Simple Icons format: /{slug}/{hexcolor} or /{slug} for default color
	const url = `${SIMPLE_ICONS_CDN}/${slug}`;
	const filePath = path.join(LOGOS_DIR, `${slug}.svg`);

	try {
		console.log(`Fetching ${companyName} logo from ${url}...`);
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		let svgContent = await response.text();

		// Ensure SVG has proper viewBox and preserves colors
		if (!svgContent.includes("viewBox") && svgContent.includes("<svg")) {
			svgContent = svgContent.replace("<svg", '<svg viewBox="0 0 24 24"');
		}

		// Ensure directory exists
		if (!fs.existsSync(LOGOS_DIR)) {
			fs.mkdirSync(LOGOS_DIR, { recursive: true });
		}

		// Write SVG file
		fs.writeFileSync(filePath, svgContent, "utf-8");
		console.log(`✅ Saved ${companyName} logo to ${filePath}`);
	} catch (error) {
		console.error(`❌ Failed to fetch ${companyName} logo:`, error);
		// Create a placeholder SVG
		const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#1a1a1a" rx="8"/>
  <text x="50" y="50" font-family="Arial" font-size="12" fill="#666" text-anchor="middle" dominant-baseline="middle">${companyName}</text>
</svg>`;
		fs.writeFileSync(filePath, placeholder, "utf-8");
		console.log(`⚠️  Created placeholder for ${companyName}`);
	}
}

async function main() {
	console.log("🚀 Starting logo fetch...\n");

	// Ensure directory exists
	if (!fs.existsSync(LOGOS_DIR)) {
		fs.mkdirSync(LOGOS_DIR, { recursive: true });
		console.log(`Created directory: ${LOGOS_DIR}\n`);
	}

	const companies = Object.entries(COMPANY_SLUGS);
	console.log(`Fetching ${companies.length} logos...\n`);

	// Fetch logos sequentially to avoid rate limiting
	for (const [companyName, slug] of companies) {
		await fetchLogo(companyName, slug);
		// Small delay to be respectful
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log(`\n✨ Done! Check ${LOGOS_DIR} for logo files.`);
	console.log(
		`\nNote: Some logos might be placeholders if Simple Icons doesn't have them.`,
	);
	console.log(`You can manually add logos by downloading SVGs from:`);
	console.log(`- https://simpleicons.org/`);
	console.log(`- https://logo.dev/`);
	console.log(`- Company official brand assets pages`);
}

main().catch(console.error);
