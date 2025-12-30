#!/usr/bin/env node

// Wrapper for Reed scraper - standardizes output format
async function main() {
	try {
		// Execute the scraper in the same process and let it finish naturally.
		require("../../scrapers/reed-scraper-standalone.cjs");
	} catch (error) {
		console.error(`❌ Reed failed: ${error.message}`);
	}
}

if (require.main === module) {
	main();
}

module.exports = { main };
