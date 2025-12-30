import { type NextRequest, NextResponse } from "next/server";
import { getAllCompanyLogos, getCompanyLogo } from "@/lib/companyLogos";
import { asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

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
			console.error(
				"[Companies API] CRITICAL: getAllCompanyLogos() returned empty array!",
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
		console.error("[Companies API] Error getting fallback companies:", error);
		// Absolute last resort fallback
		return [
			{ name: "Spotify", logoPath: "/logos/companies/spotify.svg" },
			{ name: "Google", logoPath: "/logos/companies/google.svg" },
			{ name: "Apple", logoPath: "/logos/companies/apple.svg" },
		];
	}
}

export const GET = asyncHandler(async (_req: NextRequest) => {
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
			console.error(`[Companies API] Database error: ${error.message}`);
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
			console.log(
				`[Companies API] Found ${companyData.size} unique companies in database`,
			);

			// Map database companies to logos
			const dbCompaniesWithLogos = Array.from(companyData.entries())
				.map(([name, count]) => {
					const logo = getCompanyLogo(name);
					if (!logo) {
						// Debug: Log companies without logos (first 10)
						if (Array.from(companyData.keys()).indexOf(name) < 10) {
							console.log(`[Companies API] No logo found for: "${name}"`);
						}
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
				console.log(
					`[Companies API] No DB matches found, using guaranteed fallback`,
				);
				companiesWithLogos = getGuaranteedFallbackCompanies();
			}
		}
	} catch (error) {
		// Any error - use guaranteed fallback
		console.error("[Companies API] Unexpected error:", error);
		companiesWithLogos = getGuaranteedFallbackCompanies();
	}

	// Final safety check: ensure we always have at least one company
	if (!companiesWithLogos || companiesWithLogos.length === 0) {
		console.error(
			"[Companies API] CRITICAL: companiesWithLogos is empty! Using emergency fallback.",
		);
		companiesWithLogos = getGuaranteedFallbackCompanies();
	}

	console.log(
		`[Companies API] Returning ${companiesWithLogos.length} companies with logos`,
	);

	cachedCompanies = companiesWithLogos;
	lastFetch = now;

	return NextResponse.json({
		companies: companiesWithLogos,
		count: companiesWithLogos.length,
		cached: false,
	});
});
