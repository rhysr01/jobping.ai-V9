/**
 * CONSOLIDATED MATCHING SYSTEM v2.1
 * Refactored into functional domains for better maintainability
 *
 * This file re-exports from the refactored modules for backward compatibility.
 * All matching logic has been split into:
 * - scoring.ts: Tier-aware scoring with weights, seniority, bonuses
 * - prompts.ts: GPT-4o-mini system/user instructions and AI API calls
 * - validation.ts: AI output validation logic
 * - engine.ts: Orchestrator that coordinates all functional domains
 *
 * BUILD_HASH: cb4f9a2e
 * REFACTORED: December 2025
 */

// Re-export for backward compatibility
export { LRUMatchCache } from "./matching/consolidated/cache";
export { CircuitBreaker } from "./matching/consolidated/circuitBreaker";
// Re-export everything from the refactored engine
export {
  BUILD_TIMESTAMP,
  BUILD_VERSION,
  ConsolidatedMatchingEngine,
  createConsolidatedMatcher,
} from "./matching/consolidated/engine";
// Re-export types
export type { ConsolidatedMatchResult } from "./matching/consolidated/types";
