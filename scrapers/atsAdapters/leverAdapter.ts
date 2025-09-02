import { BaseATSAdapter } from './baseAdapter';
import { IngestJob } from '../types';

interface LeverJob {
  id: string;
  text: string;
  descriptionPlain: string;
  hostedUrl: string;
  createdAt: number;
  categories: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  lists: Array<{
    text: string;
    content: string;
  }>;
}

export class LeverAdapter extends BaseATSAdapter {
  async fetchListings(input: Record<string, string>): Promise<IngestJob[]> {
    const { slug } = input;
    if (!slug) {
      throw new Error('Lever adapter requires slug parameter');
    }

    try {
      const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
      const response = await this.makeRequest(url);
      
      const jobs: LeverJob[] = response.data;
      const ingestJobs: IngestJob[] = [];

      for (const job of jobs) {
        try {
          const location = job.categories?.location || 'Unknown';
          const workEnvironment = this.determineWorkEnvironment(job);
          const languages = this.extractLanguages(job);
          
          const ingestJob = this.createIngestJob(
            job.text,
            slug, // company name from slug
            job.descriptionPlain,
            job.hostedUrl,
            new Date(job.createdAt).toISOString(),
            'lever',
            location,
            languages,
            workEnvironment
          );

          // Only include early-career jobs
          if (ingestJob.meta?.early) {
            ingestJobs.push(ingestJob);
          }
        } catch (error) {
          console.warn(`Failed to process Lever job ${job.id}:`, error);
        }
      }

      console.log(`Lever adapter found ${jobs.length} total jobs, ${ingestJobs.length} early-career jobs for ${slug}`);
      return ingestJobs;
    } catch (error) {
      console.error(`Lever adapter failed for ${slug}:`, error);
      throw error;
    }
  }

  private determineWorkEnvironment(job: LeverJob): string {
    const text = `${job.text} ${job.descriptionPlain}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('anywhere')) {
      return 'Remote';
    } else if (text.includes('hybrid') || text.includes('flexible')) {
      return 'Hybrid';
    } else {
      return 'Onsite';
    }
  }

  private extractLanguages(job: LeverJob): string[] {
    const languages: string[] = [];
    const text = `${job.text} ${job.descriptionPlain}`.toLowerCase();
    
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
