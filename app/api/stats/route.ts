// Public stats API for landing page
// Returns active job count and other public metrics

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/Utils/supabase';

// Cache stats for 1 hour
let cachedStats: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached stats if still valid
    if (cachedStats && now - lastFetch < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedStats,
        cached: true,
        cacheAge: Math.floor((now - lastFetch) / 1000 / 60), // minutes
      });
    }

    // Fetch fresh stats
    const supabase = getSupabaseClient();
    
    // Get active job count
    const { count: activeJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (jobsError) {
      throw jobsError;
    }

    // Get internship count
    const { count: internships } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_internship', true);

    // Get graduate program count
    const { count: graduates } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_graduate', true);

    // Get user count for social proof
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .eq('email_verified', true);

    // Format numbers with commas
    const formatNumber = (num: number) => {
      return num.toLocaleString('en-US');
    };

    cachedStats = {
      activeJobs: activeJobs || 0,
      activeJobsFormatted: formatNumber(activeJobs || 0),
      internships: internships || 0,
      graduates: graduates || 0,
      totalUsers: totalUsers || 0,
      totalUsersFormatted: formatNumber(totalUsers || 0),
      lastUpdated: new Date().toISOString(),
    };

    lastFetch = now;

    return NextResponse.json({
      ...cachedStats,
      cached: false,
    });

  } catch (error) {
    console.error('Failed to fetch stats:', error);
    
    // Fallback to hardcoded stats
    return NextResponse.json({
      activeJobs: 12748,
      activeJobsFormatted: '12,748',
      internships: 3710,
      graduates: 3480,
      totalUsers: 0,
      totalUsersFormatted: '0',
      lastUpdated: new Date().toISOString(),
      fallback: true,
    });
  }
}

