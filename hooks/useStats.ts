import { useState, useEffect } from 'react';

interface StatsData {
  activeJobs: number;
  totalUsers: number;
  internships: number;
  graduates: number;
  earlyCareer: number;
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
      fetch('/api/stats')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const freshStats: StatsData = {
              activeJobs: parseStat(data.activeJobs ?? data.activeJobsFormatted, 12748),
              totalUsers: parseStat(data.totalUsers ?? data.totalUsersFormatted, 3400),
              internships: parseStat(data.internships, 4997),
              graduates: parseStat(data.graduates, 3953),
              earlyCareer: parseStat(data.earlyCareer, 0),
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
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const freshStats: StatsData = {
        activeJobs: parseStat(data.activeJobs ?? data.activeJobsFormatted, 12748),
        totalUsers: parseStat(data.totalUsers ?? data.totalUsersFormatted, 3400),
        internships: parseStat(data.internships, 4997),
        graduates: parseStat(data.graduates, 3953),
        earlyCareer: parseStat(data.earlyCareer, 0),
      };
      
      setStats(freshStats);
      setCachedStats(freshStats);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch stats');
      setError(error);
      // Use defaults on error
      setStats({
        activeJobs: 12748,
        totalUsers: 3400,
        internships: 4997,
        graduates: 3953,
        earlyCareer: 0,
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

