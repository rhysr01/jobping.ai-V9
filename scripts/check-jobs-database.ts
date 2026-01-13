import { getDatabaseClient } from "../utils/core/database-pool";

async function checkJobs() {
	const supabase = getDatabaseClient();

	// Check total jobs
	const { data: totalJobs, error: totalError } = await supabase
		.from("jobs")
		.select("id", { count: "exact" })
		.eq("is_active", true)
		.eq("status", "active");

	if (totalError) {
		console.error("Error fetching total jobs:", totalError);
		return;
	}

	console.log(`Total active jobs: ${totalJobs?.length || 0}`);

	// Check jobs in Madrid, Paris, London
	const cities = ["Madrid", "Paris", "London"];

	for (const city of cities) {
		const { data: cityJobs, error: cityError } = await supabase
			.from("jobs")
			.select("id, title, company, city, country, created_at")
			.eq("is_active", true)
			.eq("status", "active")
			.eq("city", city)
			.order("created_at", { ascending: false })
			.limit(5);

		if (cityError) {
			console.error(`Error fetching jobs for ${city}:`, cityError);
		} else {
			console.log(`\nJobs in ${city}: ${cityJobs?.length || 0}`);
			if (cityJobs && cityJobs.length > 0) {
				cityJobs.forEach((job) => {
					console.log(`  - ${job.title} at ${job.company} (${job.created_at?.split('T')[0]})`);
				});
			}
		}
	}

	// Check recent jobs (last 30 days)
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const { data: recentJobs, error: recentError } = await supabase
		.from("jobs")
		.select("id, city, created_at", { count: "exact" })
		.eq("is_active", true)
		.eq("status", "active")
		.gte("created_at", thirtyDaysAgo.toISOString());

	if (recentError) {
		console.error("Error fetching recent jobs:", recentError);
	} else {
		console.log(`\nRecent jobs (last 30 days): ${recentJobs?.length || 0}`);
	}

	process.exit(0);
}

checkJobs().catch(console.error);