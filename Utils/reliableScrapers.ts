// Integration layer for reliable scrapers - GRADUATE FOCUSED
import { Job, createJobCategories, ScraperResult } from '../scrapers/types';
import { extractCareerPath } from './jobMatching';
import { logFunnelMetrics, FunnelTelemetry } from './robustJobCreation';

// Import the orchestrator that now includes graduate scrapers
const JobScrapingOrchestrator = require('../scrapers/JobScrapingOrchestrator');

export async function runReliableScrapers(runId: string): Promise<ScraperResult> {
  console.log(`🚀 Starting GRADUATE-FOCUSED scraper system for run ${runId}`);
  
  // Initialize funnel tracking
  const funnel: FunnelTelemetry = {
    raw: 0,
    eligible: 0,
    careerTagged: 0,
    locationTagged: 0,
    inserted: 0,
    updated: 0,
    errors: [] as string[],
    samples: [] as string[]
  };
  
  try {
    // Use the orchestrator which now includes graduate scrapers
    const orchestrator = new JobScrapingOrchestrator();
    const results = await orchestrator.runAllScrapers();
    
    // Get all unique jobs
    const allJobs = orchestrator.getAllJobs();
    
    funnel.raw = allJobs.length;
    console.log(`📊 Total jobs collected: ${allJobs.length}`);
    
    // Log the distribution
    const summary = orchestrator.getSummary();
    if (summary.warning) {
      console.error(`⚠️  ${summary.warning}`);
    }
    
    // Filter for early-career eligibility
    const { isEarlyCareerEligible } = require('./robustJobCreation');
    
    const graduateJobs = allJobs.filter((job: any) => {
      if (!job.title || !job.company) return false;
      
      const title = job.title || '';
      const description = job.description || '';
      
      // More lenient for jobs from graduate-specific sources
      if (job.source && ['graduatejobs', 'jobteaser', 'milkround'].includes(job.source)) {
        // These are from graduate boards, so trust them more
        return true;
      }
      
      // Strict filtering for general job boards
      const eligibility = isEarlyCareerEligible(title, description);
      return eligibility.eligible;
    });
    
    funnel.eligible = graduateJobs.length;
    console.log(`🎯 Graduate-appropriate jobs: ${graduateJobs.length}/${allJobs.length} (${((graduateJobs.length/allJobs.length)*100).toFixed(1)}%)`);
    
    // Convert to our Job interface format
    const formattedJobs: Job[] = [];
    
    for (const job of graduateJobs) {
      const { createRobustJob } = require('./robustJobCreation');
      
      // Determine if job is remote based on source and location
      const isRemote = job.source === 'remoteok' || 
                      job.location?.toLowerCase().includes('remote') ||
                      job.work_environment === 'remote';
      
      const jobResult = createRobustJob({
        title: job.title,
        company: job.company,
        location: job.location || 'Unknown',
        jobUrl: job.job_url || job.url || '#',
        companyUrl: job.company_profile_url || `https://${job.company.toLowerCase().replace(/\s+/g, '')}.com`,
        description: job.description || '',
        department: job.department || 'General',
        postedAt: job.posted_at || job.original_posted_date || new Date().toISOString(),
        runId,
        source: job.source || 'unknown',
        isRemote,
        platformId: job.id?.toString() || job.job_hash
      });
      
      if (jobResult.job) {
        formattedJobs.push(jobResult.job);
        funnel.careerTagged++;
        funnel.locationTagged++;
        
        // Add sample titles
        if (funnel.samples.length < 10) {
          funnel.samples.push(job.title);
        }
      } else {
        console.log(`❌ Job filtered: "${job.title}" at ${job.company} - ${jobResult.reason}`);
      }
    }
    
    console.log(`✅ Formatted ${formattedJobs.length} jobs for database`);
    
    // Show job source distribution
    const sourceDistribution: Record<string, number> = {};
    formattedJobs.forEach(job => {
      sourceDistribution[job.source] = (sourceDistribution[job.source] || 0) + 1;
    });
    
    console.log('📈 Final job distribution:');
    Object.entries(sourceDistribution).forEach(([source, count]) => {
      const percentage = ((count / formattedJobs.length) * 100).toFixed(1);
      console.log(`   ${source}: ${count} jobs (${percentage}%)`);
    });
    
    // WARNING if still too many RemoteOK jobs
    const remoteOKCount = sourceDistribution['remoteok'] || 0;
    if (remoteOKCount > formattedJobs.length * 0.3) {
      console.error('⚠️  WARNING: RemoteOK still represents >30% of jobs!');
      console.error('   Graduates are still seeing too many senior roles.');
      console.error('   Check that graduate scrapers are working properly.');
    }
    
    // Log funnel metrics
    logFunnelMetrics('reliable_scrapers', funnel);
    
    return { jobs: formattedJobs, funnel };
    
  } catch (error) {
    console.error('❌ Reliable scraper system failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    funnel.errors.push(errorMessage);
    
    // Return empty result on error
    logFunnelMetrics('reliable_scrapers', funnel);
    return { jobs: [], funnel };
  }
}
