#!/usr/bin/env node
/**
 * Fix Job Categorization - Re-classify all jobs based on title/description
 * 
 * Issues being fixed:
 * 1. Too many internships (14,350) vs too few graduates (651)
 * 2. Graduate roles likely exist but weren't detected properly
 * 3. Classification logic needs improvement
 */

// Load environment variables explicitly
require("dotenv").config({ path: "/Users/rhysrowlands/jobping/.env.local" });

const { createClient } = require("@supabase/supabase-js");

// IMPROVED classification logic
function classifyJobType(job) {
  const title = (job.title || "").toLowerCase();
  const description = (job.description || "").toLowerCase();
  const fullText = `${title} ${description}`;

  // GRADUATE program indicators (check first, more specific)
  const graduatePatterns = [
    /\bgraduate\s+(?:programme|program|scheme|trainee|role)\b/,
    /\bgrad\s+(?:scheme|program)\b/,
    /\b(?:management|graduate)\s+trainee\b/,
    /\b(?:rotational|leadership|accelerated|fast-track)\s+(?:programme|program)\b/,
    /\bcampus\s+hire\b/,
    /\bnew\s+grad(?:uate)?\b/,
    /\brecent\s+graduate\b/,
    /\b(?:entry.level|entry.to.career)\s+[^:]*graduate/i,
    /\btrainee\s+(?:programme|program|scheme)\b/,
  ];

  const isGraduate = graduatePatterns.some((pattern) =>
    pattern.test(fullText)
  );

  // INTERNSHIP indicators (only if NOT already marked as graduate)
  if (!isGraduate) {
    const internshipPatterns = [
      /\bintern(?:ship)?\b/,
      /\bsummer\s+(?:intern|placement)\b/,
      /\bwinter\s+(?:intern|placement)\b/,
      /\bspring\s+(?:intern|placement)\b/,
      /\b(?:co-op|coop)\b/,
      /\b(?:stage|praktikum|pr[aá]cticas|tirocinio|stagiaire|stagiar|becario)\b/,
      /\b(?:placement|work\s+experience)\b/,
      /\b(?:sandwich\s+course|year\s+out\s+industry)\b/,
    ];

    return {
      isInternship: internshipPatterns.some((pattern) =>
        pattern.test(fullText)
      ),
      isGraduate: false,
    };
  }

  return {
    isInternship: false,
    isGraduate: true,
  };
}

async function fixCategorization() {
  // Get Supabase credentials from environment or stdin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🔍 Starting job categorization fix...\n");

    // Fetch all active jobs (paginated - Supabase default limit is 1000)
    let allJobs = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: jobs, error: fetchError } = await supabase
        .from("jobs")
        .select("id, title, description, is_internship, is_graduate")
        .eq("is_active", true)
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        console.error("❌ Failed to fetch jobs:", fetchError);
        process.exit(1);
      }

      if (!jobs || jobs.length === 0) {
        hasMore = false;
      } else {
        allJobs = allJobs.concat(jobs);
        offset += pageSize;
        if (jobs.length < pageSize) {
          hasMore = false;
        }
      }
    }

    const jobs = allJobs;

    console.log(`📊 Found ${jobs.length} active jobs to analyze\n`);

    // Classify all jobs
    let changes = 0;
    let internships = 0;
    let graduates = 0;
    let earlyCareer = 0;
    const updates = [];

    for (const job of jobs) {
      const { isInternship, isGraduate } = classifyJobType(job);

      if (isInternship) internships++;
      else if (isGraduate) graduates++;
      else earlyCareer++;

      // Check if classification changed
      if (
        job.is_internship !== isInternship ||
        job.is_graduate !== isGraduate
      ) {
        changes++;
        updates.push({
          id: job.id,
          is_internship: isInternship,
          is_graduate: isGraduate,
          old_internship: job.is_internship,
          old_graduate: job.is_graduate,
        });
      }
    }

    console.log("📈 NEW CLASSIFICATION:");
    console.log(`   Internships: ${internships} (${((internships / jobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Graduates: ${graduates} (${((graduates / jobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Early Career: ${earlyCareer} (${((earlyCareer / jobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Total: ${internships + graduates + earlyCareer}\n`);

    console.log(`🔄 Jobs needing updates: ${changes}\n`);

    if (changes === 0) {
      console.log("✓ All jobs already correctly categorized!");
      return;
    }

    // Show sample changes
    console.log("📝 SAMPLE CHANGES:");
    updates.slice(0, 10).forEach((update) => {
      console.log(
        `   ID ${update.id}: ` +
          `internship ${update.old_internship} → ${update.is_internship}, ` +
          `graduate ${update.old_graduate} → ${update.is_graduate}`
      );
    });
    console.log();

    // Ask for confirmation
    console.log(`⚠️  This will update ${changes} job records.`);
    console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Apply updates in batches using UPDATE instead of UPSERT
    console.log("🚀 Applying updates...\n");

    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error } = await supabase
          .from("jobs")
          .update({
            is_internship: update.is_internship,
            is_graduate: update.is_graduate,
          })
          .eq("id", update.id);

        if (error) {
          console.error(
            `❌ Failed to update job ${update.id}:`,
            error
          );
          process.exit(1);
        }
      }

      console.log(
        `   ✓ Updated ${Math.min(i + batchSize, updates.length)} / ${updates.length}`
      );
    }

    console.log("\n✅ Categorization fix complete!");
    console.log(
      `\n📊 Summary:\n   Internships: ${internships}\n   Graduates: ${graduates}\n   Early Career: ${earlyCareer}`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixCategorization();

