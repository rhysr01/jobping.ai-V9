import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';

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
    
    // Strategy: ALWAYS return real jobs from database
    // Use fictional user profile - jobs MUST be real
    // Use week number + tier to select different jobs for rotation
    
    const resultJobs: any[] = [];
    const usedJobHashes = new Set<string>();
    
    // Create fictional user profiles for free and premium
    // These profiles represent typical user preferences
    // Jobs MUST be real from database, profiles are fictional
    // Assume users speak English + common EU languages (not Japanese, Chinese, Korean, etc.)
    const fictionalProfiles = {
      free: {
        email: 'sample-free@jobping.com',
        name: 'Alex',
        cities: ['London', 'Amsterdam', 'Berlin'],
        careerPath: 'Tech',
        languages_spoken: ['English', 'German'], // Common EU languages
      },
      premium: {
        email: 'sample-premium@jobping.com',
        name: 'Sam',
        cities: ['Stockholm', 'Dublin', 'Paris'],
        careerPath: 'Finance',
        languages_spoken: ['English', 'French'], // Common EU languages
      },
    };
    
    const selectedUserProfile = fictionalProfiles[tier as 'free' | 'premium'] || fictionalProfiles.free;
    
    // Helper function to calculate realistic match score with hot match limit
    const calculateMatchScore = (index: number, existingHotMatches: number): number => {
      // More realistic score distribution: 80-92% range
      const baseScore = 0.80; // Lower base (was 0.85)
      const increment = 0.015; // Smaller increment (was 0.02)
      const randomRange = 0.03; // Smaller random component (was 0.05)
      const maxScore = 0.92; // Lower max (was 0.95)
      
      let score = baseScore + (index * increment) + (Math.random() * randomRange);
      score = Math.min(score, maxScore);
      
      // Ensure only 1-2 hot matches (92%+) max (raised threshold)
      if (score >= 0.92 && existingHotMatches >= 2) {
        // Cap at 91% if we already have 2 hot matches
        score = Math.min(score, 0.91);
      }
      
      return score;
    };
    
    // Helper function to generate personalized match reasons based on profile
    const getMatchReason = (job: any, index: number, profile: typeof selectedUserProfile): string => {
      const city = job.city || job.location?.split(',')[0] || 'Europe';
      const category = job.categories?.[0]?.replace(/-/g, ' ') || 'roles';
      const isInPreferredCity = profile.cities.some(prefCity => 
        city.toLowerCase().includes(prefCity.toLowerCase()) || 
        job.location?.toLowerCase().includes(prefCity.toLowerCase())
      );
      
      if (isInPreferredCity) {
        return `Perfect match! This ${category} role in ${city} aligns with your preference for ${profile.cities.join(' and ')}. Entry-level friendly with excellent growth opportunities.`;
      }
      
      const reasons = [
        `Great match for ${category} roles. Based on your interest in ${profile.careerPath}, this position offers excellent entry-level opportunities in ${city}.`,
        `Strong alignment with your ${profile.careerPath} career path. Located in ${city}, this role is entry-level friendly and offers comprehensive training.`,
        `Excellent match for ${category} roles in ${city}. Perfect for someone interested in ${profile.careerPath} with entry-level opportunities and mentorship.`,
        `Great opportunity in ${city} for ${category} roles. Matches your ${profile.careerPath} interests with entry-level friendly requirements and clear progression.`,
        `Perfect match for ${category} roles. Located in ${city}, this position aligns with your ${profile.careerPath} career goals and offers entry-level opportunities.`,
      ];
      
      return reasons[index % reasons.length];
    };
    
    // Calculate job offset based on week number and tier
    // Free: week 1 = offset 0, week 2 = offset 5, etc.
    // Premium: week 1 = offset 10, week 2 = offset 15, etc.
    // This ensures weekly rotation AND different jobs for free vs premium
    const baseOffset = tier === 'premium' ? 10 : 0;
    const jobOffset = (weekNumber - 1) * 5 + baseOffset;
    
    // Get jobs from preferred cities first to ensure diversity
    // Filter by cities in the fictional profile to show diverse locations
    // Normalize city names for matching (handle case-insensitive and variations)
    const normalizedCities = selectedUserProfile.cities.map(c => c.toLowerCase().trim());
    
    // Map career path to database categories (e.g., 'Tech' → 'tech-transformation')
    const careerPathCategories = getDatabaseCategoriesForForm(selectedUserProfile.careerPath.toLowerCase());
    
    // SIMPLIFIED: Get jobs with early-career filter, but don't filter by career path or cities at DB level
    // We'll do all filtering in memory to avoid losing jobs
    let query = supabase
      .from('jobs')
      .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
      .eq('is_active', true)
      .eq('status', 'active')
      .is('filtered_reason', null)
      .not('job_url', 'is', null)
      .neq('job_url', '')
      .or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}') // Early-career filter only
      .order('created_at', { ascending: false })
      .limit(200); // Get more jobs to filter for diversity

    const { data: allJobs, error: jobsError } = await query;

    // Log query result for debugging
    if (jobsError) {
      console.warn('Sample jobs query error:', jobsError);
      // Don't return early - fall through to fallback logic
    }

    console.log(`Sample jobs query result: ${allJobs?.length || 0} jobs found`, {
      careerPath: selectedUserProfile.careerPath,
      careerPathCategories,
      cities: selectedUserProfile.cities,
      error: jobsError?.message
    });

    if (!jobsError && allJobs && allJobs.length > 0) {
      // Filter in memory: apply new rules
      const validJobs = allJobs.filter(job => {
        // Basic filters
        if (!job.job_url || job.job_url.trim() === '' || usedJobHashes.has(job.job_hash)) {
          return false;
        }
        
        const jobTitle = (job.title || '').toLowerCase();
        const jobDesc = (job.description || '').toLowerCase();
        const jobText = `${jobTitle} ${jobDesc}`;
        
        // EXCLUDE: Teaching/Education jobs (unless business-related)
        if ((jobTitle.includes('teacher') || jobTitle.includes('teaching') || 
             jobTitle.includes('educator') || jobTitle.includes('tutor') ||
             jobTitle.includes('instructor') || jobTitle.includes('lecturer')) &&
            !jobTitle.includes('business') && !jobDesc.includes('business')) {
          return false;
        }
        
        // EXCLUDE: Legal jobs (unless compliance/regulatory/business legal)
        if ((jobTitle.includes('lawyer') || jobTitle.includes('attorney') ||
             jobTitle.includes('solicitor') || jobTitle.includes('barrister') ||
             (jobTitle.includes('legal') && (jobTitle.includes('counsel') || jobTitle.includes('advisor')))) &&
            !jobTitle.includes('compliance') && !jobTitle.includes('regulatory') &&
            !jobDesc.includes('business') && !jobDesc.includes('corporate')) {
          return false;
        }
        
        // EXCLUDE: Virtual Assistant, Executive Assistant, Personal Assistant
        if (jobTitle.includes('virtual assistant') || jobTitle.includes('executive assistant') ||
            jobTitle.includes('personal assistant') || jobTitle.includes('administrative assistant')) {
          return false;
        }
        
        // EXCLUDE: Manager roles (unless graduate/trainee/junior/associate manager)
        if (jobTitle.includes('manager') &&
            !jobTitle.includes('graduate') && !jobTitle.includes('trainee') &&
            !jobTitle.includes('junior') && !jobTitle.includes('entry') &&
            !jobTitle.includes('associate')) {
          // Allow compliance/regulatory managers (business-related)
          if (!jobTitle.includes('compliance') && !jobTitle.includes('regulatory') &&
              !jobTitle.includes('tax') && !jobTitle.includes('legal')) {
            return false;
          }
        }
        
        // EXCLUDE: Jobs requiring languages user doesn't speak
        const userLanguages = selectedUserProfile.languages_spoken || ['English'];
        const userLanguagesLower = userLanguages.map(lang => lang.toLowerCase());
        
        // Check structured language requirements
        const jobLanguages = (job as any).language_requirements;
        if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0) {
          const jobLanguagesLower = jobLanguages.map((lang: string) => lang.toLowerCase());
          const hasMatchingLanguage = jobLanguagesLower.some((jobLang: string) => 
            userLanguagesLower.some(userLang => 
              userLang.includes(jobLang) || jobLang.includes(userLang) ||
              (userLang === 'english' && (jobLang.includes('english') || jobLang.includes('eng'))) ||
              (userLang === 'german' && (jobLang.includes('german') || jobLang.includes('deutsch'))) ||
              (userLang === 'french' && (jobLang.includes('french') || jobLang.includes('français')))
            )
          );
          
          if (!hasMatchingLanguage) {
            return false; // Exclude jobs requiring languages user doesn't speak
          }
        }
        
        // Check description for language requirements
        const languageRequirementKeywords = [
          'japanese speaker', 'chinese speaker', 'mandarin speaker', 'korean speaker',
          'arabic speaker', 'hindi speaker', 'thai speaker', 'russian speaker',
          'fluent japanese', 'fluent chinese', 'fluent mandarin', 'fluent korean',
          'native japanese', 'native chinese', 'native mandarin', 'native korean',
          'must speak japanese', 'must speak chinese', 'must speak mandarin', 'must speak korean',
          'requires japanese', 'requires chinese', 'requires mandarin', 'requires korean'
        ];
        
        const requiresUnknownLanguage = languageRequirementKeywords.some(keyword => {
          if (!jobText.includes(keyword)) return false;
          
          // Extract language from keyword
          const langInKeyword = keyword.split(' ').find(word => 
            ['japanese', 'chinese', 'mandarin', 'korean', 'arabic', 'hindi', 'thai', 'russian'].includes(word)
          );
          
          if (!langInKeyword) return false;
          
          // Check if user speaks this language
          return !userLanguagesLower.some(userLang => 
            userLang.includes(langInKeyword) || langInKeyword.includes(userLang)
          );
        });
        
        if (requiresUnknownLanguage) {
          return false; // Exclude jobs requiring languages user doesn't speak
        }
        
        return true; // Job passed all filters
      });

      // Score jobs: prefer career path matches and city matches
      const scoredJobs = validJobs.map(job => {
        let score = 0;
        
        // Career path match (high priority)
        const jobCategories = (job.categories || []).map((c: string) => c.toLowerCase());
        const hasCareerMatch = careerPathCategories.some(cat => 
          jobCategories.some((jc: string) => jc.includes(cat.toLowerCase()) || cat.toLowerCase().includes(jc))
        );
        if (hasCareerMatch) score += 10;
        
        // City match (high priority)
        const jobCity = (job.city || job.location?.split(',')[0] || '').toLowerCase().trim();
        const matchesPreferredCity = normalizedCities.some(prefCity => 
          jobCity.includes(prefCity) || 
          prefCity.includes(jobCity) ||
          job.location?.toLowerCase().includes(prefCity)
        );
        if (matchesPreferredCity) score += 10;
        
        return { job, score };
      }).sort((a, b) => b.score - a.score); // Sort by score (best matches first)

      console.log(`After filtering: ${scoredJobs.length} valid jobs (scored and sorted)`);
      
      // Add jobs from scored list, ensuring diversity
      const citiesUsed = new Set<string>();
      
      // First pass: Try to get jobs from preferred cities (prioritize high-scored jobs)
      for (const { job, score } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        
        const jobCity = (job.city || job.location?.split(',')[0] || '').toLowerCase().trim();
        const matchesPreferredCity = normalizedCities.some(prefCity => 
          jobCity.includes(prefCity) || 
          prefCity.includes(jobCity) ||
          job.location?.toLowerCase().includes(prefCity)
        );
        
        // Prefer jobs matching preferred cities
        if (matchesPreferredCity && !citiesUsed.has(jobCity)) {
          const hotMatches = resultJobs.filter(j => (j.matchScore || 0) >= 0.90).length;
          const matchScore = calculateMatchScore(resultJobs.length, hotMatches);
          resultJobs.push({
            ...job,
            matchScore,
            matchReason: getMatchReason(job, resultJobs.length, selectedUserProfile),
          });
          usedJobHashes.add(job.job_hash);
          citiesUsed.add(jobCity);
        }
      }
      
      // Second pass: Fill remaining slots with any high-scored jobs
      for (const { job, score } of scoredJobs) {
        if (resultJobs.length >= 5) break;
        if (usedJobHashes.has(job.job_hash)) continue;
        
        const hotMatches = resultJobs.filter(j => (j.matchScore || 0) >= 0.90).length;
        const matchScore = calculateMatchScore(resultJobs.length, hotMatches);
        resultJobs.push({
          ...job,
          matchScore,
          matchReason: getMatchReason(job, resultJobs.length, selectedUserProfile),
        });
        usedJobHashes.add(job.job_hash);
      }
    }
    
    // If initial query failed or returned no jobs, try simple fallback
    if (jobsError || !allJobs || allJobs.length === 0) {
      console.log(`Fallback needed: Initial query failed or returned 0 jobs`);
      
      // Simple fallback: Get ANY early-career jobs (with same filters)
      const { data: fallbackJobs, error: fallbackError } = await supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash, language_requirements')
        .eq('is_active', true)
        .eq('status', 'active')
        .is('filtered_reason', null)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (fallbackError) {
        console.warn('Fallback query error:', fallbackError);
      }
      
      if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
        console.log(`Fallback: Found ${fallbackJobs.length} jobs`);
        
        // Apply same filters as main query
        const userLanguages = selectedUserProfile.languages_spoken || ['English'];
        const userLanguagesLower = userLanguages.map(lang => lang.toLowerCase());
        
        const filteredFallbackJobs = fallbackJobs.filter(job => {
          const jobTitle = (job.title || '').toLowerCase();
          const jobDesc = (job.description || '').toLowerCase();
          const jobText = `${jobTitle} ${jobDesc}`;
          
          // Same filters as main query
          if ((jobTitle.includes('teacher') || jobTitle.includes('teaching') || 
               jobTitle.includes('educator') || jobTitle.includes('tutor')) &&
              !jobTitle.includes('business') && !jobDesc.includes('business')) {
            return false;
          }
          
          if ((jobTitle.includes('lawyer') || jobTitle.includes('attorney') ||
               jobTitle.includes('solicitor') || jobTitle.includes('barrister')) &&
              !jobTitle.includes('compliance') && !jobTitle.includes('regulatory') &&
              !jobDesc.includes('business') && !jobDesc.includes('corporate')) {
            return false;
          }
          
          if (jobTitle.includes('virtual assistant') || jobTitle.includes('executive assistant') ||
              jobTitle.includes('personal assistant')) {
            return false;
          }
          
          if (jobTitle.includes('manager') &&
              !jobTitle.includes('graduate') && !jobTitle.includes('trainee') &&
              !jobTitle.includes('junior') && !jobTitle.includes('entry') &&
              !jobTitle.includes('associate') &&
              !jobTitle.includes('compliance') && !jobTitle.includes('regulatory')) {
            return false;
          }
          
          // Language filter
          const jobLanguages = job.language_requirements;
          if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0) {
            const jobLanguagesLower = jobLanguages.map((lang: string) => lang.toLowerCase());
            const hasMatchingLanguage = jobLanguagesLower.some((jobLang: string) => 
              userLanguagesLower.some(userLang => 
                userLang.includes(jobLang) || jobLang.includes(userLang)
              )
            );
            if (!hasMatchingLanguage) return false;
          }
          
          const languageRequirementKeywords = [
            'japanese speaker', 'chinese speaker', 'mandarin speaker', 'korean speaker',
            'fluent japanese', 'fluent chinese', 'fluent mandarin', 'fluent korean',
            'must speak japanese', 'must speak chinese', 'must speak mandarin', 'must speak korean'
          ];
          
          const requiresUnknownLanguage = languageRequirementKeywords.some(keyword => {
            if (!jobText.includes(keyword)) return false;
            const langInKeyword = keyword.split(' ').find(word => 
              ['japanese', 'chinese', 'mandarin', 'korean'].includes(word)
            );
            return langInKeyword && !userLanguagesLower.some(userLang => 
              userLang.includes(langInKeyword) || langInKeyword.includes(userLang)
            );
          });
          
          if (requiresUnknownLanguage) return false;
          
          return true;
        });
        
        // Add filtered jobs from fallback
        filteredFallbackJobs.forEach((job, index) => {
          if (resultJobs.length < 5 && job.job_url && job.job_url.trim() !== '' && !usedJobHashes.has(job.job_hash)) {
            const hotMatches = resultJobs.filter(j => (j.matchScore || 0) >= 0.90).length;
            const matchScore = calculateMatchScore(resultJobs.length, hotMatches);
            resultJobs.push({
              ...job,
              matchScore,
              matchReason: getMatchReason(job, resultJobs.length, selectedUserProfile),
            });
            usedJobHashes.add(job.job_hash);
          }
        });
      }
    }

    // Final validation - ensure all jobs have URLs
    let validJobs = resultJobs.filter(job => job.job_url && job.job_url.trim() !== '');
    
    // If we have less than 5 jobs, try emergency fallback (even if we have 1-4 jobs)
    if (validJobs.length < 5) {
      console.log(`Emergency fallback: Only ${validJobs.length} jobs, trying emergency query to get to 5...`);
      
      // Emergency: Get ANY early-career job with URL, apply filters
      let emergencyQuery = supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash, language_requirements')
        .eq('is_active', true)
        .eq('status', 'active')
        .is('filtered_reason', null)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .not('job_hash', 'in', Array.from(usedJobHashes));
      
      // Still prefer early-career but don't require it in emergency
      emergencyQuery = emergencyQuery.or('is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}');
      emergencyQuery = emergencyQuery.order('created_at', { ascending: false }).limit(50);
      
      const { data: emergencyJobs, error: emergencyError } = await emergencyQuery;
      
      if (emergencyError) {
        console.warn('Emergency query error:', emergencyError);
      }
      
      if (!emergencyError && emergencyJobs && emergencyJobs.length > 0) {
        console.log(`Emergency fallback: Found ${emergencyJobs.length} jobs`);
        
        // Apply same filters
        const userLanguages = selectedUserProfile.languages_spoken || ['English'];
        const userLanguagesLower = userLanguages.map(lang => lang.toLowerCase());
        
        const filteredEmergencyJobs = emergencyJobs.filter(job => {
          const jobTitle = (job.title || '').toLowerCase();
          const jobDesc = (job.description || '').toLowerCase();
          const jobText = `${jobTitle} ${jobDesc}`;
          
          // Same filters as main query
          if ((jobTitle.includes('teacher') || jobTitle.includes('teaching') || 
               jobTitle.includes('educator') || jobTitle.includes('tutor')) &&
              !jobTitle.includes('business') && !jobDesc.includes('business')) {
            return false;
          }
          
          if ((jobTitle.includes('lawyer') || jobTitle.includes('attorney') ||
               jobTitle.includes('solicitor') || jobTitle.includes('barrister')) &&
              !jobTitle.includes('compliance') && !jobTitle.includes('regulatory') &&
              !jobDesc.includes('business') && !jobDesc.includes('corporate')) {
            return false;
          }
          
          if (jobTitle.includes('virtual assistant') || jobTitle.includes('executive assistant') ||
              jobTitle.includes('personal assistant')) {
            return false;
          }
          
          if (jobTitle.includes('manager') &&
              !jobTitle.includes('graduate') && !jobTitle.includes('trainee') &&
              !jobTitle.includes('junior') && !jobTitle.includes('entry') &&
              !jobTitle.includes('associate') &&
              !jobTitle.includes('compliance') && !jobTitle.includes('regulatory')) {
            return false;
          }
          
          // Language filter
          const jobLanguages = job.language_requirements;
          if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0) {
            const jobLanguagesLower = jobLanguages.map((lang: string) => lang.toLowerCase());
            const hasMatchingLanguage = jobLanguagesLower.some((jobLang: string) => 
              userLanguagesLower.some(userLang => 
                userLang.includes(jobLang) || jobLang.includes(userLang)
              )
            );
            if (!hasMatchingLanguage) return false;
          }
          
          const languageRequirementKeywords = [
            'japanese speaker', 'chinese speaker', 'mandarin speaker', 'korean speaker',
            'fluent japanese', 'fluent chinese', 'fluent mandarin', 'fluent korean',
            'must speak japanese', 'must speak chinese', 'must speak mandarin', 'must speak korean'
          ];
          
          const requiresUnknownLanguage = languageRequirementKeywords.some(keyword => {
            if (!jobText.includes(keyword)) return false;
            const langInKeyword = keyword.split(' ').find(word => 
              ['japanese', 'chinese', 'mandarin', 'korean'].includes(word)
            );
            return langInKeyword && !userLanguagesLower.some(userLang => 
              userLang.includes(langInKeyword) || langInKeyword.includes(userLang)
            );
          });
          
          if (requiresUnknownLanguage) return false;
          
          return true;
        });
        
        // Add filtered jobs until we have 5
        filteredEmergencyJobs.forEach((job, index) => {
          if (validJobs.length < 5 && job.job_url && job.job_url.trim() !== '' && !usedJobHashes.has(job.job_hash)) {
            const hotMatches = validJobs.filter(j => (j.matchScore || 0) >= 0.90).length;
            const matchScore = calculateMatchScore(validJobs.length, hotMatches);
            validJobs.push({
              ...job,
              matchScore,
              matchReason: getMatchReason(job, validJobs.length, selectedUserProfile),
            });
            usedJobHashes.add(job.job_hash);
          }
        });
      }
    }
    
    if (validJobs.length === 0) {
      console.error('CRITICAL: No jobs with URLs found after all filters');
      console.error(`  - Initial query: ${allJobs?.length || 0} jobs, error: ${jobsError?.message || 'none'}`);
      console.error(`  - Result jobs before filtering: ${resultJobs.length}`);
      console.error(`  - Used job hashes: ${usedJobHashes.size}`);
      
      // Last resort: try to get ANY job with URL (no filters at all)
      let lastResortQuery = supabase
        .from('jobs')
        .select('title, company, location, description, job_url, categories, work_environment, is_internship, is_graduate, city, job_hash')
        .eq('is_active', true)
        .eq('status', 'active')
        .is('filtered_reason', null)
        .not('job_url', 'is', null)
        .neq('job_url', '')
        .order('created_at', { ascending: false })
        .limit(10);
      
      const { data: lastResortJobs, error: lastResortError } = await lastResortQuery;
      
      if (lastResortError) {
        console.error('Last resort query error:', lastResortError);
        // Check for Supabase blocking
        const errorStr = JSON.stringify(lastResortError).toLowerCase();
        if (errorStr.includes('rate limit') || errorStr.includes('429') || errorStr.includes('memory')) {
          console.error('⚠️  Supabase appears to be blocking queries (rate limit or memory issue)');
        }
      }
      
      if (lastResortJobs && lastResortJobs.length > 0) {
        console.log(`Last resort: Found ${lastResortJobs.length} jobs (no filters)`);
        lastResortJobs.forEach((job, index) => {
          // Only add if job has a URL
          if (job.job_url && job.job_url.trim() !== '' && !usedJobHashes.has(job.job_hash)) {
            const hotMatches = validJobs.filter(j => (j.matchScore || 0) >= 0.90).length;
            const matchScore = calculateMatchScore(index, hotMatches);
            
            validJobs.push({
              ...job,
              job_url: job.job_url,
              matchScore,
              matchReason: getMatchReason(job, index, selectedUserProfile),
            });
            usedJobHashes.add(job.job_hash);
          }
        });
      }
      
      if (validJobs.length === 0) {
        console.error('❌ All fallback queries failed - returning empty result');
        // Return empty array instead of 500 error to prevent breaking the UI
        return NextResponse.json({ 
          jobs: [], 
          error: 'No jobs available. Please try again later.',
          debug: {
            initialQueryError: jobsError?.message,
            lastResortQueryError: lastResortError?.message,
            supabaseBlocking: lastResortError ? JSON.stringify(lastResortError).toLowerCase().includes('rate limit') : false
          }
        }, { status: 200 }); // Return 200 to prevent UI errors
      }
    }
    
    if (validJobs.length < 5) {
      console.warn(`Only found ${validJobs.length} jobs, expected 5`);
    }

    // Format jobs - use REAL job URLs from database
    // Ensure all jobs have working URLs (filter out empty/invalid URLs)
    const formattedJobs = validJobs
      .filter(job => job.job_url && job.job_url.trim() !== '' && job.job_url !== '#')
      .map((job) => {
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
          matchReason: job.matchReason || getMatchReason(job, 0, selectedUserProfile),
          userProfile: selectedUserProfile, // Always use the fictional profile
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

