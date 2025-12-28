/**
 * Pre-filter jobs by user preferences with scoring and feedback learning
 * Extracted to utility for reuse in batch processing
 */

import { Job as ScrapersJob } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';
import { getDatabaseClient } from '@/Utils/databasePool';
import { logger } from '@/lib/monitoring';
import { MATCH_RULES } from '@/Utils/sendConfiguration';
import { getDatabaseCategoriesForForm } from './categoryMapper';
import { apiLogger } from '@/lib/api-logger';

/**
 * Enhanced pre-filter jobs by user preferences with scoring AND feedback learning
 */
export async function preFilterJobsByUserPreferencesEnhanced(
  jobs: (ScrapersJob & { freshnessTier: string })[], 
  user: UserPreferences
): Promise<(ScrapersJob & { freshnessTier: string })[]> {
  // Get user's feedback history for personalized boosting
  let feedbackBoosts: Map<string, number> = new Map();
  
  try {
    const supabase = getDatabaseClient();
    const { data: feedback } = await supabase
      .from('user_feedback')
      .select('relevance_score, job_context')
      .eq('user_email', user.email)
      .gte('relevance_score', 4)  // Only highly-rated jobs
      .limit(10);
    
    if (feedback && feedback.length > 0) {
      // Extract patterns from highly-rated jobs
      feedback.forEach(f => {
        const ctx = f.job_context;
        if (!ctx) return;
        
        // If user loved jobs in Berlin, boost Berlin jobs
        if (ctx.location) {
          const city = ctx.location.toLowerCase();
          feedbackBoosts.set(`loc:${city}`, (feedbackBoosts.get(`loc:${city}`) || 0) + 10);
        }
        
        // If user loved startup jobs, boost startups
        if (ctx.company?.toLowerCase().includes('startup')) {
          feedbackBoosts.set('type:startup', (feedbackBoosts.get('type:startup') || 0) + 10);
        }
        
        // If user loved remote jobs, boost remote
        if (ctx.location?.toLowerCase().includes('remote')) {
          feedbackBoosts.set('env:remote', (feedbackBoosts.get('env:remote') || 0) + 15);
        }
      });
      
      // Track feedback boosts
      if (feedbackBoosts.size > 0) {
        logger.debug('Feedback boosts applied', {
          metadata: {
            userEmail: user.email,
            boostCount: feedbackBoosts.size,
            boostTypes: Object.fromEntries(feedbackBoosts)
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load feedback boosts:', error);
  }
  
  // Filter jobs by location first (fastest filter) - STRICT MATCHING
  const targetCities = Array.isArray(user.target_cities) 
    ? user.target_cities 
    : user.target_cities 
      ? [user.target_cities] 
      : [];
  
  /**
   * Comprehensive city-to-country mapping for intelligent fallback
   */
  const CITY_COUNTRY_MAP: Record<string, string[]> = {
    'london': ['uk', 'united kingdom', 'england', 'britain', 'great britain'],
    'berlin': ['germany', 'deutschland', 'de'],
    'munich': ['germany', 'deutschland', 'de'],
    'hamburg': ['germany', 'deutschland', 'de'],
    'frankfurt': ['germany', 'deutschland', 'de'],
    'cologne': ['germany', 'deutschland', 'de'],
    'paris': ['france', 'fr'],
    'lyon': ['france', 'fr'],
    'marseille': ['france', 'fr'],
    'toulouse': ['france', 'fr'],
    'madrid': ['spain', 'españa', 'es'],
    'barcelona': ['spain', 'españa', 'es'],
    'valencia': ['spain', 'españa', 'es'],
    'seville': ['spain', 'españa', 'es'],
    'amsterdam': ['netherlands', 'holland', 'nl', 'the netherlands'],
    'rotterdam': ['netherlands', 'holland', 'nl'],
    'the hague': ['netherlands', 'holland', 'nl'],
    'dublin': ['ireland', 'ie', 'republic of ireland'],
    'vienna': ['austria', 'at', 'österreich'],
    'zurich': ['switzerland', 'ch', 'schweiz'],
    'geneva': ['switzerland', 'ch', 'schweiz'],
    'basel': ['switzerland', 'ch', 'schweiz'],
    'stockholm': ['sweden', 'se', 'sverige'],
    'gothenburg': ['sweden', 'se'],
    'copenhagen': ['denmark', 'dk', 'danmark'],
    'oslo': ['norway', 'no', 'norge'],
    'helsinki': ['finland', 'fi', 'suomi'],
    'brussels': ['belgium', 'be', 'belgië', 'belgique'],
    'antwerp': ['belgium', 'be'],
    'lisbon': ['portugal', 'pt', 'portuguesa'],
    'porto': ['portugal', 'pt'],
    'milan': ['italy', 'it', 'italia'],
    'rome': ['italy', 'it', 'italia'],
    'turin': ['italy', 'it'],
    'warsaw': ['poland', 'pl', 'polska'],
    'krakow': ['poland', 'pl'],
    'prague': ['czech republic', 'czech', 'cz', 'česká republika'],
    'budapest': ['hungary', 'hu', 'magyarország'],
    'bucharest': ['romania', 'ro', 'românia'],
    'athens': ['greece', 'gr', 'ελλάδα'],
  };

  /**
   * Enhanced location matching with multiple fallback levels
   * Matches city names with word boundaries to avoid false positives
   * e.g., "London" matches "London, UK" but NOT "New London"
   * OPTIMIZED: Early exits for performance
   */
  const matchesLocationStrict = (job: ScrapersJob & { freshnessTier: string }, targetCity: string): boolean => {
    const city = targetCity.toLowerCase().trim();
    
    // OPTIMIZED: Check structured city field first (most accurate, fastest)
    if ((job as any).city) {
      const jobCity = String((job as any).city).toLowerCase().trim();
      if (jobCity === city || jobCity.includes(city) || city.includes(jobCity)) {
        return true; // Early exit - exact match found
      }
    }
    
    // OPTIMIZED: Check for remote/hybrid early (common case, fast check)
    const jobLocation = (job.location || '').toLowerCase();
    if (jobLocation.includes('remote') || jobLocation.includes('hybrid') || 
        jobLocation.includes('work from home') || jobLocation.includes('flexible location')) {
      return true; // Early exit - remote/hybrid always acceptable
    }
    
    const jobLoc = jobLocation.trim();
    
    // OPTIMIZED: Check structured country field for country-level matches
    if ((job as any).country) {
      const jobCountry = String((job as any).country).toLowerCase();
      const countries = CITY_COUNTRY_MAP[city];
      if (countries && countries.some(c => jobCountry.includes(c))) {
        return true; // Early exit - country-level match found
      }
    }
    
    // Use word boundary matching for location string
    // Match patterns like: "London", "London, UK", "Greater London", but NOT "New London"
    // Escape special regex characters in city name
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`\\b${escapedCity}\\b`, 'i'), // Exact word match
      new RegExp(`^${escapedCity}[,\\s]`, 'i'), // Starts with city name
      new RegExp(`[,\\s]${escapedCity}[,\\s]`, 'i'), // City in middle
      new RegExp(`[,\\s]${escapedCity}$`, 'i'), // City at end
    ];
    
    // Check if any pattern matches
    if (patterns.some(pattern => pattern.test(jobLoc))) {
      return true;
    }
    
    // Check for country-level matches in location string
    const countries = CITY_COUNTRY_MAP[city];
    if (countries) {
      if (countries.some(country => jobLoc.includes(country))) {
        return true; // Country-level match in location string
      }
    }
    
    // Handle special cases (Greater London, etc.)
    const specialCases: Record<string, string[]> = {
      'london': ['greater london', 'central london', 'north london', 'south london', 'east london', 'west london', 'london area', 'greater london area'],
      'paris': ['greater paris', 'paris region', 'île-de-france', 'ile-de-france'],
      'berlin': ['greater berlin', 'brandenburg'],
      'madrid': ['greater madrid', 'comunidad de madrid', 'madrid region'],
      'barcelona': ['greater barcelona', 'catalonia', 'catalunya', 'barcelona area'],
      'amsterdam': ['greater amsterdam', 'amsterdam area', 'noord-holland'],
      'milan': ['greater milan', 'milan area', 'lombardy', 'lombardia'],
      'rome': ['greater rome', 'rome area', 'lazio'],
    };
    
    if (specialCases[city]) {
      return specialCases[city].some(variant => jobLoc.includes(variant));
    }
    
    // Allow remote/hybrid if user hasn't explicitly excluded it
    if (jobLoc.includes('remote') || jobLoc.includes('hybrid') || jobLoc.includes('work from home') || jobLoc.includes('flexible location')) {
      return true; // Remote/hybrid is always acceptable
    }
    
    return false;
  };

  /**
   * Progressive location matching with intelligent fallback
   * Returns jobs that match at any level: exact city > country > remote/hybrid > all
   */
  const getLocationMatchedJobs = (jobs: (ScrapersJob & { freshnessTier: string })[], cities: string[]): {
    jobs: (ScrapersJob & { freshnessTier: string })[];
    matchLevel: 'exact' | 'country' | 'remote' | 'all';
  } => {
    if (cities.length === 0) {
      return { jobs, matchLevel: 'all' };
    }

    // Level 1: Exact city matches (strict)
    const exactMatches = jobs.filter(job => 
      cities.some(city => matchesLocationStrict(job, city))
    );

    // OPTIMIZED: Require more jobs for exact match to ensure quality
    // This ensures we have enough high-quality matches before stopping
    if (exactMatches.length >= 20) {
      return { jobs: exactMatches, matchLevel: 'exact' };
    }

    // Level 2: Country-level matches (relaxed)
    const targetCountries = new Set<string>();
    cities.forEach(city => {
      const cityLower = city.toLowerCase();
      Object.entries(CITY_COUNTRY_MAP).forEach(([key, countries]) => {
        if (cityLower.includes(key) || key.includes(cityLower)) {
          countries.forEach(c => targetCountries.add(c));
        }
      });
    });

    const countryMatches = jobs.filter(job => {
      const jobLocation = (job.location || '').toLowerCase();
      const jobCountry = ((job as any).country || '').toLowerCase();
      
      // Check if job is in target country
      return Array.from(targetCountries).some(country => 
        jobLocation.includes(country) || jobCountry.includes(country) ||
        jobLocation.includes(country.replace(' ', '-')) // Handle "united-kingdom" format
      );
    });

    // Combine exact + country matches
    const combinedMatches = [...new Set([...exactMatches, ...countryMatches])];
    
    // OPTIMIZED: Require sufficient matches for quality
    if (combinedMatches.length >= 15) {
      return { jobs: combinedMatches, matchLevel: 'country' };
    }

    // Level 3: Remote/hybrid jobs (always acceptable)
    const remoteMatches = jobs.filter(job => {
      const jobLocation = (job.location || '').toLowerCase();
      return jobLocation.includes('remote') || 
             jobLocation.includes('hybrid') || 
             jobLocation.includes('work from home') ||
             jobLocation.includes('flexible location');
    });

    const allMatches = [...new Set([...combinedMatches, ...remoteMatches])];
    
    // OPTIMIZED: Require minimum matches for quality
    if (allMatches.length >= 10) {
      return { jobs: allMatches, matchLevel: 'remote' };
    }

    // Level 4: Last resort - use all jobs (better than zero matches)
    apiLogger.warn('Using all jobs as last resort fallback', {
      email: user.email,
      targetCities: cities,
      exactMatches: exactMatches.length,
      countryMatches: countryMatches.length,
      remoteMatches: remoteMatches.length,
      totalJobs: jobs.length
    });

    return { jobs, matchLevel: 'all' };
  };
  
  // Use progressive location matching with intelligent fallback
  const locationMatchResult = getLocationMatchedJobs(jobs, targetCities);
  let filteredJobs = locationMatchResult.jobs;
  const matchLevel = locationMatchResult.matchLevel;

  // Log match level for monitoring
  if (matchLevel !== 'exact' && targetCities.length > 0) {
    logger.info('Location matching fallback applied', {
      metadata: {
        email: user.email,
        matchLevel,
        targetCities,
        matchedJobs: filteredJobs.length,
        totalJobs: jobs.length
      }
    });
  }
  
  // Language requirement hard filter (exclude jobs requiring languages user doesn't speak)
  // Default to English if no languages specified (for free users)
  const userLanguages = (user.languages_spoken && Array.isArray(user.languages_spoken) && user.languages_spoken.length > 0)
    ? user.languages_spoken
    : ['English']; // Default free users to English only
  
  if (userLanguages && userLanguages.length > 0) {
    const userLanguagesLower = userLanguages.map(lang => lang.toLowerCase());
    
    filteredJobs = filteredJobs.filter(job => {
      const jobLanguages = (job as any).language_requirements;
      const jobDesc = (job.description || '').toLowerCase();
      const jobTitle = (job.title || '').toLowerCase();
      const jobText = `${jobDesc} ${jobTitle}`.toLowerCase();
      
      // If job has explicit language requirements, check if user speaks any of them
      if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0) {
        const jobLanguagesLower = jobLanguages.map((lang: string) => lang.toLowerCase());
        
        const hasMatchingLanguage = jobLanguagesLower.some((jobLang: string) => 
          userLanguagesLower.some(userLang => 
            userLang.includes(jobLang) || 
            jobLang.includes(userLang) ||
            // Handle common variations
            (userLang === 'english' && (jobLang.includes('english') || jobLang.includes('eng'))) ||
            (userLang === 'spanish' && (jobLang.includes('spanish') || jobLang.includes('español'))) ||
            (userLang === 'french' && (jobLang.includes('french') || jobLang.includes('français'))) ||
            (userLang === 'german' && (jobLang.includes('german') || jobLang.includes('deutsch'))) ||
            (userLang === 'italian' && (jobLang.includes('italian') || jobLang.includes('italiano'))) ||
            (userLang === 'portuguese' && (jobLang.includes('portuguese') || jobLang.includes('português'))) ||
            (userLang === 'dutch' && (jobLang.includes('dutch') || jobLang.includes('nederlands'))) ||
            (userLang === 'japanese' && (jobLang.includes('japanese') || jobLang.includes('日本語'))) ||
            (userLang === 'chinese' && (jobLang.includes('chinese') || jobLang.includes('中文') || jobLang.includes('mandarin'))) ||
            (userLang === 'mandarin' && (jobLang.includes('chinese') || jobLang.includes('mandarin') || jobLang.includes('中文'))) ||
            (userLang === 'cantonese' && (jobLang.includes('chinese') || jobLang.includes('cantonese'))) ||
            (userLang === 'korean' && (jobLang.includes('korean') || jobLang.includes('한국어'))) ||
            // Additional EU languages
            (userLang === 'polish' && (jobLang.includes('polish') || jobLang.includes('polski'))) ||
            (userLang === 'swedish' && (jobLang.includes('swedish') || jobLang.includes('svenska'))) ||
            (userLang === 'danish' && (jobLang.includes('danish') || jobLang.includes('dansk'))) ||
            (userLang === 'finnish' && (jobLang.includes('finnish') || jobLang.includes('suomi'))) ||
            (userLang === 'czech' && (jobLang.includes('czech') || jobLang.includes('čeština'))) ||
            (userLang === 'romanian' && (jobLang.includes('romanian') || jobLang.includes('română'))) ||
            (userLang === 'hungarian' && (jobLang.includes('hungarian') || jobLang.includes('magyar'))) ||
            (userLang === 'greek' && (jobLang.includes('greek') || jobLang.includes('ελληνικά'))) ||
            (userLang === 'bulgarian' && (jobLang.includes('bulgarian') || jobLang.includes('български'))) ||
            (userLang === 'croatian' && (jobLang.includes('croatian') || jobLang.includes('hrvatski'))) ||
            (userLang === 'serbian' && (jobLang.includes('serbian') || jobLang.includes('српски'))) ||
            (userLang === 'russian' && (jobLang.includes('russian') || jobLang.includes('русский'))) ||
            (userLang === 'ukrainian' && (jobLang.includes('ukrainian') || jobLang.includes('українська'))) ||
            // Middle Eastern & Central Asian
            (userLang === 'arabic' && (jobLang.includes('arabic') || jobLang.includes('العربية'))) ||
            (userLang === 'turkish' && (jobLang.includes('turkish') || jobLang.includes('türkçe'))) ||
            (userLang === 'hebrew' && (jobLang.includes('hebrew') || jobLang.includes('עברית'))) ||
            (userLang === 'persian' && (jobLang.includes('persian') || jobLang.includes('farsi') || jobLang.includes('فارسی'))) ||
            (userLang === 'farsi' && (jobLang.includes('persian') || jobLang.includes('farsi') || jobLang.includes('فارسی'))) ||
            (userLang === 'urdu' && (jobLang.includes('urdu') || jobLang.includes('اردو'))) ||
            // Asian languages
            (userLang === 'hindi' && (jobLang.includes('hindi') || jobLang.includes('हिन्दी'))) ||
            (userLang === 'thai' && (jobLang.includes('thai') || jobLang.includes('ไทย'))) ||
            (userLang === 'vietnamese' && (jobLang.includes('vietnamese') || jobLang.includes('tiếng việt'))) ||
            (userLang === 'indonesian' && (jobLang.includes('indonesian') || jobLang.includes('bahasa indonesia'))) ||
            (userLang === 'tagalog' && (jobLang.includes('tagalog') || jobLang.includes('filipino'))) ||
            (userLang === 'malay' && (jobLang.includes('malay') || jobLang.includes('bahasa melayu'))) ||
            (userLang === 'bengali' && (jobLang.includes('bengali') || jobLang.includes('বাংলা'))) ||
            (userLang === 'tamil' && (jobLang.includes('tamil') || jobLang.includes('தமிழ்'))) ||
            (userLang === 'telugu' && (jobLang.includes('telugu') || jobLang.includes('తెలుగు')))
          )
        );
        
        if (!hasMatchingLanguage) {
          return false; // Exclude this job
        }
      }
      
      // Also check description for language requirements (all visa-seeking languages)
      const languageRequirementKeywords = [
        // Asian languages
        'japanese speaker', 'chinese speaker', 'mandarin speaker', 'cantonese speaker', 'korean speaker',
        'hindi speaker', 'thai speaker', 'vietnamese speaker', 'indonesian speaker', 'tagalog speaker',
        'malay speaker', 'bengali speaker', 'tamil speaker', 'telugu speaker',
        // Middle Eastern & Central Asian
        'arabic speaker', 'turkish speaker', 'hebrew speaker', 'persian speaker', 'farsi speaker', 'urdu speaker',
        // European languages
        'russian speaker', 'polish speaker', 'czech speaker', 'hungarian speaker', 'romanian speaker',
        'greek speaker', 'bulgarian speaker', 'croatian speaker', 'serbian speaker', 'ukrainian speaker',
        // Fluent/Native variations
        'fluent japanese', 'fluent chinese', 'fluent mandarin', 'fluent korean', 'fluent hindi', 'fluent thai',
        'fluent vietnamese', 'fluent arabic', 'fluent turkish', 'fluent russian', 'fluent polish',
        'native japanese', 'native chinese', 'native mandarin', 'native korean', 'native hindi',
        // Must speak/requires variations
        'must speak japanese', 'must speak chinese', 'must speak mandarin', 'must speak korean',
        'must speak hindi', 'must speak thai', 'must speak vietnamese', 'must speak arabic',
        'must speak turkish', 'must speak russian', 'must speak polish',
        'requires japanese', 'requires chinese', 'requires mandarin', 'requires korean',
        'requires hindi', 'requires thai', 'requires vietnamese', 'requires arabic',
        // Language proficiency
        'japanese language', 'chinese language', 'mandarin language', 'korean language',
        'japanese proficiency', 'chinese proficiency', 'mandarin proficiency', 'korean proficiency',
        'hindi proficiency', 'thai proficiency', 'vietnamese proficiency', 'arabic proficiency'
      ];
      
      const requiresUnknownLanguage = languageRequirementKeywords.some(keyword => {
        if (!jobText.includes(keyword)) return false;
        
        // Extract language from keyword
        const langInKeyword = keyword.split(' ').find(word => 
          ['japanese', 'chinese', 'mandarin', 'cantonese', 'korean', 'hindi', 'thai', 'vietnamese',
           'indonesian', 'tagalog', 'malay', 'bengali', 'tamil', 'telugu',
           'arabic', 'turkish', 'hebrew', 'persian', 'farsi', 'urdu',
           'russian', 'polish', 'czech', 'hungarian', 'romanian', 'greek', 'bulgarian',
           'croatian', 'serbian', 'ukrainian'].includes(word)
        );
        
        if (!langInKeyword) return false;
        
        // Check if user speaks this language
        return !userLanguagesLower.some(userLang => 
          userLang.includes(langInKeyword) || langInKeyword.includes(userLang) ||
          (userLang === 'mandarin' && langInKeyword === 'chinese') ||
          (userLang === 'chinese' && langInKeyword === 'mandarin') ||
          (userLang === 'cantonese' && langInKeyword === 'chinese')
        );
      });
      
      if (requiresUnknownLanguage) {
        return false; // Exclude this job
      }
      
      return true; // Keep this job
    });
  }
  
  // Track source distribution
  const sourceCount: Record<string, number> = {};
  
  // Initialize source counts
  filteredJobs.forEach(job => {
    const source = (job as any).source || 'unknown';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  });
  
  // Now score the location-filtered jobs with COMPREHENSIVE scoring
  const scoredJobs = filteredJobs.map(job => {
    let score = 0;
    let hasRoleMatch = false;
    let hasCareerMatch = false;
    const jobTitle = job.title.toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    const jobWorkEnv = ((job as any).work_environment || '').toLowerCase();
    
    // ============================================
    // COMPREHENSIVE SCORING SYSTEM (Total: 100+ points possible)
    // PRIORITY ORDER: Career Path > Role > Other factors
    // IMPORTANT: Roles are ALWAYS within the career path (from signup form)
    // ============================================
    
    // 1. Location match scoring (OPTIMIZED - varies by match quality)
    // Exact city match > Country match > Remote/Hybrid > Fallback
    let locationScore = 0;
    if (matchLevel === 'exact') {
      locationScore = 45; // Highest score for exact city match
    } else if (matchLevel === 'country') {
      locationScore = 35; // Good score for country-level match
    } else if (matchLevel === 'remote') {
      locationScore = 30; // Acceptable score for remote/hybrid
    } else {
      locationScore = 25; // Lower score for fallback (but still acceptable)
    }
    score += locationScore;
    
    // 2. Career path scoring (HIGHEST PRIORITY - most important factor)
    // Career path is MORE IMPORTANT than role - it defines the user's direction
    // Roles are ALWAYS a subset of the career path (from signup form structure)
    if (user.career_path) {
      const careerPaths = Array.isArray(user.career_path) ? user.career_path : [user.career_path];
      hasCareerMatch = careerPaths.some(path => {
        if (!path) return false;
        const pathLower = path.toLowerCase();
        
        // Check job title/description for career path keywords
        const titleMatch = jobTitle.includes(pathLower) || jobDesc.includes(pathLower);
        
        // CRITICAL: Also check job categories against mapped database categories
        // Form value 'strategy' → DB category 'strategy-business-design'
        const dbCategories = getDatabaseCategoriesForForm(path);
        const categoryMatch = (job as any).categories && Array.isArray((job as any).categories) && 
          (job as any).categories.some((cat: string) => 
            dbCategories.some(dbCat => 
              cat.toLowerCase().includes(dbCat.toLowerCase()) || 
              dbCat.toLowerCase().includes(cat.toLowerCase())
            )
          );
        
        return titleMatch || categoryMatch;
      });
      if (hasCareerMatch) {
        // OPTIMIZED: Boost career path matches more when combined with location quality
        // Perfect career + exact location = amazing match
        const careerBoost = matchLevel === 'exact' ? 40 : 35;
        score += careerBoost; // HIGHEST priority - career path match
      } else {
        // OPTIMIZED: Penalty varies by location match quality
        // If location is exact, be stricter on career path
        // If location is fallback, be more lenient
        const careerPenalty = matchLevel === 'exact' ? 20 : 
                              matchLevel === 'country' ? 15 : 
                              10; // Less penalty for remote/fallback
        score -= careerPenalty; // Ensures quality matches rank higher
      }
    }
    
    // 3. Role/Title matching (SECOND PRIORITY - refinement WITHIN career path)
    // IMPORTANT: Roles are ALWAYS within the career path from the signup form
    // So if career path matches, roles are more likely to match too
    // This is a refinement filter, not a separate concern
    if (user.roles_selected && user.roles_selected.length > 0) {
      const roles = user.roles_selected;
      hasRoleMatch = roles.some((role: string) => {
        if (!role) return false;
        const roleLower = role.toLowerCase();
        // Check for exact role match or partial match
        return jobTitle.includes(roleLower) || 
               jobDesc.includes(roleLower) ||
               // Also check for role keywords (e.g., "Analyst" matches "Financial Analyst")
               roleLower.split(' ').some(keyword => 
                 jobTitle.includes(keyword) || jobDesc.includes(keyword)
               );
      });
      if (hasRoleMatch) {
        // OPTIMIZED: Role match scoring varies by context
        // Perfect match: Career + Role + Exact Location = maximum score
        if (hasCareerMatch) {
          // Role match WITHIN correct career path - refinement bonus
          // Boost more if location is exact (perfect match scenario)
          const roleBoost = matchLevel === 'exact' ? 25 : 20;
          score += roleBoost;
        } else {
          // Role match but wrong career path - less valuable
          score += 10;
        }
      } else {
        // OPTIMIZED: Penalties vary by match quality context
        if (hasCareerMatch) {
          // Career matches but role doesn't - small penalty (still quality match)
          // Penalty is smaller if location is exact (career + location is strong)
          const rolePenalty = matchLevel === 'exact' ? 2 : 3;
          score -= rolePenalty;
        } else {
          // No career or role match - moderate penalty
          score -= 10;
        }
      }
    }
    
    // 4. Work environment matching (if user specified)
    if (user.work_environment && user.work_environment !== 'unclear') {
      const userWorkEnv = user.work_environment.toLowerCase();
      const jobWorkEnvLower = jobWorkEnv || jobLocation; // Check location string too
      
      if (userWorkEnv === 'remote' && (jobWorkEnvLower.includes('remote') || jobWorkEnvLower.includes('work from home'))) {
        score += 10; // Remote preference match
      } else if (userWorkEnv === 'hybrid' && (jobWorkEnvLower.includes('hybrid') || jobWorkEnvLower.includes('remote'))) {
        score += 8; // Hybrid preference match (remote also acceptable)
      } else if (userWorkEnv === 'on-site' && !jobWorkEnvLower.includes('remote') && !jobWorkEnvLower.includes('hybrid')) {
        score += 5; // On-site preference match
      } else if (userWorkEnv !== 'unclear') {
        score -= 5; // Penalty for mismatch
      }
    }
    
    // 5. Entry level preference matching (improved with flags)
    // Normalize form values: "Internship, Graduate Programmes" -> handles both formats
    if (user.entry_level_preference) {
      // Normalize: handle comma-separated values and various capitalizations
      const entryLevel = Array.isArray(user.entry_level_preference)
        ? user.entry_level_preference.join(', ').toLowerCase()
        : user.entry_level_preference.toLowerCase();
      const jobIsInternship = (job as any).is_internship === true;
      const jobIsGraduate = (job as any).is_graduate === true;
      const jobIsEarlyCareer = (job as any).is_early_career === true || 
                               ((job as any).categories && Array.isArray((job as any).categories) && 
                                (job as any).categories.includes('early-career'));
      
      // Check for working student terms in job (werkstudent, part-time student, etc.)
      const workingStudentTerms = ['werkstudent', 'working student', 'part-time student', 'student worker', 'student job'];
      const isWorkingStudentJob = workingStudentTerms.some(term => 
        jobTitle.includes(term) || jobDesc.includes(term)
      );
      
      // Use flags first (most accurate)
      // Handle form values: "Internship", "Graduate Programmes", "Entry Level" (capitalized)
      if ((entryLevel.includes('intern') || entryLevel.includes('internship')) && jobIsInternship) {
        score += 15; // Perfect match for internship
      } else if ((entryLevel.includes('intern') || entryLevel.includes('internship')) && !jobIsInternship) {
        score -= 5; // Penalty if user wants internship but job isn't
      }
      
      // Working Student preference: boost internships, especially those with working student terms
      if (entryLevel.includes('working student') || entryLevel.includes('werkstudent')) {
        if (jobIsInternship && isWorkingStudentJob) {
          score += 15; // Perfect match for working student role
        } else if (jobIsInternship) {
          score += 12; // Good match (internship, but not explicitly working student)
        } else if (isWorkingStudentJob) {
          score += 10; // Text match for working student terms
        }
      }
      
      // Handle "Graduate Programmes" (capitalized) and "graduate" (lowercase)
      if ((entryLevel.includes('graduate') || entryLevel.includes('graduate programme')) && jobIsGraduate) {
        score += 15; // Perfect match for graduate programme
      } else if ((entryLevel.includes('graduate') || entryLevel.includes('graduate programme')) && !jobIsGraduate && !jobIsInternship) {
        score -= 5; // Penalty if user wants graduate but job isn't
      }
      
      // Handle "Entry Level" (capitalized) and "entry-level" (hyphenated)
      if ((entryLevel.includes('entry level') || entryLevel.includes('entry-level') || entryLevel.includes('early career')) && 
          jobIsEarlyCareer && !jobIsInternship && !jobIsGraduate) {
        score += 10; // Match for entry-level roles
      }
      
      // Fallback to text matching
      const entryKeywords = ['intern', 'internship', 'graduate', 'grad', 'entry', 'junior', 'trainee', 'associate', 'assistant'];
      const seniorKeywords = ['senior', 'lead', 'principal', 'manager', 'director', 'head', 'executive'];
      
      const isEntryLevel = entryKeywords.some(kw => jobTitle.includes(kw) || jobDesc.includes(kw));
      const isSenior = seniorKeywords.some(kw => jobTitle.includes(kw) || jobDesc.includes(kw));
      
      if (entryLevel.includes('entry') && isEntryLevel && !jobIsInternship && !jobIsGraduate) {
        score += 8; // Entry level match (text-based)
      } else if (entryLevel.includes('entry') && isSenior) {
        score -= 15; // Strong penalty for senior jobs when user wants entry
      }
    }
    
    // 6. Company type matching (if user specified)
    if (user.company_types && user.company_types.length > 0) {
      const companyTypes = user.company_types;
      const companyName = ((job as any).company || '').toLowerCase();
      const hasCompanyMatch = companyTypes.some(type => {
        const typeLower = type.toLowerCase();
        // Check company name and description
        return companyName.includes(typeLower) || 
               jobDesc.includes(typeLower) ||
               // Handle common variations
               (typeLower.includes('startup') && (companyName.includes('startup') || jobDesc.includes('startup'))) ||
               (typeLower.includes('consulting') && (companyName.includes('consulting') || jobDesc.includes('consulting')));
      });
      if (hasCompanyMatch) {
        score += 5; // Company type match
      }
    }
    
    // 7. Visa status matching (CRITICAL for non-EU users)
    if (user.visa_status) {
      const visaStatus = user.visa_status.toLowerCase();
      const jobDescLower = jobDesc.toLowerCase();
      const jobTitleLower = jobTitle.toLowerCase();
      
      // Check if user needs visa sponsorship
      const needsVisaSponsorship = !visaStatus.includes('eu-citizen') && 
                                   !visaStatus.includes('citizen') && 
                                   !visaStatus.includes('permanent');
      
      if (needsVisaSponsorship) {
        // User needs visa sponsorship - check if job offers it
        const visaKeywords = [
          'visa sponsorship', 'sponsor visa', 'work permit', 'relocation support',
          'visa support', 'immigration support', 'work authorization', 'sponsorship available',
          'will sponsor', 'can sponsor', 'visa assistance', 'relocation package'
        ];
        
        const offersVisaSponsorship = visaKeywords.some(keyword => 
          jobDescLower.includes(keyword) || jobTitleLower.includes(keyword)
        );
        
        // Also check structured field if available
        const jobVisaFriendly = (job as any).visa_friendly === true || 
                                (job as any).visa_sponsorship === true;
        
        if (offersVisaSponsorship || jobVisaFriendly) {
          score += 15; // Strong bonus for visa sponsorship (critical for user)
        } else {
          score -= 20; // Strong penalty - user can't apply without visa sponsorship
        }
      } else {
        // EU citizen or permanent resident - no visa needed, small bonus for clarity
        score += 2; // Small bonus for jobs that explicitly mention EU eligibility
      }
    }
    
    // 8. Language scoring (improved - uses extracted language_requirements)
    if (user.languages_spoken && Array.isArray(user.languages_spoken) && user.languages_spoken.length > 0) {
      const jobLanguages = (job as any).language_requirements;
      
      // Use extracted language_requirements field first (most accurate)
      if (jobLanguages && Array.isArray(jobLanguages) && jobLanguages.length > 0 && user.languages_spoken && Array.isArray(user.languages_spoken)) {
        const matchingLanguages = jobLanguages.filter((lang: string) => 
          user.languages_spoken!.some(userLang => 
            userLang.toLowerCase().includes(lang.toLowerCase()) || 
            lang.toLowerCase().includes(userLang.toLowerCase())
          )
        );
        if (matchingLanguages.length > 0) {
          score += 10; // Bonus for language match (increased from 7)
        } else {
          score -= 3; // Small penalty if job requires languages user doesn't speak
        }
      } else {
        // Fallback to text matching in description
        const languages = Array.isArray(user.languages_spoken) ? user.languages_spoken : [user.languages_spoken];
        const hasLanguageMatch = languages.some(lang => {
          if (!lang) return false;
          const langLower = lang.toLowerCase();
          return jobDesc.includes(langLower) || 
                 jobDesc.includes(`${langLower} speaking`) ||
                 jobDesc.includes(`fluent in ${langLower}`) ||
                 jobDesc.includes(`native ${langLower}`);
        });
        if (hasLanguageMatch) {
          score += 5; // Lower score for text-based match
        }
      }
    }
    
    // 9. Industries matching (if user specified)
    if (user.industries && Array.isArray(user.industries) && user.industries.length > 0) {
      const industries = user.industries.map(i => i.toLowerCase());
      const hasIndustryMatch = industries.some(industry => {
        const industryLower = industry.toLowerCase();
        return jobDesc.includes(industryLower) || 
               jobTitle.includes(industryLower) ||
               // Handle common industry variations
               (industryLower.includes('tech') && (jobDesc.includes('technology') || jobDesc.includes('software') || jobDesc.includes('digital'))) ||
               (industryLower.includes('finance') && (jobDesc.includes('financial') || jobDesc.includes('banking') || jobDesc.includes('investment'))) ||
               (industryLower.includes('consulting') && (jobDesc.includes('consulting') || jobDesc.includes('advisory') || jobDesc.includes('strategy')));
      });
      if (hasIndustryMatch) {
        score += 5; // Industry match bonus
      }
    }
    
    // 10. Company size preference (if user specified)
    if (user.company_size_preference && user.company_size_preference !== 'any') {
      const sizePreference = user.company_size_preference.toLowerCase();
      const sizeKeywords: Record<string, string[]> = {
        'startup': ['startup', 'early-stage', 'seed', 'series a', 'series b', 'founded', 'new company'],
        'small': ['small company', 'small team', '10-50', '50-200', 'boutique', 'small business'],
        'medium': ['medium', '200-500', '500-1000', 'mid-size', 'mid-sized'],
        'large': ['large', 'multinational', 'fortune', 'ftse', 'dax', 'cac', '1000+', 'global', 'enterprise', 'established']
      };
      
      const keywords = sizeKeywords[sizePreference] || [];
      if (keywords.length > 0) {
        const hasSizeMatch = keywords.some(kw => 
          jobDesc.includes(kw) || 
          (job as any).company?.toLowerCase().includes(kw) ||
          jobTitle.includes(kw)
        );
        if (hasSizeMatch) {
          score += 3; // Company size match bonus
        }
      }
    }
    
    // 11. Skills matching (if user specified)
    if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      const skills = user.skills.map(s => s.toLowerCase().trim());
      const matchingSkills = skills.filter(skill => {
        if (!skill) return false;
        // Check for skill in title, description, or as a keyword
        return jobTitle.includes(skill) || 
               jobDesc.includes(skill) ||
               jobDesc.includes(`${skill} `) ||
               jobDesc.includes(` ${skill}`) ||
               // Handle common skill variations
               (skill.includes('python') && jobDesc.includes('python')) ||
               (skill.includes('javascript') && (jobDesc.includes('javascript') || jobDesc.includes('js'))) ||
               (skill.includes('sql') && (jobDesc.includes('sql') || jobDesc.includes('database')));
      });
      
      if (matchingSkills.length > 0) {
        // Score based on number of matching skills (up to 8 points)
        score += Math.min(8, matchingSkills.length * 2);
      }
    }
    
    // 12. Career keywords matching (if user specified - free-form text)
    if (user.career_keywords && user.career_keywords.trim().length > 0) {
      const keywords = user.career_keywords.toLowerCase()
        .split(/\s+/)
        .filter(kw => kw.length > 2); // Filter out very short words
      
      const matchingKeywords = keywords.filter(kw => 
        jobTitle.includes(kw) || jobDesc.includes(kw)
      );
      
      if (matchingKeywords.length > 0) {
        // Score based on number of matching keywords (up to 5 points)
        score += Math.min(5, matchingKeywords.length);
      }
    }
    
    // 13. Early career indicators (bonus points)
    const earlyCareerKeywords = ['graduate', 'intern', 'internship', 'entry', 'junior', 'trainee', 'associate'];
    const hasEarlyCareerIndicator = earlyCareerKeywords.some(kw => 
      jobTitle.includes(kw) || 
      jobDesc.includes(kw) ||
      (job as any).is_graduate ||
      (job as any).is_internship ||
      ((job as any).categories && Array.isArray((job as any).categories) && 
       (job as any).categories.includes('early-career'))
    );
    if (hasEarlyCareerIndicator) {
      score += 5; // Bonus for early career jobs
    }
    
    // 14. Apply feedback boosts (learned preferences)
    feedbackBoosts.forEach((boost, key) => {
      const [type, value] = key.split(':');
      
      if (type === 'loc' && jobLocation.includes(value)) {
        score += boost;
      }
      if (type === 'type' && (jobTitle.includes(value) || jobDesc.includes(value))) {
        score += boost;
      }
      if (type === 'env' && jobLocation.includes(value)) {
        score += boost;
      }
    });
    
    return { job, score, hasRoleMatch, hasCareerMatch };
  });
  
  // QUALITY-FOCUSED MATCHING: Ensure graduates get high-quality, relevant matches
  // CRITICAL: Career path matching is REQUIRED when user specifies it
  const userHasRolePreference = user.roles_selected && user.roles_selected.length > 0;
  const userHasCareerPreference = user.career_path && 
    (Array.isArray(user.career_path) ? user.career_path.length > 0 : !!user.career_path);
  
  // OPTIMIZED QUALITY THRESHOLD: Dynamic minimum based on match level
  // Lowered by 10-15 points to prevent zero matches while maintaining quality
  // Let AI make final decisions on match quality
  const getMinimumScore = () => {
    if (matchLevel === 'exact') return 40; // Reduced from 50 - let AI decide quality
    if (matchLevel === 'country') return 35; // Reduced from 45
    if (matchLevel === 'remote') return 30; // Reduced from 40
    return 25; // Reduced from 35 - ensures matches exist for AI to evaluate
  };
  const MINIMUM_SCORE = getMinimumScore();
  
  // QUALITY FILTER: If user specified preferences, jobs must show SOME relevance
  // This ensures quality over quantity - graduates get relevant matches
  const QUALITY_RELEVANCE_THRESHOLD = 0.3; // At least 30% relevance to preferences
  
  // OPTIMIZED SMART QUALITY RELAXATION: Adjust thresholds based on available jobs AND match level
  // If we have few jobs after filtering, relax quality requirements to ensure matches
  // But maintain higher standards for exact location matches
  const availableJobsCount = scoredJobs.length;
  const isScarceJobs = availableJobsCount < 20; // Few jobs available
  const isVeryScarceJobs = availableJobsCount < 10; // Very few jobs available
  
  // OPTIMIZED: Adjust thresholds based on scarcity AND match level
  // Exact matches maintain higher standards even when scarce
  const baseAdjustment = matchLevel === 'exact' ? 0 : // No adjustment for exact matches
                         matchLevel === 'country' ? 2 : // Small adjustment for country
                         matchLevel === 'remote' ? 5 : // Moderate adjustment for remote
                         10; // Larger adjustment for fallback
  
  const adjustedMinimumScore = isVeryScarceJobs ? Math.max(30, MINIMUM_SCORE - baseAdjustment - 5) : 
                                isScarceJobs ? Math.max(35, MINIMUM_SCORE - baseAdjustment) : 
                                MINIMUM_SCORE;
  
  // OPTIMIZED: Relevance threshold also varies by match level
  const baseRelevanceThreshold = matchLevel === 'exact' ? QUALITY_RELEVANCE_THRESHOLD :
                                 matchLevel === 'country' ? QUALITY_RELEVANCE_THRESHOLD - 0.05 :
                                 matchLevel === 'remote' ? QUALITY_RELEVANCE_THRESHOLD - 0.1 :
                                 QUALITY_RELEVANCE_THRESHOLD - 0.15;
  
  const adjustedRelevanceThreshold = isVeryScarceJobs ? Math.max(0.1, baseRelevanceThreshold - 0.05) : 
                                      isScarceJobs ? Math.max(0.15, baseRelevanceThreshold - 0.05) : 
                                      baseRelevanceThreshold;
  
  // Sort by score, then ensure source diversity in top results
  const sortedJobs = scoredJobs
    .filter(item => {
      // Quality threshold - ensure matches are actually good (adjusted for scarcity)
      if (item.score < adjustedMinimumScore) return false;
      
      // OPTIMIZED: Career path matching is PREFERRED but not REQUIRED
      // Always allow non-career matches with a penalty to ensure users get matches
      // This prevents zero matches while still prioritizing career-relevant jobs
      if (userHasCareerPreference && !item.hasCareerMatch) {
        // Apply penalty based on match level - stricter for exact location matches
        const penalty = matchLevel === 'exact' ? 15 : 
                       matchLevel === 'country' ? 12 : 
                       matchLevel === 'remote' ? 10 : 
                       8; // Minimal penalty for fallback
        
        apiLogger.info('Allowing non-career match with penalty', {
          email: user.email,
          availableJobs: availableJobsCount,
          matchLevel,
          penaltyApplied: penalty,
          reason: 'Ensuring users get matches while prioritizing career-relevant jobs'
        });
        item.score = Math.max(item.score - penalty, adjustedMinimumScore - 5);
      }
      
      // OPTIMIZED QUALITY CHECK: If user has role preferences, ensure job has some relevance
      // This prevents showing completely irrelevant jobs just to fill quota
      if (userHasRolePreference) {
        // Calculate relevance: how well does job match user's stated preferences?
        // OPTIMIZED: Base score varies by match level (exact location = higher base)
        const baseScore = matchLevel === 'exact' ? 45 :
                         matchLevel === 'country' ? 35 :
                         matchLevel === 'remote' ? 30 :
                         25; // Varies by location match quality
        const relevanceScore = item.score - baseScore; // Score beyond location
        const maxPossibleRelevance = 40 + 25 + 10 + 8 + 7 + 5; // Career + Role + WorkEnv + EntryLevel + Language + EarlyCareer
        const relevanceRatio = relevanceScore / maxPossibleRelevance;
        
        // OPTIMIZED: If relevance is too low, exclude it (quality over quantity)
        // But relax threshold in scarce scenarios and for lower match levels
        if (relevanceRatio < adjustedRelevanceThreshold) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => b.score - a.score);
  
  // Log quality relaxation if applied
  if (isScarceJobs) {
    logger.info('Quality thresholds relaxed due to scarce jobs', {
      metadata: {
        email: user.email,
        availableJobs: availableJobsCount,
        adjustedMinimumScore,
        adjustedRelevanceThreshold,
        finalMatches: sortedJobs.length
      }
    });
  }
  
  // Ensure source diversity in top 100 jobs sent to AI
  const diverseJobs: typeof sortedJobs[0][] = [];
  const maxPerSource = MATCH_RULES.maxPerSource; // Max jobs from any single source in top results
  
  for (const item of sortedJobs) {
    const source = (item.job as any).source || 'unknown';
    const currentCount = diverseJobs.filter(d => ((d.job as any).source || 'unknown') === source).length;
    
    if (currentCount < maxPerSource) {
      diverseJobs.push(item);
    }
    
    if (diverseJobs.length >= 100) break; // Stop at 100 jobs
  }
  
  // Add remaining jobs if we don't have 100 yet
  if (diverseJobs.length < 100) {
    const remainingJobs = sortedJobs.filter(item => !diverseJobs.includes(item));
    diverseJobs.push(...remainingJobs.slice(0, 100 - diverseJobs.length));
  }
  
  const topJobs = diverseJobs.map(item => item.job);
  const sourceCounts = Object.entries(sourceCount).map(([s, c]) => `${s}:${c}`).join(', ');
  
  // CRITICAL: Ensure we never return zero matches
  // If filtering resulted in zero matches, apply emergency fallback
  if (topJobs.length === 0) {
    const zeroMatchesError = new Error('Zero matches after pre-filtering - emergency fallback applied');
    apiLogger.error('CRITICAL: Pre-filtering returned zero matches, applying emergency fallback', zeroMatchesError, {
      email: user.email,
      targetCities: user.target_cities,
      originalJobs: jobs.length,
      filteredJobs: filteredJobs.length,
      scoredJobs: scoredJobs.length,
      sortedJobs: sortedJobs.length
    });
    
    logger.error('Zero matches after emergency fallback', {
      error: zeroMatchesError,
      component: 'matching',
      metadata: {
        issue: 'zero_matches_emergency',
        email: user.email,
        targetCities: user.target_cities,
        originalJobs: jobs.length,
        matchLevel
      }
    });
    
    // Emergency fallback: Return top-scored jobs regardless of strict filters
    // Better to show some matches than zero matches
    const emergencyJobs = scoredJobs
      .filter(item => item.score >= 35) // Lower threshold for emergency
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(item => item.job);
    
    if (emergencyJobs.length > 0) {
      apiLogger.warn('Emergency fallback successful', {
        email: user.email,
        emergencyMatches: emergencyJobs.length
      });
      return emergencyJobs;
    }
    
    // Last resort: Return any jobs (better than zero)
    const lastResortError = new Error('Last resort: Returning all jobs');
    apiLogger.error('Last resort: Returning all jobs', lastResortError, {
      email: user.email,
      totalJobs: jobs.length
    });
    return jobs.slice(0, 100);
  }
  
  // Log job filtering results
  logger.info('Job filtering completed', {
    metadata: {
      userEmail: user.email,
      originalCount: jobs.length,
      filteredCount: topJobs.length,
      sourceDistribution: sourceCounts,
      feedbackBoosted: feedbackBoosts.size > 0,
      matchLevel
    }
  });
  
  return topJobs;
}

