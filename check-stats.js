#!/usr/bin/env node

// Query the stats API to analyze categorization
async function analyzeCategories() {
  try {
    console.log("🔍 Querying job categorization from running dev server...\n");

    // Query the stats API
    const response = await fetch("http://localhost:3001/api/stats?type=eu-jobs", {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch stats:", response.status);
      return;
    }

    const result = await response.json();
    const stats = result.data;

    console.log("📊 CURRENT LIVE STATS:");
    console.log(`   Total Active Jobs: ${stats.total?.toLocaleString()}`);
    console.log(`   Internships: ${stats.internships?.toLocaleString()} (${((stats.internships / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Graduate Roles: ${stats.graduateRoles?.toLocaleString()} (${((stats.graduateRoles / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Early Career: ${stats.earlyCareer?.toLocaleString()} (${((stats.earlyCareer / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Unique Cities: ${stats.cities}`);
    console.log(`\n   Sum of categories: ${stats.internships + stats.graduateRoles + stats.earlyCareer}`);
    console.log(`   Uncategorized: ${stats.total - (stats.internships + stats.graduateRoles + stats.earlyCareer)}`);
    console.log(`   Cached: ${stats.cached}`);
    console.log(`   Last Updated: ${stats.timestamp}\n`);

    // Analysis
    const internshipPct = ((stats.internships / stats.total) * 100).toFixed(1);
    const graduatePct = ((stats.graduateRoles / stats.total) * 100).toFixed(1);
    const earlyCareerPct = ((stats.earlyCareer / stats.total) * 100).toFixed(1);

    console.log("🔎 ANALYSIS:");
    if (stats.internships > stats.graduateRoles * 10) {
      console.log(`   ⚠️  SUSPICIOUS: ${stats.internships} internships vs only ${stats.graduateRoles} graduate roles`);
      console.log(`       Internships are ${(stats.internships / stats.graduateRoles).toFixed(1)}x more than graduate roles!`);
    }

    if (parseFloat(graduatePct) < 2) {
      console.log(`   ⚠️  WARNING: Graduate roles are only ${graduatePct}% of total - very low!`);
    }

    if (parseFloat(internshipPct) > 60) {
      console.log(`   ⚠️  WARNING: Internships are ${internshipPct}% of total - unusually high!`);
    }

    if (stats.total - (stats.internships + stats.graduateRoles + stats.earlyCareer) > stats.total * 0.1) {
      console.log(`   ⚠️  WARNING: ${(100 - parseFloat(internshipPct) - parseFloat(graduatePct) - parseFloat(earlyCareerPct)).toFixed(1)}% of jobs are uncategorized!`);
    }

    console.log("\n✓ Analysis complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("   Make sure the dev server is running on port 3001");
  }
}

analyzeCategories();

