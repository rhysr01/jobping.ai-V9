import { useState, useEffect } from 'react';
import { apiCall, apiCallJson, ApiError } from '@/lib/api-client';

interface StatsData {
  activeJobs: number;
  totalUsers: number;
  internships: number;
  graduates: number;
  earlyCareer: number;
  weeklyNewJobs: number;
  avgTimeToApply: {
    premium: number; // in hours
    free: number; // in hours
  };
}

interface UseStatsReturn {
  stats: StatsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Simple cache implementation (5 minute TTL)
const CACHE_KEY = 'jobping_stats_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedStats(): { data: StatsData; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function setCachedStats(data: StatsData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore localStorage errors
  }
}

const parseStat = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/,/g, ''));
    if (!Number.isNaN(numeric)) return numeric;
  }
  return fallback;
};

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    // Check cache first
    const cached = getCachedStats();
    if (cached) {
      setStats(cached.data);
      setIsLoading(false);
      setError(null);
      
      // Fetch fresh data in background
      apiCallJson('/api/stats')
        .then(data => {
          if (data) {
            const freshStats: StatsData = {
              activeJobs: parseStat(data.data?.activeJobs ?? data.data?.activeJobsFormatted ?? data.activeJobs ?? data.activeJobsFormatted, 12748),
              totalUsers: parseStat(data.data?.totalUsers ?? data.data?.totalUsersFormatted ?? data.totalUsers ?? data.totalUsersFormatted, 3400),
              internships: parseStat(data.data?.internships ?? data.internships, 4997),
              graduates: parseStat(data.data?.graduates ?? data.graduates, 3953),
              earlyCareer: parseStat(data.data?.earlyCareer ?? data.earlyCareer, 0),
              weeklyNewJobs: parseStat(data.data?.weeklyNewJobs ?? data.data?.weeklyNewJobsFormatted ?? data.weeklyNewJobs ?? data.weeklyNewJobsFormatted, 287),
              avgTimeToApply: data.data?.avgTimeToApply ?? data.avgTimeToApply ?? { premium: 12, free: 72 },
            };
            setStats(freshStats);
            setCachedStats(freshStats);
          }
        })
        .catch(() => {
          // Ignore background fetch errors
        });
      return;
    }

    // No cache, fetch fresh
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiCallJson('/api/stats');
      const freshStats: StatsData = {
        activeJobs: parseStat(data.data?.activeJobs ?? data.data?.activeJobsFormatted ?? data.activeJobs ?? data.activeJobsFormatted, 12748),
        totalUsers: parseStat(data.data?.totalUsers ?? data.data?.totalUsersFormatted ?? data.totalUsers ?? data.totalUsersFormatted, 3400),
        internships: parseStat(data.data?.internships ?? data.internships, 4997),
        graduates: parseStat(data.data?.graduates ?? data.graduates, 3953),
        earlyCareer: parseStat(data.data?.earlyCareer ?? data.earlyCareer, 0),
        weeklyNewJobs: parseStat(data.data?.weeklyNewJobs ?? data.data?.weeklyNewJobsFormatted ?? data.weeklyNewJobs ?? data.weeklyNewJobsFormatted, 287),
        avgTimeToApply: data.data?.avgTimeToApply ?? data.avgTimeToApply ?? { premium: 12, free: 72 },
      };
      
      setStats(freshStats);
      setCachedStats(freshStats);
      setError(null);
    } catch (err) {
      const error = err instanceof ApiError 
        ? err 
        : err instanceof Error 
          ? err 
          : new Error('Failed to fetch stats');
      setError(error);
      // Use defaults on error
      setStats({
        activeJobs: 12748,
        totalUsers: 3400,
        internships: 4997,
        graduates: 3953,
        earlyCareer: 0,
        weeklyNewJobs: 287,
        avgTimeToApply: { premium: 12, free: 72 },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

