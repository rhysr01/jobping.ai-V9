/**
 * Data normalization utilities for the JobPing matching system
 * Extracted from the massive jobMatching.ts file
 */

import type { UserRow, NormalizedUser, Job } from './types';

// ---------- Array normalization utilities ----------
export const toStringArray = (v: unknown, fallback: string[] = []): string[] => {
  if (!v) return fallback;
  if (Array.isArray(v)) return v.filter(item => typeof item === 'string');
  if (typeof v === 'string') {
    // Handle both comma-separated and pipe-separated strings
    if (v.includes('|')) {
      return v.split('|').map(s => s.trim()).filter(Boolean);
    }
    return v.split(',').map(s => s.trim()).filter(Boolean);
  }
  return fallback;
};

export const toOptString = (v: unknown): string | null =>
  typeof v === 'string' ? v : null;

export const toWorkEnv = (v: unknown): 'remote' | 'hybrid' | 'on-site' | null => {
  const s = toOptString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('on-site') || lower.includes('office')) return 'on-site';
  return null;
};

// ---------- String utilities ----------
export const reqString = (s: string | null | undefined, fallback = ''): string =>
  s || fallback;

export const reqFirst = (arr: string[] | null | undefined, fallback = 'unknown'): string =>
  (arr && arr.length > 0) ? arr[0] : fallback;

// ---------- Category normalization ----------
export const normalizeCategoriesForRead = (v: unknown): string[] => toStringArray(v);

export const mapCategories = <T>(categories: unknown, fn: (c: string) => T): T[] =>
  normalizeCategoriesForRead(categories).map(fn);

// ---------- Object utilities ----------
export const anyIndex = (obj: unknown): Record<string, any> => (obj as Record<string, any>);

type UnknownObj = Record<string, unknown>;

// ---------- Job validation ----------
export function isJob(v: unknown): v is Job {
  if (!v || typeof v !== 'object') return false;
  const obj = v as UnknownObj;
  return (
    typeof obj.title === 'string' &&
    typeof obj.company === 'string' &&
    typeof obj.location === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.job_url === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.job_hash === 'string'
  );
}

// ---------- Convenience functions ----------
export const cats = (v: unknown): string[] => normalizeCategoriesForRead(v);

export const mapCats = <T>(v: unknown, fn: (c: string) => T): T[] =>
  mapCategories(v, fn);

export const mapCities = <T>(v: unknown, fn: (city: string) => T): T[] =>
  toStringArray(v).map(fn);

export const idx = (o: unknown) => o as Record<string, any>;

// ---------- User normalization ----------
export const normalizeUser = (u: Partial<UserRow> & { email: string }): NormalizedUser => ({
  email: u.email,
  career_path: toStringArray(u.career_path),
  target_cities: toStringArray(u.target_cities),
  languages_spoken: toStringArray(u.languages_spoken),
  company_types: toStringArray(u.company_types),
  roles_selected: toStringArray(u.roles_selected),
  professional_expertise: toOptString(u.professional_expertise),
  entry_level_preference: toOptString(u.entry_level_preference),
  work_environment: toWorkEnv(u.work_environment),
  start_date: toOptString(u.start_date),
  careerFocus: reqFirst(toStringArray(u.career_path))
});

// ---------- Eligibility and filtering ----------
export const hasEligibility = (v: unknown) => {
  const cats = normalizeCategoriesForRead(v);
  return cats.some(c => c.startsWith('eligibility:'));
};

export const careerSlugs = (v: unknown) => cats(v).filter((c: string) => c.startsWith('career:'));
export const locTag = (v: unknown) => cats(v).find((c: string) => c.startsWith('loc:')) ?? 'loc:unknown';

// ---------- Internal normalization functions ----------
function normalizeToString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalizeStringToArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeToString).filter(Boolean);
  if (typeof value === 'string') {
    if (value.includes('|')) {
      return value.split('|').map(s => s.trim()).filter(Boolean);
    }
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [normalizeToString(value)].filter(Boolean);
}

// ---------- Job normalization for matching ----------
export function normalizeJobForMatching(job: Job): Job {
  return {
    ...job,
    title: reqString(job.title),
    company: reqString(job.company),
    location: reqString(job.location),
    description: reqString(job.description),
    job_url: reqString(job.job_url),
    source: reqString(job.source),
    job_hash: reqString(job.job_hash),
    categories: normalizeCategoriesForRead(job.categories),
    languages_required: toStringArray(job.languages_required),
    work_environment: toOptString(job.work_environment)
  };
}

// ---------- User preferences normalization ----------
export function normalizeUserPreferences(userPrefs: UserPreferences): NormalizedUser {
  return {
    email: userPrefs.email,
    career_path: toStringArray(userPrefs.career_path),
    target_cities: toStringArray(userPrefs.target_cities),
    languages_spoken: toStringArray(userPrefs.languages_spoken),
    company_types: toStringArray(userPrefs.company_types),
    roles_selected: toStringArray(userPrefs.roles_selected),
    professional_expertise: toOptString(userPrefs.professional_expertise),
    entry_level_preference: toOptString(userPrefs.entry_level_preference),
    work_environment: toWorkEnv(userPrefs.work_environment),
    start_date: null, // Not available in UserPreferences
    careerFocus: reqFirst(toStringArray(userPrefs.career_path))
  };
}