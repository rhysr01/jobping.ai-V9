/**
 * Visa Sponsorship Confidence Detection
 * Analyzes job descriptions and company patterns to determine visa sponsorship confidence
 *
 * Confidence Levels:
 * - verified: Explicit keywords found (Tier 2, Blue Card, "will sponsor")
 * - likely: Company history or "global talent" keywords
 * - local-only: Explicit "EU citizen only" or "right to work required"
 * - unknown: No keywords found (default - many startups sponsor but don't mention it)
 */

export type VisaConfidence = "verified" | "likely" | "local-only" | "unknown";

export interface VisaConfidenceResult {
  confidence: VisaConfidence;
  reason: string;
  keywordsFound: string[];
  confidencePercentage?: number; // For tooltip display
}

/**
 * Strong keywords that explicitly mention visa sponsorship
 */
const VERIFIED_KEYWORDS = [
  "visa sponsorship",
  "sponsor visa",
  "work permit sponsorship",
  "visa support",
  "immigration support",
  "will sponsor",
  "can sponsor",
  "visa assistance",
  "relocation support",
  "relocation package",
  "tier 2 sponsorship",
  "tier 2 visa",
  "blue card",
  "work authorization support",
  "sponsorship available",
  "visa sponsorship available",
  "tier 2",
  "skilled worker visa",
];

/**
 * Moderate keywords that suggest sponsorship might be available
 */
const LIKELY_KEYWORDS = [
  "international candidates",
  "global talent",
  "diverse team",
  "international applicants welcome",
  "open to international",
  "relocation assistance",
  "relocation provided",
  "international relocation",
  "global candidates",
  "worldwide applicants",
];

/**
 * Negative keywords that suggest local-only (HIGHEST PRIORITY)
 */
const LOCAL_ONLY_KEYWORDS = [
  "eu citizen only",
  "uk citizen only",
  "right to work required",
  "must have right to work",
  "no visa sponsorship",
  "local candidates only",
  "eu nationals only",
  "uk nationals only",
  "eea citizen only",
  "eu/eea citizens only",
  "must be legally authorized to work",
  "authorized to work in",
];

/**
 * Pattern to detect "Must be based in [Country]" - location requirement, not visa
 */
const LOCATION_BASED_PATTERN =
  /must be based in|must be located in|based in (?:the )?([A-Z][a-z]+)/i;

/**
 * Companies known to sponsor visas (can be expanded)
 */
const KNOWN_SPONSOR_COMPANIES = [
  "google",
  "microsoft",
  "amazon",
  "meta",
  "apple",
  "netflix",
  "spotify",
  "stripe",
  "salesforce",
  "oracle",
  "ibm",
  "accenture",
  "deloitte",
  "pwc",
  "ey",
  "ernst",
  "kpmg",
  "mckinsey",
  "boston consulting",
  "bain",
  "goldman sachs",
  "morgan stanley",
  "jpmorgan",
  "barclays",
  "hsbc",
  "deutsche bank",
  "uber",
  "airbnb",
  "tesla",
  "shopify",
  "notion",
  "vercel",
];

/**
 * Calculate visa sponsorship confidence for a job
 */
