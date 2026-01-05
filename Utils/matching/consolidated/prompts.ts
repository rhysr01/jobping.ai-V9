/**
 * Prompts Domain - GPT-4o-mini system/user instructions and AI API calls
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import type OpenAI from "openai";
import type { ParsedMatch } from "@/lib/types";
import type { Job } from "@/scrapers/types";
import type { JobMatch, UserPreferences } from "../types";
import { JOBS_TO_ANALYZE_FREE, JOBS_TO_ANALYZE_PREMIUM } from "./config";

// ============================================
// PROMPT BUILDING
// ============================================

/**
 * Enhanced prompt that uses full user profile for world-class matching
 * TIER-AWARE: Different prompt strategies for free vs premium users
 */
export function buildStablePrompt(
  jobs: Job[],
  userPrefs: UserPreferences,
): string {
  const jobsArray = Array.isArray(jobs) ? jobs : [];

  // const isFreeTier =
  userPrefs.subscription_tier === "free" || !userPrefs.subscription_tier;
  const isPremiumTier = userPrefs.subscription_tier === "premium";

  const userCities = Array.isArray(userPrefs.target_cities)
    ? userPrefs.target_cities.join(", ")
    : userPrefs.target_cities || "Europe";

  const userCareer = userPrefs.professional_expertise || "Graduate";
  const userLevel = userPrefs.entry_level_preference || "entry-level";

  const languages =
    Array.isArray(userPrefs.languages_spoken) &&
    userPrefs.languages_spoken.length > 0
      ? userPrefs.languages_spoken.join(", ")
      : "";

  const roles =
    Array.isArray(userPrefs.roles_selected) &&
    userPrefs.roles_selected.length > 0
      ? userPrefs.roles_selected.join(", ")
      : "";

  const careerPaths =
    Array.isArray(userPrefs.career_path) && userPrefs.career_path.length > 0
      ? userPrefs.career_path.join(", ")
      : "";

  const workEnv = userPrefs.work_environment || "";

  const industries =
    Array.isArray(userPrefs.industries) && userPrefs.industries.length > 0
      ? userPrefs.industries.join(", ")
      : "";

  const skills =
    Array.isArray(userPrefs.skills) && userPrefs.skills.length > 0
      ? userPrefs.skills.join(", ")
      : "";

  const careerKeywords = userPrefs.career_keywords
    ? userPrefs.career_keywords
    : "";

  // Check if user needs visa sponsorship
  const visaStatus = userPrefs.visa_status?.toLowerCase() || "";
  const needsVisaSponsorship =
    // Explicit non-EU/UK indicators
    (visaStatus.includes("non-eu") && !visaStatus.includes("non-eu citizen")) ||
    (visaStatus.includes("non-uk") && !visaStatus.includes("non-uk citizen")) ||
    visaStatus.includes("require sponsorship") ||
    visaStatus.includes("need_sponsorship") ||
    visaStatus.includes("visa-required") ||
    // Sponsorship keywords (but not if user is a citizen)
    (visaStatus.includes("sponsorship") &&
      !visaStatus.includes("eu") &&
      !visaStatus.includes("uk citizen")) ||
    // Fallback: if status exists but doesn't indicate citizenship/permanent residency
    (!visaStatus.includes("eu-citizen") &&
      !visaStatus.includes("eu citizen") &&
      !visaStatus.includes("uk citizen") &&
      !visaStatus.includes("eea citizen") &&
      !visaStatus.includes("swiss citizen") &&
      !visaStatus.includes("citizen") &&
      !visaStatus.includes("permanent") &&
      visaStatus.length > 0);

  const jobsToAnalyze = isPremiumTier
    ? jobsArray.slice(0, JOBS_TO_ANALYZE_PREMIUM)
    : jobsArray.slice(0, JOBS_TO_ANALYZE_FREE);

  const jobListParts: string[] = [];
  for (let i = 0; i < jobsToAnalyze.length; i++) {
    const job = jobsToAnalyze[i];
    jobListParts.push(
      `${i + 1}. [${job.job_hash}] ${job.title} @ ${job.company} | ${job.location}`,
    );
  }
  const jobList = jobListParts.join("\n");

  return `### USER PROFILE
- Experience Level: ${userLevel}
- Professional Expertise: ${userCareer}
- Target Locations: ${userCities}
${languages ? `- Languages: ${languages}` : ""}
${roles ? `- Target Roles: ${roles}` : ""}
${careerPaths ? `- Career Paths: ${careerPaths}` : ""}
${workEnv ? `- Work Environment: ${workEnv}` : ""}
${industries ? `- Preferred Industries: ${industries}` : ""}
${skills ? `- Skills: ${skills}` : ""}
${careerKeywords ? `- Career Keywords: ${careerKeywords}` : ""}
${needsVisaSponsorship ? `- Visa Status: Requires sponsorship` : ""}

### AVAILABLE JOBS
${jobList}

---

## 1. FILTERING RULES (Hard Constraints)
Discard any job that fails these criteria. **Precision overrides all other considerations.**

- **Location**: Must be in ${userCities}. Accept regional variations (e.g., "London, UK", "Greater London", "Central London" for "London"). Reject only if clearly different city (e.g., "New London").
- **Language**: If a job requires a language not in [${languages || "none specified"}], EXCLUDE it. Common exclusions: "Japanese speaker", "Chinese speaker", "Mandarin speaker", "Korean speaker" when user doesn't speak that language.
${needsVisaSponsorship ? `- **Visa Sponsorship**: Job MUST offer visa sponsorship. Look for keywords: "visa sponsorship", "sponsor visa", "work permit", "relocation support", "visa support", "immigration support", "work authorization", "sponsorship available", "will sponsor", "can sponsor", "visa assistance", "relocation package", "tier 2 sponsorship", "tier 2 visa", "blue card", "skilled worker visa". Also check if job has visa_friendly=true in structured data. EXCLUDE jobs with negative indicators: "eu citizen only", "uk citizen only", "right to work required", "must have right to work", "no visa sponsorship", "local candidates only".` : ""}
${careerPaths ? `- **Career Path**: Title or description must contain keywords from: ${careerPaths}` : ""}
${roles ? `- **Role Match**: Title or description must contain keywords from: ${roles}` : ""}

**CRITICAL**: If fewer than 5 jobs pass these filters, return only the jobs that pass. Do NOT include jobs that violate hard constraints to reach 5 matches.

---

## 2. RANKING & SCORING
Rank the remaining jobs using these weights:

**Score 90-100**: Direct hit on skills, location, and ${careerPaths || "career path"}. Perfect alignment with user profile.
**Score 70-89**: Matches location and role, but may have slight industry or secondary skill gaps.
**Score 50-69**: Meets hard constraints but has notable gaps in skills, industry, or experience level.

**Evidence Rule**: For scores >85, you MUST provide 2+ specific evidence points (minimum 30 words). Each evidence point must reference actual job description text or user profile data. If you cannot find two distinct evidence points, the score cannot exceed 80.

---

## 3. OUTPUT FORMAT
Return a valid JSON array of up to 5 matches, ranked by score (highest first). If no jobs pass the Filtering Rules, return an empty array [].

Format:
\`\`\`json
[
  {
    "job_index": 1,
    "job_hash": "actual-hash-from-list",
    "match_score": 85,
    "match_reason": "Evidence-based explanation (2-3 sentences) linking user profile to specific job requirements. Minimum 30 words for scores >85."
  }
]
\`\`\`

Requirements:
- job_index: Must be 1-${jobsToAnalyze.length} (matches the number in the job list)
- job_hash: Must exactly match the hash from the job list above
- match_score: 50-100 (be selective, only recommend truly relevant jobs)
- match_reason: Evidence-based explanation that references specific job requirements and user skills. NO emotional hype, NO outcome predictions, NO generic statements.
- Return exactly the number of matches that pass filters (0-5), ranked by relevance
- Valid JSON array only, no markdown formatting or extra text`;
}

