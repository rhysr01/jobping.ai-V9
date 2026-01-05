// PERSONALIZED SUBJECT LINE BUILDER

// Use generated database types where possible
type BasicJob = {
  title?: string;
  company?: string;
  location?: string;
  match_score?: number;
};

type UserPreferencesLike = {
  rolePreference?: string | null;
  locationPreference?: string | null;
  salaryPreference?: string | null; // e.g. "��45-65k" or "��50k+"
};

function getDayContext(date: Date = new Date()): string {
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  );
}

function selectTopCompanies(jobs: BasicJob[], max = 3): string[] {
  const companies = uniqueNonEmpty(jobs.map((j) => j.company));
  return companies.slice(0, max);
}

function formatCompanyList(companies: string[]): string {
  if (companies.length === 0) return "";
  if (companies.length === 1) return companies[0];
  if (companies.length === 2) return `${companies[0]} & ${companies[1]}`;
  return `${companies[0]}, ${companies[1]} & ${companies[2]}`;
}

function coerceRole(preferences?: UserPreferencesLike): string | undefined {
  const role = preferences?.rolePreference || undefined;
  if (!role) return undefined;
  // Title case minimal
  return role.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildPersonalizedSubject(options: {
  jobs: BasicJob[];
  preferences?: UserPreferencesLike;
  now?: Date;
}): string {
  const { jobs, preferences, now } = options;
  const total = jobs.length;
  const role = coerceRole(preferences);
  const location = preferences?.locationPreference || undefined;
  const salary = preferences?.salaryPreference || undefined;
  const day = getDayContext(now);

  // Derive top job for score-based variant
  const topJob = [...jobs].sort(
    (a, b) => (b.match_score || 0) - (a.match_score || 0),
  )[0];
  const topCompany = topJob?.company;
  const topTitle = topJob?.title;
  const topScore = topJob?.match_score
    ? Math.round(topJob.match_score)
    : undefined;

  const companies = selectTopCompanies(jobs, 3);
  const companiesText = formatCompanyList(companies);

  // Variant A: "3 Frontend roles in Amsterdam: Adyen, Spotify & Booking.com"
  if (total > 1 && role && location && companies.length >= 2) {
    return `${total} ${role.toLowerCase()} roles in ${location}: ${companiesText}`;
  }

  // Variant B: "Amsterdam Frontend: React role at Stripe (94% match) + 2 more"
  if (
    role &&
    location &&
    topCompany &&
    topTitle &&
    topScore !== undefined &&
    total >= 1
  ) {
    const more = total > 1 ? ` + ${total - 1} more` : "";
    return `${location} ${role}: ${topTitle} at ${topCompany} (${topScore}% match)${more}`;
  }

  // Variant C: "Your Tuesday Frontend matches: 3 Amsterdam opportunities"
  if (role && location && total > 0) {
    const cityWord = /^(a|e|i|o|u)/i.test(location)
      ? "opportunities in"
      : "opportunities";
    return `Your ${day} ${role} matches: ${total} ${location} ${cityWord}`;
  }

  // Variant D: "3 roles matching your criteria in Amsterdam"
  if (location && total > 0) {
    return `${total} roles matching your criteria in ${location}`;
  }

  // Salary-enhanced generic if available
  if (salary && total > 0) {
    return `${total} opportunities matching your ${salary} criteria`;
  }

  // Fallback generic
  return total > 1
    ? `${total} Fresh Job Matches - JobPing`
    : `New Job Match - JobPing`;
}

export type { UserPreferencesLike, BasicJob };