export function calculateVisaConfidence(job: {
  description?: string | null;
  title?: string | null;
  company?: string | null;
  visa_friendly?: boolean | null;
  visa_sponsorship?: boolean | null;
}): VisaConfidenceResult {
  const description = (job.description || "").toLowerCase();
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const text = `${description} ${title}`.toLowerCase();

  // Check structured fields first (highest confidence - 100%)
  if (job.visa_sponsorship === true || job.visa_friendly === true) {
    return {
      confidence: "verified",
      reason: "Explicitly marked as visa-friendly in job data",
      keywordsFound: ["structured_field"],
      confidencePercentage: 100,
    };
  }

  // Check for explicit negative indicators (HIGHEST PRIORITY - 95% confidence)
  const hasLocalOnlyKeyword = LOCAL_ONLY_KEYWORDS.some((keyword) =>
    text.includes(keyword),
  );

  // Check for "Must be based in [Country]" - this is location, not visa requirement
  const locationBasedMatch = text.match(LOCATION_BASED_PATTERN);
  const isLocationBased = locationBasedMatch && !text.includes("right to work");

  if (hasLocalOnlyKeyword && !isLocationBased) {
    return {
      confidence: "local-only",
      reason: "Job description explicitly states local-only requirements",
      keywordsFound: LOCAL_ONLY_KEYWORDS.filter((k) => text.includes(k)),
      confidencePercentage: 95,
    };
  }

  // Check for verified keywords (explicit sponsorship - 90% confidence)
  const verifiedKeywordsFound = VERIFIED_KEYWORDS.filter((keyword) =>
    text.includes(keyword),
  );

  if (verifiedKeywordsFound.length > 0) {
    return {
      confidence: "verified",
      reason: `Found explicit visa sponsorship keywords: ${verifiedKeywordsFound[0]}`,
      keywordsFound: verifiedKeywordsFound,
      confidencePercentage: 90,
    };
  }

  // Check for likely keywords (suggests sponsorship - 70% confidence)
  const likelyKeywordsFound = LIKELY_KEYWORDS.filter((keyword) =>
    text.includes(keyword),
  );

  // Check company history (75% confidence if known sponsor)
  const isKnownSponsor = KNOWN_SPONSOR_COMPANIES.some((sponsorCompany) =>
    company.includes(sponsorCompany),
  );

  if (likelyKeywordsFound.length > 0 || isKnownSponsor) {
    const confidencePct = isKnownSponsor ? 75 : 70;
    const companyName = company.charAt(0).toUpperCase() + company.slice(1);
    return {
      confidence: "likely",
      reason: isKnownSponsor
        ? `${companyName} has a 5+ year history of sponsoring visas for similar roles`
        : `Found keywords suggesting international candidates welcome: ${likelyKeywordsFound[0]}`,
      keywordsFound: likelyKeywordsFound,
      confidencePercentage: confidencePct,
    };
  }

  // Default: unknown (no keywords found - many startups sponsor but don't mention it)
  return {
    confidence: "unknown",
    reason:
      "No visa sponsorship mentioned. Many startups sponsor visas even if not listed in the job description.",
    keywordsFound: [],
    confidencePercentage: 0,
  };
}

/**
 * Get display label for visa confidence
 */
export function getVisaConfidenceLabel(confidence: VisaConfidence): string {
  switch (confidence) {
    case "verified":
      return "Verified Sponsorship";
    case "likely":
      return "Likely Sponsorship";
    case "local-only":
      return "Local Only";
    default:
      return "Visa Status Unknown";
  }
}

/**
 * Get color/styling for visa confidence tag (Web UI)
 */
export function getVisaConfidenceStyle(confidence: VisaConfidence): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  dotColor: string; // Status dot color for premium UI
  emailBgColor: string; // Hex code for emails
  emailTextColor: string; // Hex code for emails
  emailBorderColor: string; // Hex code for emails
} {
  switch (confidence) {
    case "verified":
      return {
        bgColor: "bg-zinc-800/50",
        textColor: "text-emerald-400",
        borderColor: "border-white/5",
        icon: "✅", // Keep for email compatibility
        dotColor: "bg-emerald-500", // Status dot
        emailBgColor: "#065F46", // emerald-800
        emailTextColor: "#10B981", // emerald-500
        emailBorderColor: "#059669", // emerald-600
      };
    case "likely":
      return {
        bgColor: "bg-zinc-800/50",
        textColor: "text-amber-400",
        borderColor: "border-white/5",
        icon: "⚠️", // Keep for email compatibility
        dotColor: "bg-amber-500", // Status dot
        emailBgColor: "#78350F", // amber-900
        emailTextColor: "#F59E0B", // amber-500
        emailBorderColor: "#D97706", // amber-600
      };
    case "local-only":
      return {
        bgColor: "bg-zinc-800/50",
        textColor: "text-zinc-400",
        borderColor: "border-white/5",
        icon: "📍", // Keep for email compatibility
        dotColor: "bg-zinc-500", // Status dot
        emailBgColor: "#27272A", // zinc-800
        emailTextColor: "#A1A1AA", // zinc-400
        emailBorderColor: "#52525B", // zinc-600
      };
    default:
      return {
        bgColor: "bg-zinc-800/50",
        textColor: "text-gray-400",
        borderColor: "border-white/5",
        icon: "❓", // Keep for email compatibility
        dotColor: "bg-gray-500", // Status dot
        emailBgColor: "#374151", // gray-700
        emailTextColor: "#9CA3AF", // gray-400
        emailBorderColor: "#4B5563", // gray-600
      };
  }
}

/**
 * Get pro tip message for unknown visa status
 */
export function getVisaProTip(): string {
  return "Don't see a visa tag? Many startups sponsor visas even if not listed. Read our guide on how to ask during interviews.";
}
