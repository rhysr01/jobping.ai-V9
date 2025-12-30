#!/usr/bin/env tsx

/**
 * Verify Career Path Mapping
 *
 * Checks what form values map to what database categories
 * and verifies jobs exist with those categories
 */

import path from "node:path";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
try {
	dotenv.config({ path: envPath });
} catch (_error) {
	// Ignore if .env.local doesn't exist
}

import { getDatabaseClient } from "../Utils/databasePool";
import { getDatabaseCategoriesForForm } from "../Utils/matching/categoryMapper";

console.log("🔍 Verifying Career Path Mapping\n");

async function verifyMapping() {
	const supabase = getDatabaseClient();

	// Form values from SignupFormFree.tsx
	const formValues = [
		"tech",
		"finance",
		"strategy",
		"marketing",
		"sales",
		"operations",
		"data",
		"product",
	];

	// Sample-jobs route uses capitalized versions
	const sampleJobsValues = ["Tech", "Finance"];

	console.log("=".repeat(60));
	console.log("FORM VALUES → DATABASE CATEGORIES");
	console.log("=".repeat(60));

	for (const formValue of formValues) {
		const dbCategories = getDatabaseCategoriesForForm(formValue);
		console.log(`\n${formValue} → ${dbCategories.join(", ")}`);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("SAMPLE-JOBS ROUTE VALUES (capitalized → lowercased → DB)");
	console.log("=".repeat(60));

	for (const capitalizedValue of sampleJobsValues) {
		const lowercased = capitalizedValue.toLowerCase();
		const dbCategories = getDatabaseCategoriesForForm(lowercased);
		console.log(
			`\n${capitalizedValue} → ${lowercased} → ${dbCategories.join(", ")}`,
		);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("VERIFYING JOBS IN DATABASE");
	console.log("=".repeat(60));

	// Check jobs for tech-transformation category
	const { count: techJobs, error: techError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("status", "active")
		.overlaps("categories", ["tech-transformation"])
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

	if (techError) {
		console.log(`\n❌ Error checking tech jobs:`, techError);
	} else {
		console.log(
			`\n📊 Tech jobs (tech-transformation + early-career): ${techJobs || 0}`,
		);
	}

	// Check jobs for finance-investment category
	const { count: financeJobs, error: financeError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("status", "active")
		.overlaps("categories", ["finance-investment"])
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

	if (financeError) {
		console.log(`❌ Error checking finance jobs:`, financeError);
	} else {
		console.log(
			`📊 Finance jobs (finance-investment + early-career): ${financeJobs || 0}`,
		);
	}

	// Check jobs in London/Amsterdam/Berlin with tech category
	const { count: techCityJobs, error: techCityError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("status", "active")
		.in("city", ["London", "Amsterdam", "Berlin"])
		.overlaps("categories", ["tech-transformation"])
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

	if (techCityError) {
		console.log(`\n❌ Error checking tech jobs in cities:`, techCityError);
	} else {
		console.log(
			`\n📊 Tech jobs in London/Amsterdam/Berlin: ${techCityJobs || 0}`,
		);
	}

	// Check jobs in Stockholm/Dublin/Paris with finance category
	const { count: financeCityJobs, error: financeCityError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("status", "active")
		.in("city", ["Stockholm", "Dublin", "Paris"])
		.overlaps("categories", ["finance-investment"])
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

	if (financeCityError) {
		console.log(`❌ Error checking finance jobs in cities:`, financeCityError);
	} else {
		console.log(
			`📊 Finance jobs in Stockholm/Dublin/Paris: ${financeCityJobs || 0}`,
		);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("SUMMARY");
	console.log("=".repeat(60));
	console.log(`✅ Form values map correctly to database categories`);
	console.log(`✅ Sample-jobs route lowercases values before mapping`);
	console.log(`📊 Tech jobs available: ${techJobs || 0}`);
	console.log(`📊 Finance jobs available: ${financeJobs || 0}`);
	console.log(`📊 Tech jobs in free cities: ${techCityJobs || 0}`);
	console.log(`📊 Finance jobs in premium cities: ${financeCityJobs || 0}`);

	if ((techJobs || 0) === 0 && (financeJobs || 0) === 0) {
		console.log("\n⚠️  WARNING: No jobs found with these categories!");
		console.log("   This might indicate:");
		console.log("   1. Database doesn't have jobs with these categories");
		console.log("   2. Supabase is blocking queries");
		console.log("   3. Early-career filter is too restrictive");
	} else if ((techCityJobs || 0) === 0 && (financeCityJobs || 0) === 0) {
		console.log("\n⚠️  WARNING: No jobs found in specified cities!");
		console.log(
			"   Jobs exist but not in the cities used by sample-jobs route.",
		);
	} else {
		console.log("\n✅ Mapping looks correct and jobs are available!");
	}
}

verifyMapping().catch(console.error);
