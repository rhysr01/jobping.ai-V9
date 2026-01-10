/**
 * Link Health Checking Type Definitions
 * Types related to link validation and health checking
 */

// ================================
// Link Health Types
// ================================

export interface LinkHealthResult {
	healthy: boolean;
	statusCode?: number;
	redirectUrl?: string;
	reason: "healthy" | "broken" | "redirected" | "blocked" | "timeout" | "error";
}