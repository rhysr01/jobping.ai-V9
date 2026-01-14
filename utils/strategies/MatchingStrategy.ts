/**
 * Strategy Pattern Interface for Matching Algorithms
 *
 * Provides a common interface for all matching strategies with factory pattern
 * for creating appropriate strategies based on user tier.
 */

import type { JobWithMetadata } from "../../lib/types/job";

export interface UserPreferences {
	email: string;
	subscription_tier: "free" | "premium_pending";
}

export interface MatchingResult {
	matches: JobWithMetadata[];
	matchCount: number;
	method: string;
	duration: number;
	confidence?: "high" | "medium" | "low";
	fallbackUsed?: boolean;
}

/**
 * Abstract base strategy class defining the interface
 */
export abstract class MatchingStrategy {
	protected abstract readonly strategyName: string;

	abstract execute(
		userPrefs: UserPreferences,
		jobs: JobWithMetadata[],
	): Promise<MatchingResult>;

	protected createResult(
		matches: JobWithMetadata[],
		method: string,
		duration: number,
		confidence?: "high" | "medium" | "low",
		fallbackUsed?: boolean,
	): MatchingResult {
		return {
			matches,
			matchCount: matches.length,
			method: `${this.strategyName}:${method}`,
			duration,
			confidence,
			fallbackUsed,
		};
	}
}

/**
 * Factory for creating matching strategies based on user tier
 */
export class MatchingStrategyFactory {
	static createStrategy(tier: "free" | "premium_pending"): MatchingStrategy {
		switch (tier) {
			case "free":
				return new FreeMatchingStrategy();
			case "premium_pending":
				return new PremiumMatchingStrategy();
			default:
				throw new Error(`Unknown subscription tier: ${tier}`);
		}
	}
}

/**
 * Free tier matching strategy
 */
export class FreeMatchingStrategy extends MatchingStrategy {
	protected readonly strategyName = "free";

	async execute(
		userPrefs: UserPreferences,
		jobs: JobWithMetadata[],
	): Promise<MatchingResult> {
		const startTime = Date.now();

		// Free tier logic - simple filtering and ranking
		const matches = await this.performFreeMatching(userPrefs, jobs);
		const duration = Date.now() - startTime;

		return this.createResult(matches, "basic-filter", duration, "medium");
	}

	private async performFreeMatching(
		_userPrefs: UserPreferences,
		jobs: JobWithMetadata[],
	): Promise<JobWithMetadata[]> {
		// Implementation would go here - simplified for demo
		return jobs.slice(0, 5);
	}
}

/**
 * Premium tier matching strategy
 */
export class PremiumMatchingStrategy extends MatchingStrategy {
	protected readonly strategyName = "premium";

	async execute(
		userPrefs: UserPreferences,
		jobs: JobWithMetadata[],
	): Promise<MatchingResult> {
		const startTime = Date.now();

		// Premium tier logic - comprehensive filtering and AI ranking
		const matches = await this.performPremiumMatching(userPrefs, jobs);
		const duration = Date.now() - startTime;

		return this.createResult(matches, "ai-enhanced", duration, "high");
	}

	private async performPremiumMatching(
		_userPrefs: UserPreferences,
		jobs: JobWithMetadata[],
	): Promise<JobWithMetadata[]> {
		// Implementation would go here - comprehensive matching
		return jobs.slice(0, 15);
	}
}
