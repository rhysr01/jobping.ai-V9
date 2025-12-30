#!/usr/bin/env node

/**
 * Backfill Missing Job Descriptions
 * Re-scrapes job URLs to fetch descriptions for jobs that are missing them
 * Uses JobSpy to fetch job details from individual URLs
 */

require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		process.env.SUPABASE_KEY;
	if (!url || !key)
		throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	return createClient(url, key, { auth: { persistSession: false } });
}

function pickPythonCommand() {
	// First check for PYTHON environment variable (used in CI/CD)
	if (process.env.PYTHON) {
		return process.env.PYTHON;
	}

	const scriptPath = require("node:path").join(
		__dirname,
		"run-jobspy-python.sh",
	);
	if (require("node:fs").existsSync(scriptPath)) {
		return scriptPath;
	}
	const directPath = "/opt/homebrew/opt/python@3.11/bin/python3.11";
	if (require("node:fs").existsSync(directPath)) {
		return directPath;
	}
	return "python3";
}

/**
 * Fetch job description from URL using JobSpy
 */
async function _fetchDescriptionFromUrl(jobUrl, pythonCmd) {
	try {
		// Use JobSpy to scrape individual job URL
		// JobSpy can scrape job details from URLs
		const py = spawnSync(
			pythonCmd,
			[
				"-c",
				`
import sys
try:
    from jobspy import scrape_jobs
    import pandas as pd
    
    # Try to scrape from the URL directly
    # JobSpy can handle individual URLs
    df = scrape_jobs(
        site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
        search_term='',
        location='',
        results_wanted=1,
        job_url='''${jobUrl.replace(/'/g, "''")}'''
    )
    
    if df is not None and len(df) > 0:
        # Try multiple description columns
        desc_cols = ['description', 'job_description', 'full_description', 'job_details', 'details']
        description = None
        
        for col in desc_cols:
            if col in df.columns and pd.notna(df[col].iloc[0]) and str(df[col].iloc[0]).strip():
                description = str(df[col].iloc[0]).strip()
                if len(description) > 50:
                    break
        
        # Fallback to company_description + skills
        if not description or len(description) < 50:
            parts = []
            if 'company_description' in df.columns and pd.notna(df['company_description'].iloc[0]):
                parts.append(str(df['company_description'].iloc[0]).strip())
            if 'skills' in df.columns and pd.notna(df['skills'].iloc[0]):
                parts.append(str(df['skills'].iloc[0]).strip())
            if parts:
                description = ' '.join(parts)
        
        if description and len(description) > 50:
            print(description)
        else:
            print('', file=sys.stderr)
            sys.exit(1)
    else:
        print('', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f'Error: {str(e)}', file=sys.stderr)
    sys.exit(1)
`,
			],
			{
				encoding: "utf8",
				timeout: 30000, // 30 second timeout per URL
				env: { ...process.env, PATH: process.env.PATH },
			},
		);

		if (py.status === 0 && py.stdout && py.stdout.trim().length > 50) {
			return py.stdout.trim();
		}

		return null;
	} catch (error) {
		console.error(`Error fetching description for ${jobUrl}:`, error.message);
		return null;
	}
}

/**
 * Alternative: Use requests/beautifulsoup to scrape directly
 * This is a fallback if JobSpy doesn't work for individual URLs
 */
async function fetchDescriptionDirectScrape(jobUrl, pythonCmd) {
	try {
		const py = spawnSync(
			pythonCmd,
			[
				"-c",
				`
import sys
import requests
from bs4 import BeautifulSoup
import re

try:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    response = requests.get('''${jobUrl.replace(/'/g, "''")}''', headers=headers, timeout=15)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Common job description selectors
    selectors = [
        '[data-testid="job-description"]',
        '.job-description',
        '.description',
        '#job-description',
        '[class*="description"]',
        '[id*="description"]',
        '.job-details',
        '.job-content',
        '[class*="job-detail"]'
    ]
    
    description = None
    for selector in selectors:
        elements = soup.select(selector)
        if elements:
            text = ' '.join([elem.get_text(strip=True) for elem in elements])
            if len(text) > 100:
                description = text
                break
    
    # If no specific selector found, try to find main content
    if not description:
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile('content|main|body', re.I))
        if main_content:
            # Remove script and style elements
            for script in main_content(['script', 'style', 'nav', 'header', 'footer']):
                script.decompose()
            text = main_content.get_text(separator=' ', strip=True)
            # Clean up whitespace
            text = re.sub(r'\\s+', ' ', text)
            if len(text) > 200:
                description = text[:5000]  # Limit to 5000 chars
    
    if description and len(description) > 50:
        print(description)
    else:
        print('', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f'Error: {str(e)}', file=sys.stderr)
    sys.exit(1)
`,
			],
			{
				encoding: "utf8",
				timeout: 20000,
				env: { ...process.env, PATH: process.env.PATH },
			},
		);

		if (py.status === 0 && py.stdout && py.stdout.trim().length > 50) {
			return py.stdout.trim();
		}

		return null;
	} catch (_error) {
		return null;
	}
}

