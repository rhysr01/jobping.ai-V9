import { NextRequest, NextResponse } from 'next/server';
// import { scrapeGreenhouse } from '../../../scrapers/greenhouse';
// import { scrapeWorkday } from '../../../scrapers/workday';
// Removed RemoteOK import - it's poison for graduates
import { atomicUpsertJobs } from '../../../Utils/jobMatching';
import { runReliableScrapers } from '../../../Utils/reliableScrapers';
import { coerceScraperResult } from '../../../Utils/robustJobCreation';
import { calculateCareerPathTelemetry, CAREER_TAXONOMY_VERSION, type Job } from '../../../scrapers/types';
import { SecurityMiddleware, addSecurityHeaders, extractUserData, extractRateLimit } from '../../../Utils/securityMiddleware';
import { getActiveCompaniesForPlatform } from '../../../Utils/dynamicCompanyDiscovery';
import { getScraperConfig, isPlatformEnabled, logScraperConfig } from '../../../Utils/scraperConfig';
import * as crypto from 'crypto';

// Helper functions for chunked processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize security middleware
const securityMiddleware = new SecurityMiddleware();

// Import curated graduate employers
import { getGraduateEmployersByPlatform } from '../../../Utils/graduateEmployers';

// Company configurations for different platforms (using curated graduate employers)
const COMPANIES = {
  greenhouse: getGraduateEmployersByPlatform('greenhouse').map(employer => ({
    name: employer.name,
    url: employer.url,
    platform: 'greenhouse' as const
  })),
  workday: getGraduateEmployersByPlatform('workday').map(employer => ({
    name: employer.name,
    url: employer.url,
    platform: 'workday' as const
  }))
};

export async function POST(req: NextRequest) {
  try {
    // Enhanced authentication and rate limiting
    const authResult = await securityMiddleware.authenticate(req);
    
    if (!authResult.success) {
      const response = securityMiddleware.createErrorResponse(
        authResult.error || 'Authentication failed',
        authResult.status || 401,
        authResult.rateLimit ? { retryAfter: authResult.rateLimit.retryAfter } : undefined
      );
      return addSecurityHeaders(response);
    }

    // Extract user data and rate limit info
    const userData = authResult.userData;
    const rateLimit = authResult.rateLimit;

    // Get scraper configuration
    const config = getScraperConfig();
    
    // Log configuration in debug mode
    if (config.debugMode) {
      logScraperConfig();
    }

    // Log the scrape request
    console.log(`🚀 Scrape request from user ${userData?.userId || 'unknown'} (tier: ${userData?.tier || 'unknown'})`);

    const { platforms = ['all'], companies = [] } = await req.json();
    const runId = crypto.randomUUID();
    const results: any = {};

    console.log(`🚀 Starting scrape run ${runId} for platforms: ${platforms.join(', ')}`);



    // NEW: Reliable Scrapers System (fast, no hanging)
    if ((platforms.includes('all') || platforms.includes('reliable')) && isPlatformEnabled('reliable')) {
      console.log('🎯 Running reliable scraper system...');
      try {
        const rawReliableResult = await runReliableScrapers(runId);
        const reliableResult = coerceScraperResult('reliable', rawReliableResult);
        const reliableJobs = reliableResult.jobs;
        const funnel = reliableResult.funnel;
        
        // Update funnel with database results
        funnel.inserted = 0;
        funnel.updated = 0;
        
        // Chunk processing for large batches
        const chunks = chunkArray(reliableJobs, config.batchSize);
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors: string[] = [];
        
        for (const chunk of chunks) {
          // Filter out non-Job objects and cast properly
          const validJobs = chunk.filter((job): job is Job => 
            job && typeof job === 'object' && 
            'job_hash' in job && 'title' in job && 'company' in job && 'location' in job
          );
          
          const result = await atomicUpsertJobs(validJobs);
          totalInserted += result.inserted;
          totalUpdated += result.updated;
          totalErrors.push(...result.errors);
          
          // Rate limiting between chunks
          if (chunks.length > 1) {
            await sleep(config.retryDelay);
          }
        }
        
        // Update funnel with actual database results
        funnel.inserted = totalInserted;
        funnel.updated = totalUpdated;
        funnel.errors = totalErrors.length;
        
        results.reliable = {
          success: true,
          jobs: reliableJobs.length,
          inserted: totalInserted,
          updated: totalUpdated,
          errors: totalErrors,
          chunks: chunks.length,
          funnel: funnel
        };
        console.log(`✅ Reliable scrapers: ${reliableJobs.length} jobs processed in ${chunks.length} chunks`);
      } catch (error: any) {
        results.reliable = { success: false, error: error.message };
        console.error('❌ Reliable scrapers failed:', error.message);
      }
    } else if (platforms.includes('reliable') && !isPlatformEnabled('reliable')) {
      results.reliable = { success: false, error: 'Reliable scrapers disabled by configuration' };
    }

    // Removed RemoteOK scraper - it's poison for graduates

    // Scrape Greenhouse companies with dynamic discovery
    if ((platforms.includes('all') || platforms.includes('greenhouse')) && isPlatformEnabled('greenhouse')) {
      console.log('📡 Discovering active Greenhouse companies with early-career jobs...');
      try {
        let totalRaw = 0;
        let totalEligible = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors: string[] = [];
        let allSamples: string[] = [];
        
        // Get active companies dynamically focused on early-career roles
        const activeCompanies = await getActiveCompaniesForPlatform('greenhouse', 5);
        console.log(`🎯 Found ${activeCompanies.length} companies with early-career openings`);
        
        for (const company of activeCompanies) {
          try {
            const result = await scrapeGreenhouse({ ...company, platform: 'greenhouse' as const }, runId);
            // Aggregate results from all companies
            totalRaw += result.raw;
            totalEligible += result.eligible;
            totalInserted += result.inserted;
            totalUpdated += result.updated;
            totalErrors.push(...result.errors);
            allSamples.push(...result.samples);
            
            console.log(`🏢 ${company.name}: Raw=${result.raw}, Eligible=${result.eligible}, Inserted=${result.inserted}, Updated=${result.updated}`);
          } catch (error: any) {
            console.error(`❌ ${company.name} failed:`, error.message);
            totalErrors.push(`${company.name}: ${error.message}`);
          }
        }
        
        results.greenhouse = {
          success: true,
          raw: totalRaw,
          eligible: totalEligible,
          inserted: totalInserted,
          updated: totalUpdated,
          errors: totalErrors,
          samples: allSamples.slice(0, 10), // Keep top 10 samples
          companies: activeCompanies.length
        };
        console.log(`✅ Greenhouse: Raw=${totalRaw}, Eligible=${totalEligible}, Inserted=${totalInserted}, Updated=${totalUpdated} from ${activeCompanies.length} companies`);
      } catch (error: any) {
        results.greenhouse = { success: false, error: error.message };
        console.error('❌ Greenhouse scrape failed:', error.message);
      }
    } else if (platforms.includes('greenhouse') && !isPlatformEnabled('greenhouse')) {
      results.greenhouse = { success: false, error: 'Greenhouse scraper disabled by configuration' };
    }



    // Scrape Workday companies
    if (platforms.includes('all') || platforms.includes('workday')) {
      console.log('📡 Scraping Workday companies...');
      try {
        let totalRaw = 0;
        let totalEligible = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors: string[] = [];
        let allSamples: string[] = [];
        
        for (const company of COMPANIES.workday) {
          try {
            const result = await scrapeWorkday(company, runId);
            // Aggregate results from all companies
            totalRaw += result.raw;
            totalEligible += result.eligible;
            totalInserted += result.inserted;
            totalUpdated += result.updated;
            totalErrors.push(...result.errors);
            allSamples.push(...result.samples);
            
            console.log(`🏢 ${company.name}: Raw=${result.raw}, Eligible=${result.eligible}, Inserted=${result.inserted}, Updated=${result.updated}`);
          } catch (error: any) {
            console.error(`❌ ${company.name} failed:`, error.message);
            totalErrors.push(`${company.name}: ${error.message}`);
          }
        }
        
        results.workday = {
          success: true,
          raw: totalRaw,
          eligible: totalEligible,
          inserted: totalInserted,
          updated: totalUpdated,
          errors: totalErrors,
          samples: allSamples.slice(0, 10), // Keep top 10 samples
          companies: COMPANIES.workday.length
        };
        console.log(`✅ Workday: Raw=${totalRaw}, Eligible=${totalEligible}, Inserted=${totalInserted}, Updated=${totalUpdated} from ${COMPANIES.workday.length} companies`);
      } catch (error: any) {
        results.workday = { success: false, error: error.message };
        console.error('❌ Workday scrape failed:', error.message);
      }
    }

    // Scrape GraduateJobs - NEW EU SCRAPER
    if (platforms.includes('graduatejobs') || platforms.includes('all')) {
      try {
        console.log('🎓 Scraping GraduateJobs...');
        const { scrapeGraduateJobs } = await import('../../../scrapers/graduatejobs');
        const graduateJobs = await scrapeGraduateJobs(runId);
        results.graduatejobs = {
          success: true,
          raw: graduateJobs.raw,
          eligible: graduateJobs.eligible,
          careerTagged: graduateJobs.careerTagged,
          locationTagged: graduateJobs.locationTagged,
          inserted: graduateJobs.inserted,
          updated: graduateJobs.updated,
          errors: graduateJobs.errors,
          samples: graduateJobs.samples
        };
        console.log(`✅ GraduateJobs: Raw=${graduateJobs.raw}, Eligible=${graduateJobs.eligible}, Inserted=${graduateJobs.inserted}, Updated=${graduateJobs.updated}`);
      } catch (error: any) {
        results.graduatejobs = { success: false, error: error.message };
        console.error('❌ GraduateJobs scrape failed:', error.message);
      }
    }

    // Scrape JobTeaser - TEMPORARILY DISABLED due to syntax errors
    if (platforms.includes('jobteaser') || platforms.includes('all')) {
      console.log('🎓 JobTeaser temporarily disabled due to syntax errors...');
      results.jobteaser = { success: false, error: 'Temporarily disabled due to syntax errors' };
    }

    // Scrape iAgora - NEW EU SCRAPER
    if (platforms.includes('iagora') || platforms.includes('all')) {
      try {
        console.log('🌍 Scraping iAgora...');
        const { scrapeIAgora } = await import('../../../scrapers/iagora');
        const rawIAgoraResult = await scrapeIAgora(runId);
        const iagoraResult = coerceScraperResult('iagora', rawIAgoraResult);
        results.iagora = {
          success: true,
          jobs: iagoraResult.funnel.inserted,
          inserted: iagoraResult.funnel.inserted,
          updated: iagoraResult.funnel.updated,
          errors: iagoraResult.errors
        };
        console.log(`✅ iAgora: ${iagoraResult.funnel.inserted} jobs processed`);
      } catch (error: any) {
        results.iagora = { success: false, error: error.message };
        console.error('❌ iAgora scrape failed:', error.message);
      }
    }

    // Scrape SmartRecruiters - NEW EU SCRAPER
    if (platforms.includes('smartrecruiters') || platforms.includes('all')) {
      try {
        console.log('🏢 Scraping SmartRecruiters...');
        const { scrapeSmartRecruiters } = await import('../../../scrapers/smartrecruiters');
        const rawSmartRecruitersResult = await scrapeSmartRecruiters(runId);
        const smartRecruitersResult = coerceScraperResult('smartrecruiters', rawSmartRecruitersResult);
        results.smartrecruiters = {
          success: true,
          jobs: smartRecruitersResult.funnel.inserted,
          inserted: smartRecruitersResult.funnel.inserted,
          updated: smartRecruitersResult.funnel.updated,
          errors: smartRecruitersResult.errors
        };
        console.log(`✅ SmartRecruiters: ${smartRecruitersResult.funnel.inserted} jobs processed`);
      } catch (error: any) {
        results.smartrecruiters = { success: false, error: error.message };
        console.error('❌ SmartRecruiters scrape failed:', error.message);
      }
    }

    // Scrape Wellfound - NEW EU SCRAPER
    if (platforms.includes('wellfound') || platforms.includes('all')) {
      try {
        console.log('🚀 Scraping Wellfound...');
        const { scrapeWellfound } = await import('../../../scrapers/wellfound');
        const rawWellfoundResult = await scrapeWellfound(runId);
        const wellfoundResult = coerceScraperResult('wellfound', rawWellfoundResult);
        results.wellfound = {
          success: true,
          jobs: wellfoundResult.funnel.inserted,
          inserted: wellfoundResult.funnel.inserted,
          updated: wellfoundResult.funnel.updated,
          errors: wellfoundResult.errors
        };
        console.log(`✅ Wellfound: ${wellfoundResult.funnel.inserted} jobs processed`);
      } catch (error: any) {
        results.wellfound = { success: false, error: error.message };
        console.error('❌ Wellfound scrape failed:', error.message);
      }
    }

    // Scrape Milkround - NEW EU SCRAPER
    if (platforms.includes('milkround') || platforms.includes('all')) {
      try {
        console.log('🥛 Scraping Milkround...');
        const { scrapeMilkround } = await import('../../../scrapers/milkround');
        const rawMilkroundResult = await scrapeMilkround(runId);
        const milkroundResult = coerceScraperResult('milkround', rawMilkroundResult);
        results.milkround = {
          success: true,
          jobs: milkroundResult.funnel.inserted,
          inserted: milkroundResult.funnel.inserted,
          updated: milkroundResult.funnel.updated,
          errors: milkroundResult.errors
        };
        console.log(`✅ Milkround: ${milkroundResult.funnel.inserted} jobs processed`);
      } catch (error: any) {
        results.milkround = { success: false, error: error.message };
        console.error('❌ Milkround scrape failed:', error.message);
      }
    }

    // Scrape EURES - NEW EU SCRAPER
    if (platforms.includes('eures') || platforms.includes('all')) {
      try {
        console.log('🇪🇺 Scraping EURES...');
        const { scrapeEures } = await import('../../../scrapers/eures');
        const euresJobs = await scrapeEures(runId);
        const jobCount = Array.isArray(euresJobs) ? euresJobs.length : 0;
        results.eures = {
          success: true,
          jobs: jobCount,
          inserted: jobCount,
          updated: 0,
          errors: []
        };
        console.log(`✅ EURES: ${jobCount} jobs processed`);
      } catch (error: any) {
        results.eures = { success: false, error: error.message };
        console.error('❌ EURES scrape failed:', error.message);
      }
    }



    // University scrapers disabled - modules not present
    if (platforms.includes('tu-delft')) {
      results['tu-delft'] = { success: false, error: 'Disabled: TU Delft scraper not available' };
    }
    if (platforms.includes('eth-zurich')) {
      results['eth-zurich'] = { success: false, error: 'Disabled: ETH Zurich scraper not available' };
    }

    console.log(`✅ Scrape run ${runId} completed`);

    // Calculate and log career path telemetry
    try {
      const allJobs: Job[] = [];
      Object.values(results).forEach((result: any) => {
        if (result.success && result.jobs) {
          // Collect jobs from successful scrapes
          // Note: This is a simplified approach - in production you'd want to collect actual job objects
        }
      });
      
      // Log telemetry summary
      console.log('📊 Career Path Telemetry Summary:');
      console.log(`   - Taxonomy Version: ${CAREER_TAXONOMY_VERSION}`);
      console.log(`   - Total platforms scraped: ${Object.keys(results).length}`);
      console.log(`   - Successful scrapes: ${Object.values(results).filter((r: any) => r.success).length}`);
      
      // In a full implementation, you'd calculate actual telemetry here
      // const telemetry = calculateCareerPathTelemetry(allJobs);
      // console.log(`   - Jobs with career paths: ${telemetry.jobsWithCareerPath}/${telemetry.totalJobs}`);
      // console.log(`   - Unknown percentage: ${telemetry.unknownPercentage.toFixed(1)}%`);
    } catch (telemetryError) {
      console.warn('⚠️ Telemetry calculation failed:', telemetryError);
    }

    // Create success response with rate limit headers
    const response = securityMiddleware.createSuccessResponse({
      success: true,
      runId,
      timestamp: new Date().toISOString(),
      results,
      user: {
        tier: userData?.tier || 'unknown',
        userId: userData?.userId || 'unknown'
      }
    }, rateLimit);

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('❌ Scrape endpoint error:', error);
    const response = securityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      { details: error.message }
    );
    return addSecurityHeaders(response);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Enhanced authentication and rate limiting
    const authResult = await securityMiddleware.authenticate(req);
    
    if (!authResult.success) {
      const response = securityMiddleware.createErrorResponse(
        authResult.error || 'Authentication failed',
        authResult.status || 401
      );
      return addSecurityHeaders(response);
    }

    const response = securityMiddleware.createSuccessResponse({
      message: 'Scrape API active',
      endpoints: {
        POST: 'Trigger scraping for specified platforms',
        GET: 'API status'
      },
      platforms: ['reliable', 'remoteok', 'greenhouse', 'lever', 'workday', 'graduatejobs', 'jobteaser', 'milkround', 'eures', 'iagora', 'smartrecruiters', 'wellfound', 'all'],
      timestamp: new Date().toISOString(),
      user: {
        tier: authResult.userData?.tier || 'unknown',
        userId: authResult.userData?.userId || 'unknown'
      }
    }, authResult.rateLimit);

    return addSecurityHeaders(response);
  } catch (error: any) {
    console.error('❌ Scrape GET endpoint error:', error);
    const response = securityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      { details: error.message }
    );
    return addSecurityHeaders(response);
  }
}
