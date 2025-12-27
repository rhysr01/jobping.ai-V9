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
    const diverseJobs: any[] = [];
    const usedJobHashes = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const city = targetCities[i];
      const categories = targetCategories[i];
      
      // Try to find a job in this city with matching category
      const { data: cityJobs, error: cityError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('city', city)
        .eq('is_active', true)
        .overlaps('categories', categories)
        .not('job_hash', 'in', Array.from(usedJobHashes))
        .limit(1);

      if (!cityError && cityJobs && cityJobs.length > 0) {
        const job = cityJobs[0];
        diverseJobs.push({
          ...job,
          matchScore: 0.90 - (i * 0.01), // Vary match scores: 90%, 89%, 88%, 87%, 86%
          matchReason: `Perfect match for ${categories[0].replace('-', ' ')} roles in ${city}`,
        });
        usedJobHashes.add(job.job_hash);
      } else {
        // Fallback: try any job in this city
        const { data: fallbackJobs, error: fallbackError } = await supabase
          .from('jobs')
          .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
          .eq('city', city)
          .eq('is_active', true)
          .not('job_hash', 'in', Array.from(usedJobHashes))
          .limit(1);

        if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
          const job = fallbackJobs[0];
          diverseJobs.push({
            ...job,
            matchScore: 0.90 - (i * 0.01),
            matchReason: `Great match for roles in ${city}`,
          });
          usedJobHashes.add(job.job_hash);
        }
      }
    }

    // If we don't have 5 diverse jobs, fetch from real user matches as fallback
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
            .limit(10);

          if (!matchesError && matches && matches.length > 0) {
            const jobHashes = matches
              .map(m => m.job_hash)
              .filter(Boolean)
              .filter(hash => !usedJobHashes.has(hash))
              .slice(0, 5 - diverseJobs.length);

            if (jobHashes.length > 0) {
              const { data: userJobs, error: jobsError } = await supabase
                .from('jobs')
                .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
                .in('job_hash', jobHashes)
                .eq('is_active', true);

              if (!jobsError && userJobs) {
                const matchMap = new Map(matches.map(m => [m.job_hash, { score: m.match_score, reason: m.match_reason }]));
                userJobs.forEach(job => {
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

    if (diverseJobs.length === 0) {
      console.error('No diverse jobs found');
      return NextResponse.json({ jobs: [], error: 'No jobs found' }, { status: 500 });
    }

    // Format jobs
    const formattedJobs = diverseJobs.map((job) => {
      return {
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        jobUrl: job.job_url || '#', // Use '#' if no URL (will disable button)
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

