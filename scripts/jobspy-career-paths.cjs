#!/usr/bin/env node

/**
 * CAREER PATH-FOCUSED JobSpy Scraper
 * Specialized for career path areas in early career, internships, and roles
 * Targets specific career paths: strategy, finance, sales, marketing, product, operations, etc.
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

// CAREER PATH TARGETS - Focus on early career roles in specific career paths
const CAREER_PATH_QUERIES = {
	strategy: [
		"strategy consultant",
		"strategy analyst",
		"business analyst",
		"strategy intern",
		"consulting intern",
		"strategy graduate",
		"business transformation",
		"growth strategy",
		"junior strategy",
		"strategy assistant"
	],
	finance: [
		"finance analyst",
		"financial analyst",
		"investment banking",
		"corporate finance",
		"finance intern",
		"financial intern",
		"finance graduate",
		"junior finance",
		"finance assistant",
		"treasury analyst"
	],
	sales: [
		"sales development representative",
		"business development representative",
		"sales intern",
		"business development intern",
		"account executive",
		"sales graduate",
		"SDR",
		"BDR",
		"customer success",
		"sales coordinator"
	],
	marketing: [
		"marketing coordinator",
		"digital marketing",
		"brand assistant",
		"growth marketing",
		"marketing intern",
		"content marketing",
		"marketing graduate",
		"junior marketing",
		"marketing assistant",
		"communications coordinator"
	],
	product: [
		"associate product manager",
		"product analyst",
		"junior product manager",
		"product intern",
		"product graduate",
		"APM",
		"product coordinator",
		"junior product",
		"product assistant",
		"technical product"
	],
	operations: [
		"operations analyst",
		"supply chain",
		"logistics coordinator",
		"operations intern",
		"operations graduate",
		"process improvement",
		"operations coordinator",
		"junior operations",
		"operations assistant",
		"demand planning"
	],
	tech: [
		"software engineer intern",
		"data scientist",
		"junior software engineer",
		"tech analyst",
		"technology consultant",
		"IT business analyst",
		"systems analyst",
		"junior data scientist",
		"tech graduate",
		"digital analyst"
	],
	data: [
		"data analyst",
		"junior data analyst",
		"analytics intern",
		"business intelligence",
		"junior data scientist",
		"data analyst trainee",
		"data science trainee",
		"BI engineer intern",
		"analytics associate",
		"insights analyst"
	],
	sustainability: [
		"ESG intern",
		"sustainability strategy",
		"junior ESG analyst",
		"ESG graduate",
		"corporate responsibility",
		"environmental analyst",
		"climate analyst",
		"sustainable finance",
		"ESG assurance intern",
		"sustainability reporting"
	],
	hr: [
		"HR coordinator",
		"talent acquisition",
		"HR business partner",
		"people operations",
		"HR intern",
		"recruitment coordinator",
		"HR graduate",
		"junior HR",
		"HR assistant",
		"campus recruiter"
	]
};

// PRIORITY CITIES for career-focused roles - European cities from signup form
const CAREER_CITIES = [
	"Dublin", "ireland",
	"London", "uk",
	"Paris", "france",
	"Amsterdam", "netherlands",
	"Manchester", "uk",
	"Birmingham", "uk",
	"Belfast", "uk",
	"Madrid", "spain",
	"Barcelona", "spain",
	"Berlin", "germany",
	"Hamburg", "germany",
	"Munich", "germany",
	"Zurich", "switzerland",
	"Milan", "italy",
	"Rome", "italy",
	"Brussels", "belgium",
	"Stockholm", "sweden",
	"Copenhagen", "denmark",
	"Vienna", "austria",
	"Prague", "czechia",
	"Warsaw", "poland"
];

async function runCareerPathScraping() {
	console.log('🎯 STARTING CAREER PATH-FOCUSED SCRAPING');
	console.log('==========================================');
	console.log('Targeting specific career areas for early career roles');
	console.log('');

	const supabase = getSupabase();
	let totalJobsProcessed = 0;
	let totalJobsSaved = 0;

	// Process career paths in rotation
	const careerPaths = Object.keys(CAREER_PATH_QUERIES);

	for (let cityIdx = 0; cityIdx < CAREER_CITIES.length; cityIdx += 2) {
		const city = CAREER_CITIES[cityIdx];
		const country = CAREER_CITIES[cityIdx + 1];

		console.log(`\n🏙️ Processing ${city}, ${country}...`);

		// Process each career path for this city
		for (const careerPath of careerPaths) {
			const queries = CAREER_PATH_QUERIES[careerPath];

			// Take first 5 queries from each career path for comprehensive coverage
			const selectedQueries = queries.slice(0, 5);

			for (const query of selectedQueries) {
				console.log(`🔍 Searching "${query}" in ${city} (${careerPath})`);

				try {
					const pythonScript = `
import jobspy
import pandas as pd
import json
import sys
from datetime import datetime

try:
    df = jobspy.scrape_jobs(
        site_name=["indeed", "glassdoor"],
        search_term="${query.replace(/"/g, '\\"')}",
        location="${city}",
        results_wanted=8,
        hours_old=168,
        country_indeed="${country}"
    )

    if len(df) > 0:
        # Replace NaN values with None for JSON serialization
        df_cleaned = df.replace({float('nan'): None})
        records = df_cleaned.to_dict('records')

        # Handle date serialization properly
        def serialize_dates(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            if hasattr(obj, 'to_pydatetime'):
                return obj.to_pydatetime().isoformat()
            if hasattr(obj, 'toordinal'):  # date object
                return str(obj)
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

        json_output = json.dumps(records, ensure_ascii=False, indent=None, default=serialize_dates)
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
						timeout: 30000 // 30 second timeout
					});

					if (result.error || result.stderr) {
						console.log(`❌ Python error for "${query}":`, result.stderr || result.error.message);
						continue;
					}

					let jobs = [];
					try {
						const output = result.stdout.trim();
						if (output.startsWith('ERROR:')) {
							console.log(`❌ JobSpy error for "${query}":`, output);
							continue;
						}
						jobs = JSON.parse(output);
					} catch (parseError) {
						console.log(`❌ JSON parse error for "${query}":`, parseError.message);
						continue;
					}

					console.log(`📊 Found ${jobs.length} jobs for "${query}"`);

					// Process and save jobs
					let batchProcessed = 0;
					let batchSaved = 0;

					for (const jobData of jobs) {
						try {
							const processed = await processIncomingJob(jobData, {
								source: `jobspy-career-${careerPath}`
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

					console.log(`✅ Career path ${careerPath}: ${batchProcessed} processed, ${batchSaved} saved`);
					totalJobsProcessed += batchProcessed;
					totalJobsSaved += batchSaved;

					// Small delay between queries
					await new Promise(resolve => setTimeout(resolve, 1500));

				} catch (error) {
					console.log(`❌ Error with query "${query}":`, error.message);
				}
			}

			console.log(`🏆 Career path ${careerPath} complete for ${city}`);
		}

		console.log(`🏙️ Completed ${city}: ${totalJobsSaved} jobs saved so far`);
	}

	console.log('\n🎯 CAREER PATH SCRAPING COMPLETE');
	console.log('=================================');
	console.log(`📊 Total Jobs Processed: ${totalJobsProcessed}`);
	console.log(`💾 Total Jobs Saved: ${totalJobsSaved}`);
	console.log(`📈 Success Rate: ${totalJobsProcessed > 0 ? ((totalJobsSaved/totalJobsProcessed)*100).toFixed(1) : 0}%`);

	// Summary by career path
	console.log('\n📋 Career Path Focus Areas:');
	Object.keys(CAREER_PATH_QUERIES).forEach(path => {
		console.log(`   • ${path}: ${CAREER_PATH_QUERIES[path].length} targeted roles`);
	});
}

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

// Run the career path scraping
runCareerPathScraping().catch(console.error);