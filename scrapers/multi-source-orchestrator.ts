import AdzunaScraper from './adzuna-scraper';
import ReedScraper from './reed-scraper';
import InfoJobsScraper from './infojobs-scraper';
import { IngestJob, Job } from './types';
import { 
  classifyEarlyCareer, 
  inferRole, 
  parseLocation, 
  makeJobHash, 
  validateJob, 
  convertToDatabaseFormat, 
  shouldSaveJob 
} from './utils';

// Early-career tagging patterns (multilingual)
const EARLY_CAREER_PATTERNS = {
  en: /(intern|graduate|junior|trainee|entry.?level|placement|new.?grad|recent.?graduate|first.?job|no.?experience|0-1|0-2|1-2|starter|beginner|apprentice|associate|assistant)/i,
  es: /(becario|prácticas|junior|recién.?graduad|estudiante|primer.?empleo|sin.?experiencia|0-1|0-2|1-2|iniciador|principiante)/i,
  de: /(praktikant|praktikum|trainee|berufseinsteiger|junior|absolvent|student|anfänger|einsteiger|assistent)/i,
  fr: /(stagiaire|alternance|junior|débutant|jeune.?diplômé|étudiant|premier.?emploi|sans.?expérience|0-1|0-2|1-2|débutant)/i,
  nl: /(stagiair|werkstudent|junior|starter|afgestudeerde|student|eerste.?baan|geen.?ervaring|0-1|0-2|1-2|beginner)/i
};

// Target cities with language mapping
const TARGET_CITIES = {
  'London': { country: 'gb', lang: 'en' },
  'Madrid': { country: 'es', lang: 'es' },
  'Berlin': { country: 'de', lang: 'de' },
  'Amsterdam': { country: 'nl', lang: 'nl' },
  'Paris': { country: 'fr', lang: 'fr' },
  'Dublin': { country: 'ie', lang: 'en' },
  'Stockholm': { country: 'se', lang: 'en' }, // Swedish companies often use English
  'Zurich': { country: 'ch', lang: 'de' }, // German-speaking part
  'Barcelona': { country: 'es', lang: 'es' },
  'Munich': { country: 'de', lang: 'de' }
};

interface ScrapingMetrics {
  timestamp: string;
  totalJobs: number;
  newJobs: number;
  duplicates: number;
  earlyCareerTagged: number;
  errors: string[];
  latency: number;
  perCityCoverage: Record<string, number>;
  sourceMetrics: {
    adzuna: any;
    reed: any;
    infojobs: any;
  };
}

interface JobEnrichment {
  city: string;
  country: string;
  lang: string;
  isRemote: boolean;
  isEU: boolean;
  isEarlyCareer: boolean;
  role: string;
  confidence: number;
  freshnessScore: number;
  visaSponsorship: boolean;
}

class MultiSourceOrchestrator {
  private adzunaScraper: AdzunaScraper;
  private reedScraper: ReedScraper;
  private infojobsScraper: InfoJobsScraper;
  private seenJobs: Map<string, number> = new Map(); // jobHash -> timestamp
  private metrics: ScrapingMetrics[] = [];
  private isRunning = false;

