import type { SupabaseClient } from '@supabase/supabase-js';

import { apiLogger } from '@/lib/api-logger';
import type { Database } from '@/lib/database.types';
import type { UserPreferences } from '@/Utils/matching/types';

type UserRow = Database['public']['Tables']['users']['Row'];

export interface TransformedUser {
  id: string;
  email: string;
  full_name: string | null;
  preferences: UserPreferences;
  subscription_tier: 'free' | 'premium';
  created_at: string | null;
  last_email_sent: string | null;
  is_active: boolean | null;
}

export class UserFetchError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'UserFetchError';
  }
}

export async function fetchActiveUsers(
  supabase: SupabaseClient<Database>,
  limit: number
): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('active', true)
    .eq('email_verified', true) // Consistent with send-scheduled-emails - only match verified users
    .limit(limit);

  if (error) {
    apiLogger.error('Failed to fetch users', error as Error, { userCap: limit });
    throw new UserFetchError('Failed to fetch users', error);
  }

  return data || [];
}

export function transformUsers(users: UserRow[]): TransformedUser[] {
  return users.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    preferences: {
      email: user.email,
      target_cities: Array.isArray(user.target_cities)
        ? user.target_cities
        : user.target_cities
        ? [user.target_cities]
        : [],
      roles_selected: Array.isArray(user.roles_selected)
        ? user.roles_selected
        : user.roles_selected
        ? [user.roles_selected]
        : [],
      languages_spoken: Array.isArray(user.languages_spoken)
        ? user.languages_spoken
        : user.languages_spoken
        ? [user.languages_spoken]
        : [],
      career_path: user.career_path ? [user.career_path] : [],
      work_environment: user.work_environment 
        ? (user.work_environment.toLowerCase().includes('remote') ? 'remote' :
           user.work_environment.toLowerCase().includes('hybrid') ? 'hybrid' :
           user.work_environment.toLowerCase().includes('office') || user.work_environment.toLowerCase().includes('on-site') ? 'on-site' :
           'unclear')
        : undefined,
      entry_level_preference: user.entry_level_preference || 'entry',
      company_types: user.company_types || [],
      professional_expertise: user.professional_expertise || user.career_path || undefined,
      visa_status: user.visa_status || undefined,
      // Extended preferences from signup form
      industries: (user as any).industries || [],
      company_size_preference: (user as any).company_size_preference || 'any',
      skills: (user as any).skills || [],
      career_keywords: (user as any).career_keywords || undefined,
      location_preference: 'any',
      salary_expectations: 'any',
      remote_preference: 'any',
      visa_sponsorship: user.visa_status && !user.visa_status.toLowerCase().includes('eu-citizen') && !user.visa_status.toLowerCase().includes('citizen'),
      graduate_scheme: false,
      internship: false,
      work_authorization: user.visa_status || 'any'
    } as UserPreferences,
    subscription_tier: (user.subscription_active ? 'premium' : 'free') as 'free' | 'premium',
    created_at: user.created_at,
    last_email_sent: user.last_email_sent,
    is_active: user.active
  }));
}

