#!/usr/bin/env node

// Quick script to analyze job categorization
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeCategories() {
  console.log("🔍 Analyzing job categorization...\n");

  // Get counts by type
  const { count: totalActive } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: internships } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_internship", true);

  const { count: graduates } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_graduate", true);

  const { count: earlyCareer } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .contains("categories", ["early-career"])
    .eq("is_internship", false)
    .eq("is_graduate", false);

  console.log("📊 OVERALL STATS:");
  console.log(`   Total Active Jobs: ${totalActive}`);
  console.log(`   Internships: ${internships} (${((internships / totalActive) * 100).toFixed(1)}%)`);
  console.log(`   Graduate Roles: ${graduates} (${((graduates / totalActive) * 100).toFixed(1)}%)`);
  console.log(`   Early Career: ${earlyCareer} (${((earlyCareer / totalActive) * 100).toFixed(1)}%)`);
  console.log(`   Sum of categories: ${internships + graduates + earlyCareer}`);
  console.log(`   Uncategorized: ${totalActive - (internships + graduates + earlyCareer)}\n`);

  // Check for overlap (jobs marked as both internship and graduate)
  const { data: overlap } = await supabase
    .from("jobs")
    .select("id, title, company")
    .eq("is_active", true)
    .eq("is_internship", true)
    .eq("is_graduate", true)
    .limit(5);

  if (overlap && overlap.length > 0) {
    console.log("⚠️  OVERLAP DETECTED - Jobs marked as BOTH internship AND graduate:");
    overlap.forEach((job) => {
      console.log(`   - ${job.title} @ ${job.company}`);
    });
    console.log();
  }

  // Get sample internships
  console.log("📍 SAMPLE INTERNSHIPS (first 3):");
  const { data: sampleInternships } = await supabase
    .from("jobs")
    .select("id, title, company, categories")
    .eq("is_active", true)
    .eq("is_internship", true)
    .limit(3);

  sampleInternships?.forEach((job) => {
    console.log(`   - ${job.title} @ ${job.company}`);
    console.log(`     Categories: ${job.categories?.join(", ") || "none"}`);
  });
  console.log();

  // Get sample graduates
  console.log("📍 SAMPLE GRADUATE ROLES (first 3):");
  const { data: sampleGraduates } = await supabase
    .from("jobs")
    .select("id, title, company, categories")
    .eq("is_active", true)
    .eq("is_graduate", true)
    .limit(3);

  sampleGraduates?.forEach((job) => {
    console.log(`   - ${job.title} @ ${job.company}`);
    console.log(`     Categories: ${job.categories?.join(", ") || "none"}`);
  });
  console.log();

  // Get sample early career
  console.log("📍 SAMPLE EARLY CAREER ROLES (first 3):");
  const { data: sampleEarlyCareer } = await supabase
    .from("jobs")
    .select("id, title, company, categories, is_internship, is_graduate")
    .eq("is_active", true)
    .contains("categories", ["early-career"])
    .eq("is_internship", false)
    .eq("is_graduate", false)
    .limit(3);

  sampleEarlyCareer?.forEach((job) => {
    console.log(`   - ${job.title} @ ${job.company}`);
    console.log(`     Categories: ${job.categories?.join(", ") || "none"}`);
  });
  console.log();

  // Check if is_internship is even being set
  const { data: internshipCheck } = await supabase
    .from("jobs")
    .select("is_internship, is_graduate, COUNT(*) as count", { count: "exact" })
    .eq("is_active", true)
    .groupBy("is_internship,is_graduate");

  console.log("🔎 CATEGORIZATION MATRIX:");
  console.log("   is_internship | is_graduate | count");
  console.log("   --------------|-------------|-------");
  internshipCheck?.forEach((row) => {
    console.log(`        ${row.is_internship}       |      ${row.is_graduate}       | ${row.count}`);
  });
}

analyzeCategories().catch(console.error);

