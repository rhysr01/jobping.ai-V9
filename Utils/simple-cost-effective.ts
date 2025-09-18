/**
 * Simple, Cost-Effective JobPing Implementation
 * Designed for MVP with minimal costs
 */

// Simple AI matching with cost controls
export class SimpleAIMatcher {
  private dailyCallCount = 0;
  private maxDailyCalls = 100; // $5-10/month limit

  async matchJobs(jobs: any[], user: any): Promise<any[]> {
    // Check daily limit
    if (this.dailyCallCount >= this.maxDailyCalls) {
      return this.fallbackMatching(jobs, user);
    }

    // Use GPT-3.5 only (much cheaper)
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY
    });

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // $0.002 per 1K tokens vs $0.03 for GPT-4
        messages: [{
          role: 'user',
          content: `Match these jobs to user preferences: ${JSON.stringify({ jobs: jobs.slice(0, 10), user })}`
        }],
        max_tokens: 500, // Keep responses short
        temperature: 0.3
      });

      this.dailyCallCount++;
      return this.parseMatches(response.choices[0].message.content || '');
    } catch (error) {
      return this.fallbackMatching(jobs, user);
    }
  }

  private fallbackMatching(jobs: any[], user: any): any[] {
    // Simple rule-based matching when AI limit reached
    return jobs.filter(job => 
      job.location.toLowerCase().includes(user.target_cities?.[0]?.toLowerCase() || '') ||
      job.title.toLowerCase().includes(user.career_path?.[0]?.toLowerCase() || '')
    ).slice(0, 5);
  }

  private parseMatches(content: string): any[] {
    // Simple parsing of AI response
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
}

// Simple job scraper using free APIs
export class SimpleJobScraper {
  private freeJobBoards = [
    'https://jobs.github.com/positions.json',
    'https://api.lever.co/v0/postings/lever',
    'https://api.greenhouse.io/v1/boards/lever/jobs'
  ];

  async scrapeJobs(): Promise<any[]> {
    const allJobs: any[] = [];

    for (const url of this.freeJobBoards) {
      try {
        const response = await fetch(url);
        const jobs = await response.json();
        allJobs.push(...jobs.slice(0, 10)); // Limit to 10 per source
      } catch (error) {
        console.log(`Failed to scrape ${url}:`, error);
      }
    }

    return allJobs;
  }
}

// Simple background job processor
export class SimpleJobProcessor {
  private processing = false;

  async startProcessing(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    // Simple interval-based processing
    setInterval(async () => {
      await this.processUsers();
    }, 60000); // Every minute
  }

  private async processUsers(): Promise<void> {
    // Get users who need emails
    const users = await this.getUsersNeedingEmails();
    
    // Process in small batches to avoid timeouts
    for (const user of users.slice(0, 5)) {
      try {
        await this.processUser(user);
      } catch (error) {
        console.error(`Failed to process user ${user.email}:`, error);
      }
    }
  }

  private async processUser(user: any): Promise<void> {
    // Simple user processing
    const scraper = new SimpleJobScraper();
    const matcher = new SimpleAIMatcher();
    
    const jobs = await scraper.scrapeJobs();
    const matches = await matcher.matchJobs(jobs, user);
    
    if (matches.length > 0) {
      await this.sendEmail(user.email, matches);
    }
  }

  private async getUsersNeedingEmails(): Promise<any[]> {
    // Simple database query
    return []; // Implement based on your database
  }

  private async sendEmail(email: string, jobs: any[]): Promise<void> {
    // Simple email sending
    console.log(`Sending ${jobs.length} jobs to ${email}`);
  }
}

// Cost monitoring
export class CostMonitor {
  private monthlySpend = 0;
  private maxMonthlySpend = 50; // $50/month limit

  async checkCosts(): Promise<boolean> {
    // Simple cost tracking
    if (this.monthlySpend >= this.maxMonthlySpend) {
      console.log('Monthly cost limit reached, switching to fallback mode');
      return false;
    }
    return true;
  }

  recordSpend(amount: number): void {
    this.monthlySpend += amount;
  }
}
