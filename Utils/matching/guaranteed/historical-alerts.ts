/**
 * Historical Matches as Target Companies
 *
 * CRITICAL: Historical matches are NOT active jobs - they're "Target Companies"
 * Show as alert signup, not as clickable matches
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { UserPreferences } from "../types";

export interface TargetCompany {
	company: string;
	lastMatchedAt: string;
	matchCount: number;
	roles: string[];
	locations: string[];
}

export interface TargetCompaniesResult {
	targetCompanies: TargetCompany[];
	message: string;
}

/**
 * Get target companies from historical matches
 * These are companies that matched similar criteria in the past
 */
export async function getTargetCompaniesFromHistory(
	supabase: SupabaseClient,
	userPrefs: UserPreferences,
): Promise<TargetCompaniesResult> {
	try {
		// Query historical matches for similar criteria
		const { data: historical, error } = await supabase
			.from("matches")
			.select("job_snapshot, matched_at, match_score")
			.not("job_snapshot", "is", null)
			.gte("match_score", 75)
			.order("matched_at", { ascending: false })
			.limit(50);

		if (error) {
			apiLogger.error("Failed to fetch historical matches", error, {
				email: userPrefs.email,
			});
			return { targetCompanies: [], message: "" };
		}

		if (!historical || historical.length === 0) {
			return { targetCompanies: [], message: "" };
		}

		// Group by company
		const companyMap = new Map<
			string,
			{
				company: string;
				lastMatchedAt: string;
				matchCount: number;
				roles: Set<string>;
				locations: Set<string>;
			}
		>();

		historical.forEach((h) => {
			const snapshot = h.job_snapshot as any;
			if (!snapshot || !snapshot.company) return;

			const company = snapshot.company;

			if (!companyMap.has(company)) {
				companyMap.set(company, {
					company,
					lastMatchedAt: h.matched_at,
					matchCount: 1,
					roles: new Set([snapshot.title || "Unknown Role"]),
					locations: new Set([snapshot.location || "Unknown Location"]),
				});
			} else {
				const existing = companyMap.get(company)!;
				existing.matchCount++;
				if (snapshot.title) existing.roles.add(snapshot.title);
				if (snapshot.location) existing.locations.add(snapshot.location);
				if (new Date(h.matched_at) > new Date(existing.lastMatchedAt)) {
					existing.lastMatchedAt = h.matched_at;
				}
			}
		});

		// Filter by user preferences
		const filtered = Array.from(companyMap.values())
			.filter((c) => {
				// Match career path if available
				if (userPrefs.career_path && userPrefs.career_path.length > 0) {
					// Check if any role matches career path
					return Array.from(c.roles).some((role) =>
						userPrefs.career_path?.some((path) =>
							role.toLowerCase().includes(path.toLowerCase()),
						),
					);
				}
				return true;
			})
			.slice(0, 5); // Top 5 target companies

		return {
			targetCompanies: filtered.map((c) => ({
				company: c.company,
				lastMatchedAt: c.lastMatchedAt,
				matchCount: c.matchCount,
				roles: Array.from(c.roles).slice(0, 3),
				locations: Array.from(c.locations).slice(0, 3),
			})),
			message:
				"We haven't seen roles for your niche in 48 hours, but we've matched students to these companies recently.",
		};
	} catch (error) {
		apiLogger.error(
			"Error getting target companies from history",
			error as Error,
			{
				email: userPrefs.email,
			},
		);
		return { targetCompanies: [], message: "" };
	}
}
