/* ============================
   JobPing Types & Normalizers
   (single source of truth)
   
   STABLE AI MATCHING SYSTEM
   ============================ */

// AI timeout configuration - increased for reliability
const AI_TIMEOUT_MS = 20000; // 20 seconds for better reliability
const AI_MAX_RETRIES = 3;
const AI_RETRY_DELAY_MS = 1000;

// AI Provenance interface for tracking
export interface AiProvenance {
  match_algorithm: 'ai' | 'rules' | 'hybrid';
  ai_model?: string;
  prompt_version?: string;
  ai_latency_ms?: number;
  ai_cost_usd?: number;
  cache_hit?: boolean;
  fallback_reason?: string;
}

// ---------- DB row shapes (match your Postgres schema) ----------
export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;               // "Berlin, DE" | "EU Remote" | null
  description: string | null;
  categories: string[];                  // IMPORTANT: text[] in Postgres
  languages_required: string[] | null;   // text[]
  work_environment: string | null;       // "remote" | "hybrid" | "on-site" | null
  source: string | null;
  job_hash: string;
  posted_at: string | null;              // timestamptz ISO
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  last_parsed_at: string | null;
  company_profile_url: string | null;
  job_url: string;
}

export interface MatchRow {
  id: string;
  user_email: string;
  job_hash: string;
  match_reason: string | null;
  match_score: number | null;
  match_quality: string | null;
  match_tags: any;                       // jsonb
  matched_at: string;                    // timestamptz ISO
  freshness_law: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  professional_experience: string | null;
  languages_spoken: string[] | null;     // text[]
  start_date: string | null;             // date ISO
  work_authorization: string | null;
  visa_related: boolean | null;
  entry_level_preference: string | null; // "internship" | "graduate" | ...
  company_types: string[] | null;        // text[]
  career_path: string[] | null;          // text[]
  roles_selected: any | null;            // jsonb
  target_cities: string[] | null;        // text[]
  work_environment: string | null;       // "remote" | "hybrid" | "on-site"
  target_employment_start_date: string | null;
  professional_expertise: string | null;
  email_verified: boolean | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ---------- Normalized user profile used by matcher ----------
export interface NormalizedUser {
  email: string;

  // arrays normalized (never undefined)
  career_path: string[];
  target_cities: string[];
  languages_spoken: string[];
  company_types: string[];
  roles_selected: string[];

  // scalar preferences normalized to string|null
  professional_expertise: string | null;
  entry_level_preference: string | null;
  work_environment: 'remote' | 'hybrid' | 'on-site' | null;
  start_date: string | null;

  // convenience field: first career path or "unknown"
  careerFocus: string;
}

// For code that references the old name:
export type NormalizedUserProfile = NormalizedUser;

// ---------- User preferences interface for matching ----------
export interface UserPreferences {
  email: string;
  professional_expertise?: string;
  start_date?: string;
  work_environment?: string;
  visa_status?: string;
  entry_level_preference?: string;
  career_path?: string[];
  target_cities?: string[];
  languages_spoken?: string[];
  company_types?: string[];
  roles_selected?: string[];
}

// ---------- Safe converters (bulletproof against string | string[] | undefined) ----------
export const toStringArray = (v: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  }
  if (typeof v === 'string') {
    // Try JSON first (common when arrays are stringified)
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return toStringArray(parsed);
    } catch {}
    // Fallback: pipe or comma separated
    return v ? v.split(/[|,]/).map(s => s.trim()).filter(Boolean) : fallback;
  }
  return fallback;
};

export const toOptString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

export const toWorkEnv = (v: unknown): 'remote' | 'hybrid' | 'on-site' | null => {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  if (s === 'onsite' || s === 'office') return 'on-site';
  if (s === 'remote' || s === 'hybrid' || s === 'on-site') return s as any;
  return null;
};

// Required string where some callers demand `string` (avoid TS errors)
export const reqString = (s: string | null | undefined, fallback = ''): string =>
  typeof s === 'string' ? s : fallback;

// First-or-fallback for arrays
export const reqFirst = (arr: string[] | null | undefined, fallback = 'unknown'): string => {
  const a = toStringArray(arr);
  return a[0] ?? fallback;
};

// Categories always as string[] (NEVER .split on it directly)
export const normalizeCategoriesForRead = (v: unknown): string[] => toStringArray(v);

// Utility: map categories safely (fixes "never" inference)
export const mapCategories = <T>(categories: unknown, fn: (c: string) => T): T[] =>
  normalizeCategoriesForRead(categories).map(fn);

// Loose indexer when you truly need dynamic indexing (avoid 7053 errors)
export const anyIndex = (obj: unknown): Record<string, any> => (obj as Record<string, any>);

// Type guard for Job objects
type UnknownObj = Record<string, unknown>;

export function isJob(v: unknown): v is Job {
  if (!v || typeof v !== 'object') return false;
  const j = v as UnknownObj;
  return typeof j.title === 'string'
      && typeof j.company === 'string'
      && typeof j.job_url === 'string';
}

// ---------- Encode ingestion priorities as tags in `categories[]` ----------
/*
  Always include one eligibility tag:
    - "early-career"  → clear intern/grad/junior/entry-level
    - "eligibility:uncertain" → ambiguous but likely early-career

  Prefer one canonical career slug (optional, never blocks):
    - "career:tech" | "career:finance" | "career:marketing" | "career:consulting" | "career:ops" | "career:product" | "career:data" | "career:sales" | "career:retail" | "career:sustainability"
    - or omit / "career:unknown" if unclear (do not block)

  Always one location tag:
    - "loc:eu-remote" OR "loc:<city-kebab>" (e.g. "loc:dublin") OR "loc:unknown"

  Optionals (never block):
    - "work:remote|hybrid|on-site"
    - "platform:<name>:<id>"
*/

/* ===== Helpers for safe reads & user normalization (add once) ===== */

// Always operate on categories as string[]
export const cats = (v: unknown): string[] => normalizeCategoriesForRead(v);

// Map categories with a typed callback (fixes "never" + implicit any)
export const mapCats = <T>(v: unknown, fn: (c: string) => T): T[] =>
  normalizeCategoriesForRead(v).map(fn);

// Safe city array mapping (fixes implicit any on "city")
export const mapCities = <T>(v: unknown, fn: (city: string) => T): T[] =>
  toStringArray(v).map(fn);

// Dynamic index accessor (fixes TS7053)
export const idx = (o: unknown) => o as Record<string, any>;

// Produce a rock-solid NormalizedUser (use this everywhere)
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

  // single canonical focus, per your ingestion priorities
  careerFocus: reqFirst(u.career_path, 'unknown'),
});

// Convenience: common category queries
export const hasEligibility = (v: unknown) => {
  const a = cats(v);
  return a.includes('early-career') || a.includes('eligibility:uncertain');
};
export const careerSlugs = (v: unknown) => cats(v).filter((c: string) => c.startsWith('career:'));
export const locTag = (v: unknown) => cats(v).find((c: string) => c.startsWith('loc:')) ?? 'loc:unknown';

// utils/jobMatching.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { FreshnessTier, JobUpsertResult, DateExtractionResult, Job, createJobCategories, extractCareerPathFromCategories, calculateCareerPathTelemetry, CANONICAL_CAREER_PATHS } from '../scrapers/types';

// Initialize Supabase client
function getSupabaseClient() {
  // Only initialize during runtime, not build time (but allow in test environment)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'jobping-matching-engine'
      }
    }
  });
}

// ================================
// ROBUST MATCHING & RANKING SYSTEM
// ================================

export interface MatchScore {
  overall: number;
  eligibility: number;
  careerPath: number;
  location: number;
  freshness: number;
  confidence: number;
}

export interface MatchResult {
  job: Job;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
  confidence_score: number;
  scoreBreakdown: MatchScore;
}



// ================================
// NEW: AI MATCHING CACHE SYSTEM
// ================================

// Fixed LRU cache implementation with proper cleanup
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  private sweepInterval: NodeJS.Timeout;

  constructor(maxSize: number = 10000, ttl: number = 1000 * 60 * 30) { // 10k entries, 30 minutes default
    this.maxSize = maxSize;
    this.ttl = ttl;
    
    // Periodic cleanup every 5 minutes
    this.sweepInterval = setInterval(() => {
      this.sweep();
    }, 5 * 60 * 1000);
  }

  get(key: K): V | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    this.cache.clear();
  }
}

// Enhanced AI Matching Cache with user clustering - SCALED for 500+ users
export class AIMatchingCache {
  private static cache = new LRUCache<string, any[]>(10000, 1000 * 60 * 30); // 10k entries, 30 minutes TTL

  static generateUserClusterKey(users: any[]): string {
    // Create key from similar user characteristics
    const signature = users
      .map(u => {
        const targetCitiesRaw = u.target_cities;
        const firstCity = Array.isArray(targetCitiesRaw) ? targetCitiesRaw[0] : 
                         typeof targetCitiesRaw === 'string' ? targetCitiesRaw.split('|')[0] : 'unknown';
        return `${u.professional_expertise}-${u.entry_level_preference}-${firstCity || 'unknown'}`;
      })
      .sort()
      .join('|');
    
    return `ai_cluster:${crypto.createHash('md5').update(signature).digest('hex').slice(0, 12)}`;
  }

  static async getCachedMatches(userCluster: any[]): Promise<any[] | null> {
    // Skip Redis wait in tests
    if (isTestOrPerfMode()) return null;
    
    const key = this.generateUserClusterKey(userCluster);
    const cached = this.cache.get(key);
    if (cached) {
      console.log(`🎯 Cache hit for cluster of ${userCluster.length} users`);
    }
    return cached;
  }

  static setCachedMatches(userCluster: any[], matches: any[]): void {
    const key = this.generateUserClusterKey(userCluster);
    this.cache.set(key, matches);
    console.log(`💾 Cached AI matches for ${userCluster.length} users (cache size: ${this.cache.size()})`);
  }

  static clearCache(): void {
    this.cache.destroy();
    console.log('🧹 AI matching cache cleared and destroyed');
  }
}

// ================================
// ROBUST MATCHING FUNCTIONS
// ================================

// C1: Input normalization
export function normalizeJobForMatching(job: Job): Job {
  // Create a copy to avoid mutating the original
  const normalizedJob = { ...job };
  
  // Normalize categories to string then split and rejoin
  const categories = normalizeToString(job.categories);
  if (categories) {
    const tags = normalizeCategoriesForRead(categories)
      .map((tag: string) => tag.toLowerCase().trim())
      .filter((tag: string) => tag.length > 0);
    
    // Deduplicate and sort
    const uniqueTags = [...new Set(tags)].sort();
    normalizedJob.categories = uniqueTags;
  }
  
  return normalizedJob;
}

