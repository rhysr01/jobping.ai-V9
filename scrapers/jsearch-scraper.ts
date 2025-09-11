// ✅ FIXED JSearch Scraper - Optimized for EU Early Career Jobs
import { classifyEarlyCareer, convertToDatabaseFormat } from './utils.js';
import { getSmartDateStrategy, getSmartPaginationStrategy, withFallback } from './smart-strategies.js';

// Types
interface IngestJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at: string;
  source: string;
}

interface JSearchJob {
  job_id: string;
  employer_name: string;
  job_title: string;
  job_description: string;
  job_apply_link: string;
  job_city: string;
  job_country: string;
  job_posted_at_datetime_utc: string;
  job_posted_at_timestamp: number;
  job_employment_type: string;
  job_experience_in_place_of_education: boolean;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_salary_period: string | null;
  job_highlights: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_job_title: string | null;
  job_posting_language: string;
  job_onet_soc: string;
  job_onet_job_zone: string;
  job_occupational_categories: string[];
  job_naics_code: string;
  job_naics_name: string;
  employer_logo: string | null;
  employer_website: string | null;
  employer_company_type: string | null;
  job_publisher: string;
  job_apply_is_direct: boolean;
  job_apply_quality_score: number;
  apply_options: Array<{
    publisher: string;
    apply_link: string;
    is_direct: boolean;
  }>;
  job_description_language: string;
  job_is_remote: boolean;
  job_google_link: string;
  job_offer_expiration_datetime_utc: string | null;
  job_offer_expiration_timestamp: number | null;
  job_required_experience: {
    no_experience_required: boolean;
    required_experience_in_months: number | null;
    experience_mentioned: boolean;
    experience_preferred: boolean;
  };
  job_required_skills: string[] | null;
  job_required_education: {
    postgraduate_degree: boolean;
    professional_certification: boolean;
    high_school: boolean;
    associates_degree: boolean;
    bachelors_degree: boolean;
    degree_mentioned: boolean;
    degree_preferred: boolean;
    professional_certification_mentioned: boolean;
  };
  job_benefits: string[] | null;
  job_remote_option: boolean;
}

interface JSearchResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    page: number;
    num_pages: number;
    date_posted: string;
  };
  data: JSearchJob[];
  num_pages?: number;
}

// ✅ OPTIMIZED JSearch Configuration
const JSEARCH_CONFIG = {
  baseUrl: 'https://jsearch.p.rapidapi.com/search',
  // ✅ Auth: Support either RAPIDAPI_KEY or JSEARCH_API_KEY; configurable host
  apiKey: process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY || '',
  apiHost: process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com',
  
  // Core EU cities - aligned with JobPing user preferences
  locations: [
    'London, United Kingdom',
    'Dublin, Ireland',
    'Berlin, Germany',
    'Amsterdam, Netherlands',
    'Paris, France',
    'Madrid, Spain',
    'Munich, Germany',
    'Stockholm, Sweden',
    'Zurich, Switzerland',
    'Copenhagen, Denmark',
    'Barcelona, Spain',
    'Milan, Italy'
  ],
  
  // ✅ FIXED: Much more reasonable rate limiting
  requestInterval: 300000, // 5 minutes default (reduced in test mode)
  monthlyBudget: 2000,
  dailyBudget: 65,
  seenJobTTL: 7 * 24 * 60 * 60 * 1000,
  resultsPerPage: 10,
  datePosted: withFallback(() => getSmartDateStrategy('jsearch'), 'week')
};

// Query rotation for diverse job discovery  
type Track = 'A' | 'B' | 'C' | 'D' | 'E';

const TRACK_QUERIES: Record<Track, string> = {
  A: 'graduate scheme OR new grad OR campus hire OR recent graduate',
  B: 'graduate program OR junior analyst OR trainee consultant OR entry level',
  C: 'graduate marketing OR junior sales OR new grad business OR campus hire',
  D: 'graduate data analyst OR junior finance OR new grad operations OR trainee',
  E: 'graduate engineer OR junior developer OR new grad tech OR campus hire'
};

