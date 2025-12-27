import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

export const dynamic = 'force-dynamic'; // Force dynamic rendering
export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: NextRequest) {
  try {
    const supabase = getDatabaseClient();
    const { searchParams } = new URL(req.url);
    const day = searchParams.get('day') || 'monday';
    const tier = searchParams.get('tier') || 'free'; // 'free' or 'premium'
    const weekParam = searchParams.get('week');
    
    // Calculate week number for rotation (changes weekly)
    const weekNumber = weekParam ? parseInt(weekParam, 10) : (() => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((days + start.getDay() + 1) / 7);
    })();
    
    // Use week number to rotate through users (ensures weekly rotation)
    // Rotate through 20 users: week 1 = user 0, week 2 = user 1, etc.
    const userOffset = (weekNumber - 1) % 20;
    
    // Strategy: Fetch jobs with URLs from real user matches first (most reliable)
    // Different user profiles for Free vs Premium showcases
    // Then fallback to diverse city/category combinations
    // Finally fallback to ANY jobs with URLs
    // User profile can be fictional, but jobs MUST be real
    
    const resultJobs: any[] = [];
    const usedJobHashes = new Set<string>();
    let selectedUserProfile: any = null;

    // STEP 1: Try to get jobs from real user matches (most reliable - these are real matches)
    // Use different users for Free vs Premium to show different profiles
    const { data: usersWithMatches, error: userError } = await supabase
      .from('users')
      .select('email, full_name, target_cities, career_path, professional_expertise')
      .eq('active', true)
      .not('target_cities', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20); // Check more users

    if (!userError && usersWithMatches && usersWithMatches.length > 0) {
      // Select user based on tier and week rotation
      // Ensure free and premium use different users when possible
      // If only 1 user exists, use offset in job selection instead
      const baseIndex = tier === 'premium' && usersWithMatches.length > 1 ? 1 : 0;
      const userIndex = (baseIndex + userOffset) % usersWithMatches.length;
      const selectedUsers = usersWithMatches.slice(userIndex, userIndex + 1);
      
      // Job offset: if using same user for both tiers, offset job selection
      // Free: jobs 0-4, Premium: jobs 5-9 (ensures no overlap)
      const jobOffset = (tier === 'premium' && usersWithMatches.length === 1) ? 5 : 0;
      
      for (const user of selectedUsers) {
        if (resultJobs.length >= 5) break;
        
        // Store user profile for response (can be fictional if no real user)
        selectedUserProfile = {
          email: user.email,
          name: user.full_name || 'Sample User',
          cities: user.target_cities || ['London', 'Amsterdam', 'Berlin'],
          careerPath: user.career_path?.[0] || 'Diverse',
        };
        
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('job_hash, match_score, match_reason')
          .eq('user_email', user.email)
          .gte('match_score', 0.85)
          .order('match_score', { ascending: false })
          .limit(30); // Get more matches

        if (!matchesError && matches && matches.length > 0) {
          // Apply job offset to ensure free and premium get different jobs
          const jobHashes = matches
            .map(m => m.job_hash)
            .filter(Boolean)
            .filter(hash => !usedJobHashes.has(hash))
            .slice(jobOffset, jobOffset + 30); // Offset job selection

          if (jobHashes.length > 0) {
            const { data: userJobs, error: jobsError } = await supabase
              .from('jobs')
              .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
              .in('job_hash', jobHashes)
              .eq('is_active', true)
              .not('job_url', 'is', null)
              .neq('job_url', '')
              .limit(30);

            if (!jobsError && userJobs && userJobs.length > 0) {
              const matchMap = new Map(matches.map(m => [m.job_hash, { score: m.match_score, reason: m.match_reason }]));
              
              // Filter to only jobs with valid URLs and add to results
              userJobs.forEach(job => {
                if (resultJobs.length < 5 && job.job_url && job.job_url.trim() !== '' && !usedJobHashes.has(job.job_hash)) {
                  const matchData = matchMap.get(job.job_hash);
                  resultJobs.push({
                    ...job,
                    matchScore: matchData?.score || 0.85,
                    matchReason: matchData?.reason || `Great match for roles in ${job.city || job.location}`,
                  });
                  usedJobHashes.add(job.job_hash);
                }
              });
            }
          }
        }
      }
    }

    // STEP 2: If we don't have 5 jobs yet, try diverse city/category combinations
    if (resultJobs.length < 5) {
      const targetCities = ['Stockholm', 'Amsterdam', 'Berlin', 'Dublin', 'London', 'Paris', 'Barcelona', 'Munich', 'Zurich', 'Vienna'];
      const targetCategories = [
        ['tech-transformation', 'tech-engineering'],
        ['marketing', 'marketing-growth'],
        ['data-analytics', 'data-science'],
        ['design', 'product-design'],
        ['strategy', 'consulting'],
        ['finance', 'accounting'],
        ['sales', 'business-development'],
        ['operations', 'project-management'],
        ['hr', 'people-ops'],
        ['product', 'product-management']
      ];

      for (let i = 0; i < Math.min(targetCities.length, targetCategories.length) && resultJobs.length < 5; i++) {
        const city = targetCities[i];
        const categories = targetCategories[i];
        
        // Try category match first
        const { data: cityJobs, error: cityError } = await supabase
          .from('jobs')
          .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
          .eq('city', city)
          .eq('is_active', true)
          .not('job_url', 'is', null)
          .neq('job_url', '')
          .overlaps('categories', categories)
          .not('job_hash', 'in', Array.from(usedJobHashes))
          .limit(10);

        if (!cityError && cityJobs && cityJobs.length > 0) {
          const jobWithUrl = cityJobs.find(j => j.job_url && j.job_url.trim() !== '');
          if (jobWithUrl && !usedJobHashes.has(jobWithUrl.job_hash)) {
            resultJobs.push({
              ...jobWithUrl,
              matchScore: 0.90 - (resultJobs.length * 0.01),
              matchReason: `Perfect match for ${categories[0].replace(/-/g, ' ')} roles in ${city}`,
            });
            usedJobHashes.add(jobWithUrl.job_hash);
            continue;
          }
        }
        
        // Fallback: any job in this city with URL
        const { data: fallbackJobs, error: fallbackError } = await supabase
          .from('jobs')
          .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
          .eq('city', city)
          .eq('is_active', true)
          .not('job_url', 'is', null)
          .neq('job_url', '')
          .not('job_hash', 'in', Array.from(usedJobHashes))
          .limit(10);

        if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
          const jobWithUrl = fallbackJobs.find(j => j.job_url && j.job_url.trim() !== '');
          if (jobWithUrl && !usedJobHashes.has(jobWithUrl.job_hash)) {
            resultJobs.push({
              ...jobWithUrl,
              matchScore: 0.90 - (resultJobs.length * 0.01),
              matchReason: `Great match for roles in ${city}`,
            });
            usedJobHashes.add(jobWithUrl.job_hash);
          }
        }
      }
    }

    // STEP 3: Final fallback - get ANY jobs with URLs (less strict)
    if (resultJobs.length < 5) {
      const { data: anyJobsWithUrls, error: anyError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('is_active', true)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .not('job_hash', 'in', Array.from(usedJobHashes))
        .order('created_at', { ascending: false })
        .limit(20);

      if (!anyError && anyJobsWithUrls && anyJobsWithUrls.length > 0) {
        anyJobsWithUrls.forEach(job => {
          if (resultJobs.length < 5 && job.job_url && job.job_url.trim() !== '' && !usedJobHashes.has(job.job_hash)) {
            resultJobs.push({
              ...job,
              matchScore: 0.85 + (resultJobs.length * 0.01),
              matchReason: `Great match for roles in ${job.city || job.location || 'Europe'}`,
            });
            usedJobHashes.add(job.job_hash);
          }
        });
      }
    }

    // Final validation - ensure all jobs have URLs
    const validJobs = resultJobs.filter(job => job.job_url && job.job_url.trim() !== '');
    
    if (validJobs.length === 0) {
      console.error('No jobs with URLs found after all fallbacks');
      return NextResponse.json({ jobs: [], error: 'No jobs with URLs found' }, { status: 500 });
    }
    
    if (validJobs.length < 5) {
      console.warn(`Only found ${validJobs.length} jobs with URLs, expected 5`);
    }

    // Format jobs - use REAL job URLs from database
    const formattedJobs = validJobs.map((job) => {
      // Use selected user profile if available, otherwise extract from jobs
      const cities = selectedUserProfile?.cities || [...new Set(validJobs.map(j => j.city || j.location).filter(Boolean))];
      
      return {
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        jobUrl: job.job_url || '', // Use REAL job URL from database - MUST be present
        jobHash: job.job_hash || '',
        categories: job.categories || [],
        workEnvironment: job.work_environment || 'Hybrid',
        isInternship: job.is_internship || false,
        isGraduate: job.is_graduate || false,
        matchScore: job.matchScore || 0.85,
        matchReason: job.matchReason || '',
        userProfile: selectedUserProfile || {
          email: 'sample@example.com',
          name: 'Sample User',
          cities: cities.length > 0 ? cities : ['Multiple cities'],
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

