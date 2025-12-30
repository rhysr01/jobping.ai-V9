#!/usr/bin/env node

/**
 * Check GitHub Actions Workflow Runs
 *
 * This script checks recent workflow runs for the scrape-jobs workflow
 * to see why JobSpy might not have run yesterday.
 *
 * Usage:
 *   GITHUB_TOKEN=your_token node scripts/check-github-actions-logs.js
 *
 * Or set GITHUB_TOKEN in .env.local
 */

const https = require("node:https");
const { execSync } = require("node:child_process");
const zlib = require("node:zlib");
const { Readable } = require("node:stream");

// Get GitHub token from env or .env.local
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
	try {
		require("dotenv").config({ path: ".env.local" });
		GITHUB_TOKEN = process.env.GITHUB_TOKEN;
	} catch (_e) {
		// .env.local might not exist
	}
}

// Get repo info from git
function getRepoInfo() {
	try {
		const remoteUrl = execSync("git config --get remote.origin.url", {
			encoding: "utf-8",
		}).trim();
		// Handle both https and ssh formats
		const match = remoteUrl.match(
			/(?:github\.com[:/]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/,
		);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
	} catch (_e) {
		console.error("❌ Could not determine repo from git remote");
	}
	return null;
}

function makeGitHubRequest(path, options = {}) {
	return new Promise((resolve, reject) => {
		const repoInfo = getRepoInfo();
		if (!repoInfo) {
			reject(new Error("Could not determine repository"));
			return;
		}

		const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}${path}`;

		const requestOptions = {
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "JobPing-Scraper-Checker",
				...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
			},
			...options,
		};

		https
			.get(url, requestOptions, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						try {
							resolve(JSON.parse(data));
						} catch (_e) {
							resolve(data);
						}
					} else {
						reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
					}
				});
			})
			.on("error", reject);
	});
}

async function fetchJobLogs(jobId) {
	if (!GITHUB_TOKEN) {
		return null;
	}

	return new Promise((resolve, reject) => {
		const repoInfo = getRepoInfo();
		if (!repoInfo) {
			reject(new Error("Could not determine repository"));
			return;
		}

		const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/jobs/${jobId}/logs`;

		const requestOptions = {
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "JobPing-Scraper-Checker",
				Authorization: `token ${GITHUB_TOKEN}`,
			},
		};

		https
			.get(url, requestOptions, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`Failed to fetch logs: ${res.statusCode}`));
					return;
				}

				const chunks = [];
				res.on("data", (chunk) => chunks.push(chunk));
				res.on("end", () => {
					const buffer = Buffer.concat(chunks);
					// Logs are returned as a zip file, but for now we'll just return the raw buffer
					// In a production scenario, you'd unzip and parse it
					resolve(buffer);
				});
			})
			.on("error", reject);
	});
}

function extractJobSpyInfo(logText) {
	const lines = logText.split("\n");
	const jobspyLines = [];
	const keywords = [
		"jobspy",
		"JobSpy",
		"Running JobSpy",
		"total_saved",
		"jobs saved",
		"jobs processed",
	];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].toLowerCase();
		if (keywords.some((kw) => line.includes(kw.toLowerCase()))) {
			// Get context (5 lines before and after)
			const start = Math.max(0, i - 5);
			const end = Math.min(lines.length, i + 6);
			jobspyLines.push(...lines.slice(start, end));
			i = end; // Skip ahead to avoid duplicates
		}
	}

	return jobspyLines.join("\n");
}

