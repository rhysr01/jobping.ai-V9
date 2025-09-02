import { BaseATSAdapter } from './baseAdapter';
import { IngestJob } from '../types';

interface GreenhouseJob {
  id: number;
  title: string;
  location: {
    name: string;
  };
  departments: Array<{
    name: string;
  }>;
  offices: Array<{
    name: string;
  }>;
  absolute_url: string;
  updated_at: string;
  content: string;
  metadata: Array<{
    id: number;
    name: string;
    value_type: string;
    value: string;
  }>;
}

export class GreenhouseAdapter extends BaseATSAdapter {
  async fetchListings(input: Record<string, string>): Promise<IngestJob[]> {
    const { slug } = input;
    if (!slug) {
      throw new Error('Greenhouse adapter requires slug parameter');
    }

    try {
      // Try the JSON feed first
      const url = `https://boards.greenhouse.io/${slug}.json`;
      const response = await this.makeRequest(url);
      
      const jobs: GreenhouseJob[] = response.data.jobs || response.data;
      const ingestJobs: IngestJob[] = [];

      for (const job of jobs) {
        try {
          const location = this.extractLocation(job);
          const workEnvironment = this.determineWorkEnvironment(job);
          const languages = this.extractLanguages(job);
          
          const ingestJob = this.createIngestJob(
            job.title,
            slug, // company name from slug
            job.content,
            job.absolute_url,
            job.updated_at,
            'greenhouse',
            location,
            languages,
            workEnvironment
          );

          // Only include early-career jobs
          if (ingestJob.meta?.early) {
            ingestJobs.push(ingestJob);
          }
        } catch (error) {
          console.warn(`Failed to process Greenhouse job ${job.id}:`, error);
        }
      }

      console.log(`Greenhouse adapter found ${jobs.length} total jobs, ${ingestJobs.length} early-career jobs for ${slug}`);
      return ingestJobs;
    } catch (error) {
      console.error(`Greenhouse adapter failed for ${slug}:`, error);
      
      // Fallback to embed API if JSON feed fails
      try {
        return await this.fetchFromEmbedAPI(slug);
      } catch (fallbackError) {
        console.error(`Greenhouse embed API also failed for ${slug}:`, fallbackError);
        throw error;
      }
    }
  }

  private async fetchFromEmbedAPI(slug: string): Promise<IngestJob[]> {
    const url = `https://boards.greenhouse.io/boards/api/embed/job_board?for=${slug}`;
    const response = await this.makeRequest(url);
    
    const jobs: GreenhouseJob[] = response.data.jobs || [];
    const ingestJobs: IngestJob[] = [];

    for (const job of jobs) {
      try {
        const location = this.extractLocation(job);
        const workEnvironment = this.determineWorkEnvironment(job);
        const languages = this.extractLanguages(job);
        
        const ingestJob = this.createIngestJob(
          job.title,
          slug,
          job.content,
          job.absolute_url,
          job.updated_at,
          'greenhouse',
          location,
          languages,
          workEnvironment
        );

        if (ingestJob.meta?.early) {
          ingestJobs.push(ingestJob);
        }
      } catch (error) {
        console.warn(`Failed to process Greenhouse embed job ${job.id}:`, error);
      }
    }

    console.log(`Greenhouse embed API found ${jobs.length} total jobs, ${ingestJobs.length} early-career jobs for ${slug}`);
    return ingestJobs;
  }

  private extractLocation(job: GreenhouseJob): string {
    // Try location first
    if (job.location?.name) {
      return job.location.name;
    }
    
    // Try offices
    if (job.offices && job.offices.length > 0) {
      return job.offices[0].name;
    }
    
    // Try metadata for location
    const locationMeta = job.metadata?.find(m => 
      m.name.toLowerCase().includes('location') || 
      m.name.toLowerCase().includes('office')
    );
    
    if (locationMeta?.value) {
      return locationMeta.value;
    }
    
    return 'Unknown';
  }

  private determineWorkEnvironment(job: GreenhouseJob): string {
    const text = `${job.title} ${job.content}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('anywhere')) {
      return 'Remote';
    } else if (text.includes('hybrid') || text.includes('flexible')) {
      return 'Hybrid';
    } else {
      return 'Onsite';
    }
  }

  private extractLanguages(job: GreenhouseJob): string[] {
    const languages: string[] = [];
    const text = `${job.title} ${job.content}`.toLowerCase();
    
    const languagePatterns = [
      { pattern: /javascript|js/i, name: 'JavaScript' },
      { pattern: /typescript|ts/i, name: 'TypeScript' },
      { pattern: /python/i, name: 'Python' },
      { pattern: /java/i, name: 'Java' },
      { pattern: /c\+\+|cpp/i, name: 'C++' },
      { pattern: /c#|csharp/i, name: 'C#' },
      { pattern: /go|golang/i, name: 'Go' },
      { pattern: /rust/i, name: 'Rust' },
      { pattern: /ruby/i, name: 'Ruby' },
      { pattern: /php/i, name: 'PHP' },
      { pattern: /swift/i, name: 'Swift' },
      { pattern: /kotlin/i, name: 'Kotlin' },
      { pattern: /scala/i, name: 'Scala' },
      { pattern: /react/i, name: 'React' },
      { pattern: /angular/i, name: 'Angular' },
      { pattern: /vue/i, name: 'Vue' },
      { pattern: /node/i, name: 'Node.js' },
      { pattern: /sql/i, name: 'SQL' },
      { pattern: /mongodb/i, name: 'MongoDB' },
      { pattern: /redis/i, name: 'Redis' },
      { pattern: /docker/i, name: 'Docker' },
      { pattern: /kubernetes|k8s/i, name: 'Kubernetes' },
      { pattern: /aws/i, name: 'AWS' },
      { pattern: /azure/i, name: 'Azure' },
      { pattern: /gcp|google cloud/i, name: 'GCP' }
    ];

    for (const { pattern, name } of languagePatterns) {
      if (pattern.test(text) && !languages.includes(name)) {
        languages.push(name);
      }
    }

    return languages;
  }
}