  constructor() {
    this.adzunaScraper = new AdzunaScraper();
    this.reedScraper = new ReedScraper();
    this.infojobsScraper = new InfoJobsScraper();
    
    // Clean up seen jobs every 24 hours
    setInterval(() => this.cleanupSeenJobs(), 24 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000); // 48 hours
    for (const [jobHash, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobHash);
      }
    }
  }

  private detectLanguage(text: string): string {
    const textLower = text.toLowerCase();
    
    // Simple language detection based on common words
    if (textLower.includes('becario') || textLower.includes('prácticas') || textLower.includes('graduado')) {
      return 'es';
    }
    if (textLower.includes('praktikum') || textLower.includes('praktikant') || textLower.includes('absolvent')) {
      return 'de';
    }
    if (textLower.includes('stagiaire') || textLower.includes('alternance') || textLower.includes('diplômé')) {
      return 'fr';
    }
    if (textLower.includes('stagiair') || textLower.includes('werkstudent') || textLower.includes('afgestudeerde')) {
      return 'nl';
    }
    
    return 'en'; // Default to English
  }

  private enrichJob(job: IngestJob): JobEnrichment {
    const { city, country, isRemote, isEU } = parseLocation(job.location);
    const lang = this.detectLanguage(`${job.title} ${job.description}`);
    const isEarlyCareer = classifyEarlyCareer(job);
    const role = inferRole(job);
    
    // Calculate confidence score based on pattern matches
    let confidence = 0;
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (EARLY_CAREER_PATTERNS[lang as keyof typeof EARLY_CAREER_PATTERNS]?.test(text)) {
      confidence += 0.4;
    }
    
    if (isEarlyCareer) {
      confidence += 0.3;
    }
    
    if (isEU) {
      confidence += 0.2;
    }
    
    if (role !== 'unknown') {
      confidence += 0.1;
    }
    
    // Calculate freshness score (age in hours)
    const postedDate = new Date(job.posted_at || Date.now());
    const now = new Date();
    const ageInHours = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60);
    const freshnessScore = Math.max(0, 100 - ageInHours * 2); // 100 for fresh, decreasing with age
    
    // Detect visa sponsorship (simple heuristic)
    const visaSponsorship = /visa|sponsorship|work.?permit|relocation|relocate/i.test(text);
    
    return {
      city,
      country,
      lang,
      isRemote,
      isEU,
      isEarlyCareer,
      role,
      confidence: Math.min(1, confidence),
      freshnessScore: Math.max(0, Math.min(100, freshnessScore)),
      visaSponsorship
    };
  }

  private dedupeJobs(jobs: IngestJob[]): { unique: IngestJob[]; duplicates: number } {
    const unique: IngestJob[] = [];
    let duplicates = 0;
    
    for (const job of jobs) {
      const jobHash = makeJobHash(job);
      
      if (!this.seenJobs.has(jobHash)) {
        this.seenJobs.set(jobHash, Date.now());
        unique.push(job);
      } else {
        duplicates++;
      }
    }
    
    return { unique, duplicates };
  }

  private async scrapeAdzuna(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    try {
      console.log('🚀 Starting Adzuna scraping...');
      const startTime = Date.now();
      
      const result = await this.adzunaScraper.scrapeAllCities();
      
      const latency = Date.now() - startTime;
      console.log(`✅ Adzuna completed in ${latency}ms`);
      
      return { ...result, latency };
    } catch (error: any) {
      console.error('❌ Adzuna scraping failed:', error.message);
      return { jobs: [], metrics: { error: error.message }, latency: 0 };
    }
  }

  private async scrapeReed(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    try {
      console.log('🚀 Starting Reed scraping...');
      const startTime = Date.now();
      
      const result = await this.reedScraper.scrapeLondon();
      
      const latency = Date.now() - startTime;
      console.log(`✅ Reed completed in ${latency}ms`);
      
      return { ...result, latency };
    } catch (error: any) {
      console.error('❌ Reed scraping failed:', error.message);
      return { jobs: [], metrics: { error: error.message }, latency: 0 };
    }
  }

  private async scrapeInfoJobs(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    try {
      console.log('🚀 Starting InfoJobs scraping...');
      const startTime = Date.now();
      
      const result = await this.infojobsScraper.scrapeCities();
      
      const latency = Date.now() - startTime;
      console.log(`✅ InfoJobs completed in ${latency}ms`);
      
      return { ...result, latency };
    } catch (error: any) {
      console.error('❌ InfoJobs scraping failed:', error.message);
      return { jobs: [], metrics: { error: error.message }, latency: 0 };
    }
  }

  public async runFullScrape(): Promise<{ jobs: Job[]; metrics: ScrapingMetrics }> {
    if (this.isRunning) {
      throw new Error('Multi-source orchestrator is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🎯 Starting multi-source job scraping...');
      
      // Run all scrapers in parallel
      const [adzunaResult, reedResult, infojobsResult] = await Promise.all([
        this.scrapeAdzuna(),
        this.scrapeReed(),
        this.scrapeInfoJobs()
      ]);

      // Combine all jobs
      const allJobs = [
        ...adzunaResult.jobs,
        ...reedResult.jobs,
        ...infojobsResult.jobs
      ];

      // Dedupe across all sources
      const { unique: dedupedJobs, duplicates } = this.dedupeJobs(allJobs);

      // Enrich and convert jobs
      const enrichedJobs: Job[] = [];
      let earlyCareerCount = 0;
      const perCityCoverage: Record<string, number> = {};

      for (const job of dedupedJobs) {
        try {
          const enrichment = this.enrichJob(job);
          
          if (enrichment.isEarlyCareer) {
            earlyCareerCount++;
          }

          // Update city coverage
          perCityCoverage[enrichment.city] = (perCityCoverage[enrichment.city] || 0) + 1;

          // Convert to database format
          const dbJob = convertToDatabaseFormat(job);
          
          // Add enrichment data
          const enrichedJob: Job = {
            ...dbJob,
            categories: [
              ...dbJob.categories,
              enrichment.role,
              enrichment.isEarlyCareer ? 'early-career' : 'experienced',
              enrichment.lang,
              enrichment.isRemote ? 'remote' : 'on-site'
            ].filter(Boolean),
            work_environment: enrichment.isRemote ? 'remote' : 'on-site',
            experience_required: enrichment.isEarlyCareer ? 'entry-level' : 'experienced',
            // Add metadata for future processing
            metadata: {
              city: enrichment.city,
              country: enrichment.country,
              lang: enrichment.lang,
              confidence: enrichment.confidence,
              freshnessScore: enrichment.freshnessScore,
              visaSponsorship: enrichment.visaSponsorship,
              role: enrichment.role
            }
          };

          enrichedJobs.push(enrichedJob);

        } catch (error: any) {
          console.error('Error enriching job:', error.message);
        }
      }

      // Calculate final metrics
      const totalLatency = Date.now() - startTime;
      const metrics: ScrapingMetrics = {
        timestamp: new Date().toISOString(),
        totalJobs: allJobs.length,
        newJobs: enrichedJobs.length,
        duplicates,
        earlyCareerTagged: earlyCareerCount,
        errors: [
          ...(adzunaResult.metrics.error ? [adzunaResult.metrics.error] : []),
          ...(reedResult.metrics.error ? [reedResult.metrics.error] : []),
          ...(infojobsResult.metrics.error ? [infojobsResult.metrics.error] : [])
        ],
        latency: totalLatency,
        perCityCoverage,
        sourceMetrics: {
          adzuna: adzunaResult.metrics,
          reed: reedResult.metrics,
          infojobs: infojobsResult.metrics
        }
      };

      // Store metrics for monitoring
      this.metrics.push(metrics);
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100); // Keep last 100 runs
      }

      console.log(`🎉 Multi-source scraping complete: ${enrichedJobs.length} new jobs, ${duplicates} duplicates`);
      console.log(`📊 Coverage: ${Object.keys(perCityCoverage).length} cities, ${earlyCareerCount} early-career jobs`);

      return { jobs: enrichedJobs, metrics };

    } finally {
      this.isRunning = false;
    }
  }

  public async runSingleSource(source: 'adzuna' | 'reed' | 'infojobs'): Promise<{ jobs: Job[]; metrics: any }> {
    let result: { jobs: IngestJob[]; metrics: any; latency: number };

    switch (source) {
      case 'adzuna':
        result = await this.scrapeAdzuna();
        break;
      case 'reed':
        result = await this.scrapeReed();
        break;
      case 'infojobs':
        result = await this.scrapeInfoJobs();
        break;
      default:
        throw new Error(`Unknown source: ${source}`);
    }

    // Process jobs through the same pipeline
    const { unique: dedupedJobs } = this.dedupeJobs(result.jobs);
    const enrichedJobs: Job[] = [];

    for (const job of dedupedJobs) {
      try {
        const enrichment = this.enrichJob(job);
        const dbJob = convertToDatabaseFormat(job);
        
        const enrichedJob: Job = {
          ...dbJob,
          categories: [
            ...dbJob.categories,
            enrichment.role,
            enrichment.isEarlyCareer ? 'early-career' : 'experienced',
            enrichment.lang
          ].filter(Boolean),
          work_environment: enrichment.isRemote ? 'remote' : 'on-site',
          experience_required: enrichment.isEarlyCareer ? 'entry-level' : 'experienced'
        };

        enrichedJobs.push(enrichedJob);
      } catch (error: any) {
        console.error('Error enriching job:', error.message);
      }
    }

    return { jobs: enrichedJobs, metrics: result.metrics };
  }

  public getStatus(): { 
    isRunning: boolean; 
    lastRun: ScrapingMetrics | null;
    seenJobsCount: number;
    adzunaStatus: any;
    reedStatus: any;
    infojobsStatus: any;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.metrics[this.metrics.length - 1] || null,
      seenJobsCount: this.seenJobs.size,
      adzunaStatus: this.adzunaScraper.getDailyStats(),
      reedStatus: this.reedScraper.getStatus(),
      infojobsStatus: this.infojobsScraper.getStatus()
    };
  }

  public getMetrics(limit: number = 10): ScrapingMetrics[] {
    return this.metrics.slice(-limit);
  }

  public resetSeenJobs(): void {
    this.seenJobs.clear();
    console.log('🔄 Multi-source orchestrator seen jobs cache cleared');
  }

  public getCoverageReport(): { 
    cities: Record<string, { jobs: number; lastSeen: string }>;
    sources: Record<string, { jobs: number; lastRun: string }>;
    earlyCareerPercentage: number;
  } {
    const cities: Record<string, { jobs: number; lastSeen: string }> = {};
    const sources: Record<string, { jobs: number; lastRun: string }> = {};
    
    let totalEarlyCareer = 0;
    let totalJobs = 0;

    // Aggregate data from metrics
    for (const metric of this.metrics) {
      totalJobs += metric.totalJobs;
      totalEarlyCareer += metric.earlyCareerTagged;
      
      // City coverage
      for (const [city, count] of Object.entries(metric.perCityCoverage)) {
        if (!cities[city]) {
          cities[city] = { jobs: 0, lastSeen: metric.timestamp };
        }
        cities[city].jobs += count;
        cities[city].lastSeen = metric.timestamp;
      }
      
      // Source coverage
      for (const [source, sourceMetric] of Object.entries(metric.sourceMetrics)) {
        if (!sources[source]) {
          sources[source] = { jobs: 0, lastRun: metric.timestamp };
        }
        sources[source].jobs += sourceMetric.jobsFound || 0;
        sources[source].lastRun = metric.timestamp;
      }
    }

    return {
      cities,
      sources,
      earlyCareerPercentage: totalJobs > 0 ? (totalEarlyCareer / totalJobs) * 100 : 0
    };
  }
}

export default MultiSourceOrchestrator;
