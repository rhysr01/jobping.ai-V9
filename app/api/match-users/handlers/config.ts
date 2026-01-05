/**
 * Configuration Domain - Environment flags, limits, and constants
 */

export const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;

export const MATCH_SLO_MS = 2000; // SLO: match-users endpoint should respond in <2s
export const SCHEMA_VALIDATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const IS_TEST = process.env.NODE_ENV === "test";
export const IS_DEBUG = process.env.DEBUG_MATCHING === "true" || IS_TEST;
export const SEMANTIC_RETRIEVAL_ENABLED =
  process.env.ENABLE_SEMANTIC_RETRIEVAL === "true";

export const USER_LIMIT = IS_TEST ? 3 : 50; // Keep test limit for safety

export const LOCK_KEY = (rid: string) =>
  `${IS_TEST ? "jobping:test" : "jobping:prod"}:lock:match-users:${rid}`;
