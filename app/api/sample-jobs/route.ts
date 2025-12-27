import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

export const dynamic = 'force-dynamic'; // Force dynamic rendering
export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: NextRequest) {
  try {
    const supabase = getDatabaseClient();
    const { searchParams } = new URL(req.url);
    const day = searchParams.get('day') || 'monday'; // 'monday' or 'wednesday'
    
    // For sample preview, fetch diverse jobs from different cities and career paths
    // Target: 5 different cities (Stockholm, Amsterdam, Berlin, Dublin, London)
    // Target: 5 different career paths (Tech, Marketing, Data, Design, Consulting)
    const targetCities = ['Stockholm', 'Amsterdam', 'Berlin', 'Dublin', 'London'];
    const targetCategories = [
      ['tech-transformation', 'tech-engineering'], // Tech
      ['marketing', 'marketing-growth'], // Marketing
      ['data-analytics', 'data-science'], // Data
      ['design', 'product-design'], // Design
      ['strategy', 'consulting'] // Consulting
    ];

    // Fetch diverse jobs - one from each city/category combination
    // CRITICAL: Only include jobs that have URLs
    const diverseJobs: any[] = [];
    const usedJobHashes = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const city = targetCities[i];
      const categories = targetCategories[i];
      
      // Try to find a job in this city with matching category AND a URL
      const { data: cityJobs, error: cityError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('city', city)
        .eq('is_active', true)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .overlaps('categories', categories)
        .not('job_hash', 'in', Array.from(usedJobHashes))
        .limit(5); // Get multiple to find one with URL

      if (!cityError && cityJobs && cityJobs.length > 0) {
        // Find first job with a valid URL
        const jobWithUrl = cityJobs.find(j => j.job_url && j.job_url.trim() !== '');
        if (jobWithUrl) {
          diverseJobs.push({
            ...jobWithUrl,
            matchScore: 0.90 - (i * 0.01), // Vary match scores: 90%, 89%, 88%, 87%, 86%
            matchReason: `Perfect match for ${categories[0].replace('-', ' ')} roles in ${city}`,
          });
          usedJobHashes.add(jobWithUrl.job_hash);
          continue;
        }
      }
      
      // Fallback: try any job in this city WITH a URL
      const { data: fallbackJobs, error: fallbackError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('city', city)
        .eq('is_active', true)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .not('job_hash', 'in', Array.from(usedJobHashes))
        .limit(5);

      if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
        const jobWithUrl = fallbackJobs.find(j => j.job_url && j.job_url.trim() !== '');
        if (jobWithUrl) {
          diverseJobs.push({
            ...jobWithUrl,
            matchScore: 0.90 - (i * 0.01),
            matchReason: `Great match for roles in ${city}`,
          });
          usedJobHashes.add(jobWithUrl.job_hash);
        }
      }
    }

    // If we don't have 5 diverse jobs WITH URLs, fetch from real user matches as fallback
    // CRITICAL: Only include jobs that have URLs
    if (diverseJobs.length < 5) {
      const { data: usersWithMatches, error: userError } = await supabase
        .from('users')
        .select('email, full_name, target_cities, career_path, professional_expertise')
        .eq('active', true)
        .not('target_cities', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!userError && usersWithMatches && usersWithMatches.length > 0) {
        for (const user of usersWithMatches) {
          if (diverseJobs.length >= 5) break;
          
          const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select('job_hash, match_score, match_reason')
            .eq('user_email', user.email)
            .gte('match_score', 0.85)
            .order('match_score', { ascending: false })
            .limit(20); // Get more to find ones with URLs

          if (!matchesError && matches && matches.length > 0) {
            const jobHashes = matches
              .map(m => m.job_hash)
              .filter(Boolean)
              .filter(hash => !usedJobHashes.has(hash))
              .slice(0, 20); // Check more jobs to find ones with URLs

            if (jobHashes.length > 0) {
              const { data: userJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
                .in('job_hash', jobHashes)
                .eq('is_active', true)
                .not('job_url', 'is', null)
                .neq('job_url', ''); // Only jobs with URLs

              if (!jobsError && userJobs && userJobs.length > 0) {
                const matchMap = new Map(matches.map(m => [m.job_hash, { score: m.match_score, reason: m.match_reason }]));
                // Filter to only jobs with valid URLs
                const jobsWithUrls = userJobs.filter(job => job.job_url && job.job_url.trim() !== '');
                
                jobsWithUrls.forEach(job => {
                  if (diverseJobs.length < 5 && !usedJobHashes.has(job.job_hash)) {
                    const matchData = matchMap.get(job.job_hash);
                    diverseJobs.push({
                      ...job,
                      matchScore: matchData?.score || 0.85,
                      matchReason: matchData?.reason || '',
                    });
                    usedJobHashes.add(job.job_hash);
                  }
                });
              }
            }
          }
        }
      }
    }

    // Ensure we have exactly 5 jobs, all with URLs
    // If we still don't have 5, try to fill with any jobs that have URLs
    if (diverseJobs.length < 5) {
      const { data: anyJobsWithUrls, error: anyError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('is_active', true)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .not('job_hash', 'in', Array.from(usedJobHashes))
        .limit(10 - diverseJobs.length);

      if (!anyError && anyJobsWithUrls && anyJobsWithUrls.length > 0) {
        anyJobsWithUrls.forEach(job => {
          if (diverseJobs.length < 5 && job.job_url && job.job_url.trim() !== '') {
            diverseJobs.push({
              ...job,
              matchScore: 0.85,
              matchReason: `Great match for roles in ${job.city || job.location}`,
            });
            usedJobHashes.add(job.job_hash);
          }
        });
      }
    }

    // Filter to only jobs with URLs (should already be filtered, but double-check)
    const validJobs = diverseJobs.filter(job => job.job_url && job.job_url.trim() !== '');
    
    if (validJobs.length === 0) {
      console.error('No jobs with URLs found');
      return NextResponse.json({ jobs: [], error: 'No jobs with URLs found' }, { status: 500 });
    }
    
    if (validJobs.length < 5) {
      console.warn(`Only found ${validJobs.length} jobs with URLs, expected 5`);
    }

    // Format jobs - use REAL job URLs from database
    const formattedJobs = validJobs.map((job) => {
      return {
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        jobUrl: job.job_url || '', // Use REAL job URL from database
        jobHash: job.job_hash || '',
        categories: job.categories || [],
        workEnvironment: job.work_environment || 'Hybrid',
        isInternship: job.is_internship || false,
        isGraduate: job.is_graduate || false,
        matchScore: job.matchScore || 0.85,
        matchReason: job.matchReason || '',
        userProfile: {
          email: 'sample@example.com',
          name: 'Sample User',
          cities: targetCities,
          careerPath: 'Diverse',
        },
      };
    });

    // Sort by match score (descending) to show best matches first
    formattedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({ 
      jobs: formattedJobs.slice(0, 5), // Ensure exactly 5 jobs
      count: formattedJobs.length,
      userProfile: formattedJobs[0]?.userProfile,
    });

  } catch (error) {
    console.error('Failed to fetch sample jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Internal server error' }, { status: 500 });
  }
}

