/**
 * Custom Scan Trigger System
 *
 * Replace Level 7 "Emergency" with "Custom Scan Trigger"
 * Instead of showing irrelevant jobs, trigger a priority scrape
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { UserPreferences } from "../types";

export interface MissingCriteria {
	location?: string[];
	career_path?: string[];
	roles?: string[];
	visa?: boolean;
}

export interface CustomScanResult {
	scanId: string;
	estimatedTime: string;
	message: string;
}

/**
 * Extract missing criteria from user preferences and current matches
 */
export function extractMissingCriteria(
	userPrefs: UserPreferences,
	matches: Array<{ job: any }>,
): MissingCriteria {
	const criteria: MissingCriteria = {};

	// If no matches, all criteria are missing
	if (matches.length === 0) {
		if (userPrefs.target_cities && userPrefs.target_cities.length > 0) {
			criteria.location = userPrefs.target_cities;
		}
		if (userPrefs.career_path && userPrefs.career_path.length > 0) {
			criteria.career_path = userPrefs.career_path;
		}
		if (userPrefs.roles_selected && userPrefs.roles_selected.length > 0) {
			criteria.roles = userPrefs.roles_selected;
		}
		if (userPrefs.visa_status?.includes("sponsor")) {
			criteria.visa = true;
		}
	}

	return criteria;
}

/**
 * Trigger custom scan for missing criteria
 */
export async function triggerCustomScan(
	supabase: SupabaseClient,
	userPrefs: UserPreferences,
	missingCriteria: MissingCriteria,
): Promise<CustomScanResult> {
	try {
		const priorityScore = 1000; // High priority

		// Build criteria list
		const criteriaList: string[] = [];
		if (missingCriteria.location) {
			missingCriteria.location.forEach((l) => {
				criteriaList.push(`location:${l}`);
			});
		}
		if (missingCriteria.career_path) {
			missingCriteria.career_path.forEach((p) => {
				criteriaList.push(`career_path:${p}`);
			});
		}
		if (missingCriteria.roles) {
			missingCriteria.roles.forEach((r) => {
				criteriaList.push(`role:${r}`);
			});
		}
		if (missingCriteria.visa) {
			criteriaList.push("visa_sponsorship");
		}

		// Upsert into scraping_priorities
		for (const crit of criteriaList) {
			const { error } = await supabase.from("scraping_priorities").upsert(
				{
					criteria: crit,
					demand_count: priorityScore,
					last_updated: new Date().toISOString(),
				},
				{ onConflict: "criteria" },
			);

			if (error) {
				apiLogger.warn("Failed to upsert scraping priority", {
					criteria: crit,
					error: error.message,
				});
			}
		}

		// Create user notification record
		const scanId = crypto.randomUUID();
		const estimatedCompletion = new Date(
			Date.now() + 2 * 60 * 60 * 1000,
		).toISOString(); // 2 hours

		const { error: insertError } = await supabase.from("custom_scans").insert({
			id: scanId,
			user_email: userPrefs.email,
			criteria: missingCriteria as any,
			status: "pending",
			created_at: new Date().toISOString(),
			estimated_completion: estimatedCompletion,
		});

		if (insertError) {
			apiLogger.error("Failed to create custom scan record", insertError, {
				email: userPrefs.email,
				scanId,
			});
		}

		return {
			scanId,
			estimatedTime: "2 hours",
			message:
				"Your niche is highly specialized. We've prioritized a custom scrape for your criteria.",
		};
	} catch (error) {
		apiLogger.error("Error triggering custom scan", error as Error, {
			email: userPrefs.email,
		});
		// Return a fallback result even if database operations fail
		return {
			scanId: crypto.randomUUID(),
			estimatedTime: "2 hours",
			message:
				"Your niche is highly specialized. We've prioritized a custom scrape for your criteria.",
		};
	}
}
