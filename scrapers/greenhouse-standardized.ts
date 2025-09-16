import axios from 'axios';
import { pathToFileURL } from 'url';
import { GREENHOUSE_COMPANIES, COMPANY_TRACKS, GREENHOUSE_CONFIG } from './config/greenhouse-companies';
import { redisState } from '../Utils/redis-state.service';
function localMakeJobHash(job: { title: string; company: string; location: string }): string {
  const normalizedTitle = (job.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedCompany = (job.company || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedLocation = (job.location || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const c = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function localParseLocation(location: string): { isRemote: boolean } {
  const loc = (location || '').toLowerCase();
  const isRemote = /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(loc);
  return { isRemote };
}

function isEarlyCareerText(title: string, description: string): boolean {
  const hay = `${title || ''} ${(description || '')}`.toLowerCase();
  const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|specialist|assistant|representative|consultant|researcher|developer|designer|marketing|sales|finance|operations|data|business|product)\b/i;
  const excl = /(\bsenior\b|\bstaff\b|\bprincipal\b|\blead\b|\bmanager\b|\bdirector\b|\bhead\b|\bvp\b|\bvice\s+president\b|\bchief\b|\bexecutive\b|\bc-level\b|\bcto\b|\bceo\b|\bcfo\b|\bcoo\b)/i;
  return inc.test(hay) && !excl.test(hay);
}

function convertIngestToDb(job: IngestJob): any {
  const loc = localParseLocation(job.location || '');
  const isEarly = isEarlyCareerText(job.title, job.description);
  const job_hash = localMakeJobHash({ title: job.title, company: job.company, location: job.location });
  const nowIso = new Date().toISOString();
  return {
    job_hash,
    title: (job.title || '').trim(),
    company: (job.company || '').trim(),
    location: (job.location || '').trim(),
    description: (job.description || '').trim(),
    job_url: (job.url || '').trim(),
    source: (job.source || 'greenhouse').trim(),
    posted_at: job.posted_at || nowIso,
    categories: [isEarly ? 'early-career' : 'experienced'],
    work_environment: loc.isRemote ? 'remote' : 'on-site',
    experience_required: isEarly ? 'entry-level' : 'experienced',
    original_posted_date: job.posted_at || nowIso,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  };
}
import supabasePkg from '@supabase/supabase-js';
const { createClient } = supabasePkg as any;

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

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string }[];
  content?: string;
  metadata?: Array<{ name: string; value: string }>;
  company_name?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

// Using imported GREENHOUSE_CONFIG from config file

// Freshness policy
const FRESHNESS_DAYS = 28;

// Using imported COMPANY_TRACKS from config file

// Career path rotation strategy
type Track = 'A' | 'B' | 'C' | 'D' | 'E';

const TRACK_DEPARTMENTS: Record<Track, string[]> = {
  A: ['Engineering', 'Technology', 'Product'], // Tech focus
  B: ['Consulting', 'Strategy', 'Business Development'], // Consulting focus
  C: ['Data Science', 'Analytics', 'Research'], // Data focus
  D: ['Marketing', 'Sales', 'Customer Success'], // Growth focus
  E: ['Operations', 'Finance', 'Legal'] // Operations focus
};

class GreenhouseScraper {
  private requestCount = 0;
  private lastRequestTime = 0;
  private seenJobs: Map<number, number> = new Map(); // jobId -> timestamp
  private companyCache: Map<string, { lastCheck: number; jobCount: number }> = new Map();

  constructor() {
    this.cleanupSeenJobs();
    // Clean up seen jobs every 12 hours
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - GREENHOUSE_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private getTrackForRun(): Track {
    // Rotate based on hour of day
    const hour = new Date().getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    return tracks[hour % 5];
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < GREENHOUSE_CONFIG.rateLimitDelay) {
      const delay = GREENHOUSE_CONFIG.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(url: string): Promise<GreenhouseResponse> {
    await this.throttleRequest();
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        validateStatus: (status) => status === 200 || status === 404
      });
      
      this.requestCount++;
      
      if (response.status === 404) {
        return { jobs: [] };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Rate limited by Greenhouse, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.makeRequest(url);
      }
      throw error;
    }
  }

  private convertToIngestJob(ghJob: GreenhouseJob, company: string): IngestJob {
    // Build location string
    let location = 'Remote';
    if (ghJob.location?.name) {
      location = ghJob.location.name;
    } else if (ghJob.offices && ghJob.offices.length > 0) {
      location = ghJob.offices[0].name;
    }
    
    // Clean HTML content
    const description = ghJob.content ? this.stripHtmlTags(ghJob.content) : 'Early-career position';
    
    return {
      title: ghJob.title,
      company: company,
      location: location,
      description: description,
      url: ghJob.absolute_url,
      posted_at: ghJob.updated_at || new Date().toISOString(),
      source: 'greenhouse'
    };
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
  }

  private isEarlyCareer(job: GreenhouseJob): boolean {
    const hay = [
      job.title,
      ...(job.departments?.map(d => d.name) ?? []),
      job.content ?? ""
    ].join(" ").toLowerCase();

    // Inclusive early-career patterns (no "executive" to avoid senior roles)
    const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|specialist|assistant|representative|consultant|researcher|developer|designer|marketing|sales|finance|operations|data|business|product)\b/i;

    // Exclude all seniority indicators regardless of role
    const excl = /(\bsenior\b|\bstaff\b|\bprincipal\b|\blead\b|\bmanager\b|\bdirector\b|\bhead\b|\bvp\b|\bvice\s+president\b|\bchief\b|\bexecutive\b|\bc-level\b|\bcto\b|\bceo\b|\bcfo\b|\bcoo\b)/i;

    return inc.test(hay) && !excl.test(hay);
  }

  private isEU(job: GreenhouseJob): boolean {
    const txt = [
      job.location?.name ?? "",
      ...(job.offices?.map(o => o.name) ?? []),
      job.content ?? ""
    ].join(" ");
    
    // Exclude remote jobs
    if (/\b(remote|work\s+from\s+home|wfh|anywhere|distributed|virtual)\b/i.test(txt)) {
      return false;
    }
    
    const euHints = [
      // Countries
      'UK', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Portugal', 'Italy',
      'Netherlands', 'Belgium', 'Luxembourg', 'Denmark', 'Sweden', 'Norway', 'Finland',
      'Iceland', 'Poland', 'Czech', 'Austria', 'Switzerland', 'Hungary', 'Greece',
      'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
      'Lithuania',
      // Country codes
      'GB', 'IE', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE', 'LU', 'DK', 'SE', 'NO', 'FI',
      'IS', 'PL', 'CZ', 'AT', 'CH', 'HU', 'GR', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT',
      // Major cities
      'Amsterdam', 'Rotterdam', 'Eindhoven', 'London', 'Dublin', 'Paris', 'Berlin', 'Munich', 
      'Frankfurt', 'Zurich', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki', 'Madrid', 'Barcelona', 
      'Lisbon', 'Milan', 'Rome', 'Athens', 'Warsaw', 'Prague', 'Vienna', 'Budapest', 'Bucharest', 
      'Tallinn', 'Riga', 'Vilnius', 'Brussels', 'Luxembourg City'
    ];
    
    return euHints.some(hint => new RegExp(`\\b${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(txt));
  }

  private async fetchCompanyJobs(company: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    try {
      // Check if we've hit the rate limit for this company
      const companyInfo = this.companyCache.get(company);
      if (companyInfo && companyInfo.lastCheck > Date.now() - (24 * 60 * 60 * 1000)) {
        console.log(`  ⏰ Skipping ${company} - checked recently`);
        return [];
      }
      
      console.log(`  🔍 Fetching jobs from ${company}...`);
      
      const url = `${GREENHOUSE_CONFIG.baseUrl}/${company}/jobs?content=true`;
      const response = await this.makeRequest(url);
      
      if (response.jobs && response.jobs.length > 0) {
        console.log(`    📊 Found ${response.jobs.length} jobs`);
        
        for (const job of response.jobs) {
          const isSeen = await redisState.isJobSeen(job.id);
          if (!isSeen) {
            await redisState.markJobAsSeen(job.id, 72); // 72 hours TTL
            
            // Apply early-career and EU filtering
            if (this.isEarlyCareer(job) && this.isEU(job)) {
              const ingestJob = this.convertToIngestJob(job, company);
              jobs.push(ingestJob);
              console.log(`    ✅ Early-career EU: ${job.title}`);
            } else {
              console.log(`    🚫 Skipped: ${job.title} (not early-career or not EU)`);
            }
          }
        }
        
        // Update company cache
        this.companyCache.set(company, {
          lastCheck: Date.now(),
          jobCount: response.jobs.length
        });
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error fetching ${company}:`, error.message);
    }
    
    return jobs;
  }

  public async scrapeAllCompanies(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const departments = TRACK_DEPARTMENTS[track];
    
    const allJobs: IngestJob[] = [];
    const metrics = {
      track,
      departments: departments.join(', '),
      companiesProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 Greenhouse scraping with Track ${track}`);
    console.log(`📋 Departments: ${departments.join(', ')}`);
    console.log(`🏢 Companies: ${GREENHOUSE_COMPANIES.length} total`);

    // Filter companies by track if mapping exists; fallback to all
    const eligibleCompanies = GREENHOUSE_COMPANIES.filter((c: string) => {
      const tracks = COMPANY_TRACKS[c];
      return !tracks || tracks.includes(track);
    });
    console.log(`🏢 Eligible companies for Track ${track}: ${eligibleCompanies.length}`);

    // Process companies in batches to manage rate limits
    const batchSize = 5;
    const companyBatches: string[][] = [];
    for (let i = 0; i < eligibleCompanies.length; i += batchSize) {
      companyBatches.push(eligibleCompanies.slice(i, i + batchSize));
    }

    for (const batch of companyBatches) {
      for (const company of batch) {
        try {
          const companyJobs = await this.fetchCompanyJobs(company);
          allJobs.push(...companyJobs);
          metrics.companiesProcessed++;
          metrics.earlyCareerJobs += companyJobs.length;
          
          console.log(`  ✅ ${company}: ${companyJobs.length} early-career EU jobs`);
          
        } catch (error: any) {
          console.error(`  ❌ Error processing ${company}:`, error.message);
          metrics.errors++;
        }
      }
      
      // Small delay between batches
      if (companyBatches.indexOf(batch) < companyBatches.length - 1) {
        console.log('  ⏸️ Brief pause between company batches...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    metrics.totalJobsFound = allJobs.length;
    metrics.requestsUsed = this.requestCount;

    console.log(`\n📊 Greenhouse scraping complete:`);
    console.log(`   🏢 Companies processed: ${metrics.companiesProcessed}/${eligibleCompanies.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   ❌ Errors: ${metrics.errors}`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleCompany(company: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    console.log(`🔍 Greenhouse scraping ${company}...`);
    
    const jobs = await this.fetchCompanyJobs(company);
    const metrics = {
      company,
      jobsFound: jobs.length,
      requestsUsed: this.requestCount
    };

    return { jobs, metrics };
  }

  public async getStatus(): Promise<any> {
    return {
      isRunning: false,
      companiesSupported: GREENHOUSE_COMPANIES.length,
      requestsUsed: this.requestCount,
      seenJobsCount: await redisState.getSeenJobsCount(),
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }

  public getSupportedCompanies(): string[] {
    return GREENHOUSE_COMPANIES;
  }

  public async getDailyStats(): Promise<{ requestsUsed: number; seenJobsCount: number }> {
    return {
      requestsUsed: this.requestCount,
      seenJobsCount: await redisState.getSeenJobsCount()
    };
  }
}

export default GreenhouseScraper;

// -----------------------------
// Persistence helpers (Supabase)
// -----------------------------

function getSupabase(): any {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY in env');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function upsertBatched(rows: any[], supabase: any, batchSize = 150): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false, count: 'exact' });
    if (error) throw error;
    // Supabase count may include updated rows; conservatively treat all as upserted
    upserted += slice.length;
  }
  return { upserted, skipped };
}

export async function runGreenhouseAndSave(): Promise<void> {
  const start = Date.now();
  const supabase = getSupabase();
  const scraper = new GreenhouseScraper();
  const { jobs, metrics } = await scraper.scrapeAllCompanies();

  // Convert and filter to DB shape, strip non-existent columns
  const dbRows = jobs
    .map(convertIngestToDb)
    .filter(Boolean)
    .map((row: any) => {
      const { metadata, ...clean } = row || {};
      return clean;
    });

  // Deduplicate within this run by job_hash to avoid double-conflict in a single batch
  const uniqueRows: any[] = [];
  const seenHashes = new Set<string>();
  const freshnessCutoff = Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  for (const row of dbRows) {
    const hash = row?.job_hash;
    if (!hash) continue;
    // Freshness filter
    const postedMs = row.posted_at ? new Date(row.posted_at).getTime() : Date.now();
    if (isFinite(postedMs) && postedMs < freshnessCutoff) continue;
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      // Always refresh activity fields on upsert
      row.last_seen_at = new Date().toISOString();
      row.is_active = true;
      uniqueRows.push(row);
    }
  }

  let upserted = 0;
  let skipped = 0;
  try {
    const res = await upsertBatched(uniqueRows, supabase, 150);
    upserted = res.upserted;
    skipped = res.skipped;
  } catch (e: any) {
    console.error('❌ Upsert error:', e?.message || e);
    console.log(`[greenhouse] source=greenhouse found=${metrics.totalJobsFound} upserted=${upserted} skipped=${skipped} requests=${metrics.requestsUsed} duration_ms=${Date.now() - start}`);
    return; // fail gracefully without throwing to avoid unhandled rejection
  }

  console.log(`[greenhouse] source=greenhouse found=${metrics.totalJobsFound} upserted=${upserted} skipped=${skipped} requests=${metrics.requestsUsed} duration_ms=${Date.now() - start}`);
}

// Note: entrypoint removed; invoke runGreenhouseAndSave() via import in the runner or CLI.
