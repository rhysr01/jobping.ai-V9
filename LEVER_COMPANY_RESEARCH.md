# Lever Company Research Guide

## Overview
This guide provides comprehensive strategies for discovering and adding more companies to your Lever scraper, focusing on graduate-friendly employers.

## Current Lever Companies in Your System
Based on your `Utils/graduateEmployers.ts`, you currently have:
- **Spotify** (https://jobs.lever.co/spotify)
- **Discord** (https://jobs.lever.co/discord) 
- **Reddit** (https://jobs.lever.co/reddit)

## Research Strategies

### 1. Direct Lever URL Discovery

#### Common Lever URL Patterns
```
https://jobs.lever.co/{company-name}
https://jobs.lever.co/{company-slug}
https://jobs.lever.co/{company-id}
```

#### Manual Discovery Methods
1. **Company Career Pages**: Visit company career sites and look for "Powered by Lever" links
2. **LinkedIn Job Postings**: Search for jobs and check if they redirect to Lever
3. **Job Aggregators**: Sites like Glassdoor, Indeed often link to Lever job pages

### 2. Automated Discovery Techniques

#### Web Scraping Discovery
```javascript
// Example: Scrape Lever's customer showcase
const leverCompanies = [
  'spotify', 'discord', 'reddit', 'notion', 'figma', 'linear',
  'stripe', 'airtable', 'calendly', 'loom', 'robinhood', 'coinbase',
  'plaid', 'brex', 'deel', 'remote', 'gitlab', 'hashicorp'
];
```

#### API-Based Discovery
Lever provides an API for job postings:
```javascript
// Example API endpoint structure
const leverAPI = `https://api.lever.co/v0/postings/{company}`;
```

### 3. Graduate-Friendly Company Categories

#### Tech Companies (High Graduate Hiring)
- **Productivity**: Notion, Figma, Linear, Airtable
- **Communication**: Discord, Slack, Zoom
- **Finance**: Stripe, Plaid, Brex, Deel
- **Developer Tools**: GitLab, HashiCorp, Vercel
- **AI/ML**: Anthropic, Hugging Face, Scale AI

#### Scale-ups & Startups
- **Series B+ Companies**: Usually have structured graduate programs
- **Remote-First Companies**: Often hire globally
- **B2B SaaS**: Typically have entry-level roles

### 4. Validation Criteria

#### Must-Have for Graduate Programs
- [ ] Entry-level roles (Junior, Associate, Graduate)
- [ ] Structured training programs
- [ ] Visa sponsorship (for international students)
- [ ] Recent job postings (active hiring)
- [ ] European offices (for your target market)

#### Nice-to-Have
- [ ] Clear career progression
- [ ] Mentorship programs
- [ ] Competitive salaries
- [ ] Remote work options

### 5. Implementation Strategy

#### Phase 1: Manual Research (Week 1)
1. **Research 50 companies** using the discovery methods above
2. **Validate each company** against graduate criteria
3. **Test Lever URLs** to ensure they work
4. **Document findings** in a spreadsheet

#### Phase 2: Automated Validation (Week 2)
1. **Create validation script** to check:
   - URL accessibility
   - Job count
   - Recent postings
   - Graduate-friendly keywords
2. **Filter results** based on criteria
3. **Generate final list** of qualified companies

#### Phase 3: Integration (Week 3)
1. **Add companies** to `Utils/graduateEmployers.ts`
2. **Test scraper** with new companies
3. **Monitor performance** and adjust rate limits
4. **Document any issues** or special handling needed

### 6. Recommended Companies to Research

#### High Priority (Known Graduate Programs)
```
1. Notion (notion)
2. Figma (figma)
3. Linear (linear)
4. Airtable (airtable)
5. Calendly (calendly)
6. Loom (loom)
7. Robinhood (robinhood)
8. Coinbase (coinbase)
9. Plaid (plaid)
10. Brex (brex)
```

#### Medium Priority (Likely Graduate Programs)
```
1. Deel (deel)
2. Remote (remote)
3. GitLab (gitlab)
4. HashiCorp (hashicorp)
5. Vercel (vercel)
6. Anthropic (anthropic)
7. Hugging Face (huggingface)
8. Scale AI (scale)
9. Retool (retool)
10. Supabase (supabase)
```

### 7. Technical Implementation

#### Update Your graduateEmployers.ts
```typescript
// Add new Lever companies
{
  name: 'Notion',
  url: 'https://jobs.lever.co/notion',
  platform: 'lever',
  graduatePrograms: ['Notion Graduate Program', 'Notion Engineering Residency'],
  locations: ['London', 'Dublin', 'Amsterdam', 'Berlin'],
  visaSponsorship: true,
  applicationDeadlines: ['October', 'November'],
  programDuration: '2 years'
}
```

#### Enhanced Scraper Features
1. **Company-specific filtering**: Some companies need custom selectors
2. **Rate limiting per company**: Different companies have different limits
3. **Error handling**: Graceful handling of company-specific issues
4. **Monitoring**: Track success rates per company

### 8. Quality Assurance

#### Testing Checklist
- [ ] URL returns valid HTML
- [ ] Job listings are accessible
- [ ] Rate limiting is respected
- [ ] Error handling works
- [ ] Data quality is maintained
- [ ] No duplicate jobs are created

#### Monitoring Metrics
- Success rate per company
- Job count per company
- Error frequency
- Response times
- Data quality scores

### 9. Resources

#### Lever Documentation
- [Lever API Documentation](https://api.lever.co/)
- [Lever Customer Showcase](https://www.lever.co/customers/)
- [Lever Developer Resources](https://www.lever.co/developers/)

#### Company Research Tools
- [Crunchbase](https://www.crunchbase.com/) - Company funding and size
- [LinkedIn](https://www.linkedin.com/) - Company hiring patterns
- [Glassdoor](https://www.glassdoor.com/) - Company reviews and hiring
- [AngelList](https://angel.co/) - Startup job boards

### 10. Next Steps

1. **Start with manual research** of the high-priority companies
2. **Create a validation script** to automate testing
3. **Implement the new companies** in batches
4. **Monitor and optimize** based on results
5. **Expand to other ATS platforms** (Greenhouse, Workday)

## Success Metrics

- **Target**: 50+ graduate-friendly Lever companies
- **Success Rate**: >90% job extraction success
- **Coverage**: 1000+ graduate jobs per scrape
- **Quality**: <5% duplicate or invalid jobs
- **Performance**: <30 seconds per company

This research guide will help you systematically expand your Lever scraper with high-quality, graduate-friendly companies.
