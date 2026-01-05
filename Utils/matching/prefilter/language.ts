/**
 * Language Domain - Language requirement filtering
 */

import type { UserPreferences } from "@/Utils/matching/types";
import type { JobWithFreshness } from "./types";

/**
 * Filter jobs by language requirements
 * Excludes jobs requiring languages the user doesn't speak
 */
export function filterByLanguageRequirements(
  jobs: JobWithFreshness[],
  user: UserPreferences,
): JobWithFreshness[] {
  const userLanguages =
    user.languages_spoken &&
    Array.isArray(user.languages_spoken) &&
    user.languages_spoken.length > 0
      ? user.languages_spoken
      : ["English"];

  if (!userLanguages || userLanguages.length === 0) {
    return jobs;
  }

  const userLanguagesLower = userLanguages.map((lang) => lang.toLowerCase());

  return jobs.filter((job) => {
    const jobLanguages = (job as any).language_requirements;
    const jobDesc = (job.description || "").toLowerCase();
    const jobTitle = (job.title || "").toLowerCase();
    const jobText = `${jobDesc} ${jobTitle}`.toLowerCase();

    // Check explicit language requirements
    if (
      jobLanguages &&
      Array.isArray(jobLanguages) &&
      jobLanguages.length > 0
    ) {
      const jobLanguagesLower = jobLanguages.map((lang: string) =>
        lang.toLowerCase(),
      );

      const hasMatchingLanguage = jobLanguagesLower.some((jobLang: string) =>
        userLanguagesLower.some(
          (userLang) =>
            userLang.includes(jobLang) ||
            jobLang.includes(userLang) ||
            (userLang === "english" &&
              (jobLang.includes("english") || jobLang.includes("eng"))) ||
            (userLang === "spanish" &&
              (jobLang.includes("spanish") || jobLang.includes("español"))) ||
            (userLang === "french" &&
              (jobLang.includes("french") || jobLang.includes("français"))) ||
            (userLang === "german" &&
              (jobLang.includes("german") || jobLang.includes("deutsch"))) ||
            (userLang === "italian" &&
              (jobLang.includes("italian") || jobLang.includes("italiano"))) ||
            (userLang === "portuguese" &&
              (jobLang.includes("portuguese") ||
                jobLang.includes("português"))) ||
            (userLang === "dutch" &&
              (jobLang.includes("dutch") || jobLang.includes("nederlands"))) ||
            (userLang === "japanese" &&
              (jobLang.includes("japanese") || jobLang.includes("日本語"))) ||
            (userLang === "chinese" &&
              (jobLang.includes("chinese") ||
                jobLang.includes("中文") ||
                jobLang.includes("mandarin"))) ||
            (userLang === "mandarin" &&
              (jobLang.includes("chinese") ||
                jobLang.includes("mandarin") ||
                jobLang.includes("中文"))) ||
            (userLang === "cantonese" &&
              (jobLang.includes("chinese") || jobLang.includes("cantonese"))) ||
            (userLang === "korean" &&
              (jobLang.includes("korean") || jobLang.includes("한국어"))) ||
            (userLang === "polish" &&
              (jobLang.includes("polish") || jobLang.includes("polski"))) ||
            (userLang === "swedish" &&
              (jobLang.includes("swedish") || jobLang.includes("svenska"))) ||
            (userLang === "danish" &&
              (jobLang.includes("danish") || jobLang.includes("dansk"))) ||
            (userLang === "finnish" &&
              (jobLang.includes("finnish") || jobLang.includes("suomi"))) ||
            (userLang === "czech" &&
              (jobLang.includes("czech") || jobLang.includes("čeština"))) ||
            (userLang === "romanian" &&
              (jobLang.includes("romanian") || jobLang.includes("română"))) ||
            (userLang === "hungarian" &&
              (jobLang.includes("hungarian") || jobLang.includes("magyar"))) ||
            (userLang === "greek" &&
              (jobLang.includes("greek") || jobLang.includes("ελληνικά"))) ||
            (userLang === "bulgarian" &&
              (jobLang.includes("bulgarian") ||
                jobLang.includes("български"))) ||
            (userLang === "croatian" &&
              (jobLang.includes("croatian") || jobLang.includes("hrvatski"))) ||
            (userLang === "serbian" &&
              (jobLang.includes("serbian") || jobLang.includes("српски"))) ||
            (userLang === "russian" &&
              (jobLang.includes("russian") || jobLang.includes("русский"))) ||
            (userLang === "ukrainian" &&
              (jobLang.includes("ukrainian") ||
                jobLang.includes("українська"))) ||
            (userLang === "arabic" &&
              (jobLang.includes("arabic") || jobLang.includes("العربية"))) ||
            (userLang === "turkish" &&
              (jobLang.includes("turkish") || jobLang.includes("türkçe"))) ||
            (userLang === "hebrew" &&
              (jobLang.includes("hebrew") || jobLang.includes("עברית"))) ||
            (userLang === "persian" &&
              (jobLang.includes("persian") ||
                jobLang.includes("farsi") ||
                jobLang.includes("فارسی"))) ||
            (userLang === "farsi" &&
              (jobLang.includes("persian") ||
                jobLang.includes("farsi") ||
                jobLang.includes("فارسی"))) ||
            (userLang === "urdu" &&
              (jobLang.includes("urdu") || jobLang.includes("اردو"))) ||
            (userLang === "hindi" &&
              (jobLang.includes("hindi") || jobLang.includes("हिन्दी"))) ||
            (userLang === "thai" &&
              (jobLang.includes("thai") || jobLang.includes("ไทย"))) ||
            (userLang === "vietnamese" &&
              (jobLang.includes("vietnamese") ||
                jobLang.includes("tiếng việt"))) ||
            (userLang === "indonesian" &&
              (jobLang.includes("indonesian") ||
                jobLang.includes("bahasa indonesia"))) ||
            (userLang === "tagalog" &&
              (jobLang.includes("tagalog") || jobLang.includes("filipino"))) ||
            (userLang === "malay" &&
              (jobLang.includes("malay") ||
                jobLang.includes("bahasa melayu"))) ||
            (userLang === "bengali" &&
              (jobLang.includes("bengali") || jobLang.includes("বাংলা"))) ||
            (userLang === "tamil" &&
              (jobLang.includes("tamil") || jobLang.includes("தமிழ்"))) ||
            (userLang === "telugu" &&
              (jobLang.includes("telugu") || jobLang.includes("తెలుగు"))),
        ),
      );

      if (!hasMatchingLanguage) {
        return false;
      }
    }

    // Check description for language requirements
    const languageRequirementKeywords = [
      "japanese speaker",
      "chinese speaker",
      "mandarin speaker",
      "cantonese speaker",
      "korean speaker",
      "hindi speaker",
      "thai speaker",
      "vietnamese speaker",
      "indonesian speaker",
      "tagalog speaker",
      "malay speaker",
      "bengali speaker",
      "tamil speaker",
      "telugu speaker",
      "arabic speaker",
      "turkish speaker",
      "hebrew speaker",
      "persian speaker",
      "farsi speaker",
      "urdu speaker",
      "russian speaker",
      "polish speaker",
      "czech speaker",
      "hungarian speaker",
      "romanian speaker",
      "greek speaker",
      "bulgarian speaker",
      "croatian speaker",
      "serbian speaker",
      "ukrainian speaker",
      "fluent japanese",
      "fluent chinese",
      "fluent mandarin",
      "fluent korean",
      "fluent hindi",
      "fluent thai",
      "fluent vietnamese",
      "fluent arabic",
      "fluent turkish",
      "fluent russian",
      "fluent polish",
      "native japanese",
      "native chinese",
      "native mandarin",
      "native korean",
      "native hindi",
      "must speak japanese",
      "must speak chinese",
      "must speak mandarin",
      "must speak korean",
      "must speak hindi",
      "must speak thai",
      "must speak vietnamese",
      "must speak arabic",
      "must speak turkish",
      "must speak russian",
      "must speak polish",
      "requires japanese",
      "requires chinese",
      "requires mandarin",
      "requires korean",
      "requires hindi",
      "requires thai",
      "requires vietnamese",
      "requires arabic",
      "japanese language",
      "chinese language",
      "mandarin language",
      "korean language",
      "japanese proficiency",
      "chinese proficiency",
      "mandarin proficiency",
      "korean proficiency",
      "hindi proficiency",
      "thai proficiency",
      "vietnamese proficiency",
      "arabic proficiency",
    ];

    const requiresUnknownLanguage = languageRequirementKeywords.some(
      (keyword) => {
        if (!jobText.includes(keyword)) return false;

        const words = keyword.split(" ");
        const langInKeyword = words.find((word) =>
          [
            "japanese",
            "chinese",
            "mandarin",
            "cantonese",
            "korean",
            "hindi",
            "thai",
            "vietnamese",
            "indonesian",
            "tagalog",
            "malay",
            "bengali",
            "tamil",
            "telugu",
            "arabic",
            "turkish",
            "hebrew",
            "persian",
            "farsi",
            "urdu",
            "russian",
            "polish",
            "czech",
            "hungarian",
            "romanian",
            "greek",
            "bulgarian",
            "croatian",
            "serbian",
            "ukrainian",
          ].includes(word),
        );

        if (!langInKeyword) return false;

        return !userLanguagesLower.some(
          (userLang) =>
            userLang.includes(langInKeyword) ||
            langInKeyword.includes(userLang) ||
            (userLang === "mandarin" && langInKeyword === "chinese") ||
            (userLang === "chinese" && langInKeyword === "mandarin") ||
            (userLang === "cantonese" && langInKeyword === "chinese"),
        );
      },
    );

    if (requiresUnknownLanguage) {
      return false;
    }

    return true;
  });
}
