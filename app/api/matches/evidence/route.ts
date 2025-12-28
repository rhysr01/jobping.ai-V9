import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { verifySecureToken } from '@/Utils/auth/secureTokens';
import { apiLogger } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobHash = searchParams.get('jobHash');
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!jobHash || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters: jobHash and email' },
        { status: 400 }
      );
    }

    // Verify JWT token if provided
    if (token) {
      const verification = verifySecureToken(email, token, 'match_evidence');
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.reason || 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    const supabase = getDatabaseClient();

    // Fetch match data
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('match_score, match_reason, matched_at, user_email')
      .eq('job_hash', jobHash)
      .eq('user_email', email)
      .order('matched_at', { ascending: false })
      .limit(1)
      .single();

    if (matchError || !match) {
      apiLogger.warn('Match not found for evidence page', {
        jobHash,
        email,
        error: matchError?.message
      });
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company, location, description, job_url, job_hash, is_active, categories')
      .eq('job_hash', jobHash)
      .single();

    if (jobError || !job) {
      apiLogger.warn('Job not found for evidence page', {
        jobHash,
        error: jobError?.message
      });
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Extract highlighted matches (skills/keywords/locations) from match_reason
    const highlightedMatches = extractHighlightedMatches(
      match.match_reason || '',
      job.description || '',
      job.location || '',
      job.categories || []
    );

    return NextResponse.json({
      job,
      match: {
        match_score: match.match_score,
        match_reason: match.match_reason,
        matched_at: match.matched_at
      },
      user_email: email,
      highlightedMatches
    });
  } catch (error) {
    apiLogger.error('Error fetching match evidence', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract highlighted skills, keywords, and locations from match_reason
 * Returns array of strings like: ["Python", "London", "Strategy consulting"]
 */
function extractHighlightedMatches(
  matchReason: string,
  jobDescription: string,
  jobLocation: string,
  jobCategories: string[]
): string[] {
  const highlights: string[] = [];
  const seen = new Set<string>();

  // Common skills to look for
  const skillKeywords = [
    'python', 'javascript', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes',
    'excel', 'tableau', 'powerbi', 'salesforce', 'hubspot',
    'data analysis', 'project management', 'digital marketing', 'content creation',
    'financial modeling', 'accounting', 'investment analysis',
    'user experience', 'visual design', 'prototyping',
    'strategic thinking', 'problem solving', 'leadership', 'communication'
  ];

  // Extract location (if mentioned in match_reason)
  if (jobLocation) {
    const locationMatch = matchReason.match(new RegExp(`\\b${jobLocation.split(',')[0]}\\b`, 'i'));
    if (locationMatch && !seen.has(jobLocation)) {
      highlights.push(jobLocation.split(',')[0].trim());
      seen.add(jobLocation);
    }
  }

  // Extract career path/category
  if (jobCategories && jobCategories.length > 0) {
    const category = jobCategories[0];
    // Format: "strategy-business-design" -> "Strategy & Business Design"
    const formattedCategory = category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' & ');
    
    if (matchReason.toLowerCase().includes(category.toLowerCase()) && !seen.has(formattedCategory)) {
      highlights.push(formattedCategory);
      seen.add(formattedCategory);
    }
  }

  // Extract skills mentioned in match_reason or job description
  const combinedText = `${matchReason} ${jobDescription}`.toLowerCase();
  for (const skill of skillKeywords) {
    if (combinedText.includes(skill) && !seen.has(skill)) {
      // Capitalize skill name
      const capitalized = skill
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      highlights.push(capitalized);
      seen.add(skill);
    }
  }

  // Limit to top 6 most relevant highlights
  return highlights.slice(0, 6);
}

