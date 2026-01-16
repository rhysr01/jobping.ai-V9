import { getDatabaseClient } from "../utils/core/database-pool";

async function checkJobs() {
	const supabase = getDatabaseClient();

	// Check postal jobs specifically
	const { data: postalJobs, error: postalError } = await supabase
		.from("jobs")
		.select("id, title, company, city, country, categories, description, created_at")
		.eq("is_active", true)
		.eq("status", "active")
		.ilike("title", "%postal%")
		.limit(10);

	if (postalError) {
		console.error("Error fetching postal jobs:", postalError);
	} else {
		console.log(`\nFound ${postalJobs?.length || 0} postal jobs:`);
		postalJobs?.forEach((job) => {
			console.log(`Title: ${job.title}`);
			console.log(`Company: ${job.company}`);
			console.log(`Categories: ${JSON.stringify(job.categories)}`);
			console.log(`City: ${job.city}, Country: ${job.country}`);
			console.log(`Created: ${job.created_at?.split('T')[0]}`);
			console.log("---");
		});
	}

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

	process.exit(0);
}

checkJobs().catch(console.error);