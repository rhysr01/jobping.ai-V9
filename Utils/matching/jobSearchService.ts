import type { PostgrestResponse, SupabaseClient } from '@supabase/supabase-js';

import { apiLogger } from '@/lib/api-logger';
import type { Database } from '@/lib/database.types';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';
import type { UserPreferences } from '@/Utils/matching/types';

type JobRow = Database['public']['Tables']['jobs']['Row'];

export interface FetchJobsResult {
  jobs: JobRow[];
  filters: {
    cityCount: number;
    categoryCount: number;
  };
}

export class JobFetchError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'JobFetchError';
  }
}

export async function fetchCandidateJobs(
  supabase: SupabaseClient<Database>,
  jobCap: number,
  users: Array<{ preferences: UserPreferences }>
): Promise<FetchJobsResult> {
  apiLogger.info('Using optimized database filtering for job search');

  const allCities = new Set<string>();
  const allCareerPaths = new Set<string>();

  users.forEach(user => {
    user.preferences.target_cities?.forEach(city => allCities.add(city));
    if (user.preferences.career_path) {
      user.preferences.career_path.forEach(path => {
        const dbCategories = getDatabaseCategoriesForForm(path);
        dbCategories.forEach(cat => allCareerPaths.add(cat));
      });
    }
  });

  let query = supabase
    .from('jobs')
    .select(
      'job_hash, title, company, location, description, source, created_at, original_posted_date, last_seen_at, status, job_url, is_active, is_graduate, is_internship, categories, city, country, skills'
    )
    .eq('is_active', true);

  if (allCities.size > 0 && allCities.size <= 50) {
    const citiesArray = Array.from(allCities);
    query = query.in('city', citiesArray);
    apiLogger.debug(`Filtering by ${citiesArray.length} cities at DB level`, {
      cities: citiesArray.slice(0, 5)
    });
  }

  if (allCareerPaths.size > 0 && allCareerPaths.size <= 20) {
    const categoriesArray = Array.from(allCareerPaths);
    query = query.overlaps('categories', categoriesArray);
    apiLogger.debug(`Filtering by ${categoriesArray.length} categories at DB level`, {
      categories: categoriesArray.slice(0, 5)
    });
  }

  query = query.order('created_at', { ascending: false }).limit(jobCap);

  const { data, error } = (await query) as PostgrestResponse<JobRow>;

  if (error) {
    apiLogger.error('Failed to fetch jobs', error as Error, {
      jobCap,
      userCount: users.length
    });
    throw new JobFetchError('Failed to fetch jobs', error);
  }

  const jobs = data || [];

  apiLogger.info(`Fetched ${jobs.length} jobs using optimized database filtering`, {
    citiesFiltered: allCities.size,
    categoriesFiltered: allCareerPaths.size,
    jobsReturned: jobs.length
  });

  return {
    jobs,
    filters: {
      cityCount: allCities.size,
      categoryCount: allCareerPaths.size
    }
  };
}

