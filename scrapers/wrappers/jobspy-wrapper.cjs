#!/usr/bin/env node

// Wrapper for JobSpy scraper - standardizes output format
async function main() {
	try {
		const jobspyModule = require("../../scripts/jobspy-save.cjs");
		if (typeof jobspyModule.main === "function") {
			await jobspyModule.main();
		} else {
			// Back-compat: fall back to requiring script (self-exec)
			require("../../scripts/jobspy-save.cjs");
		}
		process.exit(0);
	} catch (error) {
		console.error(`❌ JobSpy failed: ${error.message}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = { main };