// ============================================
// AI API CALLS
// ============================================

/**
 * Calculate AI cost in USD based on tokens and model
 */
export function calculateAICost(tokens: number, model: string): number {
  if (model === "gpt-4o-mini") {
    const inputTokens = Math.floor(tokens * 0.8);
    const outputTokens = tokens - inputTokens;
    const inputCost = (inputTokens / 1_000_000) * 0.15;
    const outputCost = (outputTokens / 1_000_000) * 0.6;
    return inputCost + outputCost;
  }
  return 0;
}

/**
 * System message for AI matching
 */
export function getSystemMessage(): string {
  return `You are a professional career advisor. Your mission is to provide evidence-based job matching. You operate with clinical objectivity: you do not use emotional hype, you do not predict interview success, and you never use generic phrases like "Good match." Every claim you make must be tethered to specific keywords in the job description or the user's profile.`;
}

/**
 * Call OpenAI API with function calling
 * Returns raw ParsedMatch[] that needs to be validated
 */
export async function callOpenAIAPI(
  client: OpenAI,
  jobs: Job[],
  userPrefs: UserPreferences,
  model: "gpt-4o-mini" | "gpt-4" | "gpt-3.5-turbo" = "gpt-4o-mini",
  parseFunction: (matches: ParsedMatch[], jobs: Job[]) => JobMatch[],
): Promise<{
  matches: JobMatch[];
  tokens: number;
  cost: number;
}> {
  const jobsArray = Array.isArray(jobs) ? jobs : [];

  const prompt = buildStablePrompt(jobsArray, userPrefs);

  const completion = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: getSystemMessage(),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    functions: [
      {
        name: "return_job_matches",
        description: "Return the top 5 most relevant job matches for the user",
        parameters: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  job_index: {
                    type: "number",
                    minimum: 1,
                    description: "Index of the job from the list provided",
                  },
                  job_hash: {
                    type: "string",
                    description: "Exact job_hash from the job list",
                  },
                  match_score: {
                    type: "number",
                    minimum: 50,
                    maximum: 100,
                    description: "How well this job matches the user (50-100)",
                  },
                  match_reason: {
                    type: "string",
                    maxLength: 400,
                    description:
                      "Evidence-based reason (2-3 sentences max) that explicitly links user profile to job requirements. Reference specific skills, experience, or requirements. NO emotional hype or outcome predictions.",
                  },
                },
                required: [
                  "job_index",
                  "job_hash",
                  "match_score",
                  "match_reason",
                ],
              },
            },
          },
          required: ["matches"],
        },
      },
    ],
    function_call: { name: "return_job_matches" },
  });

  const tokens = completion.usage?.total_tokens || 0;
  const cost = calculateAICost(tokens, model);

  const functionCall = completion.choices[0]?.message?.function_call;
  if (!functionCall || functionCall.name !== "return_job_matches") {
    throw new Error("Invalid function call response");
  }

  try {
    const functionArgs = JSON.parse(functionCall.arguments);
    const matches = parseFunction(functionArgs.matches, jobsArray);
    return { matches, tokens, cost };
  } catch (error) {
    throw new Error(`Failed to parse function call: ${error}`);
  }
}
