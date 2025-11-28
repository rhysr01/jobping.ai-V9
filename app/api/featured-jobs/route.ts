// API route to fetch featured jobs for landing page
// Cached for 24 hours to reduce DB load

import { NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

// Cache featured jobs for 24 hours
let cachedJobs: any[] = [];
let lastFetch: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours

export async function GET() {
  try {
    // Check if cache is still valid
    const now = Date.now();
    if (cachedJobs.length > 0 && now - lastFetch < CACHE_DURATION) {
      return NextResponse.json({
        jobs: cachedJobs,
        cached: true,
        cacheAge: Math.floor((now - lastFetch) / 1000 / 60), // minutes
      });
    }

    // Fetch fresh jobs from database
    const supabase = getDatabaseClient();
    
    // Get 2 high-quality early-career finance jobs in London/Zurich
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('title, company, location, job_url, description, created_at, is_internship, is_graduate')
      .eq('is_active', true)
      .or('is_internship.eq.true,is_graduate.eq.true')
      .ilike('location', '%London%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching featured jobs:', error);
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      // Fallback to any early career jobs
      const { data: fallbackJobs } = await supabase
        .from('jobs')
        .select('title, company, location, job_url, description, created_at, is_internship, is_graduate')
        .eq('is_active', true)
        .or('is_internship.eq.true,is_graduate.eq.true')
        .order('created_at', { ascending: false })
        .limit(20);
      
      cachedJobs = selectBestJobs(fallbackJobs || []);
    } else {
      cachedJobs = selectBestJobs(jobs);
    }

    lastFetch = now;

    return NextResponse.json({
      jobs: cachedJobs,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch featured jobs:', error);
    
    // Return fallback hardcoded jobs if DB fails
    return NextResponse.json({
      jobs: [
        {
          title: "Investment Banking Analyst Intern  Financial Sponsors Group",
          company: "Guggenheim Partners",
          location: "London, England",
          job_url: "https://uk.indeed.com/viewjob?jk=e35ae28b179f6b06",
          description: "Guggenheim Partners is a global investment and advisory firm with a track record of delivering results through innovative solutions. Join our Financial Sponsors Group for a 6-month internship starting January 2026.",
          is_internship: true,
          match_score: 92
        },
        {
          title: "Graduate Trainee - Finance",
          company: "NatWest Group",
          location: "London, England",
          job_url: "https://www.linkedin.com/jobs/view/4313740922",
          description: "Join NatWest Group's Finance Graduate Programme. Gain hands-on experience across financial planning, analysis, and reporting while building your career at one of the UK's leading banks.",
          is_graduate: true,
          match_score: 88
        }
      ],
      cached: false,
      fallback: true
    });
  }
}

// Select best 2 jobs for display (1 hot match, 1 regular)
function selectBestJobs(jobs: any[]): any[] {
  if (jobs.length === 0) return [];
  
  // Prioritize internships and graduate programs
  const internships = jobs.filter(j => j.is_internship);
  const graduates = jobs.filter(j => j.is_graduate && !j.is_internship);
  const others = jobs.filter(j => !j.is_internship && !j.is_graduate);
  
  // Pick 1 internship (hot match) and 1 graduate program
  const selected: any[] = [];
  
  if (internships.length > 0) {
    const bestIntern = internships[0];
    selected.push({
      ...bestIntern,
      match_score: 92, // Hot match
      description: bestIntern.description?.substring(0, 200) || ''
    });
  }
  
  if (graduates.length > 0) {
    const bestGrad = graduates[0];
    selected.push({
      ...bestGrad,
      match_score: 88,
      description: bestGrad.description?.substring(0, 200) || ''
    });
  } else if (others.length > 0) {
    const backup = others[0];
    selected.push({
      ...backup,
      match_score: 85,
      description: backup.description?.substring(0, 200) || ''
    });
  }
  
  // If we only have 1, add another
  if (selected.length === 1) {
    const remaining = jobs.filter(j => j.title !== selected[0].title);
    if (remaining.length > 0) {
      selected.push({
        ...remaining[0],
        match_score: 85,
        description: remaining[0].description?.substring(0, 200) || ''
      });
    }
  }
  
  return selected.slice(0, 2);
}

