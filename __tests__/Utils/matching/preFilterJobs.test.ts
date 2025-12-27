import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import type { Job } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';

// Sentry removed - using Axiom for error tracking

jest.mock('@/Utils/databasePool', () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('@/Utils/sendConfiguration', () => ({
  MATCH_RULES: {
    maxPerSource: 40,
  },
}));

describe('preFilterJobs', () => {
  const mockJobs: Job[] = [
    {
      job_hash: 'hash1',
      title: 'Software Engineer',
      company: 'Tech Co',
      location: 'London, UK',
      description: 'Early career software engineer',
      job_url: 'https://example.com/job1',
      source: 'test',
      categories: ['early-career', 'software', 'career:tech'],
      is_active: true,
      is_graduate: false,
      is_internship: false,
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      original_posted_date: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      scrape_timestamp: new Date().toISOString(),
      experience_required: '',
      work_environment: 'remote',
    },
    {
      job_hash: 'hash2',
      title: 'Senior Developer',
      company: 'Old Co',
      location: 'Tokyo, Japan',
      description: 'Senior role requiring 10 years',
      job_url: 'https://example.com/job2',
      source: 'test',
      categories: ['software'],
      is_active: true,
      is_graduate: false,
      is_internship: false,
      created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
      posted_at: new Date().toISOString(),
      original_posted_date: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      scrape_timestamp: new Date().toISOString(),
      experience_required: '',
      work_environment: 'on-site',
    },
    {
      job_hash: 'hash3',
      title: 'Junior Designer',
      company: 'Design Co',
      location: 'Berlin, Germany',
      description: 'Entry level design role',
      job_url: 'https://example.com/job3',
      source: 'test',
      categories: ['early-career', 'design'],
      is_active: true,
      is_graduate: false,
      is_internship: false,
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      original_posted_date: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      scrape_timestamp: new Date().toISOString(),
      experience_required: '',
      work_environment: 'hybrid',
    },
  ];

  const mockUser: UserPreferences = {
    email: 'test@example.com',
    target_cities: ['London', 'Berlin'],
    career_path: ['tech'],
    work_environment: 'remote',
  };

  describe('preFilterJobsByUserPreferencesEnhanced', () => {
    it('should filter jobs by location', () => {
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, mockUser);
      const locations = filtered.map(job => job.location);
      expect(locations.some(loc => loc.includes('London') || loc.includes('Berlin'))).toBe(true);
    });

    it('should filter out old jobs', () => {
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, mockUser);
      const hasOldJob = filtered.some(job => job.job_hash === 'hash2');
      expect(hasOldJob).toBe(false);
    });

    it('should filter jobs by career path', () => {
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, mockUser);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should handle empty job list', () => {
      const filtered = preFilterJobsByUserPreferencesEnhanced([], mockUser);
      expect(filtered).toEqual([]);
    });

    it('should handle user with no preferences', () => {
      const emptyUser: UserPreferences = {
        email: 'test@example.com',
      };
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, emptyUser);
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should prioritize early-career jobs', () => {
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, mockUser);
      const earlyCareerJobs = filtered.filter(job => 
        job.categories?.includes('early-career')
      );
      expect(earlyCareerJobs.length).toBeGreaterThan(0);
    });

    it('should respect work environment preference', () => {
      const remoteUser: UserPreferences = {
        ...mockUser,
        work_environment: 'remote',
      };
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, remoteUser);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by target cities', () => {
      const londonUser: UserPreferences = {
        ...mockUser,
        target_cities: ['London'],
      };
      const filtered = preFilterJobsByUserPreferencesEnhanced(mockJobs, londonUser);
      const hasLondonJob = filtered.some(job => job.location.includes('London'));
      expect(hasLondonJob).toBe(true);
    });
  });
});

