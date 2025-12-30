#!/usr/bin/env node

/**
 * DATABASE SCHEMA INSPECTOR
 * Inspects actual database columns to help fix tests
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function inspectSchema(): Promise<void> {
	console.log(" INSPECTING DATABASE SCHEMA");
	console.log("==============================");

	try {
		// Try to get a sample user to see what columns exist
		const { data: users, error } = await supabase
			.from("users")
			.select("*")
			.limit(1);

		if (error) {
			console.error(" Failed to query users table:", error.message);
			return;
		}

		if (users && users.length > 0) {
			console.log(" Found sample user, inspecting columns:");
			console.log(" USERS TABLE COLUMNS:");
			Object.keys(users[0]).forEach((column) => {
				console.log(
					`   - ${column}: ${typeof users[0][column]} (${users[0][column] === null ? "NULL" : "has value"})`,
				);
			});
		} else {
			console.log(" No users found in database");

			// Try to create a minimal test user to see what's required
			console.log(
				" Attempting minimal user creation to discover required fields...",
			);

			const minimalUser = {
				email: `schema-test-${Date.now()}@test.com`,
				created_at: new Date().toISOString(),
			};

			const { data: testUser, error: testError } = await supabase
				.from("users")
				.insert(minimalUser)
				.select()
				.single();

			if (testError) {
				console.log(" Minimal user creation failed:", testError.message);
				console.log(" This helps us understand required fields");
			} else {
				console.log(" Minimal user created successfully!");
				console.log(" DISCOVERED USERS TABLE COLUMNS:");
				Object.keys(testUser).forEach((column) => {
					console.log(
						`   - ${column}: ${typeof testUser[column]} (${testUser[column] === null ? "NULL" : "has value"})`,
					);
				});

				// Clean up test user
				await supabase.from("users").delete().eq("id", testUser.id);
				console.log(" Cleaned up test user");
			}
		}

		// Also inspect other important tables
		console.log("\n INSPECTING OTHER TABLES:");

		// Jobs table
		const { data: jobs, error: jobsError } = await supabase
			.from("jobs")
			.select("*")
			.limit(1);

		if (!jobsError && jobs && jobs.length > 0) {
			console.log(" JOBS TABLE COLUMNS:");
			Object.keys(jobs[0]).forEach((column) => {
				console.log(`   - ${column}: ${typeof jobs[0][column]}`);
			});
		}

		// User job matches table
		const { data: matches, error: matchesError } = await supabase
			.from("user_job_matches")
			.select("*")
			.limit(1);

		if (!matchesError && matches && matches.length > 0) {
			console.log(" USER_JOB_MATCHES TABLE COLUMNS:");
			Object.keys(matches[0]).forEach((column) => {
				console.log(`   - ${column}: ${typeof matches[0][column]}`);
			});
		}
	} catch (error) {
		console.error(" Schema inspection failed:", (error as Error).message);
	}
}

inspectSchema().catch(console.error);