async function checkWorkflowRuns() {
	console.log("🔍 Checking GitHub Actions Workflow Runs...\n");

	if (!GITHUB_TOKEN) {
		console.warn(
			"⚠️  GITHUB_TOKEN not set. Some API calls may be rate-limited.",
		);
		console.log(
			"   Set GITHUB_TOKEN environment variable or add to .env.local\n",
		);
	}

	try {
		// Get workflow runs for scrape-jobs workflow
		const workflows = await makeGitHubRequest("/actions/workflows");

		// Find the scrape-jobs workflow
		const scrapeWorkflow = workflows.workflows?.find(
			(w) =>
				w.name === "Automated Job Scraping" ||
				w.path.includes("scrape-jobs.yml"),
		);

		if (!scrapeWorkflow) {
			console.log("❌ Could not find scrape-jobs workflow");
			return;
		}

		console.log(
			`✅ Found workflow: ${scrapeWorkflow.name} (ID: ${scrapeWorkflow.id})\n`,
		);

		// Get recent runs
		const runs = await makeGitHubRequest(
			`/actions/workflows/${scrapeWorkflow.id}/runs?per_page=10`,
		);

		if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
			console.log("❌ No workflow runs found");
			return;
		}

		console.log(`📊 Found ${runs.workflow_runs.length} recent runs:\n`);
		console.log("=".repeat(100));

		// Analyze each run
		for (const run of runs.workflow_runs) {
			const runDate = new Date(run.created_at);
			const now = new Date();
			const hoursAgo = (now - runDate) / (1000 * 60 * 60);
			const daysAgo = hoursAgo / 24;

			const statusIcon =
				run.status === "completed"
					? run.conclusion === "success"
						? "✅"
						: "❌"
					: run.status === "in_progress"
						? "🔄"
						: "⏸️";

			console.log(
				`\n${statusIcon} Run #${run.run_number} - ${run.status} (${run.conclusion || "pending"})`,
			);
			console.log(
				`   📅 Created: ${runDate.toISOString()} (${daysAgo.toFixed(1)} days ago)`,
			);
			console.log(`   🎯 Event: ${run.event}`);
			console.log(`   🔗 URL: ${run.html_url}`);

			// Check if this was yesterday
			if (daysAgo >= 1 && daysAgo < 2) {
				console.log(`   ⚠️  THIS WAS YESTERDAY!`);
			}

			// Get job details for all runs (to see what actually executed)
			try {
				const jobs = await makeGitHubRequest(`/actions/runs/${run.id}/jobs`);
				if (jobs.jobs && jobs.jobs.length > 0) {
					console.log(`   📋 Jobs in this run:`);

					for (const job of jobs.jobs) {
						const jobStatus =
							job.conclusion === "success"
								? "✅"
								: job.conclusion === "failure"
									? "❌"
									: job.conclusion === "cancelled"
										? "🚫"
										: "⏸️";
						const duration =
							job.completed_at && job.started_at
								? Math.round(
										(new Date(job.completed_at) - new Date(job.started_at)) /
											1000,
									)
								: 0;

						console.log(
							`      ${jobStatus} ${job.name} - ${job.conclusion || job.status}${duration > 0 ? ` (${duration}s)` : ""}`,
						);

						// Check for JobSpy-related output in job name
						if (
							job.name.toLowerCase().includes("scrape") ||
							job.name.toLowerCase().includes("job")
						) {
							// Try to get logs if we have a token (for successful runs too, to see what happened)
							if (
								GITHUB_TOKEN &&
								(run.conclusion === "failure" || run.conclusion === "success")
							) {
								try {
									// Note: Getting logs requires additional API calls, but we can at least note the job
									if (job.conclusion === "failure") {
										console.log(`         🔗 View logs: ${job.html_url}`);
									}
								} catch (_e) {
									// Ignore log fetch errors
								}
							}
						}
					}
				}
			} catch (e) {
				if (run.conclusion === "failure" || run.conclusion === "cancelled") {
					console.log(`   ⚠️  Could not fetch job details: ${e.message}`);
				}
			}

			// Check if run was cancelled due to concurrency
			if (run.conclusion === "cancelled" && run.event === "schedule") {
				console.log(
					`   ⚠️  This scheduled run was cancelled (likely due to concurrency)`,
				);
			}
		}

		console.log(`\n${"=".repeat(100)}`);

		// Summary
		const yesterdayRuns = runs.workflow_runs.filter((run) => {
			const runDate = new Date(run.created_at);
			const daysAgo = (Date.now() - runDate) / (1000 * 60 * 60 * 24);
			return daysAgo >= 1 && daysAgo < 2;
		});

		console.log("\n📈 Summary:");
		console.log(`   Total runs checked: ${runs.workflow_runs.length}`);
		console.log(`   Runs yesterday: ${yesterdayRuns.length}`);

		if (yesterdayRuns.length === 0) {
			console.log(
				`   ⚠️  NO RUNS YESTERDAY - This explains why JobSpy didn't run!`,
			);
		} else {
			const failedRuns = yesterdayRuns.filter(
				(r) => r.conclusion === "failure",
			);
			const cancelledRuns = yesterdayRuns.filter(
				(r) => r.conclusion === "cancelled",
			);
			const successRuns = yesterdayRuns.filter(
				(r) => r.conclusion === "success",
			);

			console.log(`   ✅ Successful: ${successRuns.length}`);
			console.log(`   ❌ Failed: ${failedRuns.length}`);
			console.log(`   🚫 Cancelled: ${cancelledRuns.length}`);

			if (cancelledRuns.length > 0) {
				console.log(
					`\n   ⚠️  Cancelled runs likely due to concurrency (cancel-in-progress: true)`,
				);
				console.log(
					`   This means another run was already in progress, so this one was cancelled.`,
				);
			}
		}

		// Check today's runs
		const todayRuns = runs.workflow_runs.filter((run) => {
			const runDate = new Date(run.created_at);
			const hoursAgo = (Date.now() - runDate) / (1000 * 60 * 60);
			return hoursAgo < 24;
		});

		console.log(`\n   Runs today: ${todayRuns.length}`);
		const todaySuccess = todayRuns.filter((r) => r.conclusion === "success");
		if (todaySuccess.length > 0) {
			console.log(`   ✅ Successful today: ${todaySuccess.length}`);
			const latestSuccess = todaySuccess[0];
			console.log(
				`   Latest success: ${new Date(latestSuccess.created_at).toISOString()}`,
			);

			// Analyze the most recent successful run in detail
			console.log(
				`\n🔍 Analyzing Most Recent Successful Run (#${latestSuccess.run_number}):`,
			);
			try {
				const latestJobs = await makeGitHubRequest(
					`/actions/runs/${latestSuccess.id}/jobs`,
				);
				if (latestJobs.jobs && latestJobs.jobs.length > 0) {
					const scrapeJob = latestJobs.jobs.find((j) => j.name === "scrape");
					if (scrapeJob) {
						const durationMs =
							scrapeJob.completed_at && scrapeJob.started_at
								? new Date(scrapeJob.completed_at) -
									new Date(scrapeJob.started_at)
								: 0;
						const duration = Math.round(durationMs / 1000 / 60); // Convert to minutes
						console.log(`   📋 Scrape job duration: ${duration} minutes`);
						console.log(`   🔗 View full logs: ${scrapeJob.html_url}`);

						// Try to fetch and analyze logs if we have a token
						if (GITHUB_TOKEN) {
							console.log(`\n   📥 Fetching log content...`);
							try {
								const logBuffer = await fetchJobLogs(scrapeJob.id);
								if (logBuffer) {
									// Try to extract text from the buffer (logs might be zipped)
									let logText = "";
									try {
										// Try to decompress if it's gzipped
										logText = zlib.gunzipSync(logBuffer).toString("utf-8");
									} catch (_e) {
										// If not gzipped, try as plain text
										try {
											logText = logBuffer.toString("utf-8");
										} catch (_e2) {
											console.log(
												`   ⚠️  Could not parse log content (may be zip format)`,
											);
										}
									}

									if (logText) {
										// Extract JobSpy-related content
										const jobspyInfo = extractJobSpyInfo(logText);
										if (jobspyInfo) {
											console.log(`\n   🔍 JobSpy-related log excerpts:`);
											console.log(`   ${"=".repeat(80)}`);
											// Show first 2000 chars
											const preview =
												jobspyInfo.length > 2000
													? `${jobspyInfo.substring(0, 2000)}...`
													: jobspyInfo;
											console.log(
												preview
													.split("\n")
													.map((l) => `   ${l}`)
													.join("\n"),
											);
											console.log(`   ${"=".repeat(80)}`);
										} else {
											console.log(
												`   ⚠️  No JobSpy-related content found in logs`,
											);
											console.log(
												`   This suggests JobSpy may not be running!`,
											);
										}

										// Check for common patterns
										const hasJobSpy = /jobspy|JobSpy/i.test(logText);
										const hasRunningJobSpy =
											/Running JobSpy|🔄 Running JobSpy/i.test(logText);
										const hasTotalSaved =
											/total_saved|jobs saved|jobs processed/i.test(logText);

										console.log(`\n   📊 Log Analysis:`);
										console.log(
											`      ${hasJobSpy ? "✅" : "❌"} Contains "JobSpy" mentions: ${hasJobSpy}`,
										);
										console.log(
											`      ${hasRunningJobSpy ? "✅" : "❌"} Contains "Running JobSpy": ${hasRunningJobSpy}`,
										);
										console.log(
											`      ${hasTotalSaved ? "✅" : "❌"} Contains job save counts: ${hasTotalSaved}`,
										);

										if (!hasJobSpy) {
											console.log(
												`\n   ⚠️  WARNING: No JobSpy mentions found in logs!`,
											);
											console.log(
												`   This strongly suggests JobSpy is not being executed.`,
											);
										}
									}
								}
							} catch (logError) {
								console.log(`   ⚠️  Could not fetch logs: ${logError.message}`);
								console.log(
									`   💡 You can view logs manually at: ${scrapeJob.html_url}`,
								);
							}
						} else {
							console.log(`\n   💡 To get detailed log analysis:`);
							console.log(`      1. Set GITHUB_TOKEN environment variable`);
							console.log(`      2. Re-run this script`);
							console.log(
								`      3. Or view logs manually at: ${scrapeJob.html_url}`,
							);
						}

						console.log(`\n   💡 Manual diagnosis steps:`);
						console.log(
							`      1. Click the link above to view the full workflow logs`,
						);
						console.log(
							`      2. Look for "Running JobSpy" or "JobSpy" in the logs`,
						);
						console.log(`      3. Check for errors or "0 jobs saved" messages`);
						console.log(`      4. Verify Python/JobSpy installation succeeded`);
					}
				}
			} catch (e) {
				console.log(`   ⚠️  Could not analyze latest run: ${e.message}`);
			}
		}
	} catch (error) {
		console.error("❌ Error checking workflow runs:", error.message);
		if (error.message.includes("401") || error.message.includes("403")) {
			console.error(
				"\n💡 Tip: You need a GitHub Personal Access Token with `actions:read` permission",
			);
			console.error("   Create one at: https://github.com/settings/tokens");
			console.error("   Then set: export GITHUB_TOKEN=your_token");
		}
	}
}

// Run the check
checkWorkflowRuns().catch(console.error);
