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
		"Business Analyst",
		"Associate Consultant",
		"Junior Consultant",
		"Strategy Analyst",
		"Consulting Intern",
		"Junior Business Analyst",
		"Transformation Analyst",
		"Management Consulting Intern",
		"Growth Consultant",
		"Business Analyst Trainee",
		"Junior Associate",
		"Strategy Consultant",
		"Digital Transformation Analyst",
		"Operations Excellence Consultant",
		"Business Strategy Intern"
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
		"Sales Development Representative (SDR)",
		"Business Development Representative (BDR)",
		"Inside Sales Representative",
		"Account Executive",
		"Business Development Associate",
		"Sales Trainee",
		"Customer Success Associate",
		"Revenue Operations Analyst",
		"Sales Operations Analyst",
		"Graduate Sales Programme",
		"Business Development Intern",
		"Channel Sales Associate",
		"Account Development Representative",
		"Junior Sales Executive",
		"Client Success Manager"
	],
	marketing: [
		"Marketing Intern",
		"Social Media Intern",
		"Digital Marketing Assistant",
		"Marketing Coordinator",
		"Growth Marketing Intern",
		"Content Marketing Intern",
		"Brand Assistant",
		"Marketing Assistant",
		"Junior Marketing Associate",
		"Email Marketing Trainee",
		"SEO/SEM Intern",
		"Trade Marketing Intern",
		"Marketing Graduate Programme",
		"Junior B2B Marketing Coordinator",
		"Marketing Campaign Assistant"
	],
	product: [
		"Associate Product Manager (APM)",
		"Product Analyst",
		"Product Management Intern",
		"Junior Product Manager",
		"Product Operations Associate",
		"Product Designer",
		"UX Intern",
		"Product Research Assistant",
		"Innovation Analyst",
		"Product Development Coordinator",
		"Product Marketing Assistant",
		"Product Owner Graduate",
		"Assistant Product Manager",
		"Product Strategy Intern",
		"Technical Product Specialist"
	],
	operations: [
		"Operations Analyst",
		"Supply Chain Analyst",
		"Logistics Analyst",
		"Procurement Analyst",
		"Operations Intern",
		"Inventory Planner",
		"Operations Coordinator",
		"Supply Chain Trainee",
		"Logistics Planning Graduate",
		"Demand Planning Intern",
		"Operations Management Trainee",
		"Fulfilment Specialist",
		"Sourcing Analyst",
		"Process Improvement Analyst",
		"Supply Chain Graduate"
	],
	tech: [
		"Software Engineer Intern",
		"Cloud Engineer Intern",
		"DevOps Engineer Intern",
		"Data Engineer Intern",
		"Systems Analyst",
		"IT Support Analyst",
		"Application Support Analyst",
		"Technology Analyst",
		"QA/Test Analyst",
		"Platform Engineer Intern",
		"Cybersecurity Analyst",
		"IT Operations Trainee",
		"Technical Consultant",
		"Solutions Engineer Graduate",
		"IT Business Analyst"
	],
	data: [
		"Data Analyst",
		"Junior Data Analyst",
		"Analytics Intern",
		"Business Intelligence Intern",
		"Data Analyst Trainee",
		"Junior Data Scientist",
		"Data Science Trainee",
		"Junior Data Engineer",
		"BI Engineer Intern",
		"Analytics Associate",
		"Data Analytics Graduate",
		"Insights Analyst",
		"Junior BI Developer",
		"Data Assistant",
		"Research & Analytics Intern"
	],
	sustainability: [
		"ESG Intern",
		"Sustainability Strategy Intern",
		"Junior ESG Analyst",
		"Sustainability Graduate Programme",
		"ESG Data Analyst Intern",
		"Corporate Responsibility Intern",
		"Environmental Analyst",
		"Sustainability Reporting Trainee",
		"Climate Analyst",
		"Sustainable Finance Analyst",
		"ESG Assurance Intern",
		"Sustainability Communications Intern",
		"Junior Impact Analyst",
		"Sustainability Operations Assistant",
		"Green Finance Analyst"
	],
	unsure: [
		"Graduate Trainee",
		"Rotational Graduate Program",
		"Management Trainee",
		"Business Graduate Analyst",
		"Entry Level Program Associate",
		"Future Leaders Programme",
		"General Analyst",
		"Operations Graduate",
		"Commercial Graduate",
		"Early Careers Program",
		"Project Coordinator",
		"Business Operations Analyst",
		"Emerging Leaders Associate",
		"Corporate Graduate Programme",
		"Generalist Trainee"
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

			// Take first 8 queries from each career path for comprehensive coverage
			const selectedQueries = queries.slice(0, 8);

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