const TRACK_LOCATIONS: Record<Track, string[]> = {
  A: ['London, United Kingdom', 'Berlin, Germany', 'Amsterdam, Netherlands', 'Stockholm, Sweden'],
  B: ['Dublin, Ireland', 'Paris, France', 'Zurich, Switzerland', 'London, United Kingdom'],
  C: ['Madrid, Spain', 'Barcelona, Spain', 'Milan, Italy', 'Copenhagen, Denmark'],
  D: ['London, United Kingdom', 'Amsterdam, Netherlands', 'Zurich, Switzerland', 'Munich, Germany'],
  E: ['Berlin, Germany', 'Dublin, Ireland', 'Paris, France', 'Munich, Germany']
};

class JSearchScraper {
  private requestCount = 0;
  private dailyRequestCount = 0;
  private monthlyRequestCount = 0;
  private lastRequestTime = 0;
  private lastDayReset = '';
  private seenJobs: Map<string, number> = new Map();

  constructor() {
    this.resetDailyCounts();
    this.cleanupSeenJobs();
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private resetDailyCounts(): void {
    const today = new Date().toDateString();
    if (this.lastDayReset !== today) {
      this.dailyRequestCount = 0;
      this.lastDayReset = today;
    }
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - JSEARCH_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private getTrackForRun(): Track {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    const trackIndex = (dayOfWeek + Math.floor(hour / 5)) % 5;
    return tracks[trackIndex];
  }

  private async throttleRequest(): Promise<void> {
    this.resetDailyCounts();
    
    if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget) {
      throw new Error('Daily API budget exceeded');
    }
    
    if (this.monthlyRequestCount >= JSEARCH_CONFIG.monthlyBudget) {
      throw new Error('Monthly API budget exceeded');
    }
    
    // ✅ FIXED: Reasonable rate limiting; in test mode, reduce to 5 seconds
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    const interval = (process.env.JOBPING_TEST_MODE === '1') ? 5000 : JSEARCH_CONFIG.requestInterval;
    if (timeSinceLastRequest < interval) {
      const delay = interval - timeSinceLastRequest;
      console.log(`⏰ Rate limiting: waiting ${Math.round(delay / 1000 / 60)} minutes...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(params: Record<string, any>): Promise<JSearchResponse> {
    await this.throttleRequest();

    try {
      // Use smart pagination strategy
      const pagination = withFallback(() => getSmartPaginationStrategy('jsearch'), { startPage: 1, endPage: 3 });
      const smartDatePosted = withFallback(() => getSmartDateStrategy('jsearch'), 'week');
      
      const queryParams = new URLSearchParams({
        query: params.query,
        page: (params.page || pagination.startPage).toString(),
        num_pages: (params.num_pages || (pagination.endPage - pagination.startPage + 1)).toString(),
        date_posted: params.datePosted || smartDatePosted,
        remote_jobs_only: (params.remote_jobs_only || false).toString(),
        employment_types: params.employment_types || 'FULLTIME,PARTTIME,CONTRACTOR',
        job_requirements: params.job_requirements || 'under_3_years_experience,no_degree'
      });

      const url = `${JSEARCH_CONFIG.baseUrl}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': JSEARCH_CONFIG.apiKey,
          'X-RapidAPI-Host': JSEARCH_CONFIG.apiHost,
          'Accept': 'application/json',
          'User-Agent': 'JobPing/1.0 (https://jobping.com)'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('🚫 Rate limited, backing off...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return this.makeRequest(params);
        }
        throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
      }

      this.requestCount++;
      this.dailyRequestCount++;
      this.monthlyRequestCount++;
      
      const data = await response.json();
      return data as JSearchResponse;

    } catch (error: any) {
      console.error('JSearch API error:', error);
      throw error;
    }
  }

  private convertToIngestJob(jSearchJob: JSearchJob): IngestJob {
    let location = 'Remote';
    if (jSearchJob.job_city && jSearchJob.job_country) {
      location = `${jSearchJob.job_city}, ${jSearchJob.job_country}`;
    } else if (jSearchJob.job_country) {
      location = jSearchJob.job_country;
    } else if (jSearchJob.job_city) {
      location = jSearchJob.job_city;
    }
    
    if (jSearchJob.job_is_remote) {
      location = `Remote, ${jSearchJob.job_country || 'EU'}`;
    }

    return {
      title: jSearchJob.job_title,
      company: jSearchJob.employer_name,
      location: location,
      description: jSearchJob.job_description,
      url: jSearchJob.job_apply_link,
      posted_at: jSearchJob.job_posted_at_datetime_utc,
      source: 'jsearch'
    };
  }

  private async searchJobs(query: string, location?: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    console.log(`🔍 Searching JSearch: "${query}" ${location ? `in ${location}` : ''}`);

    try {
      // ✅ IMPROVED: Better search query construction
      let searchQuery = query;
      if (location) {
        const city = location.split(',')[0].trim();
        searchQuery = `${query} ${city}`;
      }
      
      const params = {
        query: searchQuery,
        page: 1,
        num_pages: 1,
        date_posted: JSEARCH_CONFIG.datePosted,
        job_requirements: 'under_3_years_experience,no_degree'
      };

      const response = await this.makeRequest(params);
      console.log(`📊 Found ${response.data?.length || 0} jobs for "${query}"`);

      if (response.data && response.data.length > 0) {
        for (const job of response.data) {
          if (!this.seenJobs.has(job.job_id)) {
            this.seenJobs.set(job.job_id, Date.now());
            
            try {
              const ingestJob = this.convertToIngestJob(job);
              
              const isEarlyCareer = classifyEarlyCareer(ingestJob);
              if (isEarlyCareer) {
                if (this.isEULocation(job)) {
                  jobs.push(ingestJob);
                  console.log(`✅ Early-career EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                } else {
                  console.log(`🚫 Skipped non-EU: ${ingestJob.title} at ${ingestJob.company} (${ingestJob.location})`);
                }
              } else {
                console.log(`🚫 Skipped senior: ${ingestJob.title} at ${ingestJob.company}`);
              }
            } catch (error) {
              console.warn(`Failed to process job ${job.job_id}:`, error);
            }
          }
        }
      }

    } catch (error: any) {
      console.error(`❌ Error searching JSearch for "${query}":`, error.message);
    }

    return jobs;
  }

  // ✅ ENHANCED: Much more comprehensive EU location detection
  private isEULocation(job: JSearchJob): boolean {
    const euPatterns = [
      'united kingdom', 'uk', 'great britain', 'britain', 'england', 'scotland', 'wales',
      'ireland', 'republic of ireland', 'ie',
      'germany', 'deutschland', 'de',
      'france', 'fr', 'république française',
      'spain', 'españa', 'es',
      'italy', 'italia', 'it',
      'netherlands', 'holland', 'nl', 'nederland',
      'belgium', 'belgique', 'belgië', 'be',
      'austria', 'österreich', 'at',
      'switzerland', 'schweiz', 'suisse', 'ch',
      'sweden', 'sverige', 'se',
      'denmark', 'danmark', 'dk',
      'norway', 'norge', 'no',
      'finland', 'suomi', 'fi',
      'poland', 'polska', 'pl',
      'czech republic', 'czechia', 'cz',
      'hungary', 'magyarország', 'hu',
      'portugal', 'pt',
      'greece', 'ελλάδα', 'gr',
      'romania', 'românia', 'ro',
      'bulgaria', 'българия', 'bg',
      'croatia', 'hrvatska', 'hr',
      'slovenia', 'slovenija', 'si',
      'slovakia', 'slovensko', 'sk',
      'estonia', 'eesti', 'ee',
      'latvia', 'latvija', 'lv',
      'lithuania', 'lietuva', 'lt',
      'luxembourg', 'lëtzebuerg', 'lu',
      'malta', 'mt',
      'cyprus', 'κύπρος', 'cy',
      
      // Major EU cities
      'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'leeds', 'liverpool',
      'dublin', 'cork', 'galway',
      'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf',
      'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'strasbourg',
      'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'málaga',
      'rome', 'milan', 'naples', 'turin', 'florence', 'bologna',
      'amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven',
      'brussels', 'antwerp', 'ghent', 'bruges',
      'vienna', 'salzburg', 'graz', 'innsbruck',
      'zurich', 'geneva', 'basel', 'bern', 'lausanne',
      'stockholm', 'gothenburg', 'malmö', 'uppsala',
      'copenhagen', 'aarhus', 'odense', 'aalborg',
      'oslo', 'bergen', 'trondheim', 'stavanger',
      'helsinki', 'espoo', 'tampere', 'vantaa',
      'warsaw', 'krakow', 'gdansk', 'wrocław', 'poznań',
      'prague', 'brno', 'ostrava', 'plzen',
      'budapest', 'debrecen', 'szeged', 'miskolc',
      'lisbon', 'porto', 'braga', 'coimbra',
      'athens', 'thessaloniki', 'patras', 'heraklion'
    ];

    // Check job country
    if (job.job_country) {
      const country = job.job_country.toLowerCase().trim();
      if (euPatterns.some(pattern => 
        country.includes(pattern) || pattern.includes(country)
      )) {
        return true;
      }
    }

    // Check job city
    if (job.job_city) {
      const city = job.job_city.toLowerCase().trim();
      if (euPatterns.some(pattern => 
        city.includes(pattern) || pattern.includes(city)
      )) {
        return true;
      }
    }

    // Check combined location
    const fullLocation = `${job.job_city || ''} ${job.job_country || ''} ${job.job_description || ''}`.toLowerCase();
    if (euPatterns.some(pattern => fullLocation.includes(pattern))) {
      return true;
    }

    return false;
  }

  public async scrapeWithTrackRotation(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const query = TRACK_QUERIES[track];
    const locations = TRACK_LOCATIONS[track];
    const allJobs: IngestJob[] = [];
    
    const metrics = {
      track,
      query,
      locationsTargeted: locations,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
      monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 JSearch scraping with Track ${track}`);
    console.log(`🔍 Query: ${query}`);
    console.log(`📍 Locations: ${locations.join(', ')}`);

    try {
      // ✅ IMPROVED: Process more locations with faster rate limiting
      console.log(`\n📍 EU Location-specific searches...`);
      
      const maxLocations = Math.min(locations.length, 6);
      for (let i = 0; i < maxLocations; i++) {
        if (this.dailyRequestCount >= JSEARCH_CONFIG.dailyBudget - 2) {
          console.log('⏰ Approaching daily budget limit, stopping');
          break;
        }
        
        const location = locations[i];
        const locationJobs = await this.searchJobs(query, location);
        allJobs.push(...locationJobs);
      }

    } catch (error: any) {
      console.error(`❌ Error in JSearch scraping:`, error.message);
      metrics.errors++;
    }

    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    metrics.totalJobsFound = uniqueJobs.length;
    metrics.earlyCareerJobs = uniqueJobs.length;
    metrics.requestsUsed = this.requestCount;
    metrics.dailyBudgetRemaining = JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount;
    metrics.monthlyBudgetRemaining = JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount;

    console.log(`\n📊 JSearch scraping complete:`);
    console.log(`   🔍 Query: ${query}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   📅 Daily budget remaining: ${metrics.dailyBudgetRemaining}`);
    console.log(`   📆 Monthly budget remaining: ${metrics.monthlyBudgetRemaining}`);

    return { jobs: uniqueJobs, metrics };
  }

  private deduplicateJobs(jobs: IngestJob[]): IngestJob[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}-${job.location.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  public getStatus(): any {
    this.resetDailyCounts();
    
    return {
      isRunning: false,
      locationsSupported: JSEARCH_CONFIG.locations.length,
      requestsToday: this.dailyRequestCount,
      requestsThisMonth: this.monthlyRequestCount,
      dailyBudget: JSEARCH_CONFIG.dailyBudget,
      monthlyBudget: JSEARCH_CONFIG.monthlyBudget,
      dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
      monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString(),
      nextRequestAvailable: new Date(this.lastRequestTime + JSEARCH_CONFIG.requestInterval).toISOString()
    };
  }

  public getDailyStats(): { 
    requestsUsed: number; 
    dailyBudgetRemaining: number; 
    monthlyBudgetRemaining: number;
    seenJobsCount: number;
  } {
    this.resetDailyCounts();
    
    return {
      requestsUsed: this.dailyRequestCount,
      dailyBudgetRemaining: JSEARCH_CONFIG.dailyBudget - this.dailyRequestCount,
      monthlyBudgetRemaining: JSEARCH_CONFIG.monthlyBudget - this.monthlyRequestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default JSearchScraper;