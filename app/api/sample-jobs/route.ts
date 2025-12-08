import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: NextRequest) {
  try {
    const supabase = getDatabaseClient();
    
    // Get Strategy & Business Design category
    const strategyCategories = getDatabaseCategoriesForForm('strategy');
    
    // Fetch real Strategy & Business Design jobs in London
    let query = supabase
      .from('jobs')
      .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
      .eq('is_active', true)
      .eq('city', 'London') // Filter by London
      .overlaps('categories', strategyCategories) // Strategy & Business Design
      .order('created_at', { ascending: false })
      .limit(5);

    let { data: jobs, error } = await query;

    // If we don't have enough jobs, try without category filter
    if (!error && (!jobs || jobs.length < 3)) {
      query = supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('is_active', true)
        .eq('city', 'London')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const result = await query;
      if (!result.error && result.data) {
        jobs = result.data;
      }
    }

    if (error) {
      console.error('Error fetching sample jobs:', error);
      return NextResponse.json({ jobs: [], error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Format jobs for the component
    const formattedJobs = (jobs || []).map(job => ({
      title: job.title || 'Job Title',
      company: job.company || 'Company',
      location: job.location || 'London, UK',
      description: job.description || '',
      jobUrl: job.job_url || '',
      jobHash: job.job_hash || '', // Add this
      categories: job.categories || [],
      workEnvironment: job.work_environment || 'Hybrid',
      isInternship: job.is_internship || false,
      isGraduate: job.is_graduate || false,
    }));

    return NextResponse.json({ 
      jobs: formattedJobs,
      count: formattedJobs.length 
    });

  } catch (error) {
    console.error('Failed to fetch sample jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Internal server error' }, { status: 500 });
  }
}

