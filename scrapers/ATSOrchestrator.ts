import fs from 'fs';
import path from 'path';
import { AdapterFactory } from './atsAdapters/adapterFactory';
import { CompanyConfig, ScrapingResult, IngestJob } from './types';
import { createClient } from '@supabase/supabase-js';

export class ATSOrchestrator {
  private supabase: any;
  private companyList: CompanyConfig[] = [];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.loadCompanyList();
  }

  private loadCompanyList(): void {
    try {
      const configPath = path.join(process.cwd(), 'src/config/companyList.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.companyList = JSON.parse(configData);
      console.log(`Loaded ${this.companyList.length} companies from config`);
    } catch (error) {
      console.error('Failed to load company list:', error);
      this.companyList = [];
    }
  }

  async scrapeCompany(company: CompanyConfig): Promise<ScrapingResult> {
    const startTime = Date.now();
    const result: ScrapingResult = {
      company: company.company,
      platform: company.platform,
      jobsFound: 0,
      jobsProcessed: 0,
      jobsSaved: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`Starting scrape for ${company.company} on ${company.platform}`);
      
      const adapter = AdapterFactory.getAdapter(company.platform);
      const input = this.buildAdapterInput(company);
      
      const jobs = await adapter.fetchListings(input);
      result.jobsFound = jobs.length;
      result.jobsProcessed = jobs.length;

      // Save jobs to database
      const savedJobs = await this.saveJobs(jobs);
      result.jobsSaved = savedJobs.length;

      console.log(`✅ ${company.company}: Found ${jobs.length} jobs, saved ${savedJobs.length}`);
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      result.errors.push(errorMsg);
      console.error(`❌ ${company.company}: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private buildAdapterInput(company: CompanyConfig): Record<string, string> {
    const input: Record<string, string> = {};
    
    if (company.slug) input.slug = company.slug;
    if (company.tenant) input.tenant = company.tenant;
    if (company.careerSite) input.careerSite = company.careerSite;
    
    return input;
  }

  private async saveJobs(jobs: IngestJob[]): Promise<IngestJob[]> {
    const savedJobs: IngestJob[] = [];

    for (const job of jobs) {
      try {
        // Check if job already exists
        const { data: existingJob } = await this.supabase
          .from('jobs')
          .select('id')
          .eq('job_hash', job.job_hash)
          .single();

        if (existingJob) {
          // Update existing job
          await this.supabase
            .from('jobs')
            .update({
              title: job.title,
              company: job.company,
              description: job.description,
              job_url: job.job_url,
              location: job.location,
              languages_required: job.languages_required,
              work_environment: job.work_environment,
              meta: job.meta,
              updated_at: new Date().toISOString(),
              last_parsed_at: new Date().toISOString()
            })
            .eq('job_hash', job.job_hash);
        } else {
          // Insert new job
          await this.supabase
            .from('jobs')
            .insert({
              job_hash: job.job_hash,
              title: job.title,
              company: job.company,
              description: job.description,
              job_url: job.job_url,
              posted_at: job.posted_at,
              source: job.source,
              location: job.location,
              languages_required: job.languages_required,
              work_environment: job.work_environment,
              meta: job.meta,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_parsed_at: new Date().toISOString()
            });
        }

        savedJobs.push(job);
      } catch (error: any) {
        console.warn(`Failed to save job ${job.job_hash}:`, error.message);
      }
    }

    return savedJobs;
  }

  async scrapeAllCompanies(): Promise<ScrapingResult[]> {
    console.log(`🚀 Starting ATS scraping for ${this.companyList.length} companies`);
    
    const results: ScrapingResult[] = [];
    const supportedPlatforms = AdapterFactory.getSupportedPlatforms();
    
    // Filter companies to only supported platforms
    const supportedCompanies = this.companyList.filter(company => 
      supportedPlatforms.includes(company.platform.toLowerCase())
    );

    console.log(`📊 Found ${supportedCompanies.length} companies on supported platforms`);

    for (const company of supportedCompanies) {
      try {
        const result = await this.scrapeCompany(company);
        results.push(result);
        
        // Small delay between companies to be polite
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Failed to scrape ${company.company}:`, error);
        results.push({
          company: company.company,
          platform: company.platform,
          jobsFound: 0,
          jobsProcessed: 0,
          jobsSaved: 0,
          errors: [error.message],
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }
    }

    const summary = this.generateSummary(results);
    console.log('📈 ATS Scraping Summary:', summary);
    
    return results;
  }

  private generateSummary(results: ScrapingResult[]): any {
    const totalJobs = results.reduce((sum, r) => sum + r.jobsSaved, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const successfulCompanies = results.filter(r => r.jobsSaved > 0).length;
    const failedCompanies = results.filter(r => r.errors.length > 0).length;

    return {
      totalCompanies: results.length,
      successfulCompanies,
      failedCompanies,
      totalJobsFound: results.reduce((sum, r) => sum + r.jobsFound, 0),
      totalJobsSaved: totalJobs,
      totalErrors,
      averageJobsPerCompany: totalJobs / results.length
    };
  }

  // Method to integrate with your existing scraping system
  async runATSOnly(): Promise<void> {
    console.log('🎯 Running ATS-API scraping only');
    await this.scrapeAllCompanies();
  }
}
