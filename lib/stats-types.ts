/**
 * Stats API Type Definitions
 * Types related to public statistics and metrics
 */

// ================================
// Stats API Types
// ================================

export interface StatsCache {
	activeJobs: number;
	activeJobsFormatted: string;
	internships: number;
	graduates: number;
	earlyCareer: number;
	weeklyNewJobs: number;
	weeklyNewJobsFormatted: string;
	totalUsers: number;
	totalUsersFormatted: string;
	lastUpdated: string;
}