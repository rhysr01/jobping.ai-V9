/**
 * Simplified EURES Scraper using IngestJob format
 * Phase 4 of IngestJob implementation
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { atomicUpsertJobs } from '../Utils/jobMatching.js';
import { 
  IngestJob, 
  classifyEarlyCareer, 
  inferRole, 
  parseLocation, 
  makeJobHash, 
  validateJob, 
  convertToDatabaseFormat, 
  shouldSaveJob, 
  logJobProcessing 
} from './utils.js';
import { RobotsCompliance, RespectfulRateLimiter, JOBPING_USER_AGENT } from '../Utils/robotsCompliance.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced retry with jitter
async function backoffRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      
      // Don't retry on certain errors
      if (err?.response?.status === 404 || err?.response?.status === 401) {
        throw err;
      }
      
      if (attempt > maxRetries) {
        throw err;
      }
      
      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.warn(`🔁 EURES retrying ${err?.response?.status || 'unknown error'} in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

export async function scrapeEures(runId: string, opts?: { pageLimit?: number }): Promise<{ raw: number; eligible: number; careerTagged: number; locationTagged: number; inserted: number; updated: number; errors: string[]; samples: string[] }> {
  // Simplified metrics tracking
  let rawCount = 0;
  let eligibleCount = 0;
  let savedCount = 0;
  const errors: string[] = [];
  const samples: string[] = [];

  console.log('🇪🇺 Starting EURES European job scraping with IngestJob format...');
  
  try {
    // Target EURES job URLs
    const euresJobUrls = [
      'https://ec.europa.eu/eures/public/jobseekers/job-search',
      'https://ec.europa.eu/eures/public/jobseekers/job-search?lang=en',
      'https://ec.europa.eu/eures/public/jobseekers/job-search?lang=fr',
      'https://ec.europa.eu/eures/public/jobseekers/job-search?lang=de'
    ];
    
    for (const url of euresJobUrls) {
      console.log(`🇪🇺 Scraping EURES jobs from: ${url}`);
      
      try {
        // Check robots.txt compliance
        const robotsCheck = await RobotsCompliance.isScrapingAllowed(url);
        if (!robotsCheck.allowed) {
          console.log(`🚫 Robots.txt disallows scraping for ${url}: ${robotsCheck.reason}`);
          errors.push(`Robots.txt disallows: ${robotsCheck.reason}`);
          continue;
        }

        // Wait for respectful rate limiting
        await RespectfulRateLimiter.waitForDomain(new URL(url).hostname);

        // Fetch HTML using axios with retry
        const { data: html } = await backoffRetry(() =>
          axios.get(url, {
            headers: {
              'User-Agent': JOBPING_USER_AGENT,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-GB,en;q=0.9,fr;q=0.8,de;q=0.7',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000,
          })
        );
        
        const $ = cheerio.load(html);
        console.log(`📄 HTML size: ${html.length} chars, Title: ${$('title').text()}`);
        
        // Selectors for EURES
        const jobSelectors = [
          '.job-listing',
          '.job-card',
          '.job-item',
          '.position-listing',
          '.eures-job',
          '.job-result',
          '.job-offer',
          '[data-job-id]',
          '.search-result'
        ];
        
        let jobElements = $();
        for (const selector of jobSelectors) {
          const elements = $(selector);
          console.log(`🔍 Selector "${selector}": ${elements.length} elements`);
          if (elements.length > 0) {
            jobElements = elements;
            console.log(`✅ Using selector: ${selector} (found ${elements.length} EURES jobs)`);
            break;
          }
        }
        
        if (jobElements.length === 0) {
          console.log(`⚠️ No jobs found with any selector on ${url}`);
          continue;
        }
        
        // Process jobs using IngestJob format
        const ingestJobs: IngestJob[] = [];
        
        for (let i = 0; i < jobElements.length; i++) {
          rawCount++;
          
          try {
            const element = jobElements.eq(i);
            
            // Extract job data
            const title = element.find('.job-title, .title, h3, .position-title').text().trim();
            const company = element.find('.company-name, .employer, .company').text().trim();
            const location = element.find('.location, .job-location, .job-location').text().trim();
            const description = element.find('.job-description, .description, .job-summary').text().trim();
            const jobUrl = element.find('a').attr('href');
            const postedDate = element.find('.posted-date, .date, .job-date').text().trim();
            
            // Skip if no essential data
            if (!title || !company) {
              console.log(`⏭️ Skipping job with missing data: ${title || 'No title'}`);
              continue;
            }
            
            // Create IngestJob
            const ingestJob: IngestJob = {
              title: title.trim(),
              company: company.trim(),
              location: location.trim() || 'Europe',
              description: description.trim(),
              url: jobUrl ? (jobUrl.startsWith('http') ? jobUrl : `https://ec.europa.eu${jobUrl}`) : '',
              posted_at: new Date().toISOString(), // Simplified date handling
              source: 'eures'
            };

            // Validate the job
            const validation = validateJob(ingestJob);
            if (!validation.valid) {
              console.log(`❌ Invalid job: "${title}" - ${validation.errors.join(', ')}`);
              continue;
            }

            eligibleCount++;
            
            // Check if job should be saved based on north-star rule
            if (shouldSaveJob(ingestJob)) {
              savedCount++;
              ingestJobs.push(ingestJob);
              samples.push(ingestJob.title);
              
              logJobProcessing(ingestJob, 'SAVED', { source: 'eures' });
            } else {
              logJobProcessing(ingestJob, 'FILTERED', { source: 'eures' });
            }
            
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.warn(`⚠️ Error processing job:`, errorMsg);
            errors.push(errorMsg);
          }
        }

        // Convert IngestJobs to database format and insert
        if (ingestJobs.length > 0) {
          try {
            const databaseJobs = ingestJobs.map(convertToDatabaseFormat);
            const result = await atomicUpsertJobs(databaseJobs);
            
            console.log(`✅ EURES DATABASE: ${result.inserted} inserted, ${result.updated} updated, ${result.errors.length} errors`);
            
            if (result.errors.length > 0) {
              console.error('❌ EURES upsert errors:', result.errors.slice(0, 3));
              errors.push(...result.errors);
            }
          } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : 'Database error';
            console.error(`❌ EURES database upsert failed:`, errorMsg);
            errors.push(errorMsg);
          }
        }
        
        console.log(`✅ Scraped ${savedCount} EURES jobs from ${url} (${eligibleCount} eligible, ${rawCount} total)`);
        
        // Log scraping activity for compliance monitoring
        RobotsCompliance.logScrapingActivity('eures', url, true);
        
        // Simple rate limiting between URLs
        await sleep(1000 + Math.random() * 2000);
        
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ EURES scrape failed for ${url}:`, errorMsg);
        
        // Log failed scraping activity for compliance monitoring
        RobotsCompliance.logScrapingActivity('eures', url, false);
        
        errors.push(errorMsg);
      }
    }
    
    return {
      raw: rawCount,
      eligible: eligibleCount,
      careerTagged: savedCount,
      locationTagged: savedCount,
      inserted: savedCount,
      updated: 0,
      errors,
      samples
    };
    
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ EURES scraper failed:', errorMsg);
    
    return {
      raw: rawCount,
      eligible: eligibleCount,
      careerTagged: savedCount,
      locationTagged: savedCount,
      inserted: savedCount,
      updated: 0,
      errors: [errorMsg],
      samples
    };
  }
}

// Test runner
if (require.main === module) {
  const testRunId = 'test-run-' + Date.now();

  scrapeEures(testRunId)
    .then((result) => {
      console.log(`🧪 Test: ${result.inserted + result.updated} jobs processed`);
      console.log(`📊 EURES TEST FUNNEL: Raw=${result.raw}, Eligible=${result.eligible}, Inserted=${result.inserted}, Updated=${result.updated}`);
      if (result.samples.length > 0) {
        console.log(`📝 Sample titles: ${result.samples.join(' | ')}`);
      }
      console.log('---');
    })
    .catch(err => console.error('🛑 Test failed:', err));
}


