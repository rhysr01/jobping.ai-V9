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
    ensureCityBalance: initialCityBalance = true
  } = options;

  if (jobs.length === 0) return [];
  if (targetCount <= 0) return [];

  // Handle empty targetCities - disable city balance if no cities selected
  let ensureCityBalance = initialCityBalance;
  if (targetCities.length === 0) {
    ensureCityBalance = false;
  }

  // Step 1: Validate source diversity exists
  const uniqueSources = new Set(jobs.map(j => j.source || 'unknown').filter(s => s !== 'unknown'));
  const hasMultipleSources = uniqueSources.size >= 2;
  
  if (!hasMultipleSources && ensureCityBalance && targetCities.length > 0) {
    // Not enough diverse sources - log warning but continue
    console.warn('[JobDistribution] Insufficient source diversity', {
      uniqueSources: Array.from(uniqueSources),
      totalJobs: jobs.length,
      targetCities,
      recommendation: 'Consider relaxing source diversity constraints or expanding job pool'
    });
  }
  
  // If only one source exists, adjust maxPerSource to allow all jobs from that source
  // This prevents returning fewer jobs than requested when diversity isn't possible
  const effectiveMaxPerSource: number = !hasMultipleSources && uniqueSources.size === 1
    ? targetCount // Allow all jobs from single source
    : maxPerSource;

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

  // Step 2: Check feasibility - can we balance cities?
  let canBalanceCities = ensureCityBalance && targetCities.length > 0;
  if (canBalanceCities) {
    const jobsByCityCount = targetCities.map(city => {
      return jobs.filter(job => {
        const jobCity = (job.city || '').toLowerCase();
        const jobLocation = ((job as any).location || '').toLowerCase();
        return matchesCity(jobCity, jobLocation, city);
      }).length;
    });
    
    const minCityJobs = Math.min(...jobsByCityCount);
    const totalCityJobs = jobsByCityCount.reduce((sum, count) => sum + count, 0);
    
    // Can't balance if:
    // 1. Any city has zero jobs (impossible to balance)
    // 2. Total jobs from all cities is less than targetCount (can't fill quota)
    if (minCityJobs === 0 || totalCityJobs < targetCount) {
      console.warn('[JobDistribution] Cannot balance cities', {
        targetCities,
        jobsPerCity: jobsByCityCount,
        minCityJobs,
        totalCityJobs,
        targetCount,
        reason: minCityJobs === 0 ? 'Some cities have no jobs' : 'Insufficient jobs to fill quota'
      });
      canBalanceCities = false;
      ensureCityBalance = false; // Update local variable
    }
  }

  // Step 2: Calculate jobs per city (balanced distribution)
  const jobsPerCity = canBalanceCities && targetCities.length > 0
    ? Math.floor(targetCount / targetCities.length)
    : targetCount;
  
  const remainder = canBalanceCities && targetCities.length > 0
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
    return (sourceCounts[source] || 0) < effectiveMaxPerSource;
  };

  // Helper: Check if we need more jobs from this city (uses consistent matching)
  const needsMoreFromCity = (city: string, location?: string): boolean => {
    if (!ensureCityBalance || targetCities.length === 0) return true;
    
    // Use consistent city matching function
    const jobCity = city.toLowerCase();
    const jobLocation = (location || '').toLowerCase();
    const matchedTargetCity = targetCities.find(tc => matchesCity(jobCity, jobLocation, tc));
    
    if (!matchedTargetCity) return true; // City not in target list, can still add
    
    const currentCount = cityCounts[matchedTargetCity.toLowerCase()] || 0;
    const targetCount = jobsPerCity + (targetCities.indexOf(matchedTargetCity) < remainder ? 1 : 0);
    return currentCount < targetCount;
  };

  // Helper: Get unique identifier for job (improved to prevent false duplicates)
  const getJobId = (job: JobWithSource): string => {
    if (job.job_hash) return job.job_hash;
    // Include more fields to reduce collision risk
    const title = (job as any).title || '';
    const company = (job as any).company || '';
    const city = job.city || '';
    const location = ((job as any).location || '').substring(0, 50); // Limit length
    const url = ((job as any).job_url || '').substring(0, 100); // Limit length
    return `${title}_${company}_${city}_${location}_${url}` || Math.random().toString();
  };

  // Helper: Consistent city matching (same logic as preFilterJobs.ts)
  const matchesCity = (jobCity: string, jobLocation: string, targetCity: string): boolean => {
    const cityLower = targetCity.toLowerCase().trim();
    const jobCityLower = jobCity.toLowerCase().trim();
    const jobLocLower = jobLocation.toLowerCase().trim();
    
    // Exact match
    if (jobCityLower === cityLower || jobLocLower === cityLower) return true;
    
    // Word boundary matching (prevents false matches like "New London" matching "London")
    const escapedCity = cityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`\\b${escapedCity}\\b`, 'i'), // Exact word match
      new RegExp(`^${escapedCity}[,\\s]`, 'i'), // Starts with city name
      new RegExp(`[,\\s]${escapedCity}[,\\s]`, 'i'), // City in middle
      new RegExp(`[,\\s]${escapedCity}$`, 'i'), // City at end
    ];
    
    // Check if any pattern matches
    if (patterns.some(pattern => pattern.test(jobCityLower) || pattern.test(jobLocLower))) {
      return true;
    }
    
    // Handle special cases (Greater London, etc.)
    const specialCases: Record<string, string[]> = {
      'london': ['greater london', 'central london', 'north london', 'south london', 'east london', 'west london'],
      'paris': ['greater paris', 'paris region'],
      'berlin': ['greater berlin'],
      'madrid': ['greater madrid'],
      'barcelona': ['greater barcelona'],
    };
    
    if (specialCases[cityLower]) {
      return specialCases[cityLower].some(variant => 
        jobCityLower.includes(variant) || jobLocLower.includes(variant)
      );
    }
    
    return false;
  };

  // Step 4: Round-robin selection prioritizing diversity
  // First pass: Try to get balanced distribution
  const maxRounds = canBalanceCities && targetCities.length > 0 
    ? Math.ceil(targetCount / Math.max(1, targetCities.length))
    : Math.ceil(targetCount / 2);
  
  for (let round = 0; round < maxRounds && selectedJobs.length < targetCount; round++) {
    // Rotate through cities (or all jobs if no city balance)
    const citiesToProcess = canBalanceCities && targetCities.length > 0 
      ? targetCities 
      : ['any']; // Process all jobs if no city balance
    
    for (const targetCity of citiesToProcess) {
      if (selectedJobs.length >= targetCount) break;
      
      // Find jobs from this city that we haven't selected yet
      const selectedIds = new Set(selectedJobs.map(getJobId));
      const availableJobs = jobs.filter(job => {
        if (selectedIds.has(getJobId(job))) return false;
        
        // If no city balance, include all jobs
        if (!canBalanceCities || targetCity === 'any') return true;
        
        // Use consistent city matching
        const jobCity = (job.city || '').toLowerCase();
        const jobLocation = ((job as any).location || '').toLowerCase();
        return matchesCity(jobCity, jobLocation, targetCity);
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
        const city = job.city || '';
        const location = ((job as any).location || '') || '';
        
        if (canAddFromSource(source) && needsMoreFromCity(city, location)) {
          selectedJobs.push(job);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          
          // Update city count (use consistent matching)
          if (canBalanceCities && targetCities.length > 0) {
            const jobCity = city.toLowerCase();
            const jobLocation = location.toLowerCase();
            const matchedCity = targetCities.find(tc => matchesCity(jobCity, jobLocation, tc));
            if (matchedCity) {
              cityCounts[matchedCity.toLowerCase()] = (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
            }
          }
          
          break;
        }
      }
    }
  }

  // Step 5: Rebalance if one source dominates (before filling remaining slots)
  // Only rebalance if we have multiple sources and diversity is possible
  const currentSourceDistribution = Object.values(sourceCounts);
  const maxFromAnySource = Math.max(...currentSourceDistribution, 0);
  
  if (hasMultipleSources && maxFromAnySource > effectiveMaxPerSource && selectedJobs.length > 0) {
    // Find dominant source
    const dominantSource = Object.entries(sourceCounts)
      .find(([_, count]) => count > effectiveMaxPerSource)?.[0];
    
    if (dominantSource) {
      const excess = sourceCounts[dominantSource] - effectiveMaxPerSource;
      
      // Remove excess jobs from dominant source (keep highest scoring ones)
      const jobsFromDominantSource = selectedJobs
        .map((job, idx) => ({ job, index: idx }))
        .filter(({ job }) => (job.source || 'unknown') === dominantSource);
      
      // Sort by a quality metric (if available) or keep first ones
      // Prioritize jobs with match_score if available, otherwise keep first ones
      jobsFromDominantSource.sort((a, b) => {
        const scoreA = (a.job as any).match_score || 0;
        const scoreB = (b.job as any).match_score || 0;
        return scoreB - scoreA; // Higher score = better, keep these
      });
      
      const toRemove = jobsFromDominantSource.slice(effectiveMaxPerSource);
      
      // Remove excess jobs
      const indicesToRemove = new Set(toRemove.map(({ index }) => index));
      const rebalancedJobs = selectedJobs.filter((_, idx) => !indicesToRemove.has(idx));
      
      // Update source counts
      sourceCounts[dominantSource] = effectiveMaxPerSource;
      
      // Fill with diverse sources
      const selectedIds = new Set(rebalancedJobs.map(getJobId));
      const diverseJobs = jobs.filter(j => {
        if (selectedIds.has(getJobId(j))) return false;
        const jobSource = j.source || 'unknown';
        return jobSource !== dominantSource && canAddFromSource(jobSource);
      });
      
      // Sort diverse jobs by source diversity
      diverseJobs.sort((a, b) => {
        const sourceA = a.source || 'unknown';
        const sourceB = b.source || 'unknown';
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;
        return countA - countB;
      });
      
      // Add diverse jobs to fill slots
      const toAdd = Math.min(excess, diverseJobs.length);
      for (let i = 0; i < toAdd; i++) {
        const job = diverseJobs[i];
        rebalancedJobs.push(job);
        sourceCounts[job.source || 'unknown'] = (sourceCounts[job.source || 'unknown'] || 0) + 1;
      }
      
      selectedJobs.length = 0;
      selectedJobs.push(...rebalancedJobs);
      
      // If rebalancing reduced job count, try to fill remaining slots
      if (selectedJobs.length < targetCount && jobs.length >= targetCount) {
        const selectedIds = new Set(selectedJobs.map(getJobId));
        const remaining = jobs.filter(j => !selectedIds.has(getJobId(j)));
        
        // Sort by source diversity first
        remaining.sort((a, b) => {
          const sourceA = a.source || 'unknown';
          const sourceB = b.source || 'unknown';
          const countA = sourceCounts[sourceA] || 0;
          const countB = sourceCounts[sourceB] || 0;
          return countA - countB;
        });
        
        // Fill remaining slots prioritizing diversity
        for (let i = 0; i < remaining.length && selectedJobs.length < targetCount; i++) {
          const job = remaining[i];
          const source = job.source || 'unknown';
          
          // Prefer sources we haven't used much
          if (canAddFromSource(source) || selectedJobs.length < targetCount * 0.8) {
            selectedJobs.push(job);
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          }
        }
      }
    }
  }

  // Step 6: Fill remaining slots (if any) without strict city balance
  if (selectedJobs.length < targetCount) {
    const selectedIds = new Set(selectedJobs.map(getJobId));
    const remaining = jobs.filter(job => !selectedIds.has(getJobId(job)));

    // Sort by source diversity and city balance
    remaining.sort((a, b) => {
      const sourceA = a.source || 'unknown';
      const sourceB = b.source || 'unknown';
      const countA = sourceCounts[sourceA] || 0;
      const countB = sourceCounts[sourceB] || 0;
      
      // Prefer sources with fewer selections
      if (countA !== countB) return countA - countB;
      
      const canAddA = canAddFromSource(sourceA);
      const canAddB = canAddFromSource(sourceB);
      if (canAddA !== canAddB) return canAddB ? 1 : -1;
      
      // If source diversity is equal, prefer cities we need more from
      if (ensureCityBalance && targetCities.length > 0) {
        const cityA = a.city || '';
        const cityB = b.city || '';
        const locationA = ((a as any).location || '').toLowerCase();
        const locationB = ((b as any).location || '').toLowerCase();
        const needsA = needsMoreFromCity(cityA, locationA);
        const needsB = needsMoreFromCity(cityB, locationB);
        if (needsA !== needsB) return needsB ? 1 : -1;
      }
      
      return 0;
    });

    for (const job of remaining) {
      if (selectedJobs.length >= targetCount) break;
      
      const source = job.source || 'unknown';
      if (canAddFromSource(source)) {
        selectedJobs.push(job);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        
        // Update city count if tracking (use consistent matching)
        if (canBalanceCities && targetCities.length > 0) {
          const jobCity = (job.city || '').toLowerCase();
          const jobLocation = ((job as any).location || '').toLowerCase();
          const matchedCity = targetCities.find(tc => matchesCity(jobCity, jobLocation, tc));
          if (matchedCity) {
            cityCounts[matchedCity.toLowerCase()] = (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
          }
        }
      }
    }
  }

  // Step 7: Final fill (if still not enough, relax source constraint)
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

