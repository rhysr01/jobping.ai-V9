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
// Expanded list of premium companies for showcase and matching
export const COMPANY_LOGOS: CompanyLogo[] = [
	// Tech Giants & FAANG
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
		name: "Microsoft",
		logoPath: "/logos/companies/microsoft.svg",
		domain: "microsoft.com",
	},
	{
		name: "Amazon",
		logoPath: "/logos/companies/amazon.svg",
		domain: "amazon.com",
	},
	{
		name: "Netflix",
		logoPath: "/logos/companies/netflix.svg",
		domain: "netflix.com",
	},
	// Unicorns & High-Growth Tech
	{
		name: "Spotify",
		logoPath: "/logos/companies/spotify.svg",
		domain: "spotify.com",
	},
	{
		name: "Stripe",
		logoPath: "/logos/companies/stripe.svg",
		domain: "stripe.com",
	},
	{
		name: "Uber",
		logoPath: "/logos/companies/uber.svg",
		domain: "uber.com",
	},
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
		name: "OpenAI",
		logoPath: "/logos/companies/openai.svg",
		domain: "openai.com",
	},
	{
		name: "Anthropic",
		logoPath: "/logos/companies/anthropic.svg",
		domain: "anthropic.com",
	},
	{
		name: "Discord",
		logoPath: "/logos/companies/discord.svg",
		domain: "discord.com",
	},
	{
		name: "Figma",
		logoPath: "/logos/companies/figma.svg",
		domain: "figma.com",
	},
	{
		name: "Linear",
		logoPath: "/logos/companies/linear.svg",
		domain: "linear.app",
	},
	{
		name: "Vercel",
		logoPath: "/logos/companies/vercel.svg",
		domain: "vercel.com",
	},
	// Enterprise Software
	{
		name: "Salesforce",
		logoPath: "/logos/companies/salesforce.svg",
		domain: "salesforce.com",
	},
	{
		name: "Oracle",
		logoPath: "/logos/companies/oracle.svg",
		domain: "oracle.com",
	},
	{ name: "SAP", logoPath: "/logos/companies/sap.svg", domain: "sap.com" },
	{
		name: "Adobe",
		logoPath: "/logos/companies/adobe.svg",
		domain: "adobe.com",
	},
	{
		name: "IBM",
		logoPath: "/logos/companies/ibm.svg",
		domain: "ibm.com",
	},
	{
		name: "Cisco",
		logoPath: "/logos/companies/cisco.svg",
		domain: "cisco.com",
	},
	{
		name: "VMware",
		logoPath: "/logos/companies/vmware.svg",
		domain: "vmware.com",
	},
	{
		name: "ServiceNow",
		logoPath: "/logos/companies/servicenow.svg",
		domain: "servicenow.com",
	},
	{
		name: "Workday",
		logoPath: "/logos/companies/workday.svg",
		domain: "workday.com",
	},
	{
		name: "Atlassian",
		logoPath: "/logos/companies/atlassian.svg",
		domain: "atlassian.com",
	},
	{
		name: "Slack",
		logoPath: "/logos/companies/slack.svg",
		domain: "slack.com",
	},
	{
		name: "Zoom",
		logoPath: "/logos/companies/zoom.svg",
		domain: "zoom.us",
	},
	{
		name: "Dropbox",
		logoPath: "/logos/companies/dropbox.svg",
		domain: "dropbox.com",
	},
	// Consulting & Professional Services
	{
		name: "McKinsey",
		logoPath: "/logos/companies/mckinsey.svg",
		domain: "mckinsey.com",
	},
	{
		name: "BCG",
		logoPath: "/logos/companies/bostonconsultinggroup.svg",
		domain: "bcg.com",
	},
	{
		name: "Bain",
		logoPath: "/logos/companies/bain.svg",
		domain: "bain.com",
	},
	{
		name: "Deloitte",
		logoPath: "/logos/companies/deloitte.svg",
		domain: "deloitte.com",
	},
	{
		name: "PwC",
		logoPath: "/logos/companies/pwc.svg",
		domain: "pwc.com",
	},
	{
		name: "EY",
		logoPath: "/logos/companies/ernstandyoung.svg",
		domain: "ey.com",
	},
	{
		name: "KPMG",
		logoPath: "/logos/companies/kpmg.svg",
		domain: "kpmg.com",
	},
	{
		name: "Accenture",
		logoPath: "/logos/companies/accenture.svg",
		domain: "accenture.com",
	},
	{
		name: "Capgemini",
		logoPath: "/logos/companies/capgemini.svg",
		domain: "capgemini.com",
	},
	{
		name: "Oliver Wyman",
		logoPath: "/logos/companies/oliverwyman.svg",
		domain: "oliverwyman.com",
	},
	{
		name: "Roland Berger",
		logoPath: "/logos/companies/rolandberger.svg",
		domain: "rolandberger.com",
	},
	// Investment Banking & Finance
	{
		name: "Goldman Sachs",
		logoPath: "/logos/companies/goldmansachs.svg",
		domain: "goldmansachs.com",
	},
	{
		name: "JPMorgan",
		logoPath: "/logos/companies/jpmorgan.svg",
		domain: "jpmorgan.com",
	},
	{
		name: "Morgan Stanley",
		logoPath: "/logos/companies/morganstanley.svg",
		domain: "morganstanley.com",
	},
	{
		name: "Citigroup",
		logoPath: "/logos/companies/citigroup.svg",
		domain: "citi.com",
	},
	{
		name: "Barclays",
		logoPath: "/logos/companies/barclays.svg",
		domain: "barclays.com",
	},
	{
		name: "HSBC",
		logoPath: "/logos/companies/hsbc.svg",
		domain: "hsbc.com",
	},
	{
		name: "Deutsche Bank",
		logoPath: "/logos/companies/deutschebank.svg",
		domain: "db.com",
	},
	{
		name: "Credit Suisse",
		logoPath: "/logos/companies/creditsuisse.svg",
		domain: "credit-suisse.com",
	},
	{
		name: "UBS",
		logoPath: "/logos/companies/ubs.svg",
		domain: "ubs.com",
	},
	{
		name: "BNP Paribas",
		logoPath: "/logos/companies/bnpparibas.svg",
		domain: "bnpparibas.com",
	},
	{
		name: "BlackRock",
		logoPath: "/logos/companies/blackrock.svg",
		domain: "blackrock.com",
	},
	{
		name: "Vanguard",
		logoPath: "/logos/companies/vanguard.svg",
		domain: "vanguard.com",
	},
	// EU Fintech & Neobanks
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
	{ name: "Wise", logoPath: "/logos/companies/wise.svg", domain: "wise.com" },
	{
		name: "Klarna",
		logoPath: "/logos/companies/klarna.svg",
		domain: "klarna.com",
	},
	{
		name: "Nubank",
		logoPath: "/logos/companies/nubank.svg",
		domain: "nubank.com.br",
	},
	{
		name: "Checkout.com",
		logoPath: "/logos/companies/checkout.svg",
		domain: "checkout.com",
	},
	// EU E-commerce & Delivery
	{
		name: "Zalando",
		logoPath: "/logos/companies/zalando.svg",
		domain: "zalando.com",
	},
	{
		name: "Deliveroo",
		logoPath: "/logos/companies/deliveroo.svg",
		domain: "deliveroo.co.uk",
	},
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
	{
		name: "HelloFresh",
		logoPath: "/logos/companies/hellofresh.svg",
		domain: "hellofresh.com",
	},
	{
		name: "ASOS",
		logoPath: "/logos/companies/asos.svg",
		domain: "asos.com",
	},
	{
		name: "Booking.com",
		logoPath: "/logos/companies/booking.svg",
		domain: "booking.com",
	},
	{
		name: "Expedia",
		logoPath: "/logos/companies/expedia.svg",
		domain: "expedia.com",
	},
	// Automotive
	{ name: "BMW", logoPath: "/logos/companies/bmw.svg", domain: "bmw.com" },
	{
		name: "Volkswagen",
		logoPath: "/logos/companies/volkswagen.svg",
		domain: "volkswagen.com",
	},
	{
		name: "Mercedes-Benz",
		logoPath: "/logos/companies/mercedes.svg",
		domain: "mercedes-benz.com",
	},
	{
		name: "Audi",
		logoPath: "/logos/companies/audi.svg",
		domain: "audi.com",
	},
	{
		name: "Volvo",
		logoPath: "/logos/companies/volvo.svg",
		domain: "volvo.com",
	},
	{
		name: "Porsche",
		logoPath: "/logos/companies/porsche.svg",
		domain: "porsche.com",
	},
	{
		name: "Ferrari",
		logoPath: "/logos/companies/ferrari.svg",
		domain: "ferrari.com",
	},
	// Industrial & Manufacturing
	{
		name: "Siemens",
		logoPath: "/logos/companies/siemens.svg",
		domain: "siemens.com",
	},
	{
		name: "Bosch",
		logoPath: "/logos/companies/bosch.svg",
		domain: "bosch.com",
	},
	{
		name: "Philips",
		logoPath: "/logos/companies/philips.svg",
		domain: "philips.com",
	},
	{
		name: "Nestlé",
		logoPath: "/logos/companies/nestle.svg",
		domain: "nestle.com",
	},
	{
		name: "Unilever",
		logoPath: "/logos/companies/unilever.svg",
		domain: "unilever.com",
	},
	{
		name: "L'Oréal",
		logoPath: "/logos/companies/loreal.svg",
		domain: "loreal.com",
	},
	{
		name: "LVMH",
		logoPath: "/logos/companies/lvmh.svg",
		domain: "lvmh.com",
	},
	{
		name: "IKEA",
		logoPath: "/logos/companies/ikea.svg",
		domain: "ikea.com",
	},
	{
		name: "Heineken",
		logoPath: "/logos/companies/heineken.svg",
		domain: "heineken.com",
	},
	// Media & Entertainment
	{
		name: "Disney",
		logoPath: "/logos/companies/disney.svg",
		domain: "disney.com",
	},
	{
		name: "Warner Bros",
		logoPath: "/logos/companies/warnerbros.svg",
		domain: "warnerbros.com",
	},
	{
		name: "BBC",
		logoPath: "/logos/companies/bbc.svg",
		domain: "bbc.com",
	},
	{
		name: "Sky",
		logoPath: "/logos/companies/sky.svg",
		domain: "sky.com",
	},
	{
		name: "Spotify",
		logoPath: "/logos/companies/spotify.svg",
		domain: "spotify.com",
	},
	// Pharmaceuticals & Healthcare
	{
		name: "Roche",
		logoPath: "/logos/companies/roche.svg",
		domain: "roche.com",
	},
	{
		name: "Novartis",
		logoPath: "/logos/companies/novartis.svg",
		domain: "novartis.com",
	},
	{
		name: "GSK",
		logoPath: "/logos/companies/gsk.svg",
		domain: "gsk.com",
	},
	{
		name: "AstraZeneca",
		logoPath: "/logos/companies/astrazeneca.svg",
		domain: "astrazeneca.com",
	},
	{
		name: "Sanofi",
		logoPath: "/logos/companies/sanofi.svg",
		domain: "sanofi.com",
	},
	// Energy & Utilities
	{
		name: "Shell",
		logoPath: "/logos/companies/shell.svg",
		domain: "shell.com",
	},
	{
		name: "BP",
		logoPath: "/logos/companies/bp.svg",
		domain: "bp.com",
	},
	{
		name: "TotalEnergies",
		logoPath: "/logos/companies/totalenergies.svg",
		domain: "totalenergies.com",
	},
	// Retail
	{
		name: "Tesco",
		logoPath: "/logos/companies/tesco.svg",
		domain: "tesco.com",
	},
	{
		name: "Sainsbury's",
		logoPath: "/logos/companies/sainsburys.svg",
		domain: "sainsburys.co.uk",
	},
	{
		name: "Aldi",
		logoPath: "/logos/companies/aldi.svg",
		domain: "aldi.com",
	},
	{
		name: "Lidl",
		logoPath: "/logos/companies/lidl.svg",
		domain: "lidl.com",
	},
	// Gaming
	{
		name: "EA",
		logoPath: "/logos/companies/ea.svg",
		domain: "ea.com",
	},
	{
		name: "Ubisoft",
		logoPath: "/logos/companies/ubisoft.svg",
		domain: "ubisoft.com",
	},
	{
		name: "Riot Games",
		logoPath: "/logos/companies/riotgames.svg",
		domain: "riotgames.com",
	},
	{
		name: "Epic Games",
		logoPath: "/logos/companies/epicgames.svg",
		domain: "epicgames.com",
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
