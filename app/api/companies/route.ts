import { type NextRequest, NextResponse } from "next/server";
import { getAllCompanyLogos, getCompanyLogo } from "../../../lib/company-logos";
import { apiLogger } from "../../../lib/api-logger";
import { asyncHandler } from "../../../lib/errors";
import { getDatabaseClient } from "../../../utils/core/database-pool";
import { withApiAuth } from "../../../utils/authentication/apiAuth";

// Cache for 1 hour
let cachedCompanies: Array<{ name: string; logoPath: string }> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Get guaranteed fallback companies - always returns at least some logos
 */
function getGuaranteedFallbackCompanies(): Array<{
	name: string;
	logoPath: string;
}> {
	try {
		const allLogos = getAllCompanyLogos();
		if (allLogos.length === 0) {
			apiLogger.error(
				"CRITICAL: getAllCompanyLogos() returned empty array",
				new Error("Company logos array is empty"),
				{ endpoint: "/api/companies" },
			);
			// This should never happen due to validation, but provide absolute fallback
			return [
				{ name: "Spotify", logoPath: "/logos/companies/spotify.svg" },
				{ name: "Google", logoPath: "/logos/companies/google.svg" },
				{ name: "Apple", logoPath: "/logos/companies/apple.svg" },
			];
		}
		return allLogos
			.slice(0, 30)
			.map((logo) => ({ name: logo.name, logoPath: logo.logoPath }));
	} catch (error) {
		apiLogger.error("Error getting fallback companies", error as Error, {
			endpoint: "/api/companies",
		});
		// Absolute last resort fallback
		return [
			{ name: "Spotify", logoPath: "/logos/companies/spotify.svg" },
			{ name: "Google", logoPath: "/logos/companies/google.svg" },
			{ name: "Apple", logoPath: "/logos/companies/apple.svg" },
		];
	}
}

const getCompaniesHandler = asyncHandler(async (_req: NextRequest) => {
	const now = Date.now();

	if (cachedCompanies && now - lastFetch < CACHE_DURATION) {
		return NextResponse.json({
			companies: cachedCompanies,
			cached: true,
		});
	}

	let companiesWithLogos: Array<{ name: string; logoPath: string }>;

	try {
		const supabase = getDatabaseClient();

		// Get distinct companies from sent jobs with their locations
		const { data, error } = await supabase
			.from("jobs")
			.select("company, company_name, location, city, country")
			.eq("is_active", true)
			.eq("is_sent", true)
			.not("company", "is", null)
			.not("company", "eq", "");

		if (error) {
			apiLogger.error("Database error fetching companies", error as Error, {
				endpoint: "/api/companies",
			});
			// Fall through to use guaranteed fallback
			companiesWithLogos = getGuaranteedFallbackCompanies();
		} else {
			// Group by company and count frequency
			const companyData = new Map<string, number>();

			data?.forEach((job) => {
				const companyName = (job.company_name || job.company || "").trim();
				if (!companyName) return;

				companyData.set(companyName, (companyData.get(companyName) || 0) + 1);
			});

			// Debug: Log total companies found
			apiLogger.debug("Found companies in database", {
				endpoint: "/api/companies",
				companyCount: companyData.size,
			});

			// Map database companies to logos, but only include companies whose logo files actually exist
			const dbCompaniesWithLogos = Array.from(companyData.entries())
				.map(([name, count]) => {
					const logo = getCompanyLogo(name);
					if (!logo) {
						// Debug: Log companies without logos (first 10)
						if (Array.from(companyData.keys()).indexOf(name) < 10) {
							apiLogger.debug("No logo found for company", {
								endpoint: "/api/companies",
								companyName: name,
							});
						}
						return null;
					}

					// Check if the logo file actually exists by checking against our known existing logos
					const existingLogos = [
						'accenture', 'adobe', 'airbnb', 'amazon', 'apple', 'bmw', 'bostonconsultinggroup',
						'deloitte', 'github', 'glovo', 'google', 'ibm', 'ikea', 'justeat', 'klarna', 'kpmg',
						'mckinsey', 'meta', 'microsoft', 'monzo', 'n26', 'netflix', 'notion', 'oracle', 'pwc',
						'revolut', 'salesforce', 'sap', 'shopify', 'siemens', 'spotify', 'stripe', 'tesla',
						'uber', 'vercel', 'volkswagen', 'volvo', 'wise', 'zalando'
					];

					const logoFilename = logo.logoPath.split('/').pop()?.replace('.svg', '');
					if (!logoFilename || !existingLogos.includes(logoFilename)) {
						apiLogger.debug("Logo file does not exist", {
							endpoint: "/api/companies",
							companyName: name,
							logoPath: logo.logoPath,
						});
						return null;
					}

					return {
						name: logo.name,
						logoPath: logo.logoPath,
						count,
					};
				})
				.filter(
					(c): c is { name: string; logoPath: string; count: number } =>
						c !== null,
				)
				.sort((a, b) => b.count - a.count); // Sort by frequency

			// If we have companies from DB, use those (up to 30)
			// Otherwise, show all available logos as fallback
			if (dbCompaniesWithLogos.length > 0) {
				companiesWithLogos = dbCompaniesWithLogos
					.slice(0, 30)
					.map(({ name, logoPath }) => ({ name, logoPath }));
			} else {
				// Fallback: Show all available logos if no DB matches
				apiLogger.info("No DB matches found, using guaranteed fallback", {
					endpoint: "/api/companies",
				});
				companiesWithLogos = getGuaranteedFallbackCompanies();
			}
		}
	} catch (error) {
		// Any error - use guaranteed fallback
		apiLogger.error("Unexpected error fetching companies", error as Error, {
			endpoint: "/api/companies",
		});
		companiesWithLogos = getGuaranteedFallbackCompanies();
	}

	// Final safety check: ensure we always have at least one company
	if (!companiesWithLogos || companiesWithLogos.length === 0) {
		apiLogger.error(
			"CRITICAL: companiesWithLogos is empty! Using emergency fallback.",
			new Error("Companies array is empty"),
			{ endpoint: "/api/companies" },
		);
		companiesWithLogos = getGuaranteedFallbackCompanies();
	}

	apiLogger.info("Returning companies with logos", {
		endpoint: "/api/companies",
		count: companiesWithLogos.length,
	});

	cachedCompanies = companiesWithLogos;
	lastFetch = now;

	return NextResponse.json({
		companies: companiesWithLogos,
		count: companiesWithLogos.length,
		cached: false,
	});
});

export const GET = withApiAuth(getCompaniesHandler, {
	allowPublic: true,
	rateLimitConfig: {
		maxRequests: 50, // 50 requests per minute
		windowMs: 60000,
	},
});
