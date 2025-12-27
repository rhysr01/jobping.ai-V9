import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

export const dynamic = 'force-dynamic'; // Force dynamic rendering
export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: NextRequest) {
  try {
    const supabase = getDatabaseClient();
    const { searchParams } = new URL(req.url);
    const day = searchParams.get('day') || 'monday'; // 'monday' or 'wednesday'
    
    // Fetch a real user who has matches in the database
    // Use day parameter to rotate between different users for variety
    const userOffset = day === 'wednesday' ? 1 : 0; // Different user for Wednesday vs Monday
    
    const { data: usersWithMatches, error: userError } = await supabase
      .from('users')
      .select('email, full_name, target_cities, career_path, professional_expertise')
      .eq('active', true)
      .not('target_cities', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20); // Get more users to find one with matches

    if (userError || !usersWithMatches || usersWithMatches.length === 0) {
      console.error('Error fetching users:', userError);
      return NextResponse.json({ jobs: [], error: 'No users found' }, { status: 500 });
    }

    // Find users who have matches - try multiple users to get variety
    let selectedUser = null;
    let userMatches = null;
    const maxUsersToCheck = Math.min(10, usersWithMatches.length);

    // Start from offset to get different user based on day
    const startIndex = userOffset % maxUsersToCheck;
    
    for (let i = 0; i < maxUsersToCheck; i++) {
      const userIndex = (startIndex + i) % maxUsersToCheck;
      const user = usersWithMatches[userIndex];
      
      // Check if this user has matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('job_hash, match_score, match_reason')
        .eq('user_email', user.email)
        .gte('match_score', 0.85) // Only high-quality matches
        .order('match_score', { ascending: false })
        .limit(10);

      if (!matchesError && matches && matches.length >= 5) {
        selectedUser = user;
        userMatches = matches;
        break;
      }
      
      usersChecked++;
    }

    if (!selectedUser || !userMatches || userMatches.length < 5) {
      console.error('No user with sufficient matches found');
      return NextResponse.json({ jobs: [], error: 'No user matches found' }, { status: 500 });
    }

    // Extract job hashes from matches
    const jobHashes = userMatches.map(m => m.job_hash).filter(Boolean);
    
    // Use different offsets for Monday vs Wednesday to show different jobs
    const offset = day === 'wednesday' ? 5 : 0;
    const jobHashesToFetch = jobHashes.slice(offset, offset + 5);

    if (jobHashesToFetch.length === 0) {
      return NextResponse.json({ jobs: [], error: 'No jobs to fetch' }, { status: 500 });
    }

    // Fetch the actual jobs from the database
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
      .in('job_hash', jobHashesToFetch)
      .eq('is_active', true);

    if (jobsError || !jobs || jobs.length === 0) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json({ jobs: [], error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Create a map of job_hash -> match_score and match_reason
    const matchMap = new Map(
      userMatches.map(m => [m.job_hash, { score: m.match_score, reason: m.match_reason }])
    );

    // Format jobs with REAL match scores from the database
    const formattedJobs = jobs.map((job) => {
      const matchData = matchMap.get(job.job_hash);
      const matchScore = matchData?.score || 0.85; // Fallback to 85% if not found
      
      return {
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        jobUrl: job.job_url || '',
        jobHash: job.job_hash || '',
        categories: job.categories || [],
        workEnvironment: job.work_environment || 'Hybrid',
        isInternship: job.is_internship || false,
        isGraduate: job.is_graduate || false,
        matchScore: matchScore, // REAL match score from database
        matchReason: matchData?.reason || '', // REAL match reason
        userProfile: {
          email: selectedUser.email,
          name: selectedUser.full_name,
          cities: selectedUser.target_cities || [],
          careerPath: selectedUser.career_path || selectedUser.professional_expertise || '',
        },
      };
    });

    // Sort by match score (descending) to show best matches first
    formattedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return NextResponse.json({ 
      jobs: formattedJobs.slice(0, 5), // Ensure exactly 5 jobs
      count: formattedJobs.length,
      userProfile: formattedJobs[0]?.userProfile, // Include user profile for display
    });

  } catch (error) {
    console.error('Failed to fetch sample jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Internal server error' }, { status: 500 });
  }
}

