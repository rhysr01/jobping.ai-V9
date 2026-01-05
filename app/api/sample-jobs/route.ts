import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { COMPANY_LOGOS } from "@/lib/companyLogos";
import { withApiAuth } from "@/Utils/auth/apiAuth";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getDatabaseCategoriesForForm } from "@/Utils/matching/categoryMapper";
import { calculateCompanyTierScore } from "@/Utils/matching/consolidated/scoring";
import {
  calculateMatchScore,
  generateMatchExplanation,
} from "@/Utils/matching/rule-based-matcher.service";
import type { Job, UserPreferences } from "@/Utils/matching/types";

export const dynamic = "force-dynamic"; // Force dynamic rendering
export const revalidate = 3600; // Cache for 1 hour

async function getSampleJobsHandler(req: NextRequest) {
  try {
    const supabase = getDatabaseClient();
    const { searchParams } = new URL(req.url);
    // Day parameter available but not currently used in rotation logic
    // const _day = searchParams.get("day") || "monday";
    const tier = searchParams.get("tier") || "free"; // 'free' or 'premium'

    // Calculate week number for rotation (changes weekly)
    // Note: weekNumber calculation kept for future use
    // const _weekNumber = weekParam
    // 	? parseInt(weekParam, 10)
    // 	: (() => {
    // 			const now = new Date();
    // 			const start = new Date(now.getFullYear(), 0, 1);
    // 			const days = Math.floor(
    // 				(now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    // 			);
    // 			return Math.ceil((days + start.getDay() + 1) / 7);
    // 		})();

    // Use week number to rotate through users (ensures weekly rotation)
    // Rotate through 20 users: week 1 = user 0, week 2 = user 1, etc.
    // User offset calculation kept for future use
    // const userOffset = (weekNumber - 1) % 20;

    // Strategy: ALWAYS return real jobs from database
    // Use fictional user profile - jobs MUST be real
    // Use week number + tier to select different jobs for rotation

    interface SampleJob {
      // Core job properties needed for API response
      job_hash: string;
      title: string;
      company: string;
      location: string;
      city?: string;
      job_url: string;
      description: string;
      categories: string[];
      work_environment: string;
      is_internship?: boolean;
      is_graduate?: boolean;
      // Matching-specific properties
      matchScore: number; // camelCase for API response
      matchReason: string; // camelCase for API response
      userProfile?: UserPreferences;
    }

    interface PartialJob {
      job_hash?: string;
      title?: string;
      company?: string;
      location?: string;
    }

    const resultJobs: SampleJob[] = [];
    const usedJobHashes = new Set<string>();
    const usedCompositeKeys = new Set<string>(); // Add this for jobs without hash

    // Helper function to create composite key
    const getJobKey = (job: PartialJob): string => {
      if (job.job_hash && job.job_hash.trim() !== "") {
        return job.job_hash;
      }
      // Fallback: use title + company + location as composite key
      const title = (job.title || "").toLowerCase().trim();
      const company = (job.company || "").toLowerCase().trim();
      const location = (job.location || "").toLowerCase().trim();
      return `${title}|${company}|${location}`;
    };

    // Helper function to check if job is already used
    const isJobUsed = (job: PartialJob): boolean => {
      const key = getJobKey(job);
      if (job.job_hash && job.job_hash.trim() !== "") {
        return usedJobHashes.has(key);
      }
      return usedCompositeKeys.has(key);
    };

    // Helper function to mark job as used
    const markJobAsUsed = (job: PartialJob): void => {
      const key = getJobKey(job);
      if (job.job_hash && job.job_hash.trim() !== "") {
        usedJobHashes.add(key);
      } else {
        usedCompositeKeys.add(key);
      }
    };

    // Helper function to check if company is premium/well-known
    const isPremiumCompany = (companyName: string): boolean => {
      if (!companyName) return false;
      const normalized = companyName.toLowerCase().trim();

      // Check if company has a logo (premium indicator)
      const hasLogo = COMPANY_LOGOS.some(
        (logo) =>
          logo.name.toLowerCase() === normalized ||
          normalized.includes(logo.name.toLowerCase()) ||
          logo.name.toLowerCase().includes(normalized),
      );

      if (hasLogo) return true;

      // Also check using company tier scoring
      const tierScore = calculateCompanyTierScore(companyName, "");
      return tierScore.points >= 12; // Famous companies get 12 points
    };

    // Create realistic sample user profiles that match actual job categories
    // These profiles are designed to show high-quality matches for demonstration
    const fictionalProfiles = {
      free: {
        email: "sample-free@jobping.com",
        cities: ["Berlin", "Munich", "Hamburg"], // German cities for better matches
        careerPath: "strategy", // Use lowercase to match database
        languages_spoken: ["English", "German"],
      },
      premium: {
        email: "sample-premium@jobping.com",
        cities: ["London", "Amsterdam", "Berlin"],
        careerPath: "tech", // Tech has many jobs and good matches
        languages_spoken: ["English", "Dutch", "German"],
      },
    };

    const selectedUserProfile =
      fictionalProfiles[tier as "free" | "premium"] || fictionalProfiles.free;

    // Convert fictional profile to UserPreferences format for real matching engine
    const userPrefs: UserPreferences = {
      email: selectedUserProfile.email,
      target_cities: selectedUserProfile.cities || [],
      career_path: selectedUserProfile.careerPath
        ? [selectedUserProfile.careerPath.toLowerCase()]
        : [],
      work_environment: "hybrid", // Default to hybrid
      entry_level_preference: "entry",
      languages_spoken: selectedUserProfile.languages_spoken || ["English"],
      company_types: [],
      skills: [],
      visa_status: "need_sponsorship",
    };

    // Get career path categories for the selected profile
    const careerPathCategories = getDatabaseCategoriesForForm(
      selectedUserProfile.careerPath.toLowerCase(),
    );

    // Normalize city names for matching
    const normalizedCities = selectedUserProfile.cities.map((c) =>
      c.toLowerCase().trim(),
    );

    // Enhanced match score calculation using REAL matching engine
    const calculateRealMatchScore = (
      job: Partial<Job>,
      profile: typeof selectedUserProfile,
      existingHotMatches: number,
    ): {
      score: number;
      reason: string;
      breakdown: Record<string, unknown> | null;
    } => {
      // Convert job to Job format expected by matching engine
      const now = new Date().toISOString();
      const jobForMatching: Job = {
        title: job.title || "",
        company: job.company || "",
        location: job.location || "",
        description: job.description || "",
        categories: job.categories || [],
        work_environment: job.work_environment || "Hybrid",
        is_internship: job.is_internship || false,
        is_graduate: job.is_graduate || false,
        city: job.city || job.location?.split(",")[0] || "",
        job_url: job.job_url || "",
        job_hash: job.job_hash || "",
        experience_required: job.experience_required || "Entry level",
        source: job.source || "unknown",
        company_profile_url: job.company_profile_url || "",
        language_requirements: job.language_requirements || [],
        scrape_timestamp: job.scrape_timestamp || now,
        original_posted_date: job.original_posted_date || now,
        posted_at: job.posted_at || now,
        last_seen_at: job.last_seen_at || now,
        created_at: job.created_at || now,
        is_active: job.is_active !== undefined ? job.is_active : true,
      };

      try {
        // Use REAL matching engine
        const matchResult = calculateMatchScore(jobForMatching, userPrefs);
        const explanation = generateMatchExplanation(
          jobForMatching,
          matchResult,
          userPrefs,
        );

        // Get base score from matching engine (0-100, convert to 0-1)
        let baseScore = matchResult.overall / 100;

        // Ensure realistic distribution: vary scores but respect matching engine
        const jobCity = (job.city || job.location?.split(",")[0] || "")
          .toLowerCase()
          .trim();
        const matchesPreferredCity = normalizedCities.some(
          (prefCity) =>
            jobCity.includes(prefCity) ||
            prefCity.includes(jobCity) ||
            job.location?.toLowerCase().includes(prefCity),
        );

        const jobCategories = (job.categories || []).map((c: string) =>
          c.toLowerCase(),
        );
        // Stricter career matching - job must have the exact career category
        const hasCareerMatch = careerPathCategories.some((cat) =>
          jobCategories.includes(cat.toLowerCase()),
        );

        // Much stricter scoring: career path match is crucial for sample quality
        if (hasCareerMatch) {
          // Career match = high score, boosted for city matches
          if (matchesPreferredCity) {
            baseScore = Math.min(0.95, Math.max(baseScore, 0.85)); // 85-95% for perfect matches
          } else {
            baseScore = Math.min(0.9, Math.max(baseScore, 0.75)); // 75-90% for career matches
          }
        } else {
          // No career match = significantly lower score, only show if very high base score
          baseScore = Math.min(0.65, baseScore * 0.7); // Cap at 65%, reduce by 30%
          if (baseScore < 0.6) {
            baseScore = Math.max(0.5, baseScore); // Minimum 50% for any job shown
          }
        }

        // Ensure only 1-2 hot matches (92%+)
        if (baseScore >= 0.92 && existingHotMatches >= 2) {
          baseScore = Math.min(0.91, baseScore);
        }

        // Generate personalized reason based on actual match factors
        const city = job.city || job.location?.split(",")[0] || "Europe";
        const category = job.categories?.[0]?.replace(/-/g, " ") || "roles";
        const company = job.company || "This company";
        // Work environment available but not currently used in reason generation
        // const workEnv = job.work_environment || "Hybrid";
        const isGraduate = job.is_graduate || false;
        const isInternship = job.is_internship || false;

        // Build personalized reason - use the actual explanation from matching engine
        let personalizedReason = explanation.reason;

        // Enhance with specific details, but don't replace with generic templates
        if (matchesPreferredCity && hasCareerMatch) {
          // Perfect match - enhance the explanation
          personalizedReason = `${explanation.reason}. Located in ${city}, one of your preferred cities (${profile.cities.join(", ")}), and matches your ${profile.careerPath} career path. ${isGraduate ? "Graduate programme" : isInternship ? "Internship" : "Entry-level friendly"} with excellent growth opportunities.`;
        } else if (matchesPreferredCity) {
          // City match - enhance the explanation
          personalizedReason = `${explanation.reason}. Located in ${city}, one of your preferred cities. ${isGraduate ? "Graduate-friendly" : "Entry-level friendly"} with opportunities to grow.`;
        } else if (hasCareerMatch) {
          // Career match - use the explanation which already includes "Perfect career path match"
          // Just add context about the role type
          personalizedReason = `${explanation.reason}. ${isGraduate ? "Graduate programme" : isInternship ? "Internship" : "Entry-level friendly"} with clear progression paths.`;
        } else {
          // Use explanation from matching engine but personalize it
          personalizedReason = `${explanation.reason}. ${company}'s ${category} position in ${city} offers ${isGraduate ? "graduate-friendly" : "entry-level"} opportunities.`;
        }

        return {
          score: baseScore,
          reason: personalizedReason,
          breakdown: matchResult
            ? (matchResult as unknown as Record<string, unknown>)
            : null,
        };
      } catch (error) {
        apiLogger.error("Error calculating real match score", error as Error, {
          endpoint: "/api/sample-jobs",
        });
        // Fallback to simple scoring
        const baseScore = 0.8 + Math.random() * 0.12;
        const city = job.city || job.location?.split(",")[0] || "Europe";
        const category = job.categories?.[0]?.replace(/-/g, " ") || "roles";
        return {
          score: Math.min(0.91, baseScore),
          reason: `Good match for ${category} roles in ${city}. Entry-level friendly with growth opportunities.`,
          breakdown: null,
        };
      }
    };

    // Calculate job offset based on week number and tier
    // Free: week 1 = offset 0, week 2 = offset 5, etc.
    // Premium: week 1 = offset 10, week 2 = offset 15, etc.
    // This ensures weekly rotation AND different jobs for free vs premium
    // Base offset calculation kept for future pagination
    // const baseOffset = tier === "premium" ? 10 : 0;
    // const jobOffset = (_weekNumber - 1) * 5 + baseOffset;

    // Get jobs from preferred cities first to ensure diversity
    // Filter by cities in the fictional profile to show diverse locations

    // Map career path to database categories (e.g., 'Tech' → 'tech-transformation')
    // Using careerPathCategories defined earlier in function

    // Get jobs that actually match the career path for better sample quality
    // Filter by career path at database level for more relevant results
    const userCareerCategories = careerPathCategories;

    // Build dynamic query - prefer jobs that match career path
    let query = supabase
      .from("jobs")
      .select(
        "title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash",
      )
      .eq("is_active", true)
      .eq("status", "active")
      .is("filtered_reason", null)
      .not("job_url", "is", null)
      .neq("job_url", "")
      .or(
        "is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
      );

    // If we have specific career categories, filter by them for better matches
    if (
      userCareerCategories.length > 0 &&
      userCareerCategories[0] !== "all-categories"
    ) {
      // Use overlap filter to find jobs that have matching categories
      query = query.overlaps("categories", userCareerCategories);
    }

    query = query.order("created_at", { ascending: false }).limit(300); // Get more jobs for better selection

    const { data: allJobs, error: jobsError } = await query;

    // Log query result for debugging
    if (jobsError) {
      apiLogger.warn("Sample jobs query error:", jobsError);
      // Don't return early - fall through to fallback logic
    }

    apiLogger.info(
      `Sample jobs query result: ${allJobs?.length || 0} jobs found`,
      {
        careerPath: selectedUserProfile.careerPath,
        careerPathCategories,
        cities: selectedUserProfile.cities,
        error: jobsError?.message,
      },
    );

    if (!jobsError && allJobs && allJobs.length > 0) {
      // Filter in memory: apply new rules
      const validJobs = allJobs.filter((job) => {
        // Basic filters
        if (!job.job_url || job.job_url.trim() === "" || isJobUsed(job)) {
          return false;
        }

        const jobTitle = (job.title || "").toLowerCase();
        const jobDesc = (job.description || "").toLowerCase();
        const jobText = `${jobTitle} ${jobDesc}`;

        // EXCLUDE: Teaching/Education jobs (unless business-related)
        if (
          (jobTitle.includes("teacher") ||
            jobTitle.includes("teaching") ||
            jobTitle.includes("educator") ||
            jobTitle.includes("tutor") ||
            jobTitle.includes("instructor") ||
            jobTitle.includes("lecturer")) &&
          !jobTitle.includes("business") &&
          !jobDesc.includes("business")
        ) {
          return false;
        }

        // EXCLUDE: Legal jobs (unless compliance/regulatory/business legal)
        if (
          (jobTitle.includes("lawyer") ||
            jobTitle.includes("attorney") ||
            jobTitle.includes("solicitor") ||
            jobTitle.includes("barrister") ||
            (jobTitle.includes("legal") &&
              (jobTitle.includes("counsel") ||
                jobTitle.includes("advisor")))) &&
          !jobTitle.includes("compliance") &&
          !jobTitle.includes("regulatory") &&
          !jobDesc.includes("business") &&
          !jobDesc.includes("corporate")
        ) {
          return false;
        }

        // EXCLUDE: Virtual Assistant, Executive Assistant, Personal Assistant
        if (
          jobTitle.includes("virtual assistant") ||
          jobTitle.includes("executive assistant") ||
          jobTitle.includes("personal assistant") ||
          jobTitle.includes("administrative assistant")
        ) {
          return false;
        }

        // EXCLUDE: Manager roles (unless graduate/trainee/junior/associate manager)
        if (
          jobTitle.includes("manager") &&
          !jobTitle.includes("graduate") &&
          !jobTitle.includes("trainee") &&
          !jobTitle.includes("junior") &&
          !jobTitle.includes("entry") &&
          !jobTitle.includes("associate")
        ) {
          // Allow compliance/regulatory managers (business-related)
          if (
            !jobTitle.includes("compliance") &&
            !jobTitle.includes("regulatory") &&
            !jobTitle.includes("tax") &&
            !jobTitle.includes("legal")
          ) {
            return false;
          }
        }

        // EXCLUDE: Jobs requiring languages user doesn't speak
        const userLanguages = selectedUserProfile.languages_spoken || [
          "English",
        ];
        const userLanguagesLower = userLanguages.map((lang) =>
          lang.toLowerCase(),
        );

        // Check structured language requirements
        const jobLanguages = (job as any).language_requirements;
        if (
          jobLanguages &&
          Array.isArray(jobLanguages) &&
          jobLanguages.length > 0
        ) {
          const jobLanguagesLower = jobLanguages.map((lang: string) =>
            lang.toLowerCase(),
          );
          const hasMatchingLanguage = jobLanguagesLower.some(
            (jobLang: string) =>
              userLanguagesLower.some(
                (userLang) =>
                  userLang.includes(jobLang) ||
                  jobLang.includes(userLang) ||
                  (userLang === "english" &&
                    (jobLang.includes("english") || jobLang.includes("eng"))) ||
                  (userLang === "german" &&
                    (jobLang.includes("german") ||
                      jobLang.includes("deutsch"))) ||
                  (userLang === "french" &&
                    (jobLang.includes("french") ||
                      jobLang.includes("français"))),
              ),
          );

          if (!hasMatchingLanguage) {
            return false; // Exclude jobs requiring languages user doesn't speak
          }
        }

        // Check description for language requirements
        const languageRequirementKeywords = [
          "japanese speaker",
          "chinese speaker",
          "mandarin speaker",
          "korean speaker",
          "arabic speaker",
          "hindi speaker",
          "thai speaker",
          "russian speaker",
          "fluent japanese",
          "fluent chinese",
          "fluent mandarin",
          "fluent korean",
          "native japanese",
          "native chinese",
          "native mandarin",
          "native korean",
          "must speak japanese",
          "must speak chinese",
          "must speak mandarin",
          "must speak korean",
          "requires japanese",
          "requires chinese",
          "requires mandarin",
          "requires korean",
        ];

        const requiresUnknownLanguage = languageRequirementKeywords.some(
          (keyword) => {
            if (!jobText.includes(keyword)) return false;

            // Extract language from keyword
            const langInKeyword = keyword
              .split(" ")
              .find((word) =>
                [
                  "japanese",
                  "chinese",
                  "mandarin",
                  "korean",
                  "arabic",
                  "hindi",
                  "thai",
                  "russian",
                ].includes(word),
              );

            if (!langInKeyword) return false;

            // Check if user speaks this language
            return !userLanguagesLower.some(
              (userLang) =>
                userLang.includes(langInKeyword) ||
                langInKeyword.includes(userLang),
            );
          },
        );

        if (requiresUnknownLanguage) {
          return false; // Exclude jobs requiring languages user doesn't speak
        }

        return true; // Job passed all filters
      });

      // Score jobs using REAL matching engine
      let hotMatchCount = 0;
      const scoredJobs = validJobs
        .map((job, _index) => {
          const matchResult = calculateRealMatchScore(
            job,
            selectedUserProfile,
            hotMatchCount,
          );
          if (matchResult.score >= 0.92) hotMatchCount++;

          const jobCity = (job.city || job.location?.split(",")[0] || "")
            .toLowerCase()
            .trim();
          const matchesCity = normalizedCities.some(
            (prefCity) =>
              jobCity.includes(prefCity) ||
              prefCity.includes(jobCity) ||
              job.location?.toLowerCase().includes(prefCity),
          );
          const jobCategories = (job.categories || []).map((c: string) =>
            c.toLowerCase(),
          );
          const matchesCareer = careerPathCategories.some((cat) =>
            jobCategories.some(
              (jc: string) =>
                jc.includes(cat.toLowerCase()) ||
                cat.toLowerCase().includes(jc),
            ),
          );

          // Boost score for premium companies (for iPhone showcase)
          const companyName = job.company || "";
          const isPremium = isPremiumCompany(companyName);
          const premiumBoost = isPremium ? 0.05 : 0; // Add 5% boost for premium companies

          return {
            job,
            score: Math.min(1.0, matchResult.score + premiumBoost), // Cap at 1.0
            reason: matchResult.reason,
            breakdown: matchResult.breakdown,
            matchesCity,
            matchesCareer,
            isPerfectMatch: matchesCity && matchesCareer,
            isPremium,
          };
        })
        .sort((a, b) => {
          // Sort by: premium companies first, then perfect matches, then score
          if (a.isPremium !== b.isPremium) {
            return b.isPremium ? 1 : -1;
          }
          if (a.isPerfectMatch !== b.isPerfectMatch) {
            return b.isPerfectMatch ? 1 : -1;
          }
          return b.score - a.score;
        });

      apiLogger.info(
        `After filtering: ${scoredJobs.length} valid jobs (scored and sorted)`,
      );

      // Helper function to check if job is unpaid (filter out for showcase)
      const isUnpaid = (job: Partial<Job>): boolean => {
        const title = (job.title || "").toLowerCase();
        const description = (job.description || "").toLowerCase();
        return (
          title.includes("unpaid") ||
          description.includes("unpaid") ||
          title.includes("unpaid internship") ||
          description.includes("unpaid internship")
        );
      };

      // Add jobs from scored list, ensuring diversity and realistic distribution
      // FOR IPHONE SHOWCASE: Prioritize premium companies to show off database quality
      const citiesUsed = new Set<string>();
      let finalHotMatchCount = 0;

      // ZERO PASS: Premium companies FIRST (for showcase quality) - even if not perfect match
      // This ensures we show off big name companies like Google, McKinsey, Deloitte, etc.
      for (const { job, score, reason, isPremium } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        if (isJobUsed(job)) continue;
        if (isUnpaid(job)) continue; // Skip unpaid internships

        if (isPremium && score >= 0.6) {
          // Show premium companies with at least 60% match (even if not in preferred city)
          const finalScore =
            score >= 0.92 && finalHotMatchCount >= 2
              ? Math.min(0.91, score)
              : score;
          if (finalScore >= 0.92) finalHotMatchCount++;

          resultJobs.push({
            ...job,
            matchScore: finalScore,
            matchReason: reason,
          });
          markJobAsUsed(job);
        }
      }

      // First pass: Perfect matches (city + career) - but skip premium (already handled)
      for (const {
        job,
        score,
        reason,
        isPerfectMatch,
        isPremium,
      } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        if (isJobUsed(job)) continue;
        if (isUnpaid(job)) continue; // Skip unpaid internships
        if (isPremium) continue; // Already handled in zero pass

        const jobCity = (job.city || job.location?.split(",")[0] || "")
          .toLowerCase()
          .trim();

        if (isPerfectMatch && !citiesUsed.has(jobCity)) {
          const finalScore =
            score >= 0.92 && finalHotMatchCount >= 2
              ? Math.min(0.91, score)
              : score;
          if (finalScore >= 0.92) finalHotMatchCount++;

          resultJobs.push({
            ...job,
            matchScore: finalScore,
            matchReason: reason,
          });
          markJobAsUsed(job);
          citiesUsed.add(jobCity);
        }
      }

      // Second pass: City matches (preferred cities) - but skip premium
      for (const { job, score, reason, matchesCity, isPremium } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        if (isJobUsed(job)) continue;
        if (isUnpaid(job)) continue; // Skip unpaid internships
        if (isPremium) continue; // Already handled in zero pass

        const jobCity = (job.city || job.location?.split(",")[0] || "")
          .toLowerCase()
          .trim();

        if (matchesCity && !citiesUsed.has(jobCity)) {
          const finalScore =
            score >= 0.92 && finalHotMatchCount >= 2
              ? Math.min(0.91, score)
              : score;
          if (finalScore >= 0.92) finalHotMatchCount++;

          resultJobs.push({
            ...job,
            matchScore: finalScore,
            matchReason: reason,
          });
          markJobAsUsed(job);
          citiesUsed.add(jobCity);
        }
      }

      // Third pass: Career matches or any remaining high-scored jobs - but skip premium
      for (const { job, score, reason, isPremium } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        if (isJobUsed(job)) continue;
        if (isUnpaid(job)) continue; // Skip unpaid internships
        if (isPremium) continue; // Already handled in zero pass

        const finalScore =
          score >= 0.92 && finalHotMatchCount >= 2
            ? Math.min(0.91, score)
            : score;
        if (finalScore >= 0.92) finalHotMatchCount++;

        resultJobs.push({
          ...job,
          matchScore: finalScore,
          matchReason: reason,
        });
        markJobAsUsed(job);
      }
    }

    // If initial query failed or returned no jobs, try simple fallback
    if (jobsError || !allJobs || allJobs.length === 0) {
      apiLogger.info(
        `Fallback needed: Initial query failed or returned 0 jobs`,
      );

      // Simple fallback: Get ANY early-career jobs (with same filters)
      const { data: fallbackJobs, error: fallbackError } = await supabase
        .from("jobs")
        .select(
          "title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash, language_requirements",
        )
        .eq("is_active", true)
        .eq("status", "active")
        .is("filtered_reason", null)
        .not("job_url", "is", null)
        .neq("job_url", "")
        .or(
          "is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (fallbackError) {
        apiLogger.warn("Fallback query error:", fallbackError);
      }

      if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
        apiLogger.info(`Fallback: Found ${fallbackJobs.length} jobs`);

        // Apply same filters as main query
        const userLanguages = selectedUserProfile.languages_spoken || [
          "English",
        ];
        const userLanguagesLower = userLanguages.map((lang) =>
          lang.toLowerCase(),
        );

        const filteredFallbackJobs = fallbackJobs.filter((job) => {
          const jobTitle = (job.title || "").toLowerCase();
          const jobDesc = (job.description || "").toLowerCase();
          const jobText = `${jobTitle} ${jobDesc}`;

          // Same filters as main query
          if (
            (jobTitle.includes("teacher") ||
              jobTitle.includes("teaching") ||
              jobTitle.includes("educator") ||
              jobTitle.includes("tutor")) &&
            !jobTitle.includes("business") &&
            !jobDesc.includes("business")
          ) {
            return false;
          }

          if (
            (jobTitle.includes("lawyer") ||
              jobTitle.includes("attorney") ||
              jobTitle.includes("solicitor") ||
              jobTitle.includes("barrister")) &&
            !jobTitle.includes("compliance") &&
            !jobTitle.includes("regulatory") &&
            !jobDesc.includes("business") &&
            !jobDesc.includes("corporate")
          ) {
            return false;
          }

          if (
            jobTitle.includes("virtual assistant") ||
            jobTitle.includes("executive assistant") ||
            jobTitle.includes("personal assistant")
          ) {
            return false;
          }

          if (
            jobTitle.includes("manager") &&
            !jobTitle.includes("graduate") &&
            !jobTitle.includes("trainee") &&
            !jobTitle.includes("junior") &&
            !jobTitle.includes("entry") &&
            !jobTitle.includes("associate") &&
            !jobTitle.includes("compliance") &&
            !jobTitle.includes("regulatory")
          ) {
            return false;
          }

          // Language filter
          const jobLanguages = job.language_requirements;
          if (
            jobLanguages &&
            Array.isArray(jobLanguages) &&
            jobLanguages.length > 0
          ) {
            const jobLanguagesLower = jobLanguages.map((lang: string) =>
              lang.toLowerCase(),
            );
            const hasMatchingLanguage = jobLanguagesLower.some(
              (jobLang: string) =>
                userLanguagesLower.some(
                  (userLang) =>
                    userLang.includes(jobLang) || jobLang.includes(userLang),
                ),
            );
            if (!hasMatchingLanguage) return false;
          }

          const languageRequirementKeywords = [
            "japanese speaker",
            "chinese speaker",
            "mandarin speaker",
            "korean speaker",
            "fluent japanese",
            "fluent chinese",
            "fluent mandarin",
            "fluent korean",
            "must speak japanese",
            "must speak chinese",
            "must speak mandarin",
            "must speak korean",
          ];

          const requiresUnknownLanguage = languageRequirementKeywords.some(
            (keyword) => {
              if (!jobText.includes(keyword)) return false;
              const langInKeyword = keyword
                .split(" ")
                .find((word) =>
                  ["japanese", "chinese", "mandarin", "korean"].includes(word),
                );
              return (
                langInKeyword &&
                !userLanguagesLower.some(
                  (userLang) =>
                    userLang.includes(langInKeyword) ||
                    langInKeyword.includes(userLang),
                )
              );
            },
          );

          if (requiresUnknownLanguage) return false;

          return true;
        });

        // Add filtered jobs from fallback using real matching
        filteredFallbackJobs.forEach((job, _index) => {
          if (
            resultJobs.length < 5 &&
            job.job_url &&
            job.job_url.trim() !== "" &&
            !isJobUsed(job)
          ) {
            const hotMatches = resultJobs.filter(
              (j) => (j.matchScore || 0) >= 0.92,
            ).length;
            const matchResult = calculateRealMatchScore(
              job,
              selectedUserProfile,
              hotMatches,
            );
            resultJobs.push({
              ...job,
              matchScore: matchResult.score,
              matchReason: matchResult.reason,
            });
            markJobAsUsed(job);
          }
        });
      }
    }

    // Final validation - ensure all jobs have URLs
    const validJobs = resultJobs.filter(
      (job) => job.job_url && job.job_url.trim() !== "",
    );

    // If we have less than 5 jobs, try emergency fallback (even if we have 1-4 jobs)
    if (validJobs.length < 5) {
      apiLogger.info(
        `Emergency fallback: Only ${validJobs.length} jobs, trying emergency query to get to 5...`,
      );

      // Emergency: Get early-career jobs that match career path, apply filters
      let emergencyQuery = supabase
        .from("jobs")
        .select(
          "title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash, language_requirements",
        )
        .eq("is_active", true)
        .eq("status", "active")
        .is("filtered_reason", null)
        .not("job_url", "is", null)
        .neq("job_url", "")
        .not("job_hash", "in", Array.from(usedJobHashes));

      // Filter by career categories if available
      if (
        userCareerCategories.length > 0 &&
        userCareerCategories[0] !== "all-categories"
      ) {
        emergencyQuery = emergencyQuery.overlaps(
          "categories",
          userCareerCategories,
        );
      }

      emergencyQuery = emergencyQuery.or(
        "is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
      );
      emergencyQuery = emergencyQuery
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: emergencyJobs, error: emergencyError } =
        await emergencyQuery;

      if (emergencyError) {
        apiLogger.warn("Emergency query error:", emergencyError);
      }

      if (!emergencyError && emergencyJobs && emergencyJobs.length > 0) {
        apiLogger.info(
          `Emergency fallback: Found ${emergencyJobs.length} jobs`,
        );

        // Apply same filters
        const userLanguages = selectedUserProfile.languages_spoken || [
          "English",
        ];
        const userLanguagesLower = userLanguages.map((lang) =>
          lang.toLowerCase(),
        );

        const filteredEmergencyJobs = emergencyJobs.filter((job) => {
          const jobTitle = (job.title || "").toLowerCase();
          const jobDesc = (job.description || "").toLowerCase();
          const jobText = `${jobTitle} ${jobDesc}`;

          // Same filters as main query
          if (
            (jobTitle.includes("teacher") ||
              jobTitle.includes("teaching") ||
              jobTitle.includes("educator") ||
              jobTitle.includes("tutor")) &&
            !jobTitle.includes("business") &&
            !jobDesc.includes("business")
          ) {
            return false;
          }

          if (
            (jobTitle.includes("lawyer") ||
              jobTitle.includes("attorney") ||
              jobTitle.includes("solicitor") ||
              jobTitle.includes("barrister")) &&
            !jobTitle.includes("compliance") &&
            !jobTitle.includes("regulatory") &&
            !jobDesc.includes("business") &&
            !jobDesc.includes("corporate")
          ) {
            return false;
          }

          if (
            jobTitle.includes("virtual assistant") ||
            jobTitle.includes("executive assistant") ||
            jobTitle.includes("personal assistant")
          ) {
            return false;
          }

          if (
            jobTitle.includes("manager") &&
            !jobTitle.includes("graduate") &&
            !jobTitle.includes("trainee") &&
            !jobTitle.includes("junior") &&
            !jobTitle.includes("entry") &&
            !jobTitle.includes("associate") &&
            !jobTitle.includes("compliance") &&
            !jobTitle.includes("regulatory")
          ) {
            return false;
          }

          // Language filter
          const jobLanguages = job.language_requirements;
          if (
            jobLanguages &&
            Array.isArray(jobLanguages) &&
            jobLanguages.length > 0
          ) {
            const jobLanguagesLower = jobLanguages.map((lang: string) =>
              lang.toLowerCase(),
            );
            const hasMatchingLanguage = jobLanguagesLower.some(
              (jobLang: string) =>
                userLanguagesLower.some(
                  (userLang) =>
                    userLang.includes(jobLang) || jobLang.includes(userLang),
                ),
            );
            if (!hasMatchingLanguage) return false;
          }

          const languageRequirementKeywords = [
            "japanese speaker",
            "chinese speaker",
            "mandarin speaker",
            "korean speaker",
            "fluent japanese",
            "fluent chinese",
            "fluent mandarin",
            "fluent korean",
            "must speak japanese",
            "must speak chinese",
            "must speak mandarin",
            "must speak korean",
          ];

          const requiresUnknownLanguage = languageRequirementKeywords.some(
            (keyword) => {
              if (!jobText.includes(keyword)) return false;
              const langInKeyword = keyword
                .split(" ")
                .find((word) =>
                  ["japanese", "chinese", "mandarin", "korean"].includes(word),
                );
              return (
                langInKeyword &&
                !userLanguagesLower.some(
                  (userLang) =>
                    userLang.includes(langInKeyword) ||
                    langInKeyword.includes(userLang),
                )
              );
            },
          );

          if (requiresUnknownLanguage) return false;

          return true;
        });

        // Add filtered jobs until we have 5 using real matching
        filteredEmergencyJobs.forEach((job, _index) => {
          if (
            validJobs.length < 5 &&
            job.job_url &&
            job.job_url.trim() !== "" &&
            !isJobUsed(job)
          ) {
            const hotMatches = validJobs.filter(
              (j) => (j.matchScore || 0) >= 0.92,
            ).length;
            const matchResult = calculateRealMatchScore(
              job,
              selectedUserProfile,
              hotMatches,
            );
            validJobs.push({
              ...job,
              matchScore: matchResult.score,
              matchReason: matchResult.reason,
            });
            markJobAsUsed(job);
          }
        });
      }
    }

    if (validJobs.length === 0) {
      apiLogger.error("CRITICAL: No jobs with URLs found after all filters");
      apiLogger.error(
        `  - Initial query: ${allJobs?.length || 0} jobs, error: ${jobsError?.message || "none"}`,
      );
      apiLogger.error(`  - Result jobs before filtering: ${resultJobs.length}`);
      apiLogger.error(`  - Used job hashes: ${usedJobHashes.size}`);

      // Last resort: try to get jobs with URL, preferring career matches
      let lastResortQuery = supabase
        .from("jobs")
        .select(
          "title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash",
        )
        .eq("is_active", true)
        .eq("status", "active")
        .is("filtered_reason", null)
        .not("job_url", "is", null)
        .neq("job_url", "")
        .order("created_at", { ascending: false });

      // Still try career filtering even in last resort
      if (
        userCareerCategories.length > 0 &&
        userCareerCategories[0] !== "all-categories"
      ) {
        lastResortQuery = lastResortQuery
          .overlaps("categories", userCareerCategories)
          .limit(20);
      } else {
        lastResortQuery = lastResortQuery.limit(10);
      }

      const { data: lastResortJobs, error: lastResortError } =
        await lastResortQuery;

      if (lastResortError) {
        apiLogger.error("Last resort query error:", lastResortError);
        // Check for Supabase blocking
        const errorStr = JSON.stringify(lastResortError).toLowerCase();
        if (
          errorStr.includes("rate limit") ||
          errorStr.includes("429") ||
          errorStr.includes("memory")
        ) {
          apiLogger.error(
            "⚠️  Supabase appears to be blocking queries (rate limit or memory issue)",
          );
        }
      }

      if (lastResortJobs && lastResortJobs.length > 0) {
        apiLogger.info(
          `Last resort: Found ${lastResortJobs.length} jobs (no filters)`,
        );
        lastResortJobs.forEach((job, _index) => {
          // Only add if job has a URL
          if (job.job_url && job.job_url.trim() !== "" && !isJobUsed(job)) {
            const hotMatches = validJobs.filter(
              (j) => (j.matchScore || 0) >= 0.92,
            ).length;
            const matchResult = calculateRealMatchScore(
              job,
              selectedUserProfile,
              hotMatches,
            );

            validJobs.push({
              ...job,
              job_url: job.job_url,
              matchScore: matchResult.score,
              matchReason: matchResult.reason,
            });
            markJobAsUsed(job);
          }
        });
      }

      if (validJobs.length === 0) {
        apiLogger.error(
          "❌ All fallback queries failed - returning empty result",
        );
        // Return empty array instead of 500 error to prevent breaking the UI
        return NextResponse.json(
          {
            jobs: [],
            error: "No jobs available. Please try again later.",
            debug: {
              initialQueryError: jobsError?.message,
              lastResortQueryError: lastResortError?.message,
              supabaseBlocking: lastResortError
                ? JSON.stringify(lastResortError)
                    .toLowerCase()
                    .includes("rate limit")
                : false,
            },
          },
          { status: 200 },
        ); // Return 200 to prevent UI errors
      }
    }

    if (validJobs.length < 5) {
      apiLogger.warn(`Only found ${validJobs.length} jobs, expected 5`);
    }

    // Format jobs - use REAL job URLs from database
    // Ensure all jobs have working URLs (filter out empty/invalid URLs)
    const formattedJobs = validJobs
      .filter(
        (job) =>
          job.job_url && job.job_url.trim() !== "" && job.job_url !== "#",
      )
      .map((job) => {
        return {
          title: job.title || "Job Title",
          company: job.company || "Company",
          location: job.location || "Location",
          description: job.description || "",
          jobUrl: job.job_url || "", // Use REAL job URL from database - MUST be present
          jobHash: job.job_hash || "",
          categories: job.categories || [],
          workEnvironment: job.work_environment || "Hybrid",
          isInternship: job.is_internship || false,
          isGraduate: job.is_graduate || false,
          matchScore: (job as SampleJob).matchScore || job.matchScore || 0.85,
          matchReason:
            (job as SampleJob).matchReason ||
            job.matchReason ||
            "Good match based on your preferences",
          userProfile: selectedUserProfile, // Always use the fictional profile
        };
      });

    // Sort by match score (descending) to show best matches first
    formattedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({
      jobs: formattedJobs.slice(0, 5), // Ensure exactly 5 jobs
      count: formattedJobs.length,
      userProfile: formattedJobs[0]?.userProfile,
    });
  } catch (error) {
    apiLogger.error("Failed to fetch sample jobs:", error as Error);
    return NextResponse.json(
      { jobs: [], error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withApiAuth(getSampleJobsHandler, {
  allowPublic: true,
  rateLimitConfig: {
    maxRequests: 20, // Lower limit - expensive query
    windowMs: 60000,
  },
});
