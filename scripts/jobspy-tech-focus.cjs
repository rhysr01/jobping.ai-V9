#!/usr/bin/env node

/**
 * TECH-FOCUSED JobSpy Scraper
 * Specialized for software engineering, data science, and tech roles
 * Targets tech hubs and uses tech-specific search terms
 */

// Load environment variables conditionally
if (process.env.NODE_ENV !== "production" && !process.env.GITHUB_ACTIONS) {
	require("dotenv").config({ path: ".env.local" });
} else if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
	require("dotenv").config({ path: ".env.local" });
}

const { spawnSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");
const { processIncomingJob } = require("../scrapers/shared/processor.cjs");

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		process.env.SUPABASE_KEY;
	if (!url || !key)
		throw new Error(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY",
		);
	return createClient(url, key);
}

// TECH-FOCUSED SEARCH TERMS
const TECH_SEARCH_TERMS = [
	// Software Engineering
	"software engineer",
	"software developer",
	"full stack developer",
	"frontend developer",
	"backend developer",
	"junior software engineer",
	"junior developer",
	"graduate software engineer",

	// Data Science & AI
	"data scientist",
	"machine learning engineer",
	"ml engineer",
	"ai engineer",
	"data engineer",
	"junior data scientist",
	"graduate data scientist",

	// Product & Tech Management
	"product manager",
	"associate product manager",
	"junior product manager",
	"technical product manager",
	"product analyst",

	// DevOps & Infrastructure
	"devops engineer",
	"cloud engineer",
	"site reliability engineer",
	"platform engineer",
	"systems engineer",

	// Cybersecurity
	"security engineer",
	"cybersecurity analyst",
	"information security",
	"security analyst",

	// Mobile & Web
	"ios developer",
	"android developer",
	"mobile developer",
	"web developer",
	"react developer",
	"angular developer",

	// Tech Infrastructure
	"infrastructure engineer",
	"network engineer",
	"database administrator",
	"systems administrator",
];

// TECH-HUB CITIES (prioritize locations with high tech concentration)
// Using full country names as required by JobSpy
const TECH_HUBS = [
	"San Francisco", "usa",
	"Seattle", "usa",
	"Austin", "usa",
	"New York", "usa",
	"Boston", "usa",
	"London", "uk",
	"Berlin", "germany",
	"Amsterdam", "netherlands",
	"Paris", "france",
	"Stockholm", "sweden",
	"Zurich", "switzerland",
	"Tel Aviv", "israel",
	"Bangalore", "india",
	"Singapore", "singapore",
	"Sydney", "australia",
	"Toronto", "canada",
	"Vancouver", "canada"
];

async function runTechFocusedScraping() {
	console.log('🚀 STARTING TECH-FOCUSED JOB SCRAPING');
	console.log('======================================');
	console.log(`🎯 Target: ${TECH_SEARCH_TERMS.length} tech-specific search terms`);
	console.log(`🏙️ Cities: ${TECH_HUBS.length/2} global tech hubs`);
	console.log('');

	const supabase = getSupabase();
	let totalJobsProcessed = 0;
	let totalJobsSaved = 0;

	// Process tech hubs in batches
	for (let i = 0; i < TECH_HUBS.length; i += 2) {
		const city = TECH_HUBS[i];
		const country = TECH_HUBS[i + 1];

		console.log(`\n🏙️ Processing ${city}, ${country}...`);

		// Process tech terms in smaller batches to avoid overwhelming
		const BATCH_SIZE = 3;
		for (let j = 0; j < TECH_SEARCH_TERMS.length; j += BATCH_SIZE) {
			const termBatch = TECH_SEARCH_TERMS.slice(j, j + BATCH_SIZE);
			const searchTerm = termBatch.join('" OR "');

			console.log(`🔍 Searching: "${searchTerm}" in ${city}`);

			try {
				// Call JobSpy Python script with better error handling
				const pythonScript = `
import jobspy
import pandas as pd
import json
import sys

try:
    # Scrape with JobSpy
    df = jobspy.scrape_jobs(
        site_name=["indeed", "glassdoor"],
        search_term="${searchTerm.replace(/"/g, '\\"')}",
        location="${city}",
        results_wanted=20,
        hours_old=168,
        country_indeed="${country}"
    )

    # Convert to records and print as JSON
    if len(df) > 0:
        records = df.to_dict('records')
        # Ensure clean JSON output
        json_output = json.dumps(records, ensure_ascii=False, indent=None)
        print(json_output)
    else:
        print("[]")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

				const result = spawnSync('python3', ['-c', pythonScript], {
					stdio: ['pipe', 'pipe', 'pipe'],
					encoding: 'utf8',
					timeout: 45000 // 45 second timeout
				});

				if (result.error || result.stderr) {
					console.log(`❌ Python error for "${searchTerm}":`, result.stderr || result.error.message);
					continue;
				}

				let jobs = [];
				try {
					const output = result.stdout.trim();
					if (output.startsWith('ERROR:')) {
						console.log(`❌ JobSpy error for "${searchTerm}":`, output);
						continue;
					}
					jobs = JSON.parse(output);
				} catch (parseError) {
					console.log(`❌ JSON parse error for "${searchTerm}":`, parseError.message);
					console.log('Raw output:', result.stdout.substring(0, 200));
					continue;
				}

				console.log(`📊 Found ${jobs.length} jobs for "${searchTerm}"`);

				// Process and save jobs
				let batchProcessed = 0;
				let batchSaved = 0;

				for (const jobData of jobs) {
					try {
						const processed = await processIncomingJob(jobData, {
							source: 'jobspy-tech'
						});

						if (processed) {
							const { error } = await supabase
								.from('jobs')
								.upsert(processed, { onConflict: 'job_hash' });

							if (!error) {
								batchSaved++;
							}
						}
						batchProcessed++;
					} catch (jobError) {
						console.log(`⚠️ Error processing job:`, jobError.message);
					}
				}

				console.log(`✅ Batch complete: ${batchProcessed} processed, ${batchSaved} saved`);
				totalJobsProcessed += batchProcessed;
				totalJobsSaved += batchSaved;

				// Small delay between batches
				await new Promise(resolve => setTimeout(resolve, 2000));

			} catch (error) {
				console.log(`❌ Error with search term "${searchTerm}":`, error.message);
			}
		}

		console.log(`🏙️ Completed ${city}: ${totalJobsSaved} jobs saved so far`);
	}

	console.log('\n🎉 TECH-FOCUSED SCRAPING COMPLETE');
	console.log('==================================');
	console.log(`📊 Total Jobs Processed: ${totalJobsProcessed}`);
	console.log(`💾 Total Jobs Saved: ${totalJobsSaved}`);
	console.log(`📈 Success Rate: ${totalJobsProcessed > 0 ? ((totalJobsSaved/totalJobsProcessed)*100).toFixed(1) : 0}%`);
}

// Run the tech-focused scraping
runTechFocusedScraping().catch(console.error);