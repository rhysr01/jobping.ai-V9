/**
 * Production-grade company logo mapping
 * Maps company names to their logo file paths
 * Only includes top 30 companies we've actually sent matches from
 */

export interface CompanyLogo {
	name: string;
	logoPath: string;
	domain?: string;
}

// Curated list of companies we've sent matches from
// Only includes companies with real logos (no placeholders)
export const COMPANY_LOGOS: CompanyLogo[] = [
	{
		name: "Spotify",
		logoPath: "/logos/companies/spotify.svg",
		domain: "spotify.com",
	},
	{
		name: "Revolut",
		logoPath: "/logos/companies/revolut.svg",
		domain: "revolut.com",
	},
	{
		name: "Monzo",
		logoPath: "/logos/companies/monzo.svg",
		domain: "monzo.com",
	},
	{ name: "N26", logoPath: "/logos/companies/n26.svg", domain: "n26.com" },
	{
		name: "Deliveroo",
		logoPath: "/logos/companies/deliveroo.svg",
		domain: "deliveroo.co.uk",
	},
	{
		name: "Google",
		logoPath: "/logos/companies/google.svg",
		domain: "google.com",
	},
	{ name: "Meta", logoPath: "/logos/companies/meta.svg", domain: "meta.com" },
	{
		name: "Apple",
		logoPath: "/logos/companies/apple.svg",
		domain: "apple.com",
	},
	{
		name: "Stripe",
		logoPath: "/logos/companies/stripe.svg",
		domain: "stripe.com",
	},
	{
		name: "Notion",
		logoPath: "/logos/companies/notion.svg",
		domain: "notion.so",
	},
	{
		name: "Vercel",
		logoPath: "/logos/companies/vercel.svg",
		domain: "vercel.com",
	},
	{
		name: "GitHub",
		logoPath: "/logos/companies/github.svg",
		domain: "github.com",
	},
	{
		name: "Netflix",
		logoPath: "/logos/companies/netflix.svg",
		domain: "netflix.com",
	},
	{ name: "Uber", logoPath: "/logos/companies/uber.svg", domain: "uber.com" },
	{
		name: "Airbnb",
		logoPath: "/logos/companies/airbnb.svg",
		domain: "airbnb.com",
	},
	{
		name: "Tesla",
		logoPath: "/logos/companies/tesla.svg",
		domain: "tesla.com",
	},
	{
		name: "Shopify",
		logoPath: "/logos/companies/shopify.svg",
		domain: "shopify.com",
	},
	{
		name: "Salesforce",
		logoPath: "/logos/companies/salesforce.svg",
		domain: "salesforce.com",
	},
	{
		name: "Accenture",
		logoPath: "/logos/companies/accenture.svg",
		domain: "accenture.com",
	},
	// EU Companies
	{
		name: "Klarna",
		logoPath: "/logos/companies/klarna.svg",
		domain: "klarna.com",
	},
	{
		name: "Zalando",
		logoPath: "/logos/companies/zalando.svg",
		domain: "zalando.com",
	},
	{ name: "Wise", logoPath: "/logos/companies/wise.svg", domain: "wise.com" },
	{ name: "SAP", logoPath: "/logos/companies/sap.svg", domain: "sap.com" },
	{
		name: "Siemens",
		logoPath: "/logos/companies/siemens.svg",
		domain: "siemens.com",
	},
	{ name: "BMW", logoPath: "/logos/companies/bmw.svg", domain: "bmw.com" },
	{
		name: "Volkswagen",
		logoPath: "/logos/companies/volkswagen.svg",
		domain: "volkswagen.com",
	},
	{
		name: "Volvo",
		logoPath: "/logos/companies/volvo.svg",
		domain: "volvo.com",
	},
	{ name: "IKEA", logoPath: "/logos/companies/ikea.svg", domain: "ikea.com" },
	{
		name: "Just Eat",
		logoPath: "/logos/companies/justeat.svg",
		domain: "justeat.com",
	},
	{
		name: "Glovo",
		logoPath: "/logos/companies/glovo.svg",
		domain: "glovo.com",
	},
];

// Runtime validation: Ensure COMPANY_LOGOS is never empty
if (COMPANY_LOGOS.length === 0) {
	throw new Error(
		"[companyLogos] COMPANY_LOGOS array cannot be empty. At least one company logo must be defined.",
	);
}

// Validate logo paths are properly formatted
COMPANY_LOGOS.forEach((logo, index) => {
	if (!logo.logoPath || !logo.logoPath.startsWith("/logos/companies/")) {
		throw new Error(
			`[companyLogos] Invalid logoPath at index ${index}: "${logo.logoPath}". Must start with "/logos/companies/"`,
		);
	}
	if (!logo.name || logo.name.trim().length === 0) {
		throw new Error(
			`[companyLogos] Invalid name at index ${index}: "${logo.name}". Name cannot be empty.`,
		);
	}
});

// Create a lookup map for fast access
const LOGO_MAP = new Map<string, CompanyLogo>();
COMPANY_LOGOS.forEach((company) => {
	LOGO_MAP.set(company.name.toLowerCase().trim(), company);
	if (company.domain) {
		LOGO_MAP.set(company.domain.toLowerCase(), company);
	}
});

/**
 * Get logo for a company name
 * Returns undefined if logo not found (no fallback text)
 */
export function getCompanyLogo(companyName: string): CompanyLogo | undefined {
	if (!companyName) return undefined;

	const normalized = companyName.toLowerCase().trim();

	// Direct match
	if (LOGO_MAP.has(normalized)) {
		return LOGO_MAP.get(normalized);
	}

	// Try partial match (e.g., "Spotify Technology" -> "Spotify")
	// Check if company name contains logo name or vice versa
	for (const [key, logo] of LOGO_MAP.entries()) {
		// Skip domain matches for partial matching
		if (key.includes(".")) continue;

		// Check if normalized name contains the key or key contains normalized name
		if (normalized.includes(key) || key.includes(normalized)) {
			return logo;
		}

		// Also try word boundary matching (e.g., "Spotify AB" -> "Spotify")
		const words = normalized.split(/\s+/);
		for (const word of words) {
			if (word === key || key === word) {
				return logo;
			}
		}
	}

	return undefined;
}

/**
 * Get all companies with logos (for display)
 * GUARANTEED to return at least one logo (validated at module load)
 */
export function getAllCompanyLogos(): CompanyLogo[] {
	// Double-check at runtime (defensive programming)
	if (COMPANY_LOGOS.length === 0) {
		console.error(
			"[companyLogos] CRITICAL: COMPANY_LOGOS is empty! This should never happen.",
		);
		// Return a minimal fallback to prevent complete failure
		return [
			{
				name: "Spotify",
				logoPath: "/logos/companies/spotify.svg",
				domain: "spotify.com",
			},
			{
				name: "Google",
				logoPath: "/logos/companies/google.svg",
				domain: "google.com",
			},
			{
				name: "Apple",
				logoPath: "/logos/companies/apple.svg",
				domain: "apple.com",
			},
		];
	}
	return COMPANY_LOGOS;
}