async function main() {
	const supabase = getSupabase();
	const pythonCmd = pickPythonCommand();

	console.log("🔄 BACKFILLING MISSING JOB DESCRIPTIONS");
	console.log("========================================\n");

	// Configuration
	const BATCH_SIZE = parseInt(process.env.BACKFILL_BATCH_SIZE || "50", 10);
	const MAX_JOBS = parseInt(process.env.BACKFILL_MAX_JOBS || "1000", 10); // Limit for testing
	const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || "2000", 10); // 2 seconds between requests

	// Fetch jobs missing descriptions
	console.log("📊 Fetching jobs missing descriptions...");
	const { data: jobs, error } = await supabase
		.from("jobs")
		.select("id, job_url, description, title, company, source")
		.eq("is_active", true)
		.or("description.is.null,description.eq.")
		.not("job_url", "is", null)
		.like("job_url", "http%")
		.limit(MAX_JOBS)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("❌ Error fetching jobs:", error);
		process.exit(1);
	}

	if (!jobs || jobs.length === 0) {
		console.log("✅ No jobs need description backfill!");
		process.exit(0);
	}

	console.log(`📋 Found ${jobs.length} jobs missing descriptions\n`);

	// Group by source for reporting
	const bySource = {};
	jobs.forEach((job) => {
		bySource[job.source] = (bySource[job.source] || 0) + 1;
	});
	console.log("By source:");
	Object.entries(bySource).forEach(([source, count]) => {
		console.log(`  ${source}: ${count}`);
	});
	console.log("");

	let successCount = 0;
	let failCount = 0;
	let skipCount = 0;
	const updates = [];

	// Process in batches
	for (let i = 0; i < jobs.length; i++) {
		const job = jobs[i];
		const progress = `[${i + 1}/${jobs.length}]`;

		// Skip if URL is invalid
		if (!job.job_url || !job.job_url.startsWith("http")) {
			console.log(`${progress} ⏭️  Skipping ${job.title} - invalid URL`);
			skipCount++;
			continue;
		}

		// Skip if already has description
		if (job.description && job.description.trim().length > 50) {
			console.log(`${progress} ✅ ${job.title} - already has description`);
			skipCount++;
			continue;
		}

		console.log(`${progress} 🔍 Fetching: ${job.title} at ${job.company}`);
		console.log(`   URL: ${job.job_url.substring(0, 80)}...`);

		// Try to fetch description
		let description = null;

		// Method 1: Try JobSpy (if it supports individual URLs)
		// Note: JobSpy might not support individual URL scraping, so we'll use direct scraping

		// Method 2: Direct web scraping
		description = await fetchDescriptionDirectScrape(job.job_url, pythonCmd);

		if (description && description.length > 50) {
			updates.push({
				id: job.id,
				description: description.substring(0, 10000), // Limit to 10k chars
			});
			successCount++;
			console.log(`   ✅ Got description (${description.length} chars)`);
		} else {
			failCount++;
			console.log(`   ❌ Failed to fetch description`);
		}

		// Rate limiting
		if (i < jobs.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
		}

		// Batch update every BATCH_SIZE jobs
		if (updates.length >= BATCH_SIZE || i === jobs.length - 1) {
			console.log(`\n💾 Updating ${updates.length} jobs in database...`);

			for (const update of updates) {
				const { error: updateError } = await supabase
					.from("jobs")
					.update({
						description: update.description,
						updated_at: new Date().toISOString(),
					})
					.eq("id", update.id);

				if (updateError) {
					console.error(
						`   ❌ Error updating job ${update.id}:`,
						updateError.message,
					);
				}
			}

			console.log(`   ✅ Updated ${updates.length} jobs\n`);
			updates.length = 0; // Clear array
		}
	}

	// Final summary
	console.log(`\n${"=".repeat(50)}`);
	console.log("📊 BACKFILL SUMMARY");
	console.log("=".repeat(50));
	console.log(`Total processed: ${jobs.length}`);
	console.log(`✅ Successfully fetched: ${successCount}`);
	console.log(`❌ Failed to fetch: ${failCount}`);
	console.log(`⏭️  Skipped: ${skipCount}`);
	console.log(
		`📈 Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`,
	);
	console.log("=".repeat(50));
}

main().catch((error) => {
	console.error("❌ Fatal error:", error);
	process.exit(1);
});
