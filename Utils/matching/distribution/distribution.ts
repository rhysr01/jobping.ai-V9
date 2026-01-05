/**
 * Distribution Algorithm Domain - Main job distribution with diversity
 * This is the core algorithm that orchestrates all distribution logic
 */

import { matchesCity } from "./cityMatching";
import {
  checkCityBalance,
  checkSourceDiversity,
  checkWorkEnvironmentBalance,
} from "./feasibility";
import type { DistributionOptions, JobWithSource } from "./types";
import {
  getJobWorkEnv,
  matchesWorkEnvironment,
  normalizeWorkEnv,
} from "./workEnvironment";

/**
 * Distributes jobs ensuring:
 * 1. Source diversity (not all from one source)
 * 2. City balance (equal distribution across selected cities)
 * 3. Work environment balance (equal distribution across selected work environments)
 */
export function distributeJobsWithDiversity(
  jobs: JobWithSource[],
  options: DistributionOptions & { relaxed?: boolean },
): JobWithSource[] {
  const jobsArray = Array.isArray(jobs) ? jobs : [];

  const {
    targetCount,
    targetCities,
    maxPerSource = Math.ceil(targetCount / 3),
    ensureCityBalance: initialCityBalance = true,
    targetWorkEnvironments = [],
    ensureWorkEnvironmentBalance: initialWorkEnvBalance = true,
    qualityFloorThreshold = 10,
    relaxed = false,
  } = options;

  if (jobsArray.length === 0) return [];
  if (targetCount <= 0) return [];

  // Apply relaxed mode: if relaxed, allow more from one source and relax city balance
  const effectiveMaxPerSource = relaxed
    ? Math.ceil(targetCount / 2) // Relaxed: allow 50% from one source
    : maxPerSource;

  let ensureCityBalance = relaxed ? false : initialCityBalance;
  if (targetCities.length === 0) {
    ensureCityBalance = false;
  }

  let ensureWorkEnvironmentBalance = relaxed ? false : initialWorkEnvBalance;
  if (targetWorkEnvironments.length === 0) {
    ensureWorkEnvironmentBalance = false;
  }

  // Check source diversity feasibility
  const sourceDiversity = checkSourceDiversity(
    jobsArray,
    targetCount,
    effectiveMaxPerSource, // Use relaxed max if applicable
  );
  const {
    hasMultipleSources,
    effectiveMaxPerSource: effectiveMax,
    uniqueSources,
  } = sourceDiversity;

  // Use the effective max from source diversity check, but respect relaxed mode
  const finalMaxPerSource = relaxed ? effectiveMaxPerSource : effectiveMax;

  // Check city balance feasibility
  const cityBalance = checkCityBalance(
    jobsArray,
    targetCities,
    targetCount,
    ensureCityBalance,
  );
  let { canBalanceCities, effectiveTargetCities } = cityBalance;

  // Check work environment balance feasibility
  const canBalanceWorkEnvironments = checkWorkEnvironmentBalance(
    jobsArray,
    targetWorkEnvironments,
    targetCount,
    ensureWorkEnvironmentBalance,
  );

  // Calculate jobs per city and work environment
  const jobsPerCity =
    canBalanceCities && effectiveTargetCities.length > 0
      ? Math.floor(targetCount / effectiveTargetCities.length)
      : targetCount;

  const cityRemainder =
    canBalanceCities && effectiveTargetCities.length > 0
      ? targetCount % effectiveTargetCities.length
      : 0;

  const jobsPerWorkEnv =
    canBalanceWorkEnvironments && targetWorkEnvironments.length > 0
      ? Math.floor(targetCount / targetWorkEnvironments.length)
      : targetCount;

  const workEnvRemainder =
    canBalanceWorkEnvironments && targetWorkEnvironments.length > 0
      ? targetCount % targetWorkEnvironments.length
      : 0;

  // Group jobs by source and city
  const jobsBySource: Record<string, JobWithSource[]> = {};
  const jobsByCity: Record<string, JobWithSource[]> = {};

  for (let i = 0; i < jobsArray.length; i++) {
    const job = jobsArray[i];
    const source = job.source || "unknown";
    const city = job.city || "unknown";

    if (!jobsBySource[source]) jobsBySource[source] = [];
    jobsBySource[source].push(job);

    if (!jobsByCity[city]) jobsByCity[city] = [];
    jobsByCity[city].push(job);
  }

  // Initialize counters
  const selectedJobs: JobWithSource[] = [];
  const sourceCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const workEnvCounts: Record<string, number> = {};

  const sourceKeys = Object.keys(jobsBySource);
  for (let i = 0; i < sourceKeys.length; i++) {
    sourceCounts[sourceKeys[i]] = 0;
  }

  for (let i = 0; i < targetCities.length; i++) {
    cityCounts[targetCities[i].toLowerCase()] = 0;
  }

  for (let i = 0; i < targetWorkEnvironments.length; i++) {
    const normalizedEnv = normalizeWorkEnv(targetWorkEnvironments[i]);
    if (normalizedEnv) {
      workEnvCounts[normalizedEnv] = 0;
    }
  }

  // Helper functions
  const getJobId = (job: JobWithSource): string => {
    if (job.job_hash) return job.job_hash;
    const title = (job as any).title || "";
    const company = (job as any).company || "";
    const city = job.city || "";
    const location = ((job as any).location || "").substring(0, 50);
    const url = ((job as any).job_url || "").substring(0, 100);
    return (
      `${title}_${company}_${city}_${location}_${url}` ||
      Math.random().toString()
    );
  };

  const getJobScore = (job: JobWithSource): number => {
    const score = (job as any).match_score;
    if (score === undefined || score === null) return 0;
    return score > 1 ? score : score * 100;
  };

  const canAddFromSource = (source: string): boolean => {
    return (sourceCounts[source] || 0) < finalMaxPerSource;
  };

  const needsMoreFromCity = (city: string, location?: string): boolean => {
    if (!ensureCityBalance || effectiveTargetCities.length === 0) return true;

    const jobCity = city.toLowerCase();
    const jobLocation = (location || "").toLowerCase();
    let matchedTargetCity: string | undefined;
    for (let i = 0; i < effectiveTargetCities.length; i++) {
      if (matchesCity(jobCity, jobLocation, effectiveTargetCities[i])) {
        matchedTargetCity = effectiveTargetCities[i];
        break;
      }
    }

    if (!matchedTargetCity) return true;

    const currentCount = cityCounts[matchedTargetCity.toLowerCase()] || 0;
    const targetCountForCity =
      jobsPerCity +
      (effectiveTargetCities.indexOf(matchedTargetCity) < cityRemainder
        ? 1
        : 0);
    return currentCount < targetCountForCity;
  };

  const needsMoreFromWorkEnv = (job: JobWithSource): boolean => {
    if (!ensureWorkEnvironmentBalance || targetWorkEnvironments.length === 0)
      return true;

    const jobEnv = getJobWorkEnv(job);
    if (!jobEnv) return true;

    let matchedTargetEnv: string | undefined;
    for (let i = 0; i < targetWorkEnvironments.length; i++) {
      if (matchesWorkEnvironment(job, targetWorkEnvironments[i])) {
        matchedTargetEnv = targetWorkEnvironments[i];
        break;
      }
    }

    if (!matchedTargetEnv) return true;

    const normalizedTarget = normalizeWorkEnv(matchedTargetEnv);
    if (!normalizedTarget) return true;

    const currentCount = workEnvCounts[normalizedTarget] || 0;
    const targetCountForEnv =
      jobsPerWorkEnv +
      (targetWorkEnvironments.indexOf(matchedTargetEnv) < workEnvRemainder
        ? 1
        : 0);
    return currentCount < targetCountForEnv;
  };

  // Main selection loop
  const maxRounds =
    canBalanceCities && effectiveTargetCities.length > 0
      ? Math.ceil(targetCount / Math.max(1, effectiveTargetCities.length))
      : Math.ceil(targetCount / 2);

  const MAX_ITERATIONS = 1000;
  let iterationCount = 0;
  let consecutiveNoProgressRounds = 0;
  const MAX_NO_PROGRESS_ROUNDS = 3;

  for (
    let round = 0;
    round < maxRounds &&
    selectedJobs.length < targetCount &&
    iterationCount < MAX_ITERATIONS;
    round++
  ) {
    const jobsBeforeRound = selectedJobs.length;

    const citiesToProcess =
      canBalanceCities && effectiveTargetCities.length > 0
        ? effectiveTargetCities
        : ["any"];

    for (const targetCity of citiesToProcess) {
      if (
        selectedJobs.length >= targetCount ||
        iterationCount >= MAX_ITERATIONS
      )
        break;
      iterationCount++;

      const selectedIds = new Set<string>();
      for (let i = 0; i < selectedJobs.length; i++) {
        selectedIds.add(getJobId(selectedJobs[i]));
      }

      const availableJobs: JobWithSource[] = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        if (selectedIds.has(getJobId(job))) continue;

        if (!canBalanceCities || targetCity === "any") {
          availableJobs.push(job);
          continue;
        }

        const jobCity = (job.city || "").toLowerCase();
        const jobLocation = ((job as any).location || "").toLowerCase();
        if (matchesCity(jobCity, jobLocation, targetCity)) {
          availableJobs.push(job);
        }
      }

      if (availableJobs.length === 0) {
        if (canBalanceCities && targetCity !== "any") {
          console.warn(
            "[JobDistribution] No jobs found for city in current pool",
            {
              targetCity,
              selectedCount: selectedJobs.length,
              targetCount,
              totalJobsInPool: jobsArray.length,
            },
          );
        }
        continue;
      }

      // Multi-criteria sorting
      availableJobs.sort((a, b) => {
        const scoreA = getJobScore(a);
        const scoreB = getJobScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        const sourceA = a.source || "unknown";
        const sourceB = b.source || "unknown";
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;

        if (countA !== countB) return countA - countB;

        const canAddA = canAddFromSource(sourceA);
        const canAddB = canAddFromSource(sourceB);
        if (canAddA !== canAddB) return canAddB ? 1 : -1;

        if (canBalanceCities && targetCity !== "any") {
          const cityA = (a.city || "").toLowerCase();
          const locA = ((a as any).location || "").toLowerCase();
          const cityB = (b.city || "").toLowerCase();
          const locB = ((b as any).location || "").toLowerCase();

          const matchesCityA = matchesCity(cityA, locA, targetCity);
          const matchesCityB = matchesCity(cityB, locB, targetCity);

          if (matchesCityA !== matchesCityB) {
            return matchesCityA ? -1 : 1;
          }
        }

        return 0;
      });

      // Select first job that fits constraints
      let foundJob = false;
      for (const job of availableJobs) {
        const source = job.source || "unknown";
        const city = job.city || "";
        const location = (job as any).location || "";

        if (
          canAddFromSource(source) &&
          needsMoreFromCity(city, location) &&
          needsMoreFromWorkEnv(job)
        ) {
          selectedJobs.push(job);
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;

          if (targetCities.length > 0) {
            const jobCity = city.toLowerCase();
            const jobLocation = location.toLowerCase();
            let matchedCity: string | undefined;
            for (let i = 0; i < effectiveTargetCities.length; i++) {
              if (matchesCity(jobCity, jobLocation, effectiveTargetCities[i])) {
                matchedCity = effectiveTargetCities[i];
                break;
              }
            }
            if (!matchedCity) {
              for (let i = 0; i < targetCities.length; i++) {
                if (matchesCity(jobCity, jobLocation, targetCities[i])) {
                  matchedCity = targetCities[i];
                  break;
                }
              }
            }
            if (matchedCity) {
              cityCounts[matchedCity.toLowerCase()] =
                (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
            }
          }

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

      // If no job found, relax constraints with quality floor
      if (!foundJob && availableJobs.length > 0) {
        let minSelectedScore = 100;
        if (selectedJobs.length > 0) {
          for (let i = 0; i < selectedJobs.length; i++) {
            const score = getJobScore(selectedJobs[i]);
            if (score < minSelectedScore) {
              minSelectedScore = score;
            }
          }
        }

        let bestJob: JobWithSource | null = null;
        for (let i = 0; i < availableJobs.length; i++) {
          const job = availableJobs[i];
          const jobScore = getJobScore(job);
          if (jobScore >= minSelectedScore - qualityFloorThreshold) {
            bestJob = job;
            break;
          }
        }

        if (!bestJob && availableJobs.length > 0) {
          bestJob = availableJobs[0];
        }

        if (bestJob) {
          selectedJobs.push(bestJob);
          const source = bestJob.source || "unknown";
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;

          // Update city counts (critical for proper distribution)
          if (targetCities.length > 0) {
            const jobCity = (bestJob.city || "").toLowerCase();
            const jobLocation = ((bestJob as any).location || "").toLowerCase();
            let matchedCity: string | undefined;
            for (let i = 0; i < effectiveTargetCities.length; i++) {
              if (matchesCity(jobCity, jobLocation, effectiveTargetCities[i])) {
                matchedCity = effectiveTargetCities[i];
                break;
              }
            }
            if (!matchedCity) {
              for (let i = 0; i < targetCities.length; i++) {
                if (matchesCity(jobCity, jobLocation, targetCities[i])) {
                  matchedCity = targetCities[i];
                  break;
                }
              }
            }
            if (matchedCity) {
              cityCounts[matchedCity.toLowerCase()] =
                (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
            }
          }

          // Update work environment counts
          if (canBalanceWorkEnvironments && targetWorkEnvironments.length > 0) {
            const jobEnv = getJobWorkEnv(bestJob);
            if (jobEnv) {
              workEnvCounts[jobEnv] = (workEnvCounts[jobEnv] || 0) + 1;
            }
          }
        }
      }
    }

    if (selectedJobs.length === jobsBeforeRound) {
      consecutiveNoProgressRounds++;
      if (consecutiveNoProgressRounds >= MAX_NO_PROGRESS_ROUNDS) {
        console.warn(
          "[JobDistribution] No progress for multiple rounds, relaxing constraints",
          {
            consecutiveNoProgressRounds,
            selectedCount: selectedJobs.length,
            targetCount,
            canBalanceCities,
            hasMultipleSources,
          },
        );
        if (canBalanceCities) {
          canBalanceCities = false;
          ensureCityBalance = false;
        }
        consecutiveNoProgressRounds = 0;
      }
    } else {
      consecutiveNoProgressRounds = 0;
    }
  }

  // Rebalance if one source dominates
  const currentSourceDistribution = Object.values(sourceCounts);
  const maxFromAnySource = Math.max(...currentSourceDistribution, 0);

  if (
    hasMultipleSources &&
    maxFromAnySource > finalMaxPerSource &&
    selectedJobs.length > 0
  ) {
    const dominantSource = Object.entries(sourceCounts).find(
      ([_, count]) => count > finalMaxPerSource,
    )?.[0];

    if (dominantSource) {
      const excess = sourceCounts[dominantSource] - finalMaxPerSource;

      const jobsFromDominantSource: Array<{
        job: JobWithSource;
        index: number;
      }> = [];
      for (let i = 0; i < selectedJobs.length; i++) {
        const job = selectedJobs[i];
        if ((job.source || "unknown") === dominantSource) {
          jobsFromDominantSource.push({ job, index: i });
        }
      }

      jobsFromDominantSource.sort((a, b) => {
        const scoreA = getJobScore(a.job);
        const scoreB = getJobScore(b.job);
        return scoreB - scoreA;
      });

      const toRemove = jobsFromDominantSource.slice(finalMaxPerSource);

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

      sourceCounts[dominantSource] = finalMaxPerSource;

      const selectedIds = new Set<string>();
      for (let i = 0; i < rebalancedJobs.length; i++) {
        selectedIds.add(getJobId(rebalancedJobs[i]));
      }
      const diverseJobs: JobWithSource[] = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const j = jobsArray[i];
        if (selectedIds.has(getJobId(j))) continue;
        const jobSource = j.source || "unknown";
        if (jobSource !== dominantSource && canAddFromSource(jobSource)) {
          diverseJobs.push(j);
        }
      }

      diverseJobs.sort((a, b) => {
        const scoreA = getJobScore(a);
        const scoreB = getJobScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        const sourceA = a.source || "unknown";
        const sourceB = b.source || "unknown";
        const countA = sourceCounts[sourceA] || 0;
        const countB = sourceCounts[sourceB] || 0;
        return countA - countB;
      });

      const removedJobScores: number[] = [];
      for (let i = 0; i < toRemove.length; i++) {
        removedJobScores.push(getJobScore(toRemove[i].job));
      }
      const minRemovedScore =
        removedJobScores.length > 0 ? Math.min(...removedJobScores) : 0;

      const toAdd = Math.min(excess, diverseJobs.length);
      let addedCount = 0;
      for (let i = 0; i < diverseJobs.length && addedCount < toAdd; i++) {
        const job = diverseJobs[i];
        const jobScore = getJobScore(job);
        if (jobScore >= minRemovedScore - qualityFloorThreshold) {
          rebalancedJobs.push(job);
          sourceCounts[job.source || "unknown"] =
            (sourceCounts[job.source || "unknown"] || 0) + 1;
          addedCount++;
        }
      }

      selectedJobs.length = 0;
      selectedJobs.push(...rebalancedJobs);

      if (
        selectedJobs.length < targetCount &&
        jobsArray.length >= targetCount
      ) {
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

        remaining.sort((a, b) => {
          const scoreA = getJobScore(a);
          const scoreB = getJobScore(b);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          const sourceA = a.source || "unknown";
          const sourceB = b.source || "unknown";
          const countA = sourceCounts[sourceA] || 0;
          const countB = sourceCounts[sourceB] || 0;
          return countA - countB;
        });

        for (
          let i = 0;
          i < remaining.length && selectedJobs.length < targetCount;
          i++
        ) {
          const job = remaining[i];
          const source = job.source || "unknown";
          if (
            canAddFromSource(source) ||
            selectedJobs.length < targetCount * 0.8
          ) {
            selectedJobs.push(job);
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          }
        }
      }
    }
  }

  // Fill remaining slots
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

    remaining.sort((a, b) => {
      const scoreA = getJobScore(a);
      const scoreB = getJobScore(b);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const sourceA = a.source || "unknown";
      const sourceB = b.source || "unknown";
      const countA = sourceCounts[sourceA] || 0;
      const countB = sourceCounts[sourceB] || 0;
      if (countA !== countB) return countA - countB;

      const canAddA = canAddFromSource(sourceA);
      const canAddB = canAddFromSource(sourceB);
      if (canAddA !== canAddB) return canAddB ? 1 : -1;

      if (ensureCityBalance && effectiveTargetCities.length > 0) {
        const cityA = a.city || "";
        const cityB = b.city || "";
        const locationA = ((a as any).location || "").toLowerCase();
        const locationB = ((b as any).location || "").toLowerCase();
        const needsA = needsMoreFromCity(cityA, locationA);
        const needsB = needsMoreFromCity(cityB, locationB);
        if (needsA !== needsB) return needsB ? 1 : -1;
      }

      if (ensureWorkEnvironmentBalance && targetWorkEnvironments.length > 0) {
        const needsA = needsMoreFromWorkEnv(a);
        const needsB = needsMoreFromWorkEnv(b);
        if (needsA !== needsB) return needsB ? 1 : -1;
      }

      return 0;
    });

    let minSelectedScore = 100;
    if (selectedJobs.length > 0) {
      for (let i = 0; i < selectedJobs.length; i++) {
        const score = getJobScore(selectedJobs[i]);
        if (score < minSelectedScore) {
          minSelectedScore = score;
        }
      }
    }

    const maxFillIterations = Math.min(
      remaining.length,
      MAX_ITERATIONS - iterationCount,
      targetCount - selectedJobs.length,
    );
    for (
      let i = 0;
      i < maxFillIterations &&
      selectedJobs.length < targetCount &&
      iterationCount < MAX_ITERATIONS;
      i++
    ) {
      iterationCount++;
      const job = remaining[i];
      if (!job) break;

      const source = job.source || "unknown";
      const jobScore = getJobScore(job);
      const meetsQualityFloor =
        jobScore >= minSelectedScore - qualityFloorThreshold;
      const canRelaxForDiversity = iterationCount > MAX_ITERATIONS * 0.8;

      if (
        (canAddFromSource(source) || canRelaxForDiversity) &&
        (meetsQualityFloor || canRelaxForDiversity)
      ) {
        selectedJobs.push(job);
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        if (jobScore < minSelectedScore) {
          minSelectedScore = jobScore;
        }

        if (targetCities.length > 0) {
          const jobCity = (job.city || "").toLowerCase();
          const jobLocation = ((job as any).location || "").toLowerCase();
          let matchedCity: string | undefined;
          for (let j = 0; j < effectiveTargetCities.length; j++) {
            if (matchesCity(jobCity, jobLocation, effectiveTargetCities[j])) {
              matchedCity = effectiveTargetCities[j];
              break;
            }
          }
          if (!matchedCity) {
            for (let j = 0; j < targetCities.length; j++) {
              if (matchesCity(jobCity, jobLocation, targetCities[j])) {
                matchedCity = targetCities[j];
                break;
              }
            }
          }
          if (matchedCity) {
            cityCounts[matchedCity.toLowerCase()] =
              (cityCounts[matchedCity.toLowerCase()] || 0) + 1;
          }
        }

        if (canBalanceWorkEnvironments && targetWorkEnvironments.length > 0) {
          const jobEnv = getJobWorkEnv(job);
          if (jobEnv) {
            workEnvCounts[jobEnv] = (workEnvCounts[jobEnv] || 0) + 1;
          }
        }
      }
    }
  }

  // Final fill if still not enough
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

    const maxFinalFill = Math.min(
      remaining.length,
      targetCount - selectedJobs.length,
    );
    for (let i = 0; i < maxFinalFill; i++) {
      if (selectedJobs.length >= targetCount) break;
      selectedJobs.push(remaining[i]);
    }

    if (selectedJobs.length < targetCount) {
      console.warn("[JobDistribution] Could not fill all slots", {
        selectedCount: selectedJobs.length,
        targetCount,
        availableJobs: remaining.length,
      });
    }
  }

  // Enforce minimum 2 sources
  const finalSelectedJobs = selectedJobs.slice(0, targetCount);
  const finalSourceCounts: Record<string, number> = {};
  const finalSourceSet = new Set<string>();
  const MIN_REQUIRED_SOURCES = 2;

  for (let i = 0; i < finalSelectedJobs.length; i++) {
    const source = finalSelectedJobs[i].source || "unknown";
    finalSourceCounts[source] = (finalSourceCounts[source] || 0) + 1;
    if (source !== "unknown") {
      finalSourceSet.add(source);
    }
  }

  if (
    finalSourceSet.size < MIN_REQUIRED_SOURCES &&
    hasMultipleSources &&
    finalSelectedJobs.length >= MIN_REQUIRED_SOURCES
  ) {
    console.log("[JobDistribution] Enforcing minimum 2 sources", {
      currentSources: Array.from(finalSourceSet),
      requiredSources: MIN_REQUIRED_SOURCES,
      totalJobs: finalSelectedJobs.length,
    });

    const underrepresentedSources: string[] = [];
    for (const source of uniqueSources) {
      if (!finalSourceSet.has(source)) {
        underrepresentedSources.push(source);
      }
    }

    if (underrepresentedSources.length > 0) {
      let minSelectedScore = 100;
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        const score = getJobScore(finalSelectedJobs[i]);
        if (score < minSelectedScore) {
          minSelectedScore = score;
        }
      }

      const overrepresentedSource = Array.from(finalSourceSet)[0];
      const jobsFromOverrepresented: Array<{
        job: JobWithSource;
        index: number;
        score: number;
      }> = [];
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        const job = finalSelectedJobs[i];
        if ((job.source || "unknown") === overrepresentedSource) {
          jobsFromOverrepresented.push({
            job,
            index: i,
            score: getJobScore(job),
          });
        }
      }

      jobsFromOverrepresented.sort((a, b) => a.score - b.score);

      const selectedIds = new Set<string>();
      for (let i = 0; i < finalSelectedJobs.length; i++) {
        selectedIds.add(getJobId(finalSelectedJobs[i]));
      }

      const replacementCandidates: Array<{
        job: JobWithSource;
        score: number;
      }> = [];
      for (let i = 0; i < jobsArray.length; i++) {
        const job = jobsArray[i];
        if (selectedIds.has(getJobId(job))) continue;

        const jobSource = job.source || "unknown";
        if (underrepresentedSources.includes(jobSource)) {
          const jobScore = getJobScore(job);
          if (jobScore >= minSelectedScore - qualityFloorThreshold) {
            replacementCandidates.push({ job, score: jobScore });
          }
        }
      }

      replacementCandidates.sort((a, b) => b.score - a.score);

      let replacedCount = 0;
      const neededReplacements = MIN_REQUIRED_SOURCES - finalSourceSet.size;

      for (
        let i = 0;
        i <
        Math.min(
          neededReplacements,
          jobsFromOverrepresented.length,
          replacementCandidates.length,
        );
        i++
      ) {
        const toReplace = jobsFromOverrepresented[i];
        const replacement = replacementCandidates[i];

        if (replacement.score >= toReplace.score - qualityFloorThreshold) {
          const replaceIndex = finalSelectedJobs.findIndex(
            (j) => getJobId(j) === getJobId(toReplace.job),
          );
          if (replaceIndex !== -1) {
            finalSelectedJobs[replaceIndex] = replacement.job;
            replacedCount++;
            finalSourceSet.add(replacement.job.source || "unknown");

            console.log("[JobDistribution] Source diversity swap", {
              replaced: {
                source: toReplace.job.source,
                score: toReplace.score,
              },
              replacement: {
                source: replacement.job.source,
                score: replacement.score,
              },
              qualityFloor: qualityFloorThreshold,
            });
          }
        }
      }

      if (replacedCount > 0) {
        console.log("[JobDistribution] Enforced minimum 2 sources", {
          replacedCount,
          finalSources: Array.from(finalSourceSet),
          totalJobs: finalSelectedJobs.length,
        });
      } else {
        console.warn(
          "[JobDistribution] Could not enforce minimum 2 sources (quality floor prevented swaps)",
          {
            currentSources: Array.from(finalSourceSet),
            availableSources: Array.from(uniqueSources),
            qualityFloor: qualityFloorThreshold,
            minSelectedScore,
          },
        );
      }
    }
  }

  return finalSelectedJobs.slice(0, targetCount);
}
