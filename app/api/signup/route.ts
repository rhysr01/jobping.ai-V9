// Native signup form handler - replaces Tally webhook

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/Utils/supabase';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.email || !data.fullName || !data.cities || data.cities.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // Create user in database
    const userData = {
      email: data.email.toLowerCase().trim(),
      full_name: data.fullName.trim(),
      target_cities: data.cities,
      languages_spoken: data.languages,
      start_date: data.startDate || null,
      professional_experience: data.experience || null,
      work_environment: data.workEnvironment.join(', ') || null,
      visa_status: data.visaStatus || null,
      entry_level_preference: data.entryLevelPreference || null,
      company_types: data.targetCompanies,
      career_path: data.careerPath ? [data.careerPath] : [],
      roles_selected: data.roles,
      subscription_tier: 'free',
      email_verified: false,
      subscription_active: true,
      created_at: new Date().toISOString(),
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (userError) {
      console.error('Failed to create user:', userError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    console.log(`✅ User created: ${data.email}`);

    // Trigger instant matching
    try {
      const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
      
      // Fetch jobs for matching
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .is('filtered_reason', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (jobs && jobs.length > 0) {
        const userPrefs = {
          email: userData.email,
          target_cities: userData.target_cities,
          languages_spoken: userData.languages_spoken,
          career_path: userData.career_path,
          roles_selected: userData.roles_selected,
          entry_level_preference: userData.entry_level_preference,
          professional_expertise: userData.career_path?.[0] || '',
          work_environment: userData.work_environment,
          visa_status: userData.visa_status,
        };

        const matchResult = await matcher.performMatching(jobs, userPrefs as any);
        
        if (matchResult.matches && matchResult.matches.length > 0) {
          // Save matches
          const matchesToSave = matchResult.matches.slice(0, 10).map(m => {
            const job = jobs.find(j => j.job_hash === m.job_hash);
            return {
              user_email: userData.email,
              job_hash: m.job_hash,
              match_score: m.match_score,
              match_reason: m.match_reason || 'AI match',
            };
          }).filter(m => m.job_hash);

          const matchEntries = matchesToSave.map(match => ({
            user_email: match.user_email,
            job_hash: match.job_hash,
            match_score: (match.match_score || 85) / 100,
            match_reason: match.match_reason,
            matched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            match_algorithm: matchResult.method,
          }));

          await supabase.from('matches').upsert(matchEntries, {
            onConflict: 'user_email,job_hash',
          });

          console.log(`✅ Saved ${matchEntries.length} matches for ${data.email}`);
        }
      }
    } catch (matchError) {
      console.error('Matching failed (non-fatal):', matchError);
      // Don't fail signup if matching fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Signup successful! Check your email in 48 hours.',
      matchesCount: 10
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

