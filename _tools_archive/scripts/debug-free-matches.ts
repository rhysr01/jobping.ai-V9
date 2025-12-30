import dotenv from "dotenv";
import { getDatabaseClient } from "@/Utils/databasePool";

dotenv.config({ path: ".env.local" });

async function debugMatches(email: string) {
	const supabase = getDatabaseClient();

	// 1. Check if user exists
	const { data: user } = await supabase
		.from("users")
		.select("*")
		.eq("email", email)
		.eq("subscription_tier", "free")
		.single();

	console.log("1. User:", user ? "Found" : "NOT FOUND");

	// 2. Check matches
	const { data: matches } = await supabase
		.from("matches")
		.select("*")
		.eq("user_email", email);

	console.log("2. Matches found:", matches?.length || 0);
	if (matches && matches.length > 0) {
		console.log(
			"   Job hashes:",
			matches.map((m) => m.job_hash),
		);
	}

	// 3. Check if jobs exist for those hashes
	if (matches && matches.length > 0) {
		const jobHashes = matches.map((m) => m.job_hash).filter(Boolean);
		const { data: jobs } = await supabase
			.from("jobs")
			.select("job_hash, title, is_active, status")
			.in("job_hash", jobHashes);

		console.log("3. Jobs found:", jobs?.length || 0);
		console.log(
			"   Active jobs:",
			jobs?.filter((j) => j.is_active && j.status === "active").length || 0,
		);

		// Check which jobs are missing/inactive
		const activeJobHashes = new Set(
			jobs
				?.filter((j) => j.is_active && j.status === "active")
				.map((j) => j.job_hash) || [],
		);
		const inactiveHashes = jobHashes.filter(
			(hash) => !activeJobHashes.has(hash),
		);
		if (inactiveHashes.length > 0) {
			console.log("   ⚠️ Inactive/missing jobs:", inactiveHashes);
		}
	}
}

// Run with: tsx scripts/debug-free-matches.ts <email>
const email = process.argv[2];
if (!email) {
	console.error("Usage: tsx scripts/debug-free-matches.ts <email>");
	process.exit(1);
}

debugMatches(email).catch(console.error);
