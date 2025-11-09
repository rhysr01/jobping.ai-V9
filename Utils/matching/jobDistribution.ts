/**
 * Job Distribution Utility
 * Ensures diversity in job sources and balanced city distribution
 */

export interface JobWithSource {
  source?: string;
  city?: string;
  job_hash?: string;
  [key: string]: any;
}

export interface DistributionOptions {
  targetCount: number;
  targetCities: string[];
  maxPerSource?: number;
  ensureCityBalance?: boolean;
}

/**
 * Distributes jobs ensuring:
 * 1. Source diversity (not all from one source)
 * 2. City balance (equal distribution across selected cities)
 */
export function distributeJobsWithDiversity(
  jobs: JobWithSource[],
  options: DistributionOptions
): JobWithSource[] {
  const {
    targetCount,
    targetCities,
    maxPerSource = Math.ceil(targetCount / 3), // Default: max 1/3 from any source
    ensureCityBalance = true
  } = options;

  if (jobs.length === 0) return [];
  if (targetCount <= 0) return [];

  // Step 1: Group jobs by source and city
  const jobsBySource: Record<string, JobWithSource[]> = {};
  const jobsByCity: Record<string, JobWithSource[]> = {};
  
  jobs.forEach(job => {
    const source = job.source || 'unknown';
    const city = job.city || 'unknown';
    
    if (!jobsBySource[source]) jobsBySource[source] = [];
    jobsBySource[source].push(job);
    
    if (!jobsByCity[city]) jobsByCity[city] = [];
    jobsByCity[city].push(job);
  });

  // Step 2: Calculate jobs per city (balanced distribution)
  const jobsPerCity = ensureCityBalance && targetCities.length > 0
    ? Math.floor(targetCount / targetCities.length)
    : targetCount;
  
  const remainder = ensureCityBalance && targetCities.length > 0
    ? targetCount % targetCities.length
    : 0;

  // Step 3: Select jobs ensuring diversity
  const selectedJobs: JobWithSource[] = [];
  const sourceCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  
  // Initialize counters
  Object.keys(jobsBySource).forEach(source => {
    sourceCounts[source] = 0;
  });
  targetCities.forEach(city => {
    cityCounts[city.toLowerCase()] = 0;
  });

  // Helper: Check if we can add a job from this source
  const canAddFromSource = (source: string): boolean => {
    return (sourceCounts[source] || 0) < maxPerSource;
  };

  // Helper: Check if we need more jobs from this city
  const needsMoreFromCity = (city: string): boolean => {
    if (!ensureCityBalance || targetCities.length === 0) return true;
    const cityLower = city.toLowerCase();
    const targetCity = targetCities.find(tc => cityLower.includes(tc.toLowerCase()));
    if (!targetCity) return true; // City not in target list, can still add
    
    const currentCount = cityCounts[targetCity.toLowerCase()] || 0;
    const targetCount = jobsPerCity + (targetCities.indexOf(targetCity) < remainder ? 1 : 0);
    return currentCount < targetCount;
  };

  // Helper: Get unique identifier for job
  const getJobId = (job: JobWithSource): string => {
    return job.job_hash || `${job.title}_${job.company}_${job.city}` || Math.random().toString();
  };

  // Step 4: Round-robin selection prioritizing diversity
  // First pass: Try to get balanced distribution
  for (let round = 0; round < Math.ceil(targetCount / 2) && selectedJobs.length < targetCount; round++) {
    // Rotate through cities
    for (const targetCity of targetCities) {
      if (selectedJobs.length >= targetCount) break;
      
      // Find jobs from this city that we haven't selected yet
      const selectedIds = new Set(selectedJobs.map(getJobId));
      const availableJobs = jobs.filter(job => {
        if (selectedIds.has(getJobId(job))) return false;
        const jobCity = (job.city || '').toLowerCase();
        return jobCity.includes(targetCity.toLowerCase());
      });

      // Sort by source diversity (prefer sources we haven't used much)
      availableJobs.sort((a, b) => {
        const sourceA = a.source || 'unknown';
        const sourceB = b.source || 'unknown';
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;
        
        // Prefer sources with fewer selections
        if (countA !== countB) return countA - countB;
        
        // If counts are equal, prefer sources that can still be added
        const canAddA = canAddFromSource(sourceA);
        const canAddB = canAddFromSource(sourceB);
        if (canAddA !== canAddB) return canAddB ? 1 : -1;
        
        return 0;
      });

      // Select first job that fits constraints
      for (const job of availableJobs) {
        const source = job.source || 'unknown';
        const city = job.city || 'unknown';
        
        if (canAddFromSource(source) && needsMoreFromCity(city)) {
          selectedJobs.push(job);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          
          // Update city count
          const cityLower = city.toLowerCase();
          const matchedCity = targetCities.find(tc => cityLower.includes(tc.toLowerCase()));
          if (matchedCity) {
            cityCounts[matchedCity.toLowerCase()] = (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
          }
          
          break;
        }
      }
    }
  }

  // Step 5: Fill remaining slots (if any) without strict city balance
  if (selectedJobs.length < targetCount) {
    const selectedIds = new Set(selectedJobs.map(getJobId));
    const remaining = jobs.filter(job => !selectedIds.has(getJobId(job)));

    // Sort by source diversity
    remaining.sort((a, b) => {
      const sourceA = a.source || 'unknown';
      const sourceB = b.source || 'unknown';
      const countA = sourceCounts[sourceA] || 0;
      const countB = sourceCounts[sourceB] || 0;
      
      if (countA !== countB) return countA - countB;
      const canAddA = canAddFromSource(sourceA);
      const canAddB = canAddFromSource(sourceB);
      if (canAddA !== canAddB) return canAddB ? 1 : -1;
      return 0;
    });

    for (const job of remaining) {
      if (selectedJobs.length >= targetCount) break;
      
      const source = job.source || 'unknown';
      if (canAddFromSource(source)) {
        selectedJobs.push(job);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      }
    }
  }

  // Step 6: Final fill (if still not enough, relax source constraint)
  if (selectedJobs.length < targetCount) {
    const selectedIds = new Set(selectedJobs.map(getJobId));
    const remaining = jobs.filter(job => !selectedIds.has(getJobId(job)));

    for (const job of remaining) {
      if (selectedJobs.length >= targetCount) break;
      selectedJobs.push(job);
    }
  }

  return selectedJobs.slice(0, targetCount);
}

/**
 * Get distribution stats for logging/debugging
 */
export function getDistributionStats(jobs: JobWithSource[]): {
  sourceDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  totalJobs: number;
} {
  const sourceDistribution: Record<string, number> = {};
  const cityDistribution: Record<string, number> = {};

  jobs.forEach(job => {
    const source = job.source || 'unknown';
    const city = job.city || 'unknown';
    
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
    cityDistribution[city] = (cityDistribution[city] || 0) + 1;
  });

  return {
    sourceDistribution,
    cityDistribution,
    totalJobs: jobs.length
  };
}

