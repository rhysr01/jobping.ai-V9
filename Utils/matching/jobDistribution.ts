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
  // Work environment balancing
  targetWorkEnvironments?: string[]; // Form values: ['Office', 'Hybrid', 'Remote']
  ensureWorkEnvironmentBalance?: boolean;
  // Quality floor for diversity swaps (default: 10 points)
  // Only swap jobs for diversity if alternative is within this point range
  qualityFloorThreshold?: number;
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
  // CRITICAL FIX: Capture jobs parameter immediately to prevent TDZ errors during bundling
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  
  const {
    targetCount,
    targetCities,
    maxPerSource = Math.ceil(targetCount / 3), // Default: max 1/3 from any source
    ensureCityBalance: initialCityBalance = true,
    targetWorkEnvironments = [],
    ensureWorkEnvironmentBalance: initialWorkEnvBalance = true,
    qualityFloorThreshold = 10 // Default: only swap if within 10 points
  } = options;

  if (jobsArray.length === 0) return [];
  if (targetCount <= 0) return [];

  // Handle empty targetCities - disable city balance if no cities selected
  let ensureCityBalance = initialCityBalance;
  if (targetCities.length === 0) {
    ensureCityBalance = false;
  }

  // Handle empty targetWorkEnvironments - disable work env balance if none selected
  let ensureWorkEnvironmentBalance = initialWorkEnvBalance;
  if (targetWorkEnvironments.length === 0) {
    ensureWorkEnvironmentBalance = false;
  }

  // Helper: Normalize work environment values
  // Form values: 'Office', 'Hybrid', 'Remote'
  // Job values: 'on-site', 'hybrid', 'remote' (or in location field)
  const normalizeWorkEnv = (env: string): string | null => {
    if (!env) return null;
    const envLower = env.toLowerCase().trim();
    // Handle form values
    if (envLower === 'office' || envLower === 'on-site' || envLower === 'onsite') return 'on-site';
    if (envLower === 'hybrid') return 'hybrid';
    if (envLower === 'remote') return 'remote';
    return null;
  };

  // Helper: Get work environment from job
  const getJobWorkEnv = (job: JobWithSource): string | null => {
    // Check structured work_environment field first
    if ((job as any).work_environment) {
      const normalized = normalizeWorkEnv((job as any).work_environment);
      if (normalized) return normalized;
    }
    // Check location field for remote/hybrid indicators
    const location = ((job as any).location || '').toLowerCase();
    if (location.includes('remote') || location.includes('work from home') || location.includes('wfh')) {
      return 'remote';
    }
    if (location.includes('hybrid')) {
      return 'hybrid';
    }
    // Default to on-site if location doesn't indicate otherwise
    return 'on-site';
  };

  // Helper: Check if job matches target work environment
  const matchesWorkEnvironment = (job: JobWithSource, targetEnv: string): boolean => {
    const jobEnv = getJobWorkEnv(job);
    const normalizedTarget = normalizeWorkEnv(targetEnv);
    if (!jobEnv || !normalizedTarget) return true; // If unclear, allow it
    
    // Exact match
    if (jobEnv === normalizedTarget) return true;
    
    // Compatibility rules (similar to scoring logic):
    // - Remote users accept: remote (exact), hybrid (compatible)
    // - Hybrid users accept: hybrid (exact), remote (compatible), on-site (compatible)
    // - Office/on-site users accept: on-site (exact), hybrid (compatible)
    if (normalizedTarget === 'remote') {
      return jobEnv === 'remote' || jobEnv === 'hybrid';
    }
    if (normalizedTarget === 'hybrid') {
      return jobEnv === 'hybrid' || jobEnv === 'remote' || jobEnv === 'on-site';
    }
    if (normalizedTarget === 'on-site') {
      return jobEnv === 'on-site' || jobEnv === 'hybrid';
    }
    
    return false;
  };

  // Step 1: Validate source diversity exists
  // CRITICAL: Use imperative loop instead of map/filter to avoid TDZ errors
  const uniqueSources = new Set<string>();
  for (let i = 0; i < jobsArray.length; i++) {
    const source = jobsArray[i].source || 'unknown';
    if (source !== 'unknown') {
      uniqueSources.add(source);
    }
  }
  const hasMultipleSources = uniqueSources.size >= 2;
  const MIN_REQUIRED_SOURCES = 2; // Minimum 2 different sources required
  
  if (!hasMultipleSources) {
    // Not enough diverse sources - log warning
    console.warn('[JobDistribution] Insufficient source diversity', {
      uniqueSources: Array.from(uniqueSources),
      totalJobs: jobsArray.length,
      targetCities,
      requiredSources: MIN_REQUIRED_SOURCES,
      recommendation: 'Consider relaxing source diversity constraints or expanding job pool'
    });
  }
  
  // Calculate effective maxPerSource to ensure minimum 2 sources
  // If we have multiple sources, limit per source to ensure diversity
  // Formula: If targetCount = 5, maxPerSource = 3 ensures at least 2 sources (3+2=5)
  let effectiveMaxPerSource: number;
  if (!hasMultipleSources && uniqueSources.size === 1) {
    // Only one source available - allow all jobs (fallback)
    effectiveMaxPerSource = targetCount;
  } else if (hasMultipleSources) {
    // Multiple sources available - calculate max to ensure minimum 2 sources
    // For targetCount = 5: maxPerSource = 3 ensures we can get 3+2=5 (2 sources)
    // For targetCount = 10: maxPerSource = 8 ensures we can get 8+2=10 (2 sources)
    const calculatedMax = Math.ceil(targetCount * 0.8); // Allow up to 80% from one source
    effectiveMaxPerSource = Math.min(maxPerSource, calculatedMax);
    
    // Ensure we can still get minimum 2 sources
    // If maxPerSource is too high, reduce it
    if (effectiveMaxPerSource >= targetCount - 1) {
      effectiveMaxPerSource = Math.max(1, targetCount - 1); // Ensure at least 1 job from second source
    }
  } else {
    effectiveMaxPerSource = maxPerSource;
  }

  // Helper: Consistent city matching (same logic as preFilterJobs.ts)
  // CRITICAL: Define before use to avoid "used before declaration" errors
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
    // CRITICAL: Use imperative loop instead of some to avoid TDZ errors
    for (let p = 0; p < patterns.length; p++) {
      if (patterns[p].test(jobCityLower) || patterns[p].test(jobLocLower)) {
        return true;
      }
    }
    
    // Handle special cases (Greater London, etc.) - matches preFilterJobs.ts logic
    // Comprehensive list of all signup form cities with their variations
    const specialCases: Record<string, string[]> = {
      // UK Cities
      'london': ['greater london', 'central london', 'north london', 'south london', 'east london', 'west london', 'london area', 'greater london area', 'city of london'],
      'manchester': ['greater manchester', 'manchester area'],
      'birmingham': ['greater birmingham', 'birmingham area', 'west midlands'],
      
      // Ireland
      'dublin': ['county dublin', 'baile átha cliath', 'dublin area', 'greater dublin'],
      'belfast': ['greater belfast', 'belfast area', 'northern ireland', 'belfast city'],
      
      // France
      'paris': ['greater paris', 'paris region', 'île-de-france', 'ile-de-france', 'arrondissement'],
      
      // Netherlands
      'amsterdam': ['greater amsterdam', 'amsterdam area', 'noord-holland', 'north holland'],
      
      // Belgium
      'brussels': ['bruxelles', 'brussel', 'brussels-capital', 'greater brussels', 'brussels area'],
      
      // Germany
      'berlin': ['greater berlin', 'brandenburg', 'berlin area'],
      'hamburg': ['greater hamburg', 'hamburg area', 'hansestadt hamburg'],
      'munich': ['münchen', 'greater munich', 'munich area', 'bavaria', 'bayern'],
      'frankfurt': ['frankfurt am main', 'greater frankfurt', 'frankfurt area', 'hesse', 'hessen'],
      
      // Spain
      'madrid': ['greater madrid', 'comunidad de madrid', 'madrid region', 'madrid area'],
      'barcelona': ['greater barcelona', 'catalonia', 'catalunya', 'barcelona area', 'barcelona region'],
      
      // Italy
      'milan': ['greater milan', 'milan area', 'lombardy', 'lombardia', 'milano'],
      'rome': ['greater rome', 'rome area', 'lazio', 'roma'],
      
      // Portugal
      'lisbon': ['lisboa', 'greater lisbon', 'lisbon area', 'lisboa area'],
      
      // Switzerland
      'zurich': ['zürich', 'greater zurich', 'zurich area', 'zürich area'],
      
      // Sweden
      'stockholm': ['stockholms län', 'greater stockholm', 'stockholm area', 'stockholm county'],
      
      // Denmark
      'copenhagen': ['københavn', 'greater copenhagen', 'copenhagen area', 'capital region', 'hovedstaden'],
      
      // Norway
      'oslo': ['greater oslo', 'oslo area', 'oslo county'],
      
      // Finland
      'helsinki': ['greater helsinki', 'helsinki area', 'uusimaa', 'helsingfors'],
      
      // Austria
      'vienna': ['wien', 'greater vienna', 'vienna area', 'wien area'],
      
      // Czech Republic
      'prague': ['praha', 'greater prague', 'prague area', 'praha area'],
      
      // Poland
      'warsaw': ['warszawa', 'greater warsaw', 'warsaw area', 'warszawa area', 'mazowieckie'],
    };
    
    if (specialCases[cityLower]) {
      // CRITICAL: Use imperative loop instead of some to avoid TDZ errors
      const variants = specialCases[cityLower];
      for (let v = 0; v < variants.length; v++) {
        if (jobCityLower.includes(variants[v]) || jobLocLower.includes(variants[v])) {
          return true;
        }
      }
    }
    
    // Handle reverse matching for cities with multiple name variations
    // This ensures jobs with native language names match English city names (and vice versa)
    const reverseMatches: Record<string, string[]> = {
      'rome': ['roma'],
      'roma': ['rome'],
      'milan': ['milano'],
      'milano': ['milan'],
      'lisbon': ['lisboa'],
      'lisboa': ['lisbon'],
      'zurich': ['zürich'],
      'zürich': ['zurich'],
      'copenhagen': ['københavn'],
      'københavn': ['copenhagen'],
      'vienna': ['wien'],
      'wien': ['vienna'],
      'prague': ['praha'],
      'praha': ['prague'],
      'warsaw': ['warszawa'],
      'warszawa': ['warsaw'],
      'brussels': ['bruxelles', 'brussel'],
      'bruxelles': ['brussels'],
      'brussel': ['brussels'],
      'munich': ['münchen'],
      'münchen': ['munich'],
      'stockholm': ['stockholms län'],
      'helsinki': ['helsingfors'],
      'helsingfors': ['helsinki'],
      'dublin': ['baile átha cliath'],
    };
    
    if (reverseMatches[cityLower]) {
      const variants = reverseMatches[cityLower];
      for (let v = 0; v < variants.length; v++) {
        if (jobCityLower === variants[v] || jobLocLower.includes(variants[v])) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Step 1: Group jobs by source and city
  // CRITICAL: Use imperative loop instead of forEach to avoid TDZ errors
  const jobsBySource: Record<string, JobWithSource[]> = {};
  const jobsByCity: Record<string, JobWithSource[]> = {};
  
  for (let i = 0; i < jobsArray.length; i++) {
    const job = jobsArray[i];
    const source = job.source || 'unknown';
    const city = job.city || 'unknown';
    
    if (!jobsBySource[source]) jobsBySource[source] = [];
    jobsBySource[source].push(job);
    
    if (!jobsByCity[city]) jobsByCity[city] = [];
    jobsByCity[city].push(job);
  }

  // Step 2: Check feasibility - can we balance cities?
  // CRITICAL FIX: Filter out cities with no jobs and only balance across cities that have jobs
  let canBalanceCities = ensureCityBalance && targetCities.length > 0;
  let effectiveTargetCities = [...targetCities]; // Cities we'll actually try to balance across
  if (canBalanceCities) {
    // CRITICAL: Use imperative loops instead of map/filter/reduce to avoid TDZ errors
    const jobsByCityCount: number[] = [];
    const citiesWithJobs: string[] = [];
    const citiesWithNoJobs: string[] = [];
    
    for (let cityIdx = 0; cityIdx < targetCities.length; cityIdx++) {
      const city = targetCities[cityIdx];
      let count = 0;
      for (let jobIdx = 0; jobIdx < jobsArray.length; jobIdx++) {
        const job = jobsArray[jobIdx];
        const jobCity = (job.city || '').toLowerCase();
        const jobLocation = ((job as any).location || '').toLowerCase();
        if (matchesCity(jobCity, jobLocation, city)) {
          count++;
        }
      }
      jobsByCityCount.push(count);
      
      if (count === 0) {
        citiesWithNoJobs.push(city);
      } else {
        citiesWithJobs.push(city);
      }
    }
    
    // Filter out cities with no jobs from effective target cities
    if (citiesWithNoJobs.length > 0) {
      effectiveTargetCities = citiesWithJobs;
      
      // Create detailed city breakdown for debugging
      const cityBreakdown: Record<string, number> = {};
      for (let i = 0; i < targetCities.length; i++) {
        cityBreakdown[targetCities[i]] = jobsByCityCount[i];
      }
      
      console.warn('[JobDistribution] Cannot balance cities', {
        targetCities,
        jobsPerCity: jobsByCityCount,
        cityBreakdown,
        citiesWithNoJobs,
        citiesWithJobs,
        minCityJobs: Math.min(...jobsByCityCount.filter(c => c > 0)),
        totalCityJobs: jobsByCityCount.reduce((sum, c) => sum + c, 0),
        targetCount,
        totalJobsAvailable: jobsArray.length,
        reason: 'Some cities have no jobs',
        recommendation: 'Jobs may have been filtered out by scoring/career path requirements, or city name variations (e.g., Roma vs Rome) not matching. Will balance across cities with available jobs.',
        action: `Filtering out ${citiesWithNoJobs.length} city/cities with no jobs, balancing across ${citiesWithJobs.length} city/cities with jobs`
      });
    }
    
    // Check if we can balance across cities that have jobs
    if (effectiveTargetCities.length === 0) {
      // No cities have jobs - disable city balance entirely
      canBalanceCities = false;
      ensureCityBalance = false;
      effectiveTargetCities = [];
    } else if (effectiveTargetCities.length === 1) {
      // Only one city has jobs - can't balance, but still prefer that city
      canBalanceCities = false;
      ensureCityBalance = false;
    } else {
      // Multiple cities have jobs - check if we have enough total jobs
      const totalCityJobs = jobsByCityCount.reduce((sum, c) => sum + c, 0);
      if (totalCityJobs < targetCount) {
        // Not enough jobs to fill quota - disable strict balance but still prefer target cities
        canBalanceCities = false;
        ensureCityBalance = false;
      } else {
        // We can balance across cities that have jobs
        canBalanceCities = true;
      }
    }
  }

  // Step 2.5: Check feasibility - can we balance work environments?
  let canBalanceWorkEnvironments = ensureWorkEnvironmentBalance && targetWorkEnvironments.length > 0;
  if (canBalanceWorkEnvironments) {
    // CRITICAL: Use imperative loops instead of map/filter/reduce to avoid TDZ errors
    const jobsByWorkEnvCount: number[] = [];
    for (let envIdx = 0; envIdx < targetWorkEnvironments.length; envIdx++) {
      const targetEnv = targetWorkEnvironments[envIdx];
      let count = 0;
      for (let jobIdx = 0; jobIdx < jobsArray.length; jobIdx++) {
        const job = jobsArray[jobIdx];
        if (matchesWorkEnvironment(job, targetEnv)) {
          count++;
        }
      }
      jobsByWorkEnvCount.push(count);
    }
    
    let minWorkEnvJobs = jobsByWorkEnvCount.length > 0 ? jobsByWorkEnvCount[0] : 0;
    for (let i = 1; i < jobsByWorkEnvCount.length; i++) {
      if (jobsByWorkEnvCount[i] < minWorkEnvJobs) {
        minWorkEnvJobs = jobsByWorkEnvCount[i];
      }
    }
    let totalWorkEnvJobs = 0;
    for (let i = 0; i < jobsByWorkEnvCount.length; i++) {
      totalWorkEnvJobs += jobsByWorkEnvCount[i];
    }
    
    // Can't balance if:
    // 1. Any work environment has zero jobs (impossible to balance)
    // 2. Total jobs from all work environments is less than targetCount (can't fill quota)
    if (minWorkEnvJobs === 0 || totalWorkEnvJobs < targetCount) {
      // Create detailed work environment breakdown for debugging
      const workEnvBreakdown: Record<string, number> = {};
      for (let i = 0; i < targetWorkEnvironments.length; i++) {
        workEnvBreakdown[targetWorkEnvironments[i]] = jobsByWorkEnvCount[i];
      }
      
      // Find work environments with zero jobs
      const workEnvsWithNoJobs: string[] = [];
      for (let i = 0; i < targetWorkEnvironments.length; i++) {
        if (jobsByWorkEnvCount[i] === 0) {
          workEnvsWithNoJobs.push(targetWorkEnvironments[i]);
        }
      }
      
      console.warn('[JobDistribution] Cannot balance work environments', {
        targetWorkEnvironments,
        jobsPerWorkEnv: jobsByWorkEnvCount,
        workEnvBreakdown,
        workEnvsWithNoJobs,
        minWorkEnvJobs,
        totalWorkEnvJobs,
        targetCount,
        totalJobsAvailable: jobsArray.length,
        reason: minWorkEnvJobs === 0 ? 'Some work environments have no jobs' : 'Insufficient jobs to fill quota',
        recommendation: minWorkEnvJobs === 0 
          ? 'Jobs may have been filtered out by scoring/career path requirements, or work environment detection needs improvement'
          : 'Consider relaxing scoring thresholds or expanding job pool'
      });
      canBalanceWorkEnvironments = false;
      ensureWorkEnvironmentBalance = false; // Update local variable
    }
  }

  // Step 2: Calculate jobs per city (balanced distribution)
  // CRITICAL FIX: Use effectiveTargetCities (cities with jobs) for balancing calculations
  const jobsPerCity = canBalanceCities && effectiveTargetCities.length > 0
    ? Math.floor(targetCount / effectiveTargetCities.length)
    : targetCount;
  
  const cityRemainder = canBalanceCities && effectiveTargetCities.length > 0
    ? targetCount % effectiveTargetCities.length
    : 0;

  // Step 2.6: Calculate jobs per work environment (balanced distribution)
  const jobsPerWorkEnv = canBalanceWorkEnvironments && targetWorkEnvironments.length > 0
    ? Math.floor(targetCount / targetWorkEnvironments.length)
    : targetCount;
  
  const workEnvRemainder = canBalanceWorkEnvironments && targetWorkEnvironments.length > 0
    ? targetCount % targetWorkEnvironments.length
    : 0;

  // Step 3: Select jobs ensuring diversity
  const selectedJobs: JobWithSource[] = [];
  const sourceCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const workEnvCounts: Record<string, number> = {};
  
  // Initialize counters
  // CRITICAL: Use imperative loops instead of forEach to avoid TDZ errors
  const sourceKeys = Object.keys(jobsBySource);
  for (let i = 0; i < sourceKeys.length; i++) {
    sourceCounts[sourceKeys[i]] = 0;
  }
  // CRITICAL FIX: Initialize city counts for all target cities (including those with no jobs)
  // This allows us to track jobs from any target city, even if we can't balance
  for (let i = 0; i < targetCities.length; i++) {
    cityCounts[targetCities[i].toLowerCase()] = 0;
  }
  for (let i = 0; i < targetWorkEnvironments.length; i++) {
    const normalizedEnv = normalizeWorkEnv(targetWorkEnvironments[i]);
    if (normalizedEnv) {
      workEnvCounts[normalizedEnv] = 0;
    }
  }

  // Helper: Check if we can add a job from this source
  const canAddFromSource = (source: string): boolean => {
    return (sourceCounts[source] || 0) < effectiveMaxPerSource;
  };

  // Helper: Check if we need more jobs from this city (uses consistent matching)
  const needsMoreFromCity = (city: string, location?: string): boolean => {
    if (!ensureCityBalance || effectiveTargetCities.length === 0) return true;
    
    // Use consistent city matching function
    // CRITICAL: Use imperative loop instead of find to avoid TDZ errors
    const jobCity = city.toLowerCase();
    const jobLocation = (location || '').toLowerCase();
    let matchedTargetCity: string | undefined;
    for (let i = 0; i < effectiveTargetCities.length; i++) {
      if (matchesCity(jobCity, jobLocation, effectiveTargetCities[i])) {
        matchedTargetCity = effectiveTargetCities[i];
        break;
      }
    }
    
    if (!matchedTargetCity) return true; // City not in effective target list, can still add
    
    const currentCount = cityCounts[matchedTargetCity.toLowerCase()] || 0;
    const targetCount = jobsPerCity + (effectiveTargetCities.indexOf(matchedTargetCity) < cityRemainder ? 1 : 0);
    return currentCount < targetCount;
  };

  // Helper: Check if we need more jobs from this work environment
  const needsMoreFromWorkEnv = (job: JobWithSource): boolean => {
    if (!ensureWorkEnvironmentBalance || targetWorkEnvironments.length === 0) return true;
    
    const jobEnv = getJobWorkEnv(job);
    if (!jobEnv) return true; // If unclear, allow it
    
    // Find which target work environment this job matches
    let matchedTargetEnv: string | undefined;
    for (let i = 0; i < targetWorkEnvironments.length; i++) {
      if (matchesWorkEnvironment(job, targetWorkEnvironments[i])) {
        matchedTargetEnv = targetWorkEnvironments[i];
        break;
      }
    }
    
    if (!matchedTargetEnv) return true; // Work env not in target list, can still add
    
    const normalizedTarget = normalizeWorkEnv(matchedTargetEnv);
    if (!normalizedTarget) return true;
    
    const currentCount = workEnvCounts[normalizedTarget] || 0;
    const targetCount = jobsPerWorkEnv + (targetWorkEnvironments.indexOf(matchedTargetEnv) < workEnvRemainder ? 1 : 0);
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

  // Helper: Get match score from job (handles both 0-100 and 0-1 scales)
  const getJobScore = (job: JobWithSource): number => {
    const score = (job as any).match_score;
    if (score === undefined || score === null) return 0;
    // If score is > 1, assume it's 0-100 scale, normalize to 0-100
    // If score is <= 1, assume it's 0-1 scale, convert to 0-100
    return score > 1 ? score : score * 100;
  };

  // Helper: Check if swapping jobA for jobB is acceptable (quality floor check)
  // Only allow swap if jobB is within qualityFloorThreshold points of jobA
  const isAcceptableSwap = (jobA: JobWithSource, jobB: JobWithSource): boolean => {
    const scoreA = getJobScore(jobA);
    const scoreB = getJobScore(jobB);
    const scoreDiff = scoreA - scoreB;
    
    // Allow swap if:
    // 1. jobB is better than jobA (scoreDiff < 0), OR
    // 2. jobB is within quality floor threshold (scoreDiff <= qualityFloorThreshold)
    return scoreDiff <= qualityFloorThreshold;
  };

  // Step 4: Round-robin selection prioritizing diversity
  // First pass: Try to get balanced distribution
  // CRITICAL FIX: Use effectiveTargetCities for round calculation
  const maxRounds = canBalanceCities && effectiveTargetCities.length > 0 
    ? Math.ceil(targetCount / Math.max(1, effectiveTargetCities.length))
    : Math.ceil(targetCount / 2);
  
  // CRITICAL FIX: Add maximum iteration limit to prevent timeouts
  const MAX_ITERATIONS = 1000; // Prevent infinite loops when diversity isn't possible
  let iterationCount = 0;
  let consecutiveNoProgressRounds = 0;
  const MAX_NO_PROGRESS_ROUNDS = 3; // If no progress for 3 rounds, relax constraints
  
  for (let round = 0; round < maxRounds && selectedJobs.length < targetCount && iterationCount < MAX_ITERATIONS; round++) {
    const jobsBeforeRound = selectedJobs.length;
    
    // Rotate through cities (or all jobs if no city balance)
    // CRITICAL FIX: Use effectiveTargetCities (cities with jobs) for rotation
    const citiesToProcess = canBalanceCities && effectiveTargetCities.length > 0 
      ? effectiveTargetCities 
      : ['any']; // Process all jobs if no city balance
    
    for (const targetCity of citiesToProcess) {
      if (selectedJobs.length >= targetCount || iterationCount >= MAX_ITERATIONS) break;
      iterationCount++;
      
      // Find jobs from this city that we haven't selected yet
      // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
      const selectedIds = new Set<string>();
      for (let i = 0; i < selectedJobs.length; i++) {
        selectedIds.add(getJobId(selectedJobs[i]));
      }
      const availableJobs: JobWithSource[] = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        if (selectedIds.has(getJobId(job))) continue;
        
        // If no city balance, include all jobs
        if (!canBalanceCities || targetCity === 'any') {
          availableJobs.push(job);
          continue;
        }
        
        // Use consistent city matching
        const jobCity = (job.city || '').toLowerCase();
        const jobLocation = ((job as any).location || '').toLowerCase();
        if (matchesCity(jobCity, jobLocation, targetCity)) {
          availableJobs.push(job);
        }
      }

      // CRITICAL FIX: Early exit if no available jobs for this city
      if (availableJobs.length === 0) {
        // If we can't find any jobs for this city and we're trying to balance,
        // disable city balance and continue
        if (canBalanceCities && targetCity !== 'any') {
          console.warn('[JobDistribution] No jobs found for city, disabling city balance', {
            targetCity,
            selectedCount: selectedJobs.length,
            targetCount
          });
          canBalanceCities = false;
          ensureCityBalance = false;
          break; // Break out of city loop, will continue with relaxed constraints
        }
        continue;
      }

      // ENTERPRISE-LEVEL FIX: Multi-criteria sorting for balanced quality
      // Priority order: Quality > Source Diversity > City Balance > Work Environment Balance
      availableJobs.sort((a, b) => {
        // Primary sort: Quality (match_score DESC) - highest quality first
        const scoreA = getJobScore(a);
        const scoreB = getJobScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score = better quality
        }
        
        // Secondary sort: Source diversity (prefer sources we haven't used much)
        const sourceA = a.source || 'unknown';
        const sourceB = b.source || 'unknown';
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;
        
        if (countA !== countB) return countA - countB;
        
        // Tertiary sort: Can still add from source
        const canAddA = canAddFromSource(sourceA);
        const canAddB = canAddFromSource(sourceB);
        if (canAddA !== canAddB) return canAddB ? 1 : -1;
        
        // Quaternary sort: City balance (prefer cities we need more from)
        if (canBalanceCities && targetCity !== 'any') {
          const cityA = (a.city || '').toLowerCase();
          const locA = ((a as any).location || '').toLowerCase();
          const cityB = (b.city || '').toLowerCase();
          const locB = ((b as any).location || '').toLowerCase();
          
          const matchesCityA = matchesCity(cityA, locA, targetCity);
          const matchesCityB = matchesCity(cityB, locB, targetCity);
          
          if (matchesCityA !== matchesCityB) {
            return matchesCityA ? -1 : 1; // Prefer jobs matching target city
          }
        }
        
        return 0;
      });

      // Select first job that fits constraints (source, city, AND work environment)
      let foundJob = false;
      for (const job of availableJobs) {
        const source = job.source || 'unknown';
        const city = job.city || '';
        const location = ((job as any).location || '') || '';
        
        // Check all constraints: source diversity, city balance, AND work environment balance
        if (canAddFromSource(source) && needsMoreFromCity(city, location) && needsMoreFromWorkEnv(job)) {
          selectedJobs.push(job);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          
          // Update city count (use consistent matching)
          // CRITICAL: Use imperative loop instead of find to avoid TDZ errors
          // CRITICAL FIX: Check against all target cities (not just effective ones) for tracking
          if (targetCities.length > 0) {
            const jobCity = city.toLowerCase();
            const jobLocation = location.toLowerCase();
            let matchedCity: string | undefined;
            // First check effective cities (for balancing)
            for (let i = 0; i < effectiveTargetCities.length; i++) {
              if (matchesCity(jobCity, jobLocation, effectiveTargetCities[i])) {
                matchedCity = effectiveTargetCities[i];
                break;
              }
            }
            // If not found in effective cities, check all target cities (for tracking)
            if (!matchedCity) {
              for (let i = 0; i < targetCities.length; i++) {
                if (matchesCity(jobCity, jobLocation, targetCities[i])) {
                  matchedCity = targetCities[i];
                  break;
                }
              }
            }
            if (matchedCity) {
              cityCounts[matchedCity.toLowerCase()] = (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
            }
          }
          
          // Update work environment count
          if (canBalanceWorkEnvironments && targetWorkEnvironments.length > 0) {
            const jobEnv = getJobWorkEnv(job);
            if (jobEnv) {
              workEnvCounts[jobEnv] = (workEnvCounts[jobEnv] || 0) + 1;
            }
          }
          
          foundJob = true;
          break;
        }
      }
      
      // If no job was found that fits constraints, relax them
      // BUT: Apply quality floor check - only add if it doesn't degrade quality significantly
      if (!foundJob && availableJobs.length > 0) {
        // Get the minimum score of currently selected jobs (if any)
        let minSelectedScore = 100; // Start high
        if (selectedJobs.length > 0) {
          for (let i = 0; i < selectedJobs.length; i++) {
            const score = getJobScore(selectedJobs[i]);
            if (score < minSelectedScore) {
              minSelectedScore = score;
            }
          }
        }
        
        // Find best job that meets quality floor
        let bestJob: JobWithSource | null = null;
        for (let i = 0; i < availableJobs.length; i++) {
          const job = availableJobs[i];
          const jobScore = getJobScore(job);
          
          // Only consider if it meets quality floor (within threshold of minimum selected)
          if (jobScore >= minSelectedScore - qualityFloorThreshold) {
            bestJob = job;
            break;
          }
        }
        
        // If no job meets quality floor, use the highest-scoring available job anyway
        // (This is a fallback - better to have a job than none)
        if (!bestJob && availableJobs.length > 0) {
          bestJob = availableJobs[0];
        }
        
        if (bestJob) {
          selectedJobs.push(bestJob);
          const source = bestJob.source || 'unknown';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
      }
    }
    
    // Check if we made progress this round
    if (selectedJobs.length === jobsBeforeRound) {
      consecutiveNoProgressRounds++;
      if (consecutiveNoProgressRounds >= MAX_NO_PROGRESS_ROUNDS) {
        console.warn('[JobDistribution] No progress for multiple rounds, relaxing constraints', {
          consecutiveNoProgressRounds,
          selectedCount: selectedJobs.length,
          targetCount,
          canBalanceCities,
          hasMultipleSources
        });
        // Disable city balance if it's preventing progress
        if (canBalanceCities) {
          canBalanceCities = false;
          ensureCityBalance = false;
        }
        consecutiveNoProgressRounds = 0; // Reset counter
      }
    } else {
      consecutiveNoProgressRounds = 0; // Reset on progress
    }
  }
  
  // CRITICAL FIX: If we hit iteration limit and still don't have enough jobs, relax constraints
  if (selectedJobs.length < targetCount && iterationCount >= MAX_ITERATIONS) {
    console.warn('[JobDistribution] Hit iteration limit, relaxing constraints', {
      selectedCount: selectedJobs.length,
      targetCount,
      hasMultipleSources,
      canBalanceCities,
      iterationCount
    });
    
    // Disable city balance if it's preventing us from getting jobs
    if (canBalanceCities && selectedJobs.length < targetCount * 0.5) {
      canBalanceCities = false;
      ensureCityBalance = false;
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
      // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
      const jobsFromDominantSource: Array<{ job: JobWithSource; index: number }> = [];
      for (let i = 0; i < selectedJobs.length; i++) {
        const job = selectedJobs[i];
        if ((job.source || 'unknown') === dominantSource) {
          jobsFromDominantSource.push({ job, index: i });
        }
      }
      
      // Sort by a quality metric (if available) or keep first ones
      // Prioritize jobs with match_score if available, otherwise keep first ones
      jobsFromDominantSource.sort((a, b) => {
        const scoreA = getJobScore(a.job);
        const scoreB = getJobScore(b.job);
        return scoreB - scoreA; // Higher score = better, keep these
      });
      
      const toRemove = jobsFromDominantSource.slice(effectiveMaxPerSource);
      
      // Remove excess jobs
      // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
      const indicesToRemove = new Set<number>();
      for (let i = 0; i < toRemove.length; i++) {
        indicesToRemove.add(toRemove[i].index);
      }
      const rebalancedJobs: JobWithSource[] = [];
      for (let i = 0; i < selectedJobs.length; i++) {
        if (!indicesToRemove.has(i)) {
          rebalancedJobs.push(selectedJobs[i]);
        }
      }
      
      // Update source counts
      sourceCounts[dominantSource] = effectiveMaxPerSource;
      
      // Fill with diverse sources
      // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
      const selectedIds = new Set<string>();
      for (let i = 0; i < rebalancedJobs.length; i++) {
        selectedIds.add(getJobId(rebalancedJobs[i]));
      }
      const diverseJobs: JobWithSource[] = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const j = jobsArray[i];
        if (selectedIds.has(getJobId(j))) continue;
        const jobSource = j.source || 'unknown';
        if (jobSource !== dominantSource && canAddFromSource(jobSource)) {
          diverseJobs.push(j);
        }
      }
      
      // ENTERPRISE-LEVEL FIX: Sort diverse jobs by quality first, then source diversity
      diverseJobs.sort((a, b) => {
        // Primary: Quality (match_score DESC)
        const scoreA = getJobScore(a);
        const scoreB = getJobScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        
        // Secondary: Source diversity
        const sourceA = a.source || 'unknown';
        const sourceB = b.source || 'unknown';
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;
        return countA - countB;
      });
      
      // Add diverse jobs to fill slots (with quality floor check)
      // Get the minimum score of jobs we're removing (to ensure we don't degrade quality)
      const removedJobScores: number[] = [];
      for (let i = 0; i < toRemove.length; i++) {
        removedJobScores.push(getJobScore(toRemove[i].job));
      }
      const minRemovedScore = removedJobScores.length > 0 
        ? Math.min(...removedJobScores) 
        : 0;
      
      const toAdd = Math.min(excess, diverseJobs.length);
      let addedCount = 0;
      for (let i = 0; i < diverseJobs.length && addedCount < toAdd; i++) {
        const job = diverseJobs[i];
        const jobScore = getJobScore(job);
        
        // QUALITY FLOOR: Only add if job is within threshold of minimum removed score
        // This ensures we don't replace "Excellent" (95) with "Fair" (60) just for diversity
        if (jobScore >= minRemovedScore - qualityFloorThreshold) {
          rebalancedJobs.push(job);
          sourceCounts[job.source || 'unknown'] = (sourceCounts[job.source || 'unknown'] || 0) + 1;
          addedCount++;
        } else {
          // Log when quality floor prevents a swap
          console.debug('[JobDistribution] Quality floor prevented swap', {
            removedScore: minRemovedScore,
            candidateScore: jobScore,
            threshold: qualityFloorThreshold,
            reason: `Candidate score ${jobScore} is more than ${qualityFloorThreshold} points below minimum removed score ${minRemovedScore}`
          });
        }
      }
      
      selectedJobs.length = 0;
      selectedJobs.push(...rebalancedJobs);
      
      // If rebalancing reduced job count, try to fill remaining slots
      // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
      if (selectedJobs.length < targetCount && jobsArray.length >= targetCount) {
        const selectedIds = new Set<string>();
        for (let i = 0; i < selectedJobs.length; i++) {
          selectedIds.add(getJobId(selectedJobs[i]));
        }
        const remaining: JobWithSource[] = [];
        for (let i = 0; i < jobsArray.length; i++) {
          const j = jobsArray[i];
          if (!selectedIds.has(getJobId(j))) {
            remaining.push(j);
          }
        }
        
        // Sort by source diversity first
        // ENTERPRISE-LEVEL FIX: Sort remaining jobs by quality first, then source diversity
        remaining.sort((a, b) => {
          // Primary: Quality (match_score DESC)
          const scoreA = getJobScore(a);
          const scoreB = getJobScore(b);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          
          // Secondary: Source diversity
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
  // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
  // CRITICAL FIX: Add iteration limit check here too
  if (selectedJobs.length < targetCount && iterationCount < MAX_ITERATIONS) {
    const selectedIds = new Set<string>();
    for (let i = 0; i < selectedJobs.length; i++) {
      selectedIds.add(getJobId(selectedJobs[i]));
    }
    const remaining: JobWithSource[] = [];
    for (let i = 0; i < jobsArray.length; i++) {
      const job = jobsArray[i];
      if (!selectedIds.has(getJobId(job))) {
        remaining.push(job);
      }
    }

    // ENTERPRISE-LEVEL FIX: Sort by quality first, then diversity factors
    remaining.sort((a, b) => {
      // Primary: Quality (match_score DESC)
      const scoreA = getJobScore(a);
      const scoreB = getJobScore(b);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Secondary: Source diversity, city balance, AND work environment balance
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
      // CRITICAL FIX: Use effectiveTargetCities for city balance preference
      if (ensureCityBalance && effectiveTargetCities.length > 0) {
        const cityA = a.city || '';
        const cityB = b.city || '';
        const locationA = ((a as any).location || '').toLowerCase();
        const locationB = ((b as any).location || '').toLowerCase();
        const needsA = needsMoreFromCity(cityA, locationA);
        const needsB = needsMoreFromCity(cityB, locationB);
        if (needsA !== needsB) return needsB ? 1 : -1;
      }
      
      // If city balance is equal, prefer work environments we need more from
      if (ensureWorkEnvironmentBalance && targetWorkEnvironments.length > 0) {
        const needsA = needsMoreFromWorkEnv(a);
        const needsB = needsMoreFromWorkEnv(b);
        if (needsA !== needsB) return needsB ? 1 : -1;
      }
      
      return 0;
    });

    // QUALITY FLOOR: Get minimum score of currently selected jobs
    let minSelectedScore = 100; // Start high
    if (selectedJobs.length > 0) {
      for (let i = 0; i < selectedJobs.length; i++) {
        const score = getJobScore(selectedJobs[i]);
        if (score < minSelectedScore) {
          minSelectedScore = score;
        }
      }
    }

    // CRITICAL FIX: Limit iterations in this loop too
    const maxFillIterations = Math.min(remaining.length, MAX_ITERATIONS - iterationCount, targetCount - selectedJobs.length);
    for (let i = 0; i < maxFillIterations && selectedJobs.length < targetCount && iterationCount < MAX_ITERATIONS; i++) {
      iterationCount++;
      const job = remaining[i];
      if (!job) break;
      
      const source = job.source || 'unknown';
      const jobScore = getJobScore(job);
      
      // QUALITY FLOOR: Only add if job meets quality threshold
      // Allow if: within quality floor threshold OR we're running out of iterations (fallback)
      const meetsQualityFloor = jobScore >= minSelectedScore - qualityFloorThreshold;
      const canRelaxForDiversity = iterationCount > MAX_ITERATIONS * 0.8;
      
      // CRITICAL FIX: Relax source constraint if we're running out of iterations
      if ((canAddFromSource(source) || canRelaxForDiversity) && (meetsQualityFloor || canRelaxForDiversity)) {
        selectedJobs.push(job);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        
        // Update minimum selected score if this job has a lower score
        if (jobScore < minSelectedScore) {
          minSelectedScore = jobScore;
        }
        
        // Update city count if tracking (use consistent matching)
        // CRITICAL: Use imperative loop instead of find to avoid TDZ errors
        // CRITICAL FIX: Check against all target cities for tracking
        if (targetCities.length > 0) {
          const jobCity = (job.city || '').toLowerCase();
          const jobLocation = ((job as any).location || '').toLowerCase();
          let matchedCity: string | undefined;
          // First check effective cities
          for (let j = 0; j < effectiveTargetCities.length; j++) {
            if (matchesCity(jobCity, jobLocation, effectiveTargetCities[j])) {
              matchedCity = effectiveTargetCities[j];
              break;
            }
          }
          // If not found, check all target cities
          if (!matchedCity) {
            for (let j = 0; j < targetCities.length; j++) {
              if (matchesCity(jobCity, jobLocation, targetCities[j])) {
                matchedCity = targetCities[j];
                break;
              }
            }
          }
          if (matchedCity) {
            cityCounts[matchedCity.toLowerCase()] = (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
          }
        }
        
        // Update work environment count if tracking
        if (canBalanceWorkEnvironments && targetWorkEnvironments.length > 0) {
          const jobEnv = getJobWorkEnv(job);
          if (jobEnv) {
            workEnvCounts[jobEnv] = (workEnvCounts[jobEnv] || 0) + 1;
          }
        }
      }
    }
  }

  // Step 7: Final fill (if still not enough, relax ALL constraints)
  // CRITICAL: Use imperative loops instead of map/filter to avoid TDZ errors
  // CRITICAL FIX: This is the last resort - just fill with any remaining jobs
  if (selectedJobs.length < targetCount) {
    const selectedIds = new Set<string>();
    for (let i = 0; i < selectedJobs.length; i++) {
      selectedIds.add(getJobId(selectedJobs[i]));
    }
    const remaining: JobWithSource[] = [];
    for (let i = 0; i < jobsArray.length; i++) {
      const job = jobsArray[i];
      if (!selectedIds.has(getJobId(job))) {
        remaining.push(job);
      }
    }

    // CRITICAL FIX: Limit final fill to prevent timeout
    const maxFinalFill = Math.min(remaining.length, targetCount - selectedJobs.length);
    for (let i = 0; i < maxFinalFill; i++) {
      if (selectedJobs.length >= targetCount) break;
      selectedJobs.push(remaining[i]);
    }
    
    if (selectedJobs.length < targetCount) {
      console.warn('[JobDistribution] Could not fill all slots', {
        selectedCount: selectedJobs.length,
        targetCount,
        availableJobs: remaining.length
      });
    }
  }

  // Step 8: ENFORCE MINIMUM 2 SOURCES (Quality Floor Protected)
  // Ensure we have at least 2 different sources in final selection
  const finalSelectedJobs = selectedJobs.slice(0, targetCount);
  const finalSourceCounts: Record<string, number> = {};
  const finalSourceSet = new Set<string>();
  // MIN_REQUIRED_SOURCES already defined at line 131 in function scope
  
  // Count sources in final selection
  for (let i = 0; i < finalSelectedJobs.length; i++) {
    const source = finalSelectedJobs[i].source || 'unknown';
    finalSourceCounts[source] = (finalSourceCounts[source] || 0) + 1;
    if (source !== 'unknown') {
      finalSourceSet.add(source);
    }
  }
  
  // If we have fewer than 2 sources and multiple sources are available, enforce diversity
  if (finalSourceSet.size < MIN_REQUIRED_SOURCES && hasMultipleSources && finalSelectedJobs.length >= MIN_REQUIRED_SOURCES) {
    console.log('[JobDistribution] Enforcing minimum 2 sources', {
      currentSources: Array.from(finalSourceSet),
      requiredSources: MIN_REQUIRED_SOURCES,
      totalJobs: finalSelectedJobs.length
    });
    
    // Find jobs from underrepresented sources
    const underrepresentedSources: string[] = [];
    for (const source of uniqueSources) {
      if (!finalSourceSet.has(source)) {
        underrepresentedSources.push(source);
      }
    }
    
    if (underrepresentedSources.length > 0) {
      // Get minimum score of currently selected jobs (for quality floor)
      let minSelectedScore = 100;
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        const score = getJobScore(finalSelectedJobs[i]);
        if (score < minSelectedScore) {
          minSelectedScore = score;
        }
      }
      
      // Find lowest-scoring job from overrepresented source to potentially replace
      const overrepresentedSource = Array.from(finalSourceSet)[0];
      const jobsFromOverrepresented: Array<{ job: JobWithSource; index: number; score: number }> = [];
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        const job = finalSelectedJobs[i];
        if ((job.source || 'unknown') === overrepresentedSource) {
          jobsFromOverrepresented.push({
            job,
            index: i,
            score: getJobScore(job)
          });
        }
      }
      
      // Sort by score (lowest first - these are candidates for replacement)
      jobsFromOverrepresented.sort((a, b) => a.score - b.score);
      
      // Find replacement jobs from underrepresented sources
      const selectedIds = new Set<string>();
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        selectedIds.add(getJobId(finalSelectedJobs[i]));
      }
      
      const replacementCandidates: Array<{ job: JobWithSource; score: number }> = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        if (selectedIds.has(getJobId(job))) continue;
        
        const jobSource = job.source || 'unknown';
        if (underrepresentedSources.includes(jobSource)) {
          const jobScore = getJobScore(job);
          // QUALITY FLOOR: Only consider if within threshold of lowest selected
          if (jobScore >= minSelectedScore - qualityFloorThreshold) {
            replacementCandidates.push({ job, score: jobScore });
          }
        }
      }
      
      // Sort replacement candidates by score (highest first)
      replacementCandidates.sort((a, b) => b.score - a.score);
      
      // Replace lowest-scoring jobs from overrepresented source with best from underrepresented
      let replacedCount = 0;
      const neededReplacements = MIN_REQUIRED_SOURCES - finalSourceSet.size;
      
      for (let i = 0; i < Math.min(neededReplacements, jobsFromOverrepresented.length, replacementCandidates.length); i++) {
        const toReplace = jobsFromOverrepresented[i];
        const replacement = replacementCandidates[i];
        
        // Double-check quality floor
        if (replacement.score >= toReplace.score - qualityFloorThreshold) {
          // Replace in final selection
          const replaceIndex = finalSelectedJobs.findIndex(j => getJobId(j) === getJobId(toReplace.job));
          if (replaceIndex !== -1) {
            finalSelectedJobs[replaceIndex] = replacement.job;
            replacedCount++;
            finalSourceSet.add(replacement.job.source || 'unknown');
            
            console.log('[JobDistribution] Source diversity swap', {
              replaced: {
                source: toReplace.job.source,
                score: toReplace.score
              },
              replacement: {
                source: replacement.job.source,
                score: replacement.score
              },
              qualityFloor: qualityFloorThreshold
            });
          }
        }
      }
      
      if (replacedCount > 0) {
        console.log('[JobDistribution] Enforced minimum 2 sources', {
          replacedCount,
          finalSources: Array.from(finalSourceSet),
          totalJobs: finalSelectedJobs.length
        });
      } else {
        console.warn('[JobDistribution] Could not enforce minimum 2 sources (quality floor prevented swaps)', {
          currentSources: Array.from(finalSourceSet),
          availableSources: Array.from(uniqueSources),
          qualityFloor: qualityFloorThreshold,
          minSelectedScore
        });
      }
    }
  }

  return finalSelectedJobs.slice(0, targetCount);
}

/**
 * Get distribution stats for logging/debugging
 */
export function getDistributionStats(jobs: JobWithSource[]): {
  sourceDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  workEnvironmentDistribution: Record<string, number>;
  totalJobs: number;
} {
  // CRITICAL FIX: Capture jobs parameter immediately to prevent TDZ errors during bundling
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  
  const sourceDistribution: Record<string, number> = {};
  const cityDistribution: Record<string, number> = {};
  const workEnvironmentDistribution: Record<string, number> = {};

  // Helper to get work environment from job (same logic as main function)
  const getJobWorkEnv = (job: JobWithSource): string => {
    if ((job as any).work_environment) {
      const env = String((job as any).work_environment).toLowerCase().trim();
      if (env === 'office' || env === 'on-site' || env === 'onsite') return 'on-site';
      if (env === 'hybrid') return 'hybrid';
      if (env === 'remote') return 'remote';
    }
    const location = ((job as any).location || '').toLowerCase();
    if (location.includes('remote') || location.includes('work from home') || location.includes('wfh')) {
      return 'remote';
    }
    if (location.includes('hybrid')) {
      return 'hybrid';
    }
    return 'on-site';
  };

  // CRITICAL: Use imperative loop instead of forEach to avoid TDZ errors
  for (let i = 0; i < jobsArray.length; i++) {
    const job = jobsArray[i];
    const source = job.source || 'unknown';
    const city = job.city || 'unknown';
    const workEnv = getJobWorkEnv(job);
    
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
    cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    workEnvironmentDistribution[workEnv] = (workEnvironmentDistribution[workEnv] || 0) + 1;
  }

  return {
    sourceDistribution,
    cityDistribution,
    workEnvironmentDistribution,
    totalJobs: jobsArray.length
  };
}