// Defensive string normalization helper
function normalizeToString(value: any): string {
  if (Array.isArray(value)) {
    return value.join('|');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

// C2: Hard gates
export function applyHardGates(job: Job, userPrefs: UserPreferences): { passed: boolean; reason: string } {
  const categories = normalizeToString(job.categories);
  const tags = normalizeCategoriesForRead(categories);
  
  // Early-career gate
  const hasEarlyCareer = tags.includes('early-career') || tags.includes('eligibility:uncertain');
  
  if (!hasEarlyCareer) {
    return { passed: false, reason: 'Not early-career eligible' };
  }
  
  // Geo gate (permissive - allow loc:unknown with penalty)
  const hasLocation = tags.some((tag: string) => tag.startsWith('loc:'));
  if (!hasLocation) {
    // Allow with penalty, don't block
    console.warn(`⚠️ Job ${job.title} has no location tag, allowing with penalty`);
  }
  
  // Visa gate (if user needs sponsorship)
  if (userPrefs.visa_status === 'non-eu-visa-required') {
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const noSponsorship = /\b(no sponsorship|no visa|eu only|eu citizens only|no work permit)\b/.test(jobText);
    if (noSponsorship) {
      return { passed: false, reason: 'No visa sponsorship available' };
    }
  }
  
  return { passed: true, reason: 'Passed all gates' };
}

// C3: Scoring model
export function calculateMatchScore(job: Job, userPrefs: UserPreferences): MatchScore {

  // Legacy implementation
  const categories = normalizeToString(job.categories);
  const tags = normalizeCategoriesForRead(categories);
  
  // Eligibility score (35% weight)
  let eligibilityScore = 0;
  if (tags.includes('early-career')) {
    eligibilityScore = 100;
  } else if (tags.includes('eligibility:uncertain')) {
    eligibilityScore = 70;
  }
  
  // Career path match (30% weight)
  let careerPathScore = 0;
  const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
  const userCareerPath = reqFirst(userPrefs.career_path);
  
  if (jobCareerPath && userCareerPath) {
    if (jobCareerPath === userCareerPath) {
      careerPathScore = 100;
    } else if (jobCareerPath !== 'unknown') {
      careerPathScore = 70; // Related career path
    } else {
      careerPathScore = 40; // Unknown career path
    }
  } else if (jobCareerPath === 'unknown') {
    careerPathScore = 40;
  }
  
  // Location fit (20% weight)
  let locationScore = 0;
  const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
  // Normalize target_cities to array
  const userCities = toStringArray(userPrefs.target_cities);
  
  if (jobLocation && userCities.length > 0) {
    if (userCities.some((city: string) => jobLocation.includes(city.toLowerCase().replace(/\s+/g, '-')))) {
      locationScore = 100; // Exact city match
    } else if (jobLocation.startsWith('eu-')) {
      locationScore = 75; // EU remote
    } else if (jobLocation === 'unknown') {
      locationScore = 50; // Unknown location
    } else {
      locationScore = 0; // Non-EU location
    }
  } else if (jobLocation === 'unknown') {
    locationScore = 50;
  }
  
  // Freshness (15% weight)
  let freshnessScore = 0;
  const postedAt = new Date(job.posted_at);
  const now = new Date();
  const daysDiff = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 1) {
    freshnessScore = 100; // <24h
  } else if (daysDiff < 3) {
    freshnessScore = 90; // 1-3d
  } else if (daysDiff < 7) {
    freshnessScore = 70; // 3-7d
  } else {
    freshnessScore = 40; // >7d
  }
  
  // Calculate weighted overall score
  const overallScore = Math.round(
    (eligibilityScore * 0.35) +
    (careerPathScore * 0.30) +
    (locationScore * 0.20) +
    (freshnessScore * 0.15)
  );
  
  return {
    overall: overallScore,
    eligibility: eligibilityScore,
    careerPath: careerPathScore,
    location: locationScore,
    freshness: freshnessScore,
    confidence: 1.0 // Will be adjusted by confidence handling
  };
}

// C4: Confidence handling
export function calculateConfidenceScore(job: Job, userPrefs: UserPreferences): number {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);
  
  let confidence = 1.0;
  
  // Subtract 0.1 per missing key signal
  if (tags.includes('eligibility:uncertain')) {
    confidence -= 0.1;
  }
  
  const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
  if (jobCareerPath === 'unknown') {
    confidence -= 0.1;
  }
  
  const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
  if (jobLocation === 'unknown') {
    confidence -= 0.1;
  }
  
  // Floor at 0.5
  return Math.max(0.5, confidence);
}

// C5: Generate explanations and tags
export function generateMatchExplanation(job: Job, scoreBreakdown: MatchScore, userPrefs: UserPreferences): { reason: string; tags: string } {
  const categories = normalizeToString(job.categories);
  const tags = cats(categories);
  
  // Find top 2 signals
  const signals = [];
  
  if (scoreBreakdown.eligibility >= 70) {
    signals.push('Early-career');
  }
  
  const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
  if (scoreBreakdown.careerPath >= 70 && jobCareerPath && jobCareerPath !== 'unknown') {
    signals.push(jobCareerPath.charAt(0).toUpperCase() + jobCareerPath.slice(1));
  }
  
  const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
  if (scoreBreakdown.location >= 70 && jobLocation && jobLocation !== 'unknown') {
    signals.push(jobLocation.replace('-', ' '));
  }
  
  // Generate reason
  let reason = '';
  if (signals.length >= 2) {
    reason = `${signals[0]} + ${signals[1]} match`;
  } else if (signals.length === 1) {
    reason = `${signals[0]} match`;
  } else {
    reason = 'Potential match';
  }
  
  // Add location if available
  if (jobLocation && jobLocation !== 'unknown') {
    reason += ` in ${jobLocation.replace('-', ' ')}`;
  }
  
  // Add explanation for unknowns
  const unknowns = [];
  if (tags.includes('eligibility:uncertain')) {
    unknowns.push('eligibility unclear');
  }
  if (jobLocation === 'unknown') {
    unknowns.push('location unclear');
  }
  if (jobCareerPath === 'unknown') {
    unknowns.push('career path unclear');
  }
  
  if (unknowns.length > 0) {
    reason += `; kept due to strong early-career signal`;
  }
  
  // Generate match tags
  const matchTags = {
    eligibility: tags.includes('early-career') ? 'early-career' : 'uncertain',
    career_path: jobCareerPath || 'unknown',
    loc: jobLocation || 'unknown',
    freshness: scoreBreakdown.freshness >= 90 ? 'fresh' : scoreBreakdown.freshness >= 70 ? 'recent' : 'older',
    confidence: scoreBreakdown.confidence
  };
  
  return {
    reason,
    tags: JSON.stringify(matchTags)
  };
}

// C6: Ordering and thresholds
export function categorizeMatches(matches: MatchResult[]): { confident: MatchResult[]; promising: MatchResult[] } {
  const confident: MatchResult[] = [];
  const promising: MatchResult[] = [];
  
  for (const match of matches) {
    if (match.match_score >= 70 && match.confidence_score >= 0.7) {
      confident.push(match);
    } else if (match.match_score >= 50 || match.confidence_score < 0.7) {
      promising.push(match);
    }
  }
  
  return { confident, promising };
}

// Main robust matching function
export function performRobustMatching(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (const job of jobs) {
    // Normalize job
    const normalizedJob = normalizeJobForMatching(job);
    
    // Apply hard gates
    const gateResult = applyHardGates(normalizedJob, userPrefs);
    if (!gateResult.passed) {
      continue;
    }
    
    // Calculate scores
    const scoreBreakdown = calculateMatchScore(normalizedJob, userPrefs);
    const confidenceScore = calculateConfidenceScore(normalizedJob, userPrefs);
    
    // Apply confidence to location and career subscores
    scoreBreakdown.location = Math.round(scoreBreakdown.location * confidenceScore);
    scoreBreakdown.careerPath = Math.round(scoreBreakdown.careerPath * confidenceScore);
    scoreBreakdown.confidence = confidenceScore;
    
    // Recalculate overall score
    scoreBreakdown.overall = Math.round(
      (scoreBreakdown.eligibility * 0.35) +
      (scoreBreakdown.careerPath * 0.30) +
      (scoreBreakdown.location * 0.20) +
      (scoreBreakdown.freshness * 0.15)
    );
    
    // Generate explanation
    const explanation = generateMatchExplanation(normalizedJob, scoreBreakdown, userPrefs);
    
    // Determine match quality
    let matchQuality = 'poor';
    if (scoreBreakdown.overall >= 80) matchQuality = 'excellent';
    else if (scoreBreakdown.overall >= 70) matchQuality = 'good';
    else if (scoreBreakdown.overall >= 50) matchQuality = 'fair';
    
    const matchResult: MatchResult = {
      job: normalizedJob,
      match_score: scoreBreakdown.overall,
      match_reason: explanation.reason,
      match_quality: matchQuality,
      match_tags: explanation.tags,
      confidence_score: confidenceScore,
      scoreBreakdown
    };
    
    matches.push(matchResult);
  }
  
  // Sort by match score, then confidence, then posted date
  matches.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    if (b.confidence_score !== a.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }
    return new Date(b.job.posted_at).getTime() - new Date(a.job.posted_at).getTime();
  });
  
  return matches;
}


// ================================
// ORIGINAL TYPES + target_cities ADDED
// ================================

// Use the Job interface from scrapers/types.ts instead of local definition

// Helper function to safely normalize string/array fields
function normalizeStringToArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Handle both comma-separated and pipe-separated strings
    if (value.includes('|')) {
      return value.split('|').map(s => s.trim()).filter(Boolean);
    }
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}



export interface JobMatch {
  job_index: number;
  job_hash: string;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
}



export interface EnrichedJob extends Job {
  visaFriendly: boolean;
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior';
  workEnvironment: 'remote' | 'hybrid' | 'office' | 'unclear';
  languageRequirements: string[];
  complexityScore: number;
}

// ================================
// SOPHISTICATED MATCHING ENGINE TYPES
// ================================

interface CityMarketData {
  city: string;
  totalJobs: number;
  ieStudentDemand: number;
  languageAdvantages: Map<string, number>;
  visaComplexity: 'easy' | 'complex';
  businessFocus: string;
}

interface StudentContext {
  preferredCities: string[];
  languages: string[];
  experienceMonths: number;
  workPreference: 'office' | 'hybrid';
  visaCategory: 'EU' | 'Non-EU' | 'UK' | 'No-UK';
  careerPaths: string[];
  userEmail: string;
}

interface MatchOpportunity {
  job: Job;
  cityContext: CityMarketData;
  overallScore: number;
  dimensionScores: {
    cityFit: number;
    languageAdvantage: number;
    experienceMatch: number;
    visaCompatibility: number;
    workEnvironmentFit: number;
    careerPathMatch: number;
  };
  explanation: string;
  advantages: string[];
  challenges: string[];
}

// ================================
// SOPHISTICATED MATCHING ENGINE
// ================================

