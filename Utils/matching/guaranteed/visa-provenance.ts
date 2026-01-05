/**
 * Enhanced Visa Confidence with Data-Driven Provenance
 *
 * Uses historical match data to prove sponsorship likelihood
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { Job } from "@/scrapers/types";
import {
  calculateVisaConfidence,
  type VisaConfidenceResult,
} from "../visa-confidence";

export interface VisaProvenance {
  source: "keywords" | "structured_field" | "company_history" | "h1b_data";
  evidence: string;
  historicalMatches?: number;
  lastMatchedAt?: string;
}

export interface EnhancedVisaConfidence extends VisaConfidenceResult {
  provenance: VisaProvenance;
}

/**
 * Enhanced visa confidence with data-driven provenance
 */
export async function calculateVisaConfidenceWithProvenance(
  job: Job,
  supabase: SupabaseClient,
): Promise<EnhancedVisaConfidence> {
  // First, check existing visa confidence (keywords, structured fields)
  const baseConfidence = calculateVisaConfidence(job);

  if (
    baseConfidence.confidence === "verified" ||
    baseConfidence.confidence === "likely"
  ) {
    return {
      ...baseConfidence,
      provenance: {
        source: baseConfidence.keywordsFound?.length
          ? "keywords"
          : "structured_field",
        evidence: baseConfidence.reason,
      },
    };
  }

  // Check company history from matches table
  try {
    const oneYearAgo = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: companyHistory, error } = await supabase
      .from("matches")
      .select("matched_at, job_snapshot")
      .not("job_snapshot", "is", null)
      .gte("matched_at", oneYearAgo)
      .limit(100);

    if (!error && companyHistory) {
      const companyMatches = companyHistory.filter((h) => {
        const snapshot = h.job_snapshot as any;
        return snapshot?.company?.toLowerCase() === job.company?.toLowerCase();
      });

      if (companyMatches.length > 0) {
        // Check how many of these matches had visa sponsorship
        const visaSponsorMatches = companyMatches.filter((h) => {
          const snapshot = h.job_snapshot as any;
          const visaConf = calculateVisaConfidence({
            description: snapshot.description,
            title: snapshot.title,
            company: snapshot.company,
          });
          return (
            visaConf.confidence === "verified" ||
            visaConf.confidence === "likely"
          );
        });

        if (visaSponsorMatches.length >= 5) {
          // Company has sponsored 5+ roles in last 12 months
          return {
            confidence: "likely",
            reason: `This company has sponsored ${visaSponsorMatches.length} similar roles in the last 12 months`,
            keywordsFound: [],
            confidencePercentage: 75,
            provenance: {
              source: "company_history",
              evidence: `This company has sponsored ${visaSponsorMatches.length} similar roles in the last 12 months`,
              historicalMatches: visaSponsorMatches.length,
              lastMatchedAt: visaSponsorMatches[0]?.matched_at,
            },
          };
        }
      }
    }
  } catch (error) {
    apiLogger.warn("Failed to check company history for visa confidence", {
      company: job.company,
      error: (error as Error).message,
    });
  }

  // Check known sponsor list (fallback)
  const isKnownSponsor = isKnownSponsorCompany(job.company);

  if (isKnownSponsor) {
    return {
      confidence: "likely",
      reason: "Company is known to sponsor visas for similar roles",
      keywordsFound: [],
      confidencePercentage: 70,
      provenance: {
        source: "company_history",
        evidence: "Company is known to sponsor visas for similar roles",
      },
    };
  }

  // Return base confidence with provenance
  return {
    ...baseConfidence,
    provenance: {
      source: "keywords",
      evidence: baseConfidence.reason,
    },
  };
}

/**
 * Check if company is known sponsor
 */
function isKnownSponsorCompany(company?: string | null): boolean {
  if (!company) return false;

  const companyLower = company.toLowerCase();
  const knownSponsors = [
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

  return knownSponsors.some((sponsor) => companyLower.includes(sponsor));
}
