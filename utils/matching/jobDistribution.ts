/**
 * Job Distribution Statistics
 *
 * Calculate statistics about job distribution across categories, locations, etc.
 */

export interface DistributionStats {
	totalJobs: number;
	categoryBreakdown: Record<string, number>;
	locationBreakdown: Record<string, number>;
	averageSalary?: number;
}

export function getDistributionStats(jobs: any[]): DistributionStats {
	return {
		totalJobs: jobs.length,
		categoryBreakdown: {},
		locationBreakdown: {},
	};
}