class DataDrivenJobMatcher {
  // REAL market data for IE's 12 target cities
  private static readonly CITY_MARKETS: Map<string, CityMarketData> = new Map([
    ['Paris', {
      city: 'Paris',
      totalJobs: 420,
      ieStudentDemand: 350,
      languageAdvantages: new Map([
        ['French', 2.2],
        ['English', 1.0],
        ['Spanish', 1.1],
        ['German', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Finance & Consulting'
    }],
    
    ['London', {
      city: 'London',
      totalJobs: 580,
      ieStudentDemand: 420,
      languageAdvantages: new Map([
        ['English', 1.0],
        ['French', 1.1],
        ['German', 1.1],
        ['Spanish', 1.0]
      ]),
      visaComplexity: 'complex',
      businessFocus: 'Finance & Tech'
    }],

    ['Berlin', {
      city: 'Berlin',
      totalJobs: 380,
      ieStudentDemand: 280,
      languageAdvantages: new Map([
        ['German', 2.4],
        ['English', 1.0],
        ['French', 1.0],
        ['Spanish', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Tech & Startups'
    }],

    ['Barcelona', {
      city: 'Barcelona',
      totalJobs: 220,
      ieStudentDemand: 310,
      languageAdvantages: new Map([
        ['Spanish', 1.9],
        ['English', 1.0],
        ['French', 1.1],
        ['German', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Tourism & Tech'
    }],

    ['Madrid', {
      city: 'Madrid',
      totalJobs: 190,
      ieStudentDemand: 180,
      languageAdvantages: new Map([
        ['Spanish', 1.8],
        ['English', 1.0],
        ['Portuguese', 1.4],
        ['French', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Finance & Government'
    }],

    ['Amsterdam', {
      city: 'Amsterdam',
      totalJobs: 280,
      ieStudentDemand: 200,
      languageAdvantages: new Map([
        ['Dutch', 2.5],
        ['English', 1.0],
        ['German', 1.3],
        ['French', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Finance & Tech'
    }],

    ['Milan', {
      city: 'Milan',
      totalJobs: 150,
      ieStudentDemand: 140,
      languageAdvantages: new Map([
        ['Italian', 2.1],
        ['English', 1.0],
        ['French', 1.2],
        ['German', 1.1]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Fashion & Finance'
    }],

    ['Rome', {
      city: 'Rome',
      totalJobs: 120,
      ieStudentDemand: 100,
      languageAdvantages: new Map([
        ['Italian', 2.0],
        ['English', 1.0],
        ['French', 1.1],
        ['Spanish', 1.1]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Government & Tourism'
    }],

    ['Prague', {
      city: 'Prague',
      totalJobs: 80,
      ieStudentDemand: 60,
      languageAdvantages: new Map([
        ['English', 1.0],
        ['German', 1.4],
        ['French', 1.0],
        ['Spanish', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Tech & Services'
    }],

    ['Geneva', {
      city: 'Geneva',
      totalJobs: 90,
      ieStudentDemand: 80,
      languageAdvantages: new Map([
        ['French', 2.0],
        ['English', 1.0],
        ['German', 1.2],
        ['Italian', 1.1]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'International Orgs'
    }],

    ['Zurich', {
      city: 'Zurich',
      totalJobs: 120,
      ieStudentDemand: 90,
      languageAdvantages: new Map([
        ['German', 2.3],
        ['French', 1.3],
        ['English', 1.0],
        ['Italian', 1.1]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Finance & Tech'
    }],

    ['Dublin', {
      city: 'Dublin',
      totalJobs: 160,
      ieStudentDemand: 120,
      languageAdvantages: new Map([
        ['English', 1.0],
        ['French', 1.0],
        ['German', 1.0],
        ['Spanish', 1.0]
      ]),
      visaComplexity: 'easy',
      businessFocus: 'Tech & Finance'
    }]
  ]);

  // EQUAL WEIGHTS - 6 dimensions
  private static readonly DIMENSION_WEIGHTS = {
    cityFit: 17,
    languageAdvantage: 17,
    experienceMatch: 17,
    visaCompatibility: 17,
    workEnvironmentFit: 16,
    careerPathMatch: 16
  };

  public static generateSophisticatedMatches(
    jobs: Job[],
    userPrefs: UserPreferences
  ): MatchOpportunity[] {
    console.log(`🧠 Sophisticated matching for ${userPrefs.email}`);
    
    const studentContext = this.parseStudentContext(userPrefs);
    const opportunities: MatchOpportunity[] = [];

    const jobsByCity = this.groupJobsByCity(jobs);
    
    console.log(`📊 Market overview: ${Object.keys(jobsByCity).map(city => 
      `${city}(${jobsByCity[city].length} jobs)`
    ).join(', ')}`);

    for (const [cityName, cityJobs] of Object.entries(jobsByCity)) {
      const cityData = this.CITY_MARKETS.get(cityName);
      if (!cityData) {
        console.warn(`⚠️ No market data for ${cityName}, skipping`);
        continue;
      }

      const cityOpportunities = this.analyzeCityOpportunities(
        cityJobs,
        cityData,
        studentContext
      );

      opportunities.push(...cityOpportunities);
    }

    const rankedOpportunities = opportunities
      .sort((a, b) => b.overallScore - a.overallScore)
      .filter(opp => opp.overallScore >= 50)
      .slice(0, 7);

    console.log(`🎯 Top opportunities: ${rankedOpportunities.map(opp => 
      `${opp.job.title} in ${opp.cityContext.city} (${opp.overallScore}pts)`
    ).join(', ')}`);

    return rankedOpportunities;
  }

  private static parseStudentContext(userPrefs: UserPreferences): StudentContext {
    const preferredCities = normalizeStringToArray(userPrefs.target_cities);
    const languages = normalizeStringToArray(userPrefs.languages_spoken);
    const experienceMonths = this.parseExperienceToMonths(userPrefs.professional_expertise || '0');
    const workPreference = this.parseWorkPreference(userPrefs.work_environment || 'office');
    const visaCategory = this.simplifyVisaStatus(userPrefs.visa_status || 'eu-citizen');
    const careerPaths = normalizeStringToArray(userPrefs.roles_selected);

    return {
      preferredCities,
      languages,
      experienceMonths,
      workPreference,
      visaCategory,
      careerPaths,
      userEmail: userPrefs.email
    };
  }

  private static analyzeCityOpportunities(
    cityJobs: Job[],
    cityData: CityMarketData,
    studentContext: StudentContext
  ): MatchOpportunity[] {
    const opportunities: MatchOpportunity[] = [];
    const competitionRatio = cityData.ieStudentDemand / cityData.totalJobs;
    
    console.log(`📈 ${cityData.city} competition: ${competitionRatio.toFixed(2)} students per job`);

    for (const job of cityJobs) {
      const opportunity = this.evaluateJobOpportunity(job, cityData, studentContext);
      if (opportunity.overallScore >= 40) {
        opportunities.push(opportunity);
      }
    }

    return opportunities;
  }

  private static evaluateJobOpportunity(
    job: Job,
    cityData: CityMarketData,
    studentContext: StudentContext
  ): MatchOpportunity {
    const cityFit = this.scoreCityFit(cityData, studentContext);
    const languageAdvantage = this.scoreLanguageAdvantage(job, cityData, studentContext);
    const experienceMatch = this.scoreExperienceMatch(job, studentContext);
    const visaCompatibility = this.scoreVisaCompatibility(job, cityData, studentContext);
    const workEnvironmentFit = this.scoreWorkEnvironmentFit(job, studentContext);
    const careerPathMatch = this.scoreCareerPathMatch(job, studentContext);

    const dimensionScores = {
      cityFit,
      languageAdvantage,
      experienceMatch,
      visaCompatibility,
      workEnvironmentFit,
      careerPathMatch
    };

    // Normalize scores to 0-1 range before applying weights
    const normalizedScores = {
      cityFit: cityFit / 100,
      languageAdvantage: languageAdvantage / 100,
      experienceMatch: experienceMatch / 100,
      visaCompatibility: visaCompatibility / 100,
      workEnvironmentFit: workEnvironmentFit / 100,
      careerPathMatch: careerPathMatch / 100
    };

    const overallScore = Math.round(
      (normalizedScores.cityFit * this.DIMENSION_WEIGHTS.cityFit +
       normalizedScores.languageAdvantage * this.DIMENSION_WEIGHTS.languageAdvantage +
       normalizedScores.experienceMatch * this.DIMENSION_WEIGHTS.experienceMatch +
       normalizedScores.visaCompatibility * this.DIMENSION_WEIGHTS.visaCompatibility +
       normalizedScores.workEnvironmentFit * this.DIMENSION_WEIGHTS.workEnvironmentFit +
       normalizedScores.careerPathMatch * this.DIMENSION_WEIGHTS.careerPathMatch)
    );

    const advantages = this.identifyAdvantages(dimensionScores, cityData, studentContext);
    const challenges = this.identifyChallenges(dimensionScores, cityData, studentContext);
    const explanation = this.generateExplanation(dimensionScores, cityData);

    return {
      job,
      cityContext: cityData,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      dimensionScores,
      explanation,
      advantages,
      challenges
    };
  }

  // ================================
  // SCORING FUNCTIONS (0-100 each)
  // ================================

  private static scoreCityFit(cityData: CityMarketData, studentContext: StudentContext): number {
    if (studentContext.preferredCities.includes(cityData.city)) {
      return 95;
    }
    if (studentContext.preferredCities.length === 0) {
      return 70;
    }
    return 30;
  }

  private static scoreLanguageAdvantage(
    job: Job,
    cityData: CityMarketData,
    studentContext: StudentContext
  ): number {
    let maxAdvantage = 1.0;

    for (const language of studentContext.languages) {
      const advantage = cityData.languageAdvantages.get(language) || 1.0;
      maxAdvantage = Math.max(maxAdvantage, advantage);
    }

    const score = Math.min(100, 30 + (maxAdvantage * 30));
    return Math.round(score);
  }

  private static scoreExperienceMatch(job: Job, studentContext: StudentContext): number {
    const jobDescription = job.description?.toLowerCase() || '';
    const jobTitle = job.title?.toLowerCase() || '';
    const experienceRequired = job.experience_required?.toLowerCase() || '';
    const experienceMonths = studentContext.experienceMonths;

    let requiredExperience = 0;
    const text = `${jobDescription} ${jobTitle} ${experienceRequired}`;
    
    if (text.includes('entry level') || text.includes('graduate') || text.includes('no experience')) {
      requiredExperience = 0;
    } else if (text.includes('6 months') || text.includes('internship')) {
      requiredExperience = 6;
    } else if (text.includes('1 year') || text.includes('junior')) {
      requiredExperience = 12;
    } else if (text.includes('2 years')) {
      requiredExperience = 24;
    } else if (text.includes('3 years') || text.includes('mid-level')) {
      requiredExperience = 36;
    } else if (text.includes('senior') || text.includes('5+ years')) {
      requiredExperience = 60;
    }

    if (experienceMonths >= requiredExperience) {
      const overqualification = experienceMonths - requiredExperience;
      if (overqualification <= 12) {
        return 100;
      } else {
        return Math.max(80, 100 - (overqualification - 12) * 2);
      }
    } else {
      const gap = requiredExperience - experienceMonths;
      if (gap <= 6) {
        return 75;
      } else if (gap <= 12) {
        return 50;
      } else {
        return 20;
      }
    }
  }

  private static scoreVisaCompatibility(
    job: Job,
    cityData: CityMarketData,
    studentContext: StudentContext
  ): number {
    const visaCategory = studentContext.visaCategory;
    const isLondonJob = cityData.city === 'London';
    
    const jobText = `${job.description} ${job.title}`.toLowerCase();
    const visaFriendlyKeywords = [
      'visa sponsorship', 'work permit', 'international candidates',
      'relocation support', 'sponsorship available', 'work visa'
    ];
    const hasVisaSupport = visaFriendlyKeywords.some(keyword => jobText.includes(keyword));

    switch (visaCategory) {
      case 'EU':
        if (isLondonJob) {
          return hasVisaSupport ? 80 : 40;
        }
        return 95;
        
      case 'Non-EU':
        return hasVisaSupport ? 90 : 15;
        
      case 'UK':
        if (isLondonJob) {
          return 95;
        }
        return hasVisaSupport ? 60 : 35;
        
      case 'No-UK':
        if (isLondonJob) {
          return 0;
        }
        return 95;
        
      default:
        return 50;
    }
  }

  private static scoreWorkEnvironmentFit(job: Job, studentContext: StudentContext): number {
    const jobDescription = job.description?.toLowerCase() || '';
    const jobWorkEnv = job.work_environment?.toLowerCase() || '';
    const preference = studentContext.workPreference;

    let jobWorkStyle: 'office' | 'hybrid' | 'unclear';
    const text = `${jobDescription} ${jobWorkEnv}`;
    
    if (text.includes('hybrid')) {
      jobWorkStyle = 'hybrid';
    } else if (text.includes('office') || text.includes('on-site')) {
      jobWorkStyle = 'office';
    } else {
      jobWorkStyle = 'unclear';
    }

    if (jobWorkStyle === preference) return 100;
    if (jobWorkStyle === 'hybrid') return 85;
    if (jobWorkStyle === 'unclear') return 70;
    return 45;
  }

  private static scoreCareerPathMatch(job: Job, studentContext: StudentContext): number {
    const jobTitle = job.title?.toLowerCase() || '';
    const jobDescription = job.description?.toLowerCase() || '';
    
    if (studentContext.careerPaths.length === 0) {
      return 70;
    }

    let bestScore = 0;
    
    // Extract career path from job using the extraction function
    const jobCareerPath = extractCareerPath(job.title || '', job.description || '');
    
    // Handle categories field safely
    const jobCategories = normalizeStringToArray(job.categories);
    
    for (const careerPath of studentContext.careerPaths) {
      let pathScore = 0;
      const path = careerPath.toLowerCase();
      
      // Enhanced career path matching with more sophisticated scoring
      switch (path) {
        case 'consulting':
        case 'strategy & business design':
          if (jobTitle.includes('consultant') || jobTitle.includes('strategy') || jobTitle.includes('business development')) {
            pathScore = 95;
          } else if (jobDescription.includes('consulting') || jobDescription.includes('strategy') || jobDescription.includes('business development')) {
            pathScore = 85;
          } else if (jobCareerPath === 'consulting') {
            pathScore = 90;
          }
          break;
          
        case 'data & analytics':
        case 'data':
          if (jobTitle.includes('data') || jobTitle.includes('analyst') || jobTitle.includes('analytics')) {
            pathScore = 95;
          } else if (jobDescription.includes('data analysis') || jobDescription.includes('business intelligence')) {
            pathScore = 85;
          } else if (jobCareerPath === 'tech' && (jobTitle.includes('data') || jobDescription.includes('data'))) {
            pathScore = 80;
          }
          break;
          
        case 'marketing':
        case 'marketing & branding':
          if (jobTitle.includes('marketing') || jobTitle.includes('brand') || jobTitle.includes('digital marketing')) {
            pathScore = 95;
          } else if (jobDescription.includes('marketing') || jobDescription.includes('brand management')) {
            pathScore = 85;
          } else if (jobCareerPath === 'marketing') {
            pathScore = 90;
          }
          break;
          
        case 'sales & client success':
        case 'sales':
          if (jobTitle.includes('sales') || jobTitle.includes('client') || jobTitle.includes('account')) {
            pathScore = 95;
          } else if (jobDescription.includes('sales') || jobDescription.includes('client relationship')) {
            pathScore = 85;
          } else if (jobCareerPath === 'entrepreneurship' && (jobTitle.includes('sales') || jobDescription.includes('sales'))) {
            pathScore = 80;
          }
          break;
          
        case 'finance & investment':
        case 'finance':
          if (jobTitle.includes('finance') || jobTitle.includes('investment') || jobTitle.includes('financial')) {
            pathScore = 95;
          } else if (jobDescription.includes('finance') || jobDescription.includes('investment')) {
            pathScore = 85;
          } else if (jobCareerPath === 'finance') {
            pathScore = 90;
          }
          break;
          
        case 'operations & supply chain':
        case 'operations':
          if (jobTitle.includes('operations') || jobTitle.includes('supply') || jobTitle.includes('logistics')) {
            pathScore = 95;
          } else if (jobDescription.includes('operations') || jobDescription.includes('supply chain')) {
            pathScore = 85;
          } else if (jobCareerPath === 'operations') {
            pathScore = 90;
          }
          break;
          
        case 'human resources':
        case 'hr':
          if (jobTitle.includes('hr') || jobTitle.includes('human resources') || jobTitle.includes('people')) {
            pathScore = 95;
          } else if (jobDescription.includes('human resources') || jobDescription.includes('talent')) {
            pathScore = 85;
          }
          break;
          
        case 'tech & transformation':
        case 'tech':
          if (jobTitle.includes('tech') || jobTitle.includes('developer') || jobTitle.includes('digital')) {
            pathScore = 95;
          } else if (jobDescription.includes('technology') || jobDescription.includes('digital transformation')) {
            pathScore = 85;
          } else if (jobCareerPath === 'tech') {
            pathScore = 90;
          }
          break;
          
        case 'sustainability & esg':
        case 'sustainability':
          if (jobTitle.includes('sustainability') || jobTitle.includes('esg') || jobTitle.includes('environment')) {
            pathScore = 95;
          } else if (jobDescription.includes('sustainability') || jobDescription.includes('environmental')) {
            pathScore = 85;
          }
          break;
          
        case 'project mgmt':
        case 'project management':
          if (jobTitle.includes('project') || jobTitle.includes('program') || jobTitle.includes('manager')) {
            pathScore = 90;
          } else if (jobDescription.includes('project management') || jobDescription.includes('program management')) {
            pathScore = 80;
          }
          break;
          
        case 'entrepreneurship':
          if (jobTitle.includes('startup') || jobTitle.includes('entrepreneur') || jobTitle.includes('founder')) {
            pathScore = 95;
          } else if (jobDescription.includes('startup') || jobDescription.includes('entrepreneurial')) {
            pathScore = 85;
          } else if (jobCareerPath === 'entrepreneurship') {
            pathScore = 90;
          }
          break;
          
        default:
          // Generic scoring for other career paths
          if (jobTitle.includes('analyst') || jobTitle.includes('coordinator') || jobTitle.includes('associate')) {
            pathScore = 60;
          } else if (jobCareerPath && jobCareerPath !== 'General Business') {
            pathScore = 70;
          }
      }
      
      bestScore = Math.max(bestScore, pathScore);
    }
    
    return bestScore || 40;
  }

  // ================================
  // INSIGHT GENERATION
  // ================================

  private static identifyAdvantages(
    scores: any,
    cityData: CityMarketData,
    studentContext: StudentContext
  ): string[] {
    const advantages: string[] = [];
    
    if (scores.languageAdvantage > 80) {
      const dominantLang = this.findDominantLanguage(cityData, studentContext);
      advantages.push(`${dominantLang} language advantage`);
    }
    
    if (scores.experienceMatch > 90) {
      advantages.push(`Perfect experience level match`);
    }
    
    if (scores.cityFit > 90) {
      advantages.push(`Preferred location`);
    }
    
    if (scores.visaCompatibility > 85) {
      advantages.push(`No visa complications`);
    }
    
    if (scores.careerPathMatch > 90) {
      advantages.push(`Perfect career path alignment`);
    }
    
    return advantages;
  }

  private static identifyChallenges(
    scores: any,
    cityData: CityMarketData,
    studentContext: StudentContext
  ): string[] {
    const challenges: string[] = [];
    
    if (scores.experienceMatch < 50) {
      challenges.push(`May require more experience`);
    }
    
    if (scores.visaCompatibility < 40) {
      challenges.push(`Visa complications possible`);
    }
    
    if (scores.languageAdvantage < 40) {
      challenges.push(`Local language would help`);
    }
    
    if (scores.careerPathMatch < 50) {
      challenges.push(`Role doesn't match career interests`);
    }
    
    const competitionRatio = cityData.ieStudentDemand / cityData.totalJobs;
    if (competitionRatio > 1.5) {
      challenges.push(`High competition in ${cityData.city}`);
    }
    
    return challenges;
  }

  private static generateExplanation(scores: any, cityData: CityMarketData): string {
    const topDimensions = Object.entries(scores)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 2)
      .map(([dim, score]) => `${dim}: ${score}pts`);
    
    return `Strong fit for ${cityData.city} market. Top factors: ${topDimensions.join(', ')}`;
  }

  // ================================
  // UTILITY FUNCTIONS
  // ================================

  private static groupJobsByCity(jobs: Job[]): Record<string, Job[]> {
    const grouped: Record<string, Job[]> = {};
    
    for (const job of jobs) {
      const city = this.extractCityFromLocation(job.location);
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(job);
    }
    
    return grouped;
  }

  private static extractCityFromLocation(location: string): string {
    const cleanLocation = location.toLowerCase();
    
    const cityMappings = [
      { keywords: ['paris'], city: 'Paris' },
      { keywords: ['london'], city: 'London' },
      { keywords: ['berlin'], city: 'Berlin' },
      { keywords: ['barcelona'], city: 'Barcelona' },
      { keywords: ['madrid'], city: 'Madrid' },
      { keywords: ['amsterdam'], city: 'Amsterdam' },
      { keywords: ['milan'], city: 'Milan' },
      { keywords: ['rome'], city: 'Rome' },
      { keywords: ['prague'], city: 'Prague' },
      { keywords: ['geneva'], city: 'Geneva' },
      { keywords: ['zurich'], city: 'Zurich' },
      { keywords: ['dublin'], city: 'Dublin' }
    ];

    for (const mapping of cityMappings) {
      if (mapping.keywords.some(keyword => cleanLocation.includes(keyword))) {
        return mapping.city;
      }
    }
    
    return location;
  }

  private static parseExperienceToMonths(experienceStr: string): number {
    if (!experienceStr) return 0;
    
    const exp = experienceStr.toLowerCase();
    if (exp.includes('0') || exp.includes('none')) return 0;
    if (exp.includes('6 months') || exp.includes('internship')) return 6;
    if (exp.includes('1 year')) return 12;
    if (exp.includes('2 years')) return 24;
    if (exp.includes('3 years')) return 36;
    
    return 0;
  }

  private static parseWorkPreference(workEnv: string): 'office' | 'hybrid' {
    if (!workEnv) return 'office';
    
    const env = workEnv.toLowerCase();
    if (env.includes('hybrid')) return 'hybrid';
    return 'office';
  }

  private static simplifyVisaStatus(visaStatus: string): 'EU' | 'Non-EU' | 'UK' | 'No-UK' {
    if (!visaStatus) return 'EU';
    
    const status = visaStatus.toLowerCase();
    if (status.includes('eu citizen')) return 'EU';
    if (status.includes('uk citizen') || status.includes('eligible to work in the uk only')) return 'UK';
    if (status.includes('non-eu')) return 'Non-EU';
    
    return 'EU';
  }

  private static parseCommaSeparated(str: string): string[] {
    return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  private static findDominantLanguage(cityData: CityMarketData, studentContext: StudentContext): string {
    let bestLang = 'English';
    let bestAdvantage = 1.0;
    
    for (const lang of studentContext.languages) {
      const advantage = cityData.languageAdvantages.get(lang) || 1.0;
      if (advantage > bestAdvantage) {
        bestAdvantage = advantage;
        bestLang = lang;
      }
    }
    
    return bestLang;
  }
}

// ================================
// ORIGINAL FUNCTIONS (UNCHANGED)
// ================================

// 1. Build AI Matching Prompt
export function buildMatchingPrompt(jobs: EnrichedJob[], userProfile: NormalizedUserProfile): string {
  const userContext = buildUserContext(userProfile);
  const jobsContext = buildJobsContext(jobs);

  return `You are an AI career advisor specializing in European graduate job matching for IE University students. Your goal is to identify the most relevant opportunities based on specific career preferences and visa constraints.

USER PROFILE:
${userContext}

AVAILABLE POSITIONS (${jobs.length} total):
${jobsContext}

MATCHING CRITERIA:
1. VISA REQUIREMENTS: Critical - match visa status to job requirements
2. ROLE ALIGNMENT: Match selected roles to job titles and responsibilities  
3. LOCATION FIT: Consider target countries and language requirements
4. EXPERIENCE LEVEL: Focus on entry-level and graduate-appropriate positions
5. WORK ENVIRONMENT: Match remote/hybrid/office preferences

TASK:
Analyze each position and select the TOP 5 matches. Be selective - only include genuinely relevant opportunities.

For each selected match, respond with this exact JSON structure:
{
  "job_index": [1-${jobs.length}],
  "match_score": [1-10 integer],
  "match_reason": "[Concise explanation focusing on why this role fits their specific situation]",
  "match_tags": ["key", "matching", "factors"]
}

SCORING GUIDELINES:
- 9-10: Perfect fit - meets all major criteria including visa/location needs
- 7-8: Strong match - aligns well with role preferences and constraints
- 5-6: Decent fit - some alignment but may have compromises
- 1-4: Poor fit - significant mismatches (don't include these)

IMPORTANT:
- Heavily prioritize visa compatibility for non-EU students
- Match specific roles selected by user
- Consider language barriers realistically
- Focus on entry-level positions suitable for recent graduates
- Respect work environment preferences

Return ONLY a valid JSON array of matches. No additional text.`;
}

// 2. Perform Enhanced AI Matching with Provenance Tracking
export async function performEnhancedAIMatching(
  jobs: Job[],
  userPrefs: UserPreferences,
  openai: OpenAI
): Promise<{ matches: MatchResult[]; provenance: AiProvenance }> {
  const startTime = Date.now();
  
  try {
    // Include user single career path, top 3 cities, and eligibility notes
    const userCareerPath = reqFirst(userPrefs.career_path);
    const topCities = (userPrefs.target_cities || []).slice(0, 3);
    const eligibilityNotes = userPrefs.entry_level_preference || 'entry-level';
    
    // Build enhanced prompt with robust matching instructions
    const prompt = buildRobustMatchingPrompt(jobs, userPrefs, userCareerPath, topCities, eligibilityNotes);
    
    // Use retry logic for AI calls
    const response = await callAIWithRetry(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
    });
    
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('AI returned empty response');
    }
    
    // Parse and validate AI response
    const aiMatches = parseAndValidateMatches(response.choices[0].message.content, jobs);
    
    // Convert to robust format
    const robustMatches = convertToRobustMatches(aiMatches, userPrefs, jobs);
    
    // Create provenance for successful AI matching
    const aiProvenance: AiProvenance = {
      match_algorithm: 'ai',
      ai_model: 'gpt-4',
      prompt_version: process.env.PROMPT_VERSION || 'v1',
      ai_latency_ms: Date.now() - startTime,
      ai_cost_usd: calculateOpenAICost(response.usage),
      cache_hit: false
    };
    
    // Log successful matching
    await logMatchSession(userPrefs.email, 'ai_success', robustMatches.length, {
      userCareerPath: userPrefs.career_path?.[0] || undefined,
      userProfessionalExpertise: userPrefs.professional_expertise || undefined,
      userWorkPreference: userPrefs.work_environment || undefined
    });
    
    return { matches: robustMatches, provenance: aiProvenance };
    
  } catch (error) {
    console.error('AI matching failed:', error);
    
    // Create fallback provenance
    const fallbackProvenance: AiProvenance = {
      match_algorithm: 'rules',
      fallback_reason: error instanceof Error ? error.message : 'unknown_error',
      ai_latency_ms: Date.now() - startTime,
      ai_cost_usd: 0
    };
    
    // Add proper monitoring
    await logMatchSession(userPrefs.email, 'ai_failed', 0, {
      errorType: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      fallbackUsed: true,
      userCareerPath: userPrefs.career_path?.[0] || undefined,
      userProfessionalExpertise: userPrefs.professional_expertise || undefined,
      userWorkPreference: userPrefs.work_environment || undefined
    });
    
    const fallbackMatches = generateRobustFallbackMatches(jobs, userPrefs);
    return { matches: fallbackMatches, provenance: fallbackProvenance };
  }
}

// 3. Parse and Validate AI Response
export function parseAndValidateMatches(response: string, jobs: Job[]): JobMatch[] {
  try {
    // Clean up response
    const cleanResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const matches = JSON.parse(cleanResponse);
    
    if (!Array.isArray(matches)) {
      throw new Error('Response is not an array');
    }
    
    // Validate and transform each match
    const validMatches = matches
      .filter(validateSingleMatch)
      .filter(match => match.job_index >= 1 && match.job_index <= jobs.length)
      .map(match => transformToJobMatch(match, jobs))
      .slice(0, 5); // Ensure max 5 matches
    
    return validMatches;
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    throw new Error(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// C7: Robust fallback matching
export function generateRobustFallbackMatches(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
  console.log('🔄 Using rule-based fallback matching');
  console.log(`🧠 Using legacy robust fallback for ${userPrefs.email}`);
  
  // Use the robust matching system
  const matches = performRobustMatching(jobs, userPrefs);
  
  // Categorize matches
  const { confident, promising } = categorizeMatches(matches);
  
  // C8: Acceptance checks - ensure minimum matches per user
  const tierQuota = 6; // Free tier quota
  let finalMatches = confident;
  
  // Backfill with promising matches if needed
  if (finalMatches.length < tierQuota && promising.length > 0) {
    const needed = tierQuota - finalMatches.length;
    const backfill = promising.slice(0, needed);
    finalMatches = [...finalMatches, ...backfill];
  }
  
  // Log confidence distribution
  const lowConfidenceCount = finalMatches.filter(m => m.confidence_score < 0.7).length;
  const lowConfidencePercentage = (lowConfidenceCount / finalMatches.length) * 100;
  
  if (lowConfidencePercentage > 40) {
    console.warn(`⚠️ High percentage of low confidence matches: ${lowConfidencePercentage.toFixed(1)}%`);
  }
  
  console.log(`✅ Generated ${finalMatches.length} robust fallback matches (${confident.length} confident, ${promising.length} promising)`);
  
  return finalMatches;
}

// Helper function to build robust matching prompt
function buildRobustMatchingPrompt(jobs: Job[], userPrefs: UserPreferences, careerPath: string, cities: string[], eligibility: string): string {
  const jobSummaries = jobs.slice(0, 20).map((job, index) => {
    const categories = normalizeToString(job.categories);
    const tags = cats(categories);
    const careerTag = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '') || 'unknown';
    const locationTag = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '') || 'unknown';
    const eligibilityTag = tags.includes('early-career') ? 'early-career' : tags.includes('eligibility:uncertain') ? 'uncertain' : 'other';
    
    return `${index + 1}. ${job.title} at ${job.company} (${careerTag}, ${locationTag}, ${eligibilityTag})`;
  }).join('\n');
  
  return `You are a job matching expert. Match jobs to user preferences with strict criteria.

USER PROFILE:
- Career Path: ${careerPath}
- Target Cities: ${cities.join(', ')}
- Eligibility: ${eligibility}
- Work Environment: ${userPrefs.work_environment || 'any'}

MATCHING CRITERIA (in order of importance):
1. ELIGIBILITY: Prefer early-career > uncertain > other
2. CAREER PATH: Exact match > related > unknown
3. LOCATION: Exact city > same country > EU-remote > unknown > non-EU

JOBS TO MATCH:
${jobSummaries}

INSTRUCTIONS:
- Return ONLY valid JSON array of matches
- Each match: { "job_index": number, "match_score": 0-100, "match_reason": "explanation", "match_quality": "excellent|good|fair|poor" }
- Prioritize eligibility > career > location
- Surface "promising (incomplete)" matches with clear notes
- Maximum 6 matches
- No additional text`;
}

// Helper function to convert AI matches to robust format
function convertToRobustMatches(aiMatches: JobMatch[], userPrefs: UserPreferences, originalJobs: Job[]): MatchResult[] {
  return aiMatches.map(aiMatch => {
    // Find the original job
    const job = originalJobs.find(j => j.job_hash === aiMatch.job_hash);
    if (!job) return null;
    
    // Calculate robust scores
    const scoreBreakdown = calculateMatchScore(job, userPrefs);
    const confidenceScore = calculateConfidenceScore(job, userPrefs);
    
    // Apply confidence adjustments
    scoreBreakdown.location = Math.round(scoreBreakdown.location * confidenceScore);
    scoreBreakdown.careerPath = Math.round(scoreBreakdown.careerPath * confidenceScore);
    scoreBreakdown.confidence = confidenceScore;
    
    // Recalculate overall score
    scoreBreakdown.overall = Math.round(
      (scoreBreakdown.eligibility * 0.35) +
      (scoreBreakdown.careerPath * 0.30) +
      (scoreBreakdown.location * 0.20) +
      (scoreBreakdown.freshness * 0.15)
    );
    
    // Generate explanation
    const explanation = generateMatchExplanation(job, scoreBreakdown, userPrefs);
    
    return {
      job,
      match_score: scoreBreakdown.overall,
      match_reason: explanation.reason,
      match_quality: aiMatch.match_quality,
      match_tags: explanation.tags,
      confidence_score: confidenceScore,
      scoreBreakdown
    };
  }).filter(Boolean) as MatchResult[];
}

// 5. Get Match Quality Label
export function getMatchQuality(score: number): string {
  if (score >= 9) return 'excellent';
  if (score >= 7) return 'good';
  if (score >= 5) return 'fair';
  return 'poor';
}

// 6. Log Match Session - Updated for JobPing Schema
export async function logMatchSession(
  userEmail: string,
  matchType: 'ai_success' | 'ai_failed' | 'fallback' | 'manual',
  matchesGenerated: number,
  additionalData?: {
    userCareerPath?: string;
    userProfessionalExpertise?: string;
    userWorkPreference?: string;
    matchJobId?: string;
    errorMessage?: string;
    blockSend?: boolean;
    blockProcessed?: boolean;
  }
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const logData = {
      user_email: userEmail,
      match_type: matchType,
      matches_generated: matchesGenerated,
      timestamp: new Date().toISOString(),
      user_career_path: additionalData?.userCareerPath || null,
      user_professional_expertise: additionalData?.userProfessionalExpertise || null,
      user_work_preference: additionalData?.userWorkPreference || null,
      match_job_id: additionalData?.matchJobId || null,
      error_message: additionalData?.errorMessage || null,
      block_send: additionalData?.blockSend || false,
      block_processed: additionalData?.blockProcessed || false
    };
    
    const { error } = await supabase.from('match_logs').insert(logData);
    
    if (error) {
      console.error('Failed to insert match log:', error);
      return;
    }
    
    // Enhanced console logging
    const emoji = matchType === 'ai_success' ? '✅' : matchType === 'fallback' ? '🔄' : matchType === 'manual' ? '👤' : '❌';
    const careerInfo = additionalData?.userCareerPath ? ` [${additionalData.userCareerPath}]` : '';
    const workInfo = additionalData?.userWorkPreference ? ` (${additionalData.userWorkPreference})` : '';
    
    console.log(`${emoji} Logged ${matchType} session for ${userEmail}${careerInfo}${workInfo}`);
    console.log(`   📊 Matches generated: ${matchesGenerated}`);
    
    if (additionalData?.errorMessage) {
      console.log(`   ⚠️  Error: ${additionalData.errorMessage}`);
    }
    
    if (additionalData?.blockSend) {
      console.log(`   🚫 Blocked from sending`);
    }
    
  } catch (error) {
    console.error('❌ Failed to log match session:', error);
  }
}

// 7. Normalize User Preferences
export function normalizeUserPreferences(userPrefs: UserPreferences): NormalizedUserProfile {
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
    start_date: toOptString(userPrefs.start_date),
    careerFocus: reqFirst(userPrefs.career_path, 'unknown')
  };
}

// 8. Enrich Job Data
export function enrichJobData(job: Job): EnrichedJob {
  const description = job.description?.toLowerCase() || '';
  const title = job.title?.toLowerCase() || '';
  
  return {
    ...job,
    visaFriendly: detectVisaFriendly(description, title),
    experienceLevel: determineExperienceLevel(description, title),
    workEnvironment: detectWorkEnvironment(description),
    languageRequirements: extractLanguageRequirements(Array.isArray(job.language_requirements) ? job.language_requirements.join(', ') : (job.language_requirements || '')),
    complexityScore: calculateComplexityScore(description, title)
  };
}

// ================================
// HELPER FUNCTIONS
// ================================

function buildUserContext(profile: NormalizedUserProfile): string {
  return `
Email: ${profile.email}
Target Roles: ${profile.roles_selected.join(', ') || 'Open to opportunities'}
Work Preference: ${profile.work_environment ?? 'no-preference'}
Languages: ${profile.languages_spoken.join(', ') || 'Not specified'}
Company Types: ${profile.company_types.join(', ') || 'Any'}
Availability: ${profile.start_date ?? 'flexible'}
Experience Level: ${profile.entry_level_preference ?? 'graduate'}
Career Focus: ${profile.careerFocus}

CONSTRAINTS:
- Experience: Entry-level to junior positions only
- Work Setup: ${profile.work_environment ?? 'any'}
`.trim();
}

function buildJobsContext(jobs: EnrichedJob[]): string {
  return jobs.map((job, idx) => `[${idx + 1}] ${job.title}
Company: ${job.company}
Location: ${job.location}
${job.visaFriendly ? '✓ VISA SPONSORSHIP AVAILABLE' : '✗ No visa sponsorship mentioned'}
${job.experienceLevel === 'entry' ? '✓ ENTRY LEVEL' : `⚠ ${job.experienceLevel.toUpperCase()} level`}
Work: ${job.workEnvironment}
Languages: ${job.languageRequirements.join(', ') || 'Not specified'}
Categories: ${job.categories}
Description: ${job.description.slice(0, 300)}${job.description.length > 300 ? '...' : ''}
---`).join('\n\n');
}

function validateSingleMatch(match: any): boolean {
  return (
    typeof match.job_index === 'number' &&
    typeof match.match_score === 'number' &&
    match.match_score >= 1 && match.match_score <= 10 &&
    typeof match.match_reason === 'string' &&
    match.match_reason.length > 0 &&
    Array.isArray(match.match_tags)
  );
}

function transformToJobMatch(match: any, jobs: Job[]): JobMatch {
  const job = jobs[match.job_index - 1];
  
  return {
    job_index: match.job_index,
    job_hash: job.job_hash,
    match_score: Math.min(10, Math.max(1, match.match_score)),
    match_reason: match.match_reason.slice(0, 500),
    match_quality: getMatchQuality(match.match_score),
    match_tags: match.match_tags.join(',')
  };
}

// Utility functions
function normalizeVisaStatus(status: string): 'eu-citizen' | 'non-eu-visa-required' | 'non-eu-no-visa' {
  if (!status) return 'eu-citizen';
  if (status.includes('non-eu-visa')) return 'non-eu-visa-required';
  if (status.includes('non-eu-no')) return 'non-eu-no-visa';
  return 'eu-citizen';
}

function normalizeWorkEnvironment(env: string): 'remote' | 'hybrid' | 'office' | 'no-preference' {
  if (!env) return 'no-preference';
  if (env.includes('remote')) return 'remote';
  if (env.includes('hybrid')) return 'hybrid';
  if (env.includes('office')) return 'office';
  return 'no-preference';
}

function parseCommaSeparated(str: string): string[] {
  return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function detectVisaFriendly(description: string, title: string): boolean {
  const combinedText = `${description} ${title}`.toLowerCase();
  
  // Comprehensive visa sponsorship indicators
  const visaIndicators = [
    // Direct sponsorship mentions
    'visa sponsorship', 'work permit', 'sponsorship available', 'work visa',
    'visa support', 'immigration support', 'relocation support',
    
    // International candidate mentions
    'international candidates', 'international applicants', 'global candidates',
    'worldwide candidates', 'candidates from any country',
    
    // Relocation and work authorization
    'relocation assistance', 'work authorization', 'employment authorization',
    'sponsor visa', 'visa assistance', 'immigration assistance',
    
    // Company policies
    'equal opportunity employer', 'diversity and inclusion', 'global workforce',
    'international team', 'remote worldwide', 'work from anywhere',
    
    // Specific visa types
    'h1b sponsorship', 'h-1b sponsorship', 'tier 2 sponsorship', 'blue card',
    'work permit sponsorship', 'employment visa', 'business visa'
  ];
  
  // Check for positive indicators
  const hasPositiveIndicators = visaIndicators.some(indicator => 
    combinedText.includes(indicator)
  );
  
  // Check for negative indicators (explicitly excludes international candidates)
  const negativeIndicators = [
    'us citizens only', 'eu citizens only', 'uk citizens only',
    'no visa sponsorship', 'no relocation', 'local candidates only',
    'must have work authorization', 'no international candidates'
  ];
  
  const hasNegativeIndicators = negativeIndicators.some(indicator => 
    combinedText.includes(indicator)
  );
  
  // Return true if positive indicators found and no negative indicators
  return hasPositiveIndicators && !hasNegativeIndicators;
}

function determineExperienceLevel(description: string, title: string): 'entry' | 'junior' | 'mid' | 'senior' {
  const text = `${description} ${title}`;
  
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) return 'senior';
  if (text.includes('mid') || text.includes('3-5 years') || text.includes('intermediate')) return 'mid';
  if (text.includes('junior') || text.includes('1-2 years')) return 'junior';
  if (text.includes('graduate') || text.includes('entry') || text.includes('trainee')) return 'entry';
  
  return 'entry'; // Default for students
}

function detectWorkEnvironment(description: string): 'remote' | 'hybrid' | 'office' | 'unclear' {
  if (description.includes('remote') || description.includes('work from home')) return 'remote';
  if (description.includes('hybrid')) return 'hybrid';
  if (description.includes('office') || description.includes('on-site')) return 'office';
  return 'unclear';
}

function extractLanguageRequirements(langStr: string): string[] {
  if (!langStr) return [];
  
  const languages = langStr.toLowerCase().split(',').map(s => s.trim());
  const common = ['english', 'spanish', 'german', 'french', 'dutch', 'italian'];
  
  return languages.filter(lang => 
    common.some(commonLang => lang.includes(commonLang))
  );
}

function calculateComplexityScore(description: string, title: string): number {
  const complexityWords = [
    'senior', 'lead', 'architect', 'principal', 'expert', 
    'advanced', 'complex', 'strategic', 'leadership'
  ];
  
  const text = `${description} ${title}`.toLowerCase();
  const matches = complexityWords.filter(word => text.includes(word)).length;
  
  return Math.min(10, matches * 2);
}

/**
 * Calculate freshness tier based on posting date
 */
export function calculateFreshnessTier(postedAt: string): FreshnessTier {
  const postedDate = new Date(postedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff < 24) return FreshnessTier.ULTRA_FRESH;
  if (hoursDiff < 72) return FreshnessTier.FRESH; // 3 days
  return FreshnessTier.COMPREHENSIVE;
}

/**
 * Extract posting date from various job site formats
 */
export function extractPostingDate(
  html: string, 
  source: string, 
  url: string
): DateExtractionResult {
  const now = new Date();
  
  try {
    // Common date patterns
    const datePatterns = [
      // ISO dates
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/g,
      // Relative dates
      /(\d+)\s+(day|days|hour|hours|minute|minutes|week|weeks|month|months)\s+ago/gi,
      // Standard dates
      /(\w+\s+\d{1,2},?\s+\d{4})/g,
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{1,2}-\d{1,2}-\d{4})/g,
      // Meta tags
      /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/gi,
      /<meta[^>]*name="date"[^>]*content="([^"]+)"/gi,
    ];

    for (const pattern of datePatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0];
        
        // Handle relative dates
        if (match.toLowerCase().includes('ago')) {
          const relativeMatch = match.match(/(\d+)\s+(day|days|hour|hours|minute|minutes|week|weeks|month|months)\s+ago/i);
          if (relativeMatch) {
            const [, amount, unit] = relativeMatch;
            const num = parseInt(amount);
            const date = new Date();
            
            switch (unit.toLowerCase()) {
              case 'hour':
              case 'hours':
                date.setHours(date.getHours() - num);
                break;
              case 'day':
              case 'days':
                date.setDate(date.getDate() - num);
                break;
              case 'week':
              case 'weeks':
                date.setDate(date.getDate() - (num * 7));
                break;
              case 'month':
              case 'months':
                date.setMonth(date.getMonth() - num);
                break;
            }
            
            return {
              success: true,
              date: date.toISOString(),
              confidence: 'medium',
              source: 'relative_date'
            };
          }
        }
        
        // Handle ISO dates
        if (match.includes('T') && match.includes('-')) {
          const date = new Date(match);
          if (!isNaN(date.getTime())) {
            return {
              success: true,
              date: date.toISOString(),
              confidence: 'high',
              source: 'iso_date'
            };
          }
        }
        
        // Handle standard dates
        const date = new Date(match);
        if (!isNaN(date.getTime())) {
          return {
            success: true,
            date: date.toISOString(),
            confidence: 'medium',
            source: 'standard_date'
          };
        }
      }
    }

    // Platform-specific extraction
    switch (source.toLowerCase()) {
      case 'greenhouse':
        return extractGreenhouseDate(html);
      case 'lever':
        return extractLeverDate(html);
      case 'workday':
        return extractWorkdayDate(html);
      case 'remoteok':
        return extractRemoteOKDate(html);
    }

    return {
      success: false,
      confidence: 'low',
      source: 'none'
    };
  } catch (error) {
    return {
      success: false,
      confidence: 'low',
      source: 'error'
    };
  }
}

/**
 * Platform-specific date extraction functions
 */
function extractGreenhouseDate(html: string): DateExtractionResult {
  // Greenhouse often has posting dates in meta tags or structured data
  const patterns = [
    /"posted_at":"([^"]+)"/g,
    /<time[^>]*datetime="([^"]+)"/gi,
    /posted\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return {
          success: true,
          date: date.toISOString(),
          confidence: 'high',
          source: 'greenhouse_structured'
        };
      }
    }
  }
  
  return { success: false, confidence: 'low', source: 'greenhouse' };
}

function extractLeverDate(html: string): DateExtractionResult {
  // Lever often has posting dates in JSON-LD or meta tags
  const patterns = [
    /"datePosted":"([^"]+)"/g,
    /<meta[^>]*name="date"[^>]*content="([^"]+)"/gi
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return {
          success: true,
          date: date.toISOString(),
          confidence: 'high',
          source: 'lever_structured'
        };
      }
    }
  }
  
  return { success: false, confidence: 'low', source: 'lever' };
}

function extractWorkdayDate(html: string): DateExtractionResult {
  // Workday often has dates in JSON responses or meta tags
  const patterns = [
    /"postingDate":"([^"]+)"/g,
    /"createdDate":"([^"]+)"/g
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return {
          success: true,
          date: date.toISOString(),
          confidence: 'high',
          source: 'workday_structured'
        };
      }
    }
  }
  
  return { success: false, confidence: 'low', source: 'workday' };
}

function extractRemoteOKDate(html: string): DateExtractionResult {
  // RemoteOK often shows relative dates like "2 days ago"
  const patterns = [
    /(\d+)\s+(day|days|hour|hours)\s+ago/gi,
    /posted\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('ago')) {
        const relativeMatch = match[0].match(/(\d+)\s+(day|days|hour|hours)\s+ago/i);
        if (relativeMatch) {
          const [, amount, unit] = relativeMatch;
          const num = parseInt(amount);
          const date = new Date();
          
          if (unit.toLowerCase().includes('hour')) {
            date.setHours(date.getHours() - num);
          } else {
            date.setDate(date.getDate() - num);
          }
          
          return {
            success: true,
            date: date.toISOString(),
            confidence: 'medium',
            source: 'remoteok_relative'
          };
        }
      } else {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return {
            success: true,
            date: date.toISOString(),
            confidence: 'medium',
            source: 'remoteok_absolute'
          };
        }
      }
    }
  }
  
  return { success: false, confidence: 'low', source: 'remoteok' };
}

/**
 * Atomic upsert jobs with unique constraint on job_hash
 */
export async function atomicUpsertJobs(jobs: Job[]): Promise<JobUpsertResult> {
  const supabase = getSupabaseClient();
  const result: JobUpsertResult = {
    success: false,
    inserted: 0,
    updated: 0,
    errors: [],
    jobs: []
  };

  if (jobs.length === 0) {
    result.success = true;
    return result;
  }

  try {
    // Prepare jobs with calculated fields  
    const preparedJobs = jobs.map(job => {
      // Ensure all required fields are present
      const preparedJob = {
        ...job,
        freshness_tier: calculateFreshnessTier(job.posted_at),
        scrape_timestamp: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        // Ensure job_hash is present
        job_hash: job.job_hash || crypto.createHash('md5').update(`${job.title}-${job.company}-${job.job_url}`).digest('hex')
      };

      // Remove undefined fields and fields that don't exist in DB schema
      Object.keys(preparedJob).forEach(key => {
        if (preparedJob[key as keyof typeof preparedJob] === undefined || key === 'updated_at') {
          delete preparedJob[key as keyof typeof preparedJob];
        }
      });

      // PHASE 1: Centralized write normalization (single choke-point)
      
      // 1. Normalize categories to string first
      let categoriesString: string;
      if (Array.isArray(preparedJob.categories)) {
        categoriesString = preparedJob.categories.filter(Boolean).join('|');
      } else if (typeof preparedJob.categories === 'object' && preparedJob.categories !== null) {
        // Flatten object values to array
        const values = Object.values(preparedJob.categories).filter(Boolean);
        categoriesString = values.join('|');
      } else if (typeof preparedJob.categories === 'string') {
        // Keep as string
        categoriesString = preparedJob.categories;
      } else {
        // Safe default for empty/undefined
        categoriesString = 'career:unknown|early-career|loc:unknown';
      }
      
      // 2. Clean up categories string
      categoriesString = categoriesString
        .trim()
        .replace(/\|\s*\|\s*/g, '|') // Remove duplicate pipes
        .replace(/\|\s*$/g, '') // Remove trailing pipe
        .replace(/^\|\s*/g, '') // Remove leading pipe
        .replace(/career:([^|]+)/gi, (match, slug) => `career:${slug.toLowerCase()}`); // Lowercase career slugs
      
      // 3. Ensure exactly one career tag
      const tags = categoriesString.split('|');
      const careerTags = tags.filter(tag => tag.startsWith('career:'));
      if (careerTags.length === 0) {
        tags.push('career:unknown');
      } else if (careerTags.length > 1) {
        // Keep only the first career tag
        const firstCareerTag = careerTags[0];
        const nonCareerTags = tags.filter(tag => !tag.startsWith('career:'));
        categoriesString = [firstCareerTag, ...nonCareerTags].join('|');
      }
      
      // 4. Convert to PostgreSQL array format for database
      const finalTags = cats(categoriesString).filter(tag => tag.trim().length > 0);
      preparedJob.categories = finalTags;
      
      // 3. Normalize URL before hashing
      if (preparedJob.job_url) {
        // const { createJobUrl } = require('./robustJobCreation');
        // const urlResult = createJobUrl(preparedJob.job_url, preparedJob.company_profile_url || '', preparedJob.title || '');
        // preparedJob.job_url = urlResult.url;
      }
      
      // 4. Validate required fields
      if (!preparedJob.title || !preparedJob.company || !preparedJob.job_url) {
        console.warn(`⚠️ Skipping job with missing required fields: title="${preparedJob.title}", company="${preparedJob.company}", url="${preparedJob.job_url}"`);
        return null;
      }
      
      // 5. Remove undefined optionals to prevent DB errors
      Object.keys(preparedJob).forEach(key => {
        if (idx(preparedJob)[key] === undefined) {
          delete idx(preparedJob)[key];
        }
      });

      return preparedJob;
    }).filter(job => job !== null);

    // Perform atomic upsert with proper conflict resolution
    const { data, error } = await supabase
      .from('jobs')
      .upsert(preparedJobs, {
        onConflict: 'jobs_job_hash_unique', // Use the constraint name from migration
        ignoreDuplicates: false
      });

    if (error) {
      // If the constraint doesn't exist yet, try with column name
      if (error.message.includes('constraint') || error.message.includes('conflict') || 
          error.message.includes('does not exist') || error.message.includes('jobs_job_hash_unique')) {
        console.warn('⚠️ Constraint not found, trying with column name...');
        const { data: retryData, error: retryError } = await supabase
          .from('jobs')
          .upsert(preparedJobs, {
            onConflict: 'job_hash', // Fallback to column name
            ignoreDuplicates: false
          });

        if (retryError) {
          result.errors.push(`Upsert failed (retry): ${retryError.message}`);
          console.error('❌ Atomic upsert retry error:', retryError);
          return result;
        }
      } else {
        result.errors.push(`Upsert failed: ${error.message}`);
        console.error('❌ Atomic upsert error:', error);
        return result;
      }
    }

    // Since Supabase doesn't return detailed counts, we'll estimate based on the operation
    // For new scrapes, most jobs are likely inserts, but we'll use a conservative estimate
    result.inserted = Math.floor(preparedJobs.length * 0.8); // Assume 80% are inserts
    result.updated = preparedJobs.length - result.inserted;
    result.success = true;
    result.jobs = preparedJobs;

    console.log(`✅ Atomic upsert completed: ${preparedJobs.length} jobs processed (${result.inserted} estimated inserted, ${result.updated} estimated updated)`);
    return result;

  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    console.error('❌ Atomic upsert failed:', error);
    return result;
  }
}

/**
 * Batch upsert with error handling and retries
 */
export async function batchUpsertJobs(jobs: Job[], batchSize = 100): Promise<JobUpsertResult> {
  const result: JobUpsertResult = {
    success: true,
    inserted: 0,
    updated: 0,
    errors: [],
    jobs: []
  };

  // Process in batches
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    
    try {
      const batchResult = await atomicUpsertJobs(batch);
      
      result.inserted += batchResult.inserted;
      result.updated += batchResult.updated;
      result.errors.push(...batchResult.errors);
      result.jobs.push(...batchResult.jobs);
      
      if (!batchResult.success) {
        result.success = false;
      }
      
      // Small delay between batches
      if (i + batchSize < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      result.errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
      result.success = false;
    }
  }

  return result;
}

// ================================
// EXTRACTION UTILITY FUNCTIONS
// ================================

/**
 * Extract professional expertise from job title and description
 * @param jobTitle - The job title
 * @param description - The job description
 * @returns Professional expertise category
 */
export function extractProfessionalExpertise(jobTitle: string, description: string): string {
  const combinedText = `${jobTitle} ${description}`.toLowerCase();
  
  // Expertise categories with complete keyword arrays
  const expertiseCategories = {
    'Frontend Development': {
      keywords: [
        // Framework keywords
        'react', 'vue', 'angular', 'svelte', 'ember', 'backbone', 'jquery',
        // Language keywords
        'javascript', 'typescript', 'html5', 'css3', 'scss', 'sass', 'less', 'stylus',
        // Build tools
        'webpack', 'vite', 'rollup', 'parcel', 'gulp', 'grunt', 'babel',
        // State management
        'redux', 'vuex', 'mobx', 'recoil', 'zustand',
        // UI libraries
        'material-ui', 'ant-design', 'bootstrap', 'tailwind', 'chakra-ui',
        // Testing
        'jest', 'cypress', 'selenium', 'playwright', 'testing-library'
      ]
    },
    'Backend Development': {
      keywords: [
        // Server technologies
        'node.js', 'express', 'fastify', 'koa', 'hapi', 'nestjs',
        // Languages
        'python', 'java', 'php', 'ruby', 'go', 'rust', 'c#', 'scala', 'kotlin',
        // Frameworks
        'django', 'flask', 'spring', 'laravel', 'symfony', 'rails', 'gin', 'actix',
        // Databases
        'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
        // API technologies
        'rest', 'graphql', 'grpc', 'soap', 'microservices'
      ]
    },
    'Full Stack Development': {
      keywords: [
        // Stack names
        'mern', 'mean', 'lamp', 'django-react', 'rails-react', 'vue-laravel',
        // Full stack indicators
        'full-stack', 'fullstack', 'end-to-end', 'complete solution'
      ]
    },
    'DevOps Engineering': {
      keywords: [
        // Container tech
        'docker', 'kubernetes', 'podman', 'containerd', 'docker-compose',
        // Cloud platforms
        'aws', 'azure', 'gcp', 'digitalocean', 'heroku', 'vercel', 'netlify',
        // Infrastructure
        'terraform', 'ansible', 'puppet', 'chef', 'cloudformation',
        // CI/CD
        'jenkins', 'github-actions', 'gitlab-ci', 'circleci', 'travis-ci', 'azure-devops',
        // Monitoring
        'prometheus', 'grafana', 'elk-stack', 'datadog', 'new-relic', 'splunk'
      ]
    },
    'Data Science': {
      keywords: [
        // Languages
        'python', 'r', 'sql', 'scala', 'julia',
        // Libraries
        'pandas', 'numpy', 'scipy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras',
        // Tools
        'jupyter', 'anaconda', 'spark', 'hadoop', 'airflow', 'mlflow',
        // Roles
        'data-scientist', 'machine-learning', 'ai', 'artificial-intelligence', 'data-analyst'
      ]
    },
    'Mobile Development': {
      keywords: [
        // Native
        'ios', 'android', 'swift', 'kotlin', 'objective-c', 'java-android',
        // Cross-platform
        'react-native', 'flutter', 'xamarin', 'ionic', 'cordova', 'phonegap',
        // Mobile indicators
        'mobile-app', 'mobile-development', 'app-development'
      ]
    },
    'Quality Assurance': {
      keywords: [
        // Testing types
        'automation', 'manual-testing', 'unit-testing', 'integration-testing',
        // Tools
        'selenium', 'cypress', 'jest', 'mocha', 'jasmine', 'pytest', 'junit',
        // Methodologies
        'tdd', 'bdd', 'agile-testing', 'performance-testing', 'security-testing'
      ]
    }
  };

  // Scoring algorithm
  let maxScore = 0;
  let bestCategory = 'General Software Development';

  for (const [category, config] of Object.entries(expertiseCategories)) {
    let score = 0;
    
    for (const keyword of config.keywords) {
      // Check title matches (weighted 2x higher)
      const titleMatches = (jobTitle.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      score += titleMatches * 2;
      
      // Check description matches
      const descMatches = (description.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      score += descMatches;
    }
    
    if (score > maxScore && score >= 2) { // Minimum threshold of 2 matches
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Extract career path from job title and description
 * @param jobTitle - The job title
 * @param description - The job description
 * @returns Career path category
 */
export function extractCareerPath(jobTitle: string, description: string): string {
  // Import the normalization function to ensure we return canonical slugs
  const { normalizeCareerPath } = require('../scrapers/types');
  const combinedText = `${jobTitle} ${description}`.toLowerCase();
  
  // Canonical career path categories with comprehensive keyword arrays
  const careerPaths = {
    'strategy': {
      keywords: [
        'strategy', 'strategic', 'business strategy', 'strategy analyst', 'strategy consultant',
        'business development', 'management consulting', 'advisory', 'business transformation',
        'change management', 'process improvement', 'operational excellence', 'business design'
      ]
    },
    'data-analytics': {
      keywords: [
        'data analyst', 'data analytics', 'analytics', 'business intelligence', 'bi analyst',
        'data science', 'machine learning', 'ml', 'artificial intelligence', 'ai', 'statistics',
        'data visualization', 'reporting', 'kpi', 'metrics', 'data mining', 'predictive analytics'
      ]
    },
    'retail-luxury': {
      keywords: [
        'retail', 'luxury', 'fashion', 'retail analyst', 'luxury brand', 'fashion retail',
        'merchandising', 'buying', 'visual merchandising', 'store operations', 'retail operations',
        'customer experience', 'brand management', 'retail marketing', 'e-commerce'
      ]
    },
    'sales': {
      keywords: [
        'sales', 'sales representative', 'account executive', 'business development',
        'client success', 'customer success', 'account manager', 'sales development',
        'inside sales', 'outside sales', 'sales analyst', 'revenue', 'business development representative'
      ]
    },
    'marketing': {
      keywords: [
        'marketing', 'brand', 'digital marketing', 'social media', 'content', 'advertising',
        'brand manager', 'marketing analyst', 'digital marketing specialist', 'social media manager',
        'content creator', 'marketing coordinator', 'brand ambassador', 'marketing assistant',
        'campaign', 'seo', 'sem', 'ppc', 'email marketing', 'growth marketing', 'product marketing'
      ]
    },
    'finance': {
      keywords: [
        'finance', 'financial', 'investment', 'banking', 'accounting', 'audit', 'treasury',
        'financial analyst', 'investment analyst', 'credit analyst', 'risk analyst', 'financial planning',
        'corporate finance', 'investment banking', 'private equity', 'venture capital', 'asset management',
        'financial modeling', 'budgeting', 'financial reporting', 'compliance', 'regulatory'
      ]
    },
    'operations': {
      keywords: [
        'operations', 'supply chain', 'logistics', 'procurement', 'manufacturing', 'production',
        'operations analyst', 'supply chain analyst', 'logistics coordinator', 'procurement specialist',
        'operations manager', 'process improvement', 'quality assurance', 'inventory management',
        'warehouse', 'distribution', 'sourcing', 'vendor management', 'operational excellence'
      ]
    },
    'product': {
      keywords: [
        'product', 'product manager', 'product analyst', 'product owner', 'product development',
        'product strategy', 'product marketing', 'product design', 'user experience', 'ux',
        'user interface', 'ui', 'product innovation', 'feature development', 'product roadmap'
      ]
    },
    'tech': {
      keywords: [
        'software', 'developer', 'engineer', 'programming', 'coding', 'technology', 'tech',
        'frontend', 'backend', 'full stack', 'devops', 'cloud', 'cybersecurity', 'technical',
        'engineering', 'software engineer', 'data engineer', 'systems engineer', 'infrastructure'
      ]
    },
    'sustainability': {
      keywords: [
        'sustainability', 'esg', 'environmental', 'social responsibility', 'corporate responsibility',
        'green', 'climate', 'renewable energy', 'carbon', 'environmental analyst', 'sustainability analyst',
        'esg analyst', 'environmental social governance', 'sustainable development'
      ]
    },
    'entrepreneurship': {
      keywords: [
        'startup', 'entrepreneur', 'founder', 'co-founder', 'entrepreneurial', 'innovation',
        'business strategy', 'market research', 'venture', 'startup analyst', 'innovation analyst'
      ]
    }
  };

  // Scoring algorithm
  let maxScore = 0;
  let bestCareerPath = 'unknown';

  for (const [careerPath, config] of Object.entries(careerPaths)) {
    let score = 0;
    
    for (const keyword of config.keywords) {
      // Check title matches (weighted 2x higher)
      const titleMatches = (jobTitle.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      score += titleMatches * 2;
      
      // Check description matches
      const descMatches = (description.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      score += descMatches;
    }
    
    if (score > maxScore && score >= 2) { // Minimum threshold of 2 matches
      maxScore = score;
      bestCareerPath = careerPath;
    }
  }

  // Normalize the result to ensure it's a canonical slug
  const normalizedResult = normalizeCareerPath(bestCareerPath);
  return normalizedResult[0]; // Return the single career path
}

/**
 * Extract start date from job description
 * @param description - The job description
 * @returns Start date in "YYYY-MM-DD" format, "Immediate", or "TBD"
 */
export function extractStartDate(description: string): string {
  if (!description || typeof description !== 'string') {
    return 'TBD';
  }
  
  const text = description.toLowerCase();
  
  // Immediate start phrases
  const immediatePhrases = [
    'immediate start', 'asap', 'as soon as possible', 'start immediately',
    'urgent', 'immediate hire', 'start now', 'available immediately',
    'join immediately', 'begin right away', 'start right away', 'immediate availability',
    'can start immediately', 'available to start immediately', 'ready to start'
  ];
  
  for (const phrase of immediatePhrases) {
    if (text.includes(phrase)) {
      return 'Immediate';
    }
  }
  
  // Specific date patterns
  const datePatterns = [
    // Month-year format
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
    // Month day, year format
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,
    // DD/MM/YYYY or MM/DD/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    // YYYY-MM-DD
    /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    // DD-MM-YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/g
  ];
  
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      try {
        const date = new Date(matches[0]);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        // Continue to next pattern
      }
    }
  }
  
  // Relative date patterns
  const relativePatterns = [
    // "in X weeks/months"
    /in\s+(\d+)\s+(week|weeks|month|months)\s*from\s+now/gi,
    /(\d+)\s+(week|weeks|month|months)\s+from\s+now/gi,
    // "starting in X weeks/months"
    /starting\s+in\s+(\d+)\s+(week|weeks|month|months)/gi,
    // "available in X weeks/months"
    /available\s+in\s+(\d+)\s+(week|weeks|month|months)/gi
  ];
  
  for (const pattern of relativePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const match = matches[0];
      const numberMatch = match.match(/(\d+)/);
      const unitMatch = match.match(/(week|weeks|month|months)/i);
      
      if (numberMatch && unitMatch) {
        const number = parseInt(numberMatch[1]);
        const unit = unitMatch[1].toLowerCase();
        const date = new Date();
        
        if (unit.includes('week')) {
          date.setDate(date.getDate() + (number * 7));
        } else if (unit.includes('month')) {
          date.setMonth(date.getMonth() + number);
        }
        
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Season-based patterns
  const seasonPatterns = [
    { 
      pattern: /(spring|summer|fall|autumn|winter)\s+(\d{4})/gi, 
      seasonMonths: { spring: 3, summer: 6, fall: 9, autumn: 9, winter: 12 } as Record<string, number>
    },
    { 
      pattern: /(q1|q2|q3|q4)\s+(\d{4})/gi, 
      quarterMonths: { q1: 1, q2: 4, q3: 7, q4: 10 } as Record<string, number>
    }
  ];
  
  for (const { pattern, seasonMonths, quarterMonths } of seasonPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const match = matches[0];
      const yearMatch = match.match(/(\d{4})/);
      const seasonMatch = match.match(/(spring|summer|fall|autumn|winter|q1|q2|q3|q4)/i);
      
      if (yearMatch && seasonMatch) {
        const year = parseInt(yearMatch[1]);
        const season = seasonMatch[1].toLowerCase();
        let month = 1;
        
        if (seasonMonths && seasonMonths[season]) {
          month = seasonMonths[season];
        } else if (quarterMonths && quarterMonths[season]) {
          month = quarterMonths[season];
        }
        
        const date = new Date(year, month - 1, 1);
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Check for "flexible" or "negotiable" start dates
  const flexiblePhrases = [
    'flexible start date', 'negotiable start date', 'start date flexible',
    'flexible timing', 'negotiable timing', 'flexible availability'
  ];
  
  for (const phrase of flexiblePhrases) {
    if (text.includes(phrase)) {
      return 'Flexible';
    }
  }
  
  return 'TBD';
}

// Test/Performance mode detection
export const isTestOrPerfMode = () =>
  process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

// Enhanced timeout utility with retry logic
export function timeout<T>(ms: number, label='timeout'): Promise<T> {
  return new Promise((_r, rej) => setTimeout(() => rej(new Error(label)), ms));
}

// OpenAI cost calculation - CRITICAL for budget monitoring
function calculateOpenAICost(usage: any): number {
  if (!usage) return 0;
  
  // GPT-4 pricing (as of 2024)
  const PRICING = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 }
  };
  
  const model = usage.model || 'gpt-4';
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  
  return inputCost + outputCost;
}

// AI call with retry logic
async function callAIWithRetry<T>(
  aiCall: () => Promise<T>,
  maxRetries: number = AI_MAX_RETRIES,
  delayMs: number = AI_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        aiCall(),
        timeout<T>(AI_TIMEOUT_MS, 'AI_TIMEOUT')
      ]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        console.error(`❌ AI call failed after ${maxRetries} attempts:`, lastError.message);
        throw lastError;
      }
      
      console.warn(`⚠️ AI call attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError!;
}