import { type NextRequest, NextResponse } from "next/server";
import { withAxiom } from "next-axiom";
// import { withAuth } from '../../../../lib/auth';
import { AppError, asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

// Use centralized database client
const supabase = getDatabaseClient();

// Configuration
const BATCH_SIZE = parseInt(process.env.SCRAPING_BATCH_SIZE || "3", 10);
const MAX_PROCESSING_TIME = parseInt(
	process.env.MAX_PROCESSING_TIME || "25000",
	10,
); // 25 seconds (Vercel limit)

const processScrapingQueueHandler = asyncHandler(
	async (_request: NextRequest) => {
		const startTime = Date.now();

		console.log(" Starting cron scraping queue processing...");

		// Get pending scraping jobs
		const { data: jobs, error: fetchError } = await supabase
			.from("job_queue")
			.select("*")
			.eq("type", "job_scrape")
			.eq("status", "pending")
			.lte("scheduled_for", new Date().toISOString())
			.order("priority", { ascending: false })
			.order("created_at", { ascending: true })
			.limit(BATCH_SIZE);

		if (fetchError) {
			console.error(" Error fetching scraping jobs:", fetchError);
			throw new AppError("Failed to fetch jobs", 500, "DB_FETCH_ERROR", {
				details: fetchError.message,
			});
		}

		if (!jobs || jobs.length === 0) {
			console.log(" No pending scraping jobs to process");
			return NextResponse.json({
				message: "No jobs to process",
				processed: 0,
				duration: Date.now() - startTime,
			});
		}

		console.log(` Processing ${jobs.length} scraping jobs...`);

		let processed = 0;
		let failed = 0;

		// Process each job
		for (const job of jobs) {
			// Check if we're running out of time
			if (Date.now() - startTime > MAX_PROCESSING_TIME) {
				console.log(" Time limit reached, stopping processing");
				break;
			}

			try {
				// Mark as processing
				await supabase
					.from("job_queue")
					.update({ status: "processing" })
					.eq("id", job.id);

				// Process the scraping job
				const { companies, scraperType } = job.payload;

				// Import scraper dynamically based on type
				let scraperResult;
				switch (scraperType) {
					case "adzuna":
						scraperResult = await processAdzunaScraper(companies);
						break;
					case "reed":
						scraperResult = await processReedScraper(companies);
						break;
					case "muse":
						scraperResult = await processMuseScraper(companies);
						break;
					case "greenhouse":
						scraperResult = await processGreenhouseScraper(companies);
						break;
					default:
						throw new Error(`Unknown scraper type: ${scraperType}`);
				}

				// Mark as completed
				await supabase
					.from("job_queue")
					.update({
						status: "completed",
						result: scraperResult,
						updated_at: new Date().toISOString(),
					})
					.eq("id", job.id);

				processed++;
				console.log(
					` Completed scraping job ${job.id} for ${scraperType}: ${scraperResult.jobsScraped} jobs`,
				);
			} catch (error) {
				console.error(` Failed to process scraping job ${job.id}:`, error);

				// Handle failure with retry logic
				const newAttempts = (job.attempts || 0) + 1;
				const maxAttempts = job.max_attempts || 2;

				if (newAttempts >= maxAttempts) {
					// Max attempts reached, mark as failed
					await supabase
						.from("job_queue")
						.update({
							status: "failed",
							error: error instanceof Error ? error.message : "Unknown error",
							updated_at: new Date().toISOString(),
						})
						.eq("id", job.id);

					console.error(
						` Job ${job.id} failed permanently after ${newAttempts} attempts`,
					);
				} else {
					// Retry with exponential backoff
					const retryDelay = Math.min(1000 * 2 ** newAttempts, 300000); // Max 5 minutes
					const retryTime = new Date(Date.now() + retryDelay);

					await supabase
						.from("job_queue")
						.update({
							attempts: newAttempts,
							status: "retrying",
							scheduled_for: retryTime.toISOString(),
							error: error instanceof Error ? error.message : "Unknown error",
						})
						.eq("id", job.id);

					console.log(
						` Job ${job.id} will retry in ${retryDelay}ms (attempt ${newAttempts}/${maxAttempts})`,
					);
				}

				failed++;
			}
		}

		const duration = Date.now() - startTime;
		console.log(
			` Scraping queue processing complete: ${processed} processed, ${failed} failed in ${duration}ms`,
		);

		return NextResponse.json({
			message: "Scraping queue processing complete",
			processed,
			failed,
			total: jobs.length,
			duration,
		});
	},
);

// Scraper processing functions
async function processAdzunaScraper(
	companies: string[],
): Promise<{ jobsScraped: number; companiesProcessed: number }> {
	// NOTE: Mock implementation - real scraper not yet implemented
	return {
		jobsScraped: Math.floor(Math.random() * 10),
		companiesProcessed: companies.length,
	};
}

async function processReedScraper(
	companies: string[],
): Promise<{ jobsScraped: number; companiesProcessed: number }> {
	// NOTE: Mock implementation - real scraper not yet implemented
	return {
		jobsScraped: Math.floor(Math.random() * 8),
		companiesProcessed: companies.length,
	};
}

async function processMuseScraper(
	companies: string[],
): Promise<{ jobsScraped: number; companiesProcessed: number }> {
	// NOTE: Mock implementation - real scraper not yet implemented
	return {
		jobsScraped: Math.floor(Math.random() * 5),
		companiesProcessed: companies.length,
	};
}

async function processGreenhouseScraper(
	companies: string[],
): Promise<{ jobsScraped: number; companiesProcessed: number }> {
	// NOTE: Mock implementation - real scraper not yet implemented
	return {
		jobsScraped: Math.floor(Math.random() * 12),
		companiesProcessed: companies.length,
	};
}

// Export with Axiom logging
export const GET = withAxiom(processScrapingQueueHandler);

// Health check endpoint
export const HEAD = withAxiom(async function HEAD() {
	return new NextResponse(null, { status: 200 });
});
