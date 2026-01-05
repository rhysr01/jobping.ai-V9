/**
 * Scoring Domain - Comprehensive job scoring system
 * This is the largest module containing all scoring logic
 */

import type { UserPreferences } from "@/Utils/matching/types";
import { getDatabaseCategoriesForForm } from "../categoryMapper";
import { applyFeedbackBoosts } from "./feedback";
import type { JobWithFreshness, LocationMatchLevel, ScoredJob } from "./types";

/**
 * Score a single job against user preferences
 */
export function scoreJob(
  job: JobWithFreshness,
  user: UserPreferences,
  matchLevel: LocationMatchLevel,
  feedbackBoosts: Map<string, number>,
): ScoredJob {
  let score = 0;
  let hasRoleMatch = false;
  let hasCareerMatch = false;
  const jobTitle = job.title.toLowerCase();
  const jobDesc = (job.description || "").toLowerCase();
  const jobLocation = (job.location || "").toLowerCase();
  const jobWorkEnv = ((job as any).work_environment || "").toLowerCase();

  // 1. Location match scoring
  let locationScore = 0;
  if (matchLevel === "exact") {
    locationScore = 45;
  } else if (matchLevel === "country") {
    locationScore = 35;
  } else if (matchLevel === "remote") {
    locationScore = 30;
  } else {
    locationScore = 25;
  }
  score += locationScore;

  // 2. Career path scoring (HIGHEST PRIORITY)
  if (user.career_path) {
    const careerPaths = Array.isArray(user.career_path)
      ? user.career_path
      : [user.career_path];
    hasCareerMatch = careerPaths.some((path) => {
      if (!path) return false;
      const pathLower = path.toLowerCase();
      const titleMatch =
        jobTitle.includes(pathLower) || jobDesc.includes(pathLower);
      const dbCategories = getDatabaseCategoriesForForm(path);
      const categoryMatch =
        (job as any).categories &&
        Array.isArray((job as any).categories) &&
        (job as any).categories.some((cat: string) =>
          dbCategories.some(
            (dbCat) =>
              cat.toLowerCase().includes(dbCat.toLowerCase()) ||
              dbCat.toLowerCase().includes(cat.toLowerCase()),
          ),
        );
      return titleMatch || categoryMatch;
    });
    if (hasCareerMatch) {
      const careerBoost = matchLevel === "exact" ? 40 : 35;
      score += careerBoost;
    } else {
      const careerPenalty =
        matchLevel === "exact" ? 20 : matchLevel === "country" ? 15 : 10;
      score -= careerPenalty;
    }
  }

  // 3. Role/Title matching (SECOND PRIORITY)
  if (user.roles_selected && user.roles_selected.length > 0) {
    const roles = user.roles_selected;
    hasRoleMatch = roles.some((role: string) => {
      if (!role) return false;
      const roleLower = role.toLowerCase();
      return (
        jobTitle.includes(roleLower) ||
        jobDesc.includes(roleLower) ||
        roleLower
          .split(" ")
          .some(
            (keyword) =>
              jobTitle.includes(keyword) || jobDesc.includes(keyword),
          )
      );
    });
    if (hasRoleMatch) {
      if (hasCareerMatch) {
        const roleBoost = matchLevel === "exact" ? 25 : 20;
        score += roleBoost;
      } else {
        score += 10;
      }
    } else {
      if (hasCareerMatch) {
        const rolePenalty = matchLevel === "exact" ? 2 : 3;
        score -= rolePenalty;
      } else {
        score -= 10;
      }
    }
  }

  // 4. Work environment matching
  if (user.work_environment && user.work_environment !== "unclear") {
    const userWorkEnv = user.work_environment.toLowerCase();
    const jobWorkEnvLower = jobWorkEnv || jobLocation;
    if (
      userWorkEnv === "remote" &&
      (jobWorkEnvLower.includes("remote") ||
        jobWorkEnvLower.includes("work from home"))
    ) {
      score += 10;
    } else if (
      userWorkEnv === "hybrid" &&
      (jobWorkEnvLower.includes("hybrid") || jobWorkEnvLower.includes("remote"))
    ) {
      score += 8;
    } else if (
      userWorkEnv === "on-site" &&
      !jobWorkEnvLower.includes("remote") &&
      !jobWorkEnvLower.includes("hybrid")
    ) {
      score += 5;
    } else if (userWorkEnv !== "unclear") {
      score -= 5;
    }
  }

  // 5. Entry level preference matching
  if (user.entry_level_preference) {
    const entryLevel = Array.isArray(user.entry_level_preference)
      ? user.entry_level_preference.join(", ").toLowerCase()
      : user.entry_level_preference.toLowerCase();
    const jobIsInternship = (job as any).is_internship === true;
    const jobIsGraduate = (job as any).is_graduate === true;
    const jobIsEarlyCareer =
      (job as any).is_early_career === true ||
      ((job as any).categories &&
        Array.isArray((job as any).categories) &&
        (job as any).categories.includes("early-career"));

    const workingStudentTerms = [
      "werkstudent",
      "working student",
      "part-time student",
      "student worker",
      "student job",
    ];
    const isWorkingStudentJob = workingStudentTerms.some(
      (term) => jobTitle.includes(term) || jobDesc.includes(term),
    );

    if (
      (entryLevel.includes("intern") || entryLevel.includes("internship")) &&
      jobIsInternship
    ) {
      score += 15;
    } else if (
      (entryLevel.includes("intern") || entryLevel.includes("internship")) &&
      !jobIsInternship
    ) {
      score -= 5;
    }

    if (
      entryLevel.includes("working student") ||
      entryLevel.includes("werkstudent")
    ) {
      if (jobIsInternship && isWorkingStudentJob) {
        score += 15;
      } else if (jobIsInternship) {
        score += 12;
      } else if (isWorkingStudentJob) {
        score += 10;
      }
    }

    if (
      (entryLevel.includes("graduate") ||
        entryLevel.includes("graduate programme")) &&
      jobIsGraduate
    ) {
      score += 15;
    } else if (
      (entryLevel.includes("graduate") ||
        entryLevel.includes("graduate programme")) &&
      !jobIsGraduate &&
      !jobIsInternship
    ) {
      score -= 5;
    }

    if (
      (entryLevel.includes("entry level") ||
        entryLevel.includes("entry-level") ||
        entryLevel.includes("early career")) &&
      jobIsEarlyCareer &&
      !jobIsInternship &&
      !jobIsGraduate
    ) {
      score += 10;
    }

    const entryKeywords = [
      "intern",
      "internship",
      "graduate",
      "grad",
      "entry",
      "junior",
      "trainee",
      "associate",
      "assistant",
    ];
    const seniorKeywords = [
      "senior",
      "lead",
      "principal",
      "manager",
      "director",
      "head",
      "executive",
    ];

    const isEntryLevel = entryKeywords.some(
      (kw) => jobTitle.includes(kw) || jobDesc.includes(kw),
    );
    const isSenior = seniorKeywords.some(
      (kw) => jobTitle.includes(kw) || jobDesc.includes(kw),
    );

    if (
      entryLevel.includes("entry") &&
      isEntryLevel &&
      !jobIsInternship &&
      !jobIsGraduate
    ) {
      score += 8;
    } else if (entryLevel.includes("entry") && isSenior) {
      score -= 15;
    }
  }

  // 6. Company type matching
  if (user.company_types && user.company_types.length > 0) {
    const companyTypes = user.company_types;
    const companyName = ((job as any).company || "").toLowerCase();
    const hasCompanyMatch = companyTypes.some((type) => {
      const typeLower = type.toLowerCase();
      return (
        companyName.includes(typeLower) ||
        jobDesc.includes(typeLower) ||
        (typeLower.includes("startup") &&
          (companyName.includes("startup") || jobDesc.includes("startup"))) ||
        (typeLower.includes("consulting") &&
          (companyName.includes("consulting") ||
            jobDesc.includes("consulting")))
      );
    });
    if (hasCompanyMatch) {
      score += 5;
    }
  }

  // 7. Visa status matching
  if (user.visa_status) {
    const visaStatus = user.visa_status.toLowerCase();
    const jobDescLower = jobDesc.toLowerCase();
    const jobTitleLower = jobTitle.toLowerCase();
    const needsVisaSponsorship =
      !visaStatus.includes("eu-citizen") &&
      !visaStatus.includes("citizen") &&
      !visaStatus.includes("permanent");

    if (needsVisaSponsorship) {
      const visaKeywords = [
        "visa sponsorship",
        "sponsor visa",
        "work permit",
        "relocation support",
        "visa support",
        "immigration support",
        "work authorization",
        "sponsorship available",
        "will sponsor",
        "can sponsor",
        "visa assistance",
        "relocation package",
      ];

      const offersVisaSponsorship = visaKeywords.some(
        (keyword) =>
          jobDescLower.includes(keyword) || jobTitleLower.includes(keyword),
      );

      // Check visa_friendly field from database (set by visa detection filter)
      const jobVisaFriendly =
        (job as any).visa_friendly === true ||
        (job as any).visa_sponsorship === true;

      if (offersVisaSponsorship || jobVisaFriendly) {
        score += 15;
      } else {
        score -= 20;
      }
    } else {
      score += 2;
    }
  }

  // 8. Language scoring
  if (
    user.languages_spoken &&
    Array.isArray(user.languages_spoken) &&
    user.languages_spoken.length > 0
  ) {
    const jobLanguages = (job as any).language_requirements;
    if (
      jobLanguages &&
      Array.isArray(jobLanguages) &&
      jobLanguages.length > 0 &&
      user.languages_spoken &&
      Array.isArray(user.languages_spoken)
    ) {
      const matchingLanguages = jobLanguages.filter((lang: string) =>
        user.languages_spoken?.some(
          (userLang) =>
            userLang.toLowerCase().includes(lang.toLowerCase()) ||
            lang.toLowerCase().includes(userLang.toLowerCase()),
        ),
      );
      if (matchingLanguages.length > 0) {
        score += 10;
      } else {
        score -= 3;
      }
    } else {
      const languages = Array.isArray(user.languages_spoken)
        ? user.languages_spoken
        : [user.languages_spoken];
      const hasLanguageMatch = languages.some((lang) => {
        if (!lang) return false;
        const langLower = lang.toLowerCase();
        return (
          jobDesc.includes(langLower) ||
          jobDesc.includes(`${langLower} speaking`) ||
          jobDesc.includes(`fluent in ${langLower}`) ||
          jobDesc.includes(`native ${langLower}`)
        );
      });
      if (hasLanguageMatch) {
        score += 5;
      }
    }
  }

  // 9. Industries matching
  if (
    user.industries &&
    Array.isArray(user.industries) &&
    user.industries.length > 0
  ) {
    const industries = user.industries.map((i) => i.toLowerCase());
    const hasIndustryMatch = industries.some((industry) => {
      const industryLower = industry.toLowerCase();
      return (
        jobDesc.includes(industryLower) ||
        jobTitle.includes(industryLower) ||
        (industryLower.includes("tech") &&
          (jobDesc.includes("technology") ||
            jobDesc.includes("software") ||
            jobDesc.includes("digital"))) ||
        (industryLower.includes("finance") &&
          (jobDesc.includes("financial") ||
            jobDesc.includes("banking") ||
            jobDesc.includes("investment"))) ||
        (industryLower.includes("consulting") &&
          (jobDesc.includes("consulting") ||
            jobDesc.includes("advisory") ||
            jobDesc.includes("strategy")))
      );
    });
    if (hasIndustryMatch) {
      score += 5;
    }
  }

  // 10. Company size preference
  if (user.company_size_preference && user.company_size_preference !== "any") {
    const sizePreference = user.company_size_preference.toLowerCase();
    const sizeKeywords: Record<string, string[]> = {
      startup: [
        "startup",
        "early-stage",
        "seed",
        "series a",
        "series b",
        "founded",
        "new company",
      ],
      small: [
        "small company",
        "small team",
        "10-50",
        "50-200",
        "boutique",
        "small business",
      ],
      medium: ["medium", "200-500", "500-1000", "mid-size", "mid-sized"],
      large: [
        "large",
        "multinational",
        "fortune",
        "ftse",
        "dax",
        "cac",
        "1000+",
        "global",
        "enterprise",
        "established",
      ],
    };

    const keywords = sizeKeywords[sizePreference] || [];
    if (keywords.length > 0) {
      const hasSizeMatch = keywords.some(
        (kw) =>
          jobDesc.includes(kw) ||
          (job as any).company?.toLowerCase().includes(kw) ||
          jobTitle.includes(kw),
      );
      if (hasSizeMatch) {
        score += 3;
      }
    }
  }

  // 11. Skills matching
  if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
    const skills = user.skills.map((s) => s.toLowerCase().trim());
    const matchingSkills = skills.filter((skill) => {
      if (!skill) return false;
      return (
        jobTitle.includes(skill) ||
        jobDesc.includes(skill) ||
        jobDesc.includes(`${skill} `) ||
        jobDesc.includes(` ${skill}`) ||
        (skill.includes("python") && jobDesc.includes("python")) ||
        (skill.includes("javascript") &&
          (jobDesc.includes("javascript") || jobDesc.includes("js"))) ||
        (skill.includes("sql") &&
          (jobDesc.includes("sql") || jobDesc.includes("database")))
      );
    });

    if (matchingSkills.length > 0) {
      score += Math.min(8, matchingSkills.length * 2);
    }
  }

  // 12. Career keywords matching
  if (user.career_keywords && user.career_keywords.trim().length > 0) {
    const keywords = user.career_keywords
      .toLowerCase()
      .split(/\s+/)
      .filter((kw) => kw.length > 2);

    const matchingKeywords = keywords.filter(
      (kw) => jobTitle.includes(kw) || jobDesc.includes(kw),
    );

    if (matchingKeywords.length > 0) {
      score += Math.min(5, matchingKeywords.length);
    }
  }

  // 13. Early career indicators
  const earlyCareerKeywords = [
    "graduate",
    "intern",
    "internship",
    "entry",
    "junior",
    "trainee",
    "associate",
  ];
  const hasEarlyCareerIndicator = earlyCareerKeywords.some(
    (kw) =>
      jobTitle.includes(kw) ||
      jobDesc.includes(kw) ||
      (job as any).is_graduate ||
      (job as any).is_internship ||
      ((job as any).categories &&
        Array.isArray((job as any).categories) &&
        (job as any).categories.includes("early-career")),
  );
  if (hasEarlyCareerIndicator) {
    score += 5;
  }

  // 14. Apply feedback boosts
  score = applyFeedbackBoosts(score, job, feedbackBoosts);

  return { job, score, hasRoleMatch, hasCareerMatch };
}

/**
 * Score all jobs
 */
export function scoreJobs(
  jobs: JobWithFreshness[],
  user: UserPreferences,
  matchLevel: LocationMatchLevel,
  feedbackBoosts: Map<string, number>,
): ScoredJob[] {
  return jobs.map((job) => scoreJob(job, user, matchLevel, feedbackBoosts));
}
