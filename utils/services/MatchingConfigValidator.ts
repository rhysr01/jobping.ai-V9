/**
 * Configuration Validator for Matching Strategies
 *
 * Validates all configuration parameters and user preferences per tier
 * Ensures data integrity and prevents runtime errors
 */

import { apiLogger } from "../../lib/api-logger";

export type SubscriptionTier = "free" | "premium_pending";

export interface MatchingConfig {
  tier: SubscriptionTier;
  maxMatches: number;
  jobFreshnessDays: number;
  useAI: boolean;
  maxJobsForAI: number;
  fallbackThreshold: number;
  includePrefilterScore: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UserPreferencesValidation {
  email: string;
  target_cities: string[];
  subscription_tier: SubscriptionTier;
  // Free tier specific
  career_path?: string | null;
  // Premium tier specific
  languages_spoken?: string[];
  roles_selected?: string[];
  skills?: string[];
  industries?: string[];
}

/**
 * Validates matching configuration parameters
 */
export class MatchingConfigValidator {
  private static readonly CONFIG_CONSTRAINTS = {
    maxMatches: { min: 1, max: 50 },
    jobFreshnessDays: { min: 1, max: 365 },
    maxJobsForAI: { min: 5, max: 100 },
    fallbackThreshold: { min: 0.1, max: 1.0 }
  };

  /**
   * Validates a complete matching configuration
   */
  static validateConfig(config: MatchingConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tier
    if (!["free", "premium_pending"].includes(config.tier)) {
      errors.push(`Invalid tier: ${config.tier}`);
    }

    // Validate max matches based on tier
    const { min, max } = this.CONFIG_CONSTRAINTS.maxMatches;
    if (config.maxMatches < min || config.maxMatches > max) {
      errors.push(`maxMatches must be between ${min} and ${max}`);
    }

    // Tier-specific validation
    if (config.tier === "free" && config.maxMatches > 5) {
      errors.push("Free tier cannot have more than 5 matches");
    }
    if (config.tier === "premium_pending" && config.maxMatches < 10) {
      warnings.push("Premium tier typically has 10+ matches");
    }

    // Validate job freshness
    const freshnessConstraints = this.CONFIG_CONSTRAINTS.jobFreshnessDays;
    if (config.jobFreshnessDays < freshnessConstraints.min ||
        config.jobFreshnessDays > freshnessConstraints.max) {
      errors.push(`jobFreshnessDays must be between ${freshnessConstraints.min} and ${freshnessConstraints.max}`);
    }

    // Tier-specific freshness validation
    if (config.tier === "free" && config.jobFreshnessDays > 30) {
      warnings.push("Free tier typically uses 30-day freshness");
    }
    if (config.tier === "premium_pending" && config.jobFreshnessDays > 7) {
      warnings.push("Premium tier typically uses 7-day freshness");
    }

    // Validate AI settings
    const aiConstraints = this.CONFIG_CONSTRAINTS.maxJobsForAI;
    if (config.maxJobsForAI < aiConstraints.min || config.maxJobsForAI > aiConstraints.max) {
      errors.push(`maxJobsForAI must be between ${aiConstraints.min} and ${aiConstraints.max}`);
    }

    // Validate fallback threshold
    const fallbackConstraints = this.CONFIG_CONSTRAINTS.fallbackThreshold;
    if (config.fallbackThreshold < fallbackConstraints.min ||
        config.fallbackThreshold > fallbackConstraints.max) {
      errors.push(`fallbackThreshold must be between ${fallbackConstraints.min} and ${fallbackConstraints.max}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates user preferences based on tier
   */
  static validateUserPreferences(prefs: UserPreferencesValidation): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Email validation
    if (!prefs.email || !this.isValidEmail(prefs.email)) {
      errors.push("Valid email is required");
    }

    // Cities validation
    if (!prefs.target_cities || prefs.target_cities.length === 0) {
      errors.push("At least one target city is required");
    } else if (prefs.target_cities.length > 10) {
      warnings.push("More than 10 cities may reduce match quality");
    }

    // Tier-specific validation
    switch (prefs.subscription_tier) {
      case "free":
        this.validateFreeTierPreferences(prefs, errors, warnings);
        break;
      case "premium_pending":
        this.validatePremiumTierPreferences(prefs, errors, warnings);
        break;
      default:
        errors.push(`Invalid subscription tier: ${prefs.subscription_tier}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates free tier specific preferences
   */
  private static validateFreeTierPreferences(
    prefs: UserPreferencesValidation,
    _errors: string[],
    warnings: string[]
  ): void {
    if (!prefs.career_path) {
      warnings.push("Career path improves matching quality for free users");
    }

    // Free users shouldn't have premium fields
    if (prefs.skills || prefs.industries || prefs.languages_spoken) {
      warnings.push("Free tier preferences should not include premium fields");
    }
  }

  /**
   * Validates premium tier specific preferences
   */
  private static validatePremiumTierPreferences(
    prefs: UserPreferencesValidation,
    errors: string[],
    warnings: string[]
  ): void {
    // Required premium fields
    if (!prefs.languages_spoken || prefs.languages_spoken.length === 0) {
      errors.push("Languages spoken is required for premium tier");
    }

    if (!prefs.roles_selected || prefs.roles_selected.length === 0) {
      errors.push("Role selection is required for premium tier");
    }

    if (!prefs.skills || prefs.skills.length === 0) {
      warnings.push("Skills significantly improve premium matching");
    }

    if (!prefs.industries || prefs.industries.length === 0) {
      warnings.push("Industry preferences enhance premium matching");
    }

    // Array size validation
    if (prefs.skills && prefs.skills.length > 20) {
      warnings.push("More than 20 skills may over-constrain matching");
    }

    if (prefs.industries && prefs.industries.length > 10) {
      warnings.push("More than 10 industries may reduce match variety");
    }
  }

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Comprehensive validation combining config and preferences
   */
  static validateCompleteSetup(
    config: MatchingConfig,
    preferences: UserPreferencesValidation
  ): ValidationResult {
    const configResult = this.validateConfig(config);
    const prefsResult = this.validateUserPreferences(preferences);

    return {
      isValid: configResult.isValid && prefsResult.isValid,
      errors: [...configResult.errors, ...prefsResult.errors],
      warnings: [...configResult.warnings, ...prefsResult.warnings]
    };
  }

  /**
   * Logs validation results for monitoring
   */
  static logValidationResults(result: ValidationResult, context: string): void {
    if (!result.isValid) {
      apiLogger.error(`Validation failed for ${context}`, undefined, {
        errors: result.errors,
        warnings: result.warnings
      });
    } else if (result.warnings.length > 0) {
      apiLogger.warn(`Validation warnings for ${context}`, {
        warnings: result.warnings
      });
    } else {
      apiLogger.info(`Validation passed for ${context}`);
    }
  }
}