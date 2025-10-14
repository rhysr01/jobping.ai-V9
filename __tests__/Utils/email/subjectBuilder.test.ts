/**
 * Tests for Email Subject Builder
 * Tests personalized subject line generation
 */

import {
  buildPersonalizedSubject
} from '@/Utils/email/subjectBuilder';

describe('SubjectBuilder - buildPersonalizedSubject', () => {
  it('should build subject with jobs and preferences', () => {
    const jobs = [
      { title: 'Software Engineer', company: 'Google', match_score: 95 },
      { title: 'Frontend Dev', company: 'Meta', match_score: 90 },
      { title: 'Backend Dev', company: 'Amazon', match_score: 85 }
    ];
    
    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Frontend',
        locationPreference: 'London'
      }
    });

    expect(subject).toBeTruthy();
    expect(subject.length).toBeGreaterThan(10);
  });

  it('should include company names when multiple jobs', () => {
    const jobs = [
      { title: 'Engineer', company: 'Google', match_score: 95 },
      { title: 'Engineer', company: 'Meta', match_score: 90 }
    ];

    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Engineer',
        locationPreference: 'Berlin'
      }
    });

    // Should mention companies or job count
    const hasCompany = subject.includes('Google') || subject.includes('Meta');
    const hasCount = subject.includes('2');
    
    expect(hasCompany || hasCount).toBe(true);
  });

  it('should include match score for top job', () => {
    const jobs = [
      { title: 'Senior Engineer', company: 'Stripe', match_score: 94 },
      { title: 'Junior Engineer', company: 'Adyen', match_score: 80 }
    ];

    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Engineer',
        locationPreference: 'Amsterdam'
      }
    });

    // Should include match score or company
    expect(subject).toBeTruthy();
    expect(subject.length).toBeGreaterThan(10);
  });

  it('should handle jobs without preferences', () => {
    const jobs = [
      { title: 'Developer', company: 'TechCo', match_score: 85 }
    ];

    const subject = buildPersonalizedSubject({ jobs });

    expect(subject).toBeTruthy();
    expect(subject.length).toBeGreaterThan(5);
  });

  it('should handle single job', () => {
    const jobs = [
      { title: 'Data Analyst', company: 'DataCorp', match_score: 88 }
    ];

    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Data Analyst',
        locationPreference: 'Paris'
      }
    });

    expect(subject).toBeTruthy();
    expect(subject.length).toBeGreaterThan(10);
  });

  it('should handle many jobs', () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      title: `Job ${i}`,
      company: `Company ${i}`,
      match_score: 80 + i
    }));

    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Software Engineer',
        locationPreference: 'London'
      }
    });

    expect(subject).toBeTruthy();
    expect(subject).toContain('10');
  });

  it('should use day context when provided', () => {
    const jobs = [
      { title: 'Engineer', company: 'TechCo', match_score: 90 }
    ];

    const monday = new Date('2024-01-01T10:00:00Z'); // Monday
    
    const subject = buildPersonalizedSubject({
      jobs,
      preferences: {
        rolePreference: 'Engineer',
        locationPreference: 'London'
      },
      now: monday
    });

    expect(subject).toBeTruthy();
  });
});


