'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReducedMotion } from '@/components/ui/useReducedMotion';
import { BrandIcons } from '@/components/ui/BrandIcons';
import * as Copy from '@/lib/copy';
import { FormFieldError, FormFieldSuccess, FormFieldHelper } from '@/components/ui/FormFieldFeedback';
import { useAriaAnnounce } from '@/components/ui/AriaLiveRegion';
import { useEmailValidation, useRequiredValidation } from '@/hooks/useFormValidation';
import EuropeMap from '@/components/ui/EuropeMap';
import WorkEnvironmentSelector from '@/components/ui/WorkEnvironmentSelector';
import ExperienceTimeline from '@/components/ui/ExperienceTimeline';
import EntryLevelSelector from '@/components/ui/EntryLevelSelector';
import LanguageSelector from '@/components/ui/LanguageSelector';
import CalendarPicker from '@/components/ui/CalendarPicker';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams?.get('tier') as 'free' | 'premium' | null;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeJobs, setActiveJobs] = useState('Updating…');
  const [totalUsers, setTotalUsers] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsStale, setStatsStale] = useState(true);
  const [tier] = useState<'free' | 'premium'>(tierParam === 'premium' ? 'premium' : 'free');
  const prefersReduced = useReducedMotion();
  const { announce, Announcement } = useAriaAnnounce();
  const formRefs = {
    fullName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
  };
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cities: [] as string[],
    languages: [] as string[],
    startDate: '',
    experience: '',
    workEnvironment: [] as string[],
    visaStatus: '',
    entryLevelPreferences: [] as string[], // Changed to array for multiple selections
    targetCompanies: [] as string[],
    careerPath: '',
    roles: [] as string[],
    // NEW FIELDS FOR BETTER MATCHING
    industries: [] as string[],
    companySizePreference: '',
    skills: [] as string[],
    careerKeywords: '', // NEW: Free-form career keywords
    gdprConsent: false, // GDPR: Must explicitly agree
  });

  useEffect(() => {
    const normalize = (value: unknown): number => {
      if (typeof value === 'number' && !Number.isNaN(value)) return value;
      if (typeof value === 'string') {
        const numeric = Number(value.replace(/,/g, ''));
        if (!Number.isNaN(numeric)) return numeric;
      }
      return 0;
    };

    fetch('/api/stats')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) {
          setActiveJobs('~12,000');
          setTotalUsers('3,400');
          setStatsStale(true);
          return;
        }

        const activeValue = normalize(data.activeJobs ?? data.activeJobsFormatted);
        const totalValue = normalize(data.totalUsers ?? data.totalUsersFormatted);
        const hasFreshStats = activeValue > 0 && totalValue > 0;

        setActiveJobs(
          hasFreshStats ? activeValue.toLocaleString('en-US') : '~12,000'
        );
        setTotalUsers(
          hasFreshStats ? totalValue.toLocaleString('en-US') : '3,400'
        );
        setStatsStale(!hasFreshStats);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setActiveJobs('~12,000');
        setTotalUsers('3,400');
        setStatsStale(true);
      })
      .finally(() => setIsLoadingStats(false));
  }, []);

  const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw'];
  
  const LANGUAGES = [
    // Most common EU languages
    'English', 'French', 'German', 'Spanish', 'Italian', 'Dutch', 'Portuguese',
    // Additional EU languages
    'Polish', 'Swedish', 'Danish', 'Finnish', 'Czech', 'Romanian', 'Hungarian', 'Greek',
    // Other common languages
    'Arabic'
  ];
  
  // NEW CONSTANTS FOR BETTER MATCHING
  const INDUSTRIES = [
    'Technology', 'Finance', 'Consulting', 'Healthcare', 'Retail', 'Manufacturing', 
    'Energy', 'Media', 'Education', 'Government', 'Non-profit', 'Real Estate', 
    'Transportation', 'Automotive', 'Fashion', 'Food & Beverage', 'Travel', 'Other'
  ];
  
  const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup (1-50)', emoji: '' },
    { value: 'scaleup', label: 'Scale-up (50-500)', emoji: '' },
    { value: 'enterprise', label: 'Enterprise (500+)', emoji: '' },
    { value: 'any', label: 'Any Size', emoji: '' }
  ];
  
  const COMMON_SKILLS = [
    'Excel', 'PowerPoint', 'Word', 'Python', 'R', 'SQL', 'PowerBI', 'Tableau', 
    'Google Analytics', 'Salesforce', 'HubSpot', 'Jira', 'Confluence', 'Slack',
    'Microsoft Office', 'Google Workspace', 'Adobe Creative Suite', 'Canva',
    'Data Analysis', 'Project Management', 'Digital Marketing', 'Social Media',
    'Email Marketing', 'Content Creation', 'Research', 'Presentation Skills',
    'Communication', 'Leadership', 'Problem Solving', 'Analytical Thinking'
  ];
  
  const CAREER_PATHS = [
    { 
      value: 'strategy', 
      label: 'Strategy & Business Design', 
      emoji: '', 
      roles: ['Business Analyst', 'Associate Consultant', 'Junior Consultant', 'Strategy Analyst', 'Consulting Intern', 'Junior Business Analyst', 'Transformation Analyst', 'Management Consulting Intern', 'Growth Consultant', 'Business Analyst Trainee', 'Junior Associate', 'Strategy Consultant', 'Digital Transformation Analyst', 'Operations Excellence Consultant', 'Business Strategy Intern']
    },
    { 
      value: 'finance', 
      label: 'Finance & Investment', 
      emoji: '', 
      roles: ['Financial Analyst', 'Finance Intern', 'Investment Banking Analyst', 'Risk Analyst', 'Audit Associate', 'Finance Trainee', 'FP&A Analyst', 'Credit Analyst', 'Investment Analyst', 'Junior Accountant', 'Corporate Finance Analyst', 'M&A Analyst', 'Treasury Analyst', 'Junior Tax Associate', 'Finance Graduate']
    },
    { 
      value: 'sales', 
      label: 'Sales & Client Success', 
      emoji: '', 
      roles: ['Sales Development Representative (SDR)', 'Business Development Representative (BDR)', 'Inside Sales Representative', 'Account Executive', 'Business Development Associate', 'Sales Trainee', 'Customer Success Associate', 'Revenue Operations Analyst', 'Sales Operations Analyst', 'Graduate Sales Programme', 'Business Development Intern', 'Channel Sales Associate', 'Account Development Representative', 'Junior Sales Executive', 'Client Success Manager']
    },
    { 
      value: 'marketing', 
      label: 'Marketing & Growth', 
      emoji: '', 
      roles: ['Marketing Intern', 'Social Media Intern', 'Digital Marketing Assistant', 'Marketing Coordinator', 'Growth Marketing Intern', 'Content Marketing Intern', 'Brand Assistant', 'Marketing Assistant', 'Junior Marketing Associate', 'Email Marketing Trainee', 'SEO/SEM Intern', 'Trade Marketing Intern', 'Marketing Graduate Programme', 'Junior B2B Marketing Coordinator', 'Marketing Campaign Assistant']
    },
    { 
      value: 'data', 
      label: 'Data & Analytics', 
      emoji: '', 
      roles: ['Data Analyst', 'Junior Data Analyst', 'Analytics Intern', 'Business Intelligence Intern', 'Data Analyst Trainee', 'Junior Data Scientist', 'Data Science Trainee', 'Junior Data Engineer', 'BI Engineer Intern', 'Analytics Associate', 'Data Analytics Graduate', 'Insights Analyst', 'Junior BI Developer', 'Data Assistant', 'Research & Analytics Intern']
    },
    { 
      value: 'operations', 
      label: 'Operations & Supply Chain', 
      emoji: '', 
      roles: ['Operations Analyst', 'Supply Chain Analyst', 'Logistics Analyst', 'Procurement Analyst', 'Operations Intern', 'Inventory Planner', 'Operations Coordinator', 'Supply Chain Trainee', 'Logistics Planning Graduate', 'Demand Planning Intern', 'Operations Management Trainee', 'Fulfilment Specialist', 'Sourcing Analyst', 'Process Improvement Analyst', 'Supply Chain Graduate']
    },
    { 
      value: 'product', 
      label: 'Product & Innovation', 
      emoji: '', 
      roles: ['Associate Product Manager (APM)', 'Product Analyst', 'Product Management Intern', 'Junior Product Manager', 'Product Operations Associate', 'Product Designer', 'UX Intern', 'Product Research Assistant', 'Innovation Analyst', 'Product Development Coordinator', 'Product Marketing Assistant', 'Product Owner Graduate', 'Assistant Product Manager', 'Product Strategy Intern', 'Technical Product Specialist']
    },
    { 
      value: 'tech', 
      label: 'Tech & Engineering', 
      emoji: '', 
      roles: ['Software Engineer Intern', 'Cloud Engineer Intern', 'DevOps Engineer Intern', 'Data Engineer Intern', 'Systems Analyst', 'IT Support Analyst', 'Application Support Analyst', 'Technology Analyst', 'QA/Test Analyst', 'Platform Engineer Intern', 'Cybersecurity Analyst', 'IT Operations Trainee', 'Technical Consultant', 'Solutions Engineer Graduate', 'IT Business Analyst']
    },
    { 
      value: 'sustainability', 
      label: 'Sustainability & ESG', 
      emoji: '', 
      roles: ['ESG Intern', 'Sustainability Strategy Intern', 'Junior ESG Analyst', 'Sustainability Graduate Programme', 'ESG Data Analyst Intern', 'Corporate Responsibility Intern', 'Environmental Analyst', 'Sustainability Reporting Trainee', 'Climate Analyst', 'Sustainable Finance Analyst', 'ESG Assurance Intern', 'Sustainability Communications Intern', 'Junior Impact Analyst', 'Sustainability Operations Assistant', 'Green Finance Analyst']
    },
    { 
      value: 'unsure', 
      label: 'Not Sure Yet / General', 
      emoji: '', 
      roles: ['Graduate Trainee', 'Rotational Graduate Program', 'Management Trainee', 'Business Graduate Analyst', 'Entry Level Program Associate', 'Future Leaders Programme', 'General Analyst', 'Operations Graduate', 'Commercial Graduate', 'Early Careers Program', 'Project Coordinator', 'Business Operations Analyst', 'Emerging Leaders Associate', 'Corporate Graduate Programme', 'Generalist Trainee']
    },
  ];

  const COMPANIES = ['Global Consulting Firms', 'Startups / Scaleups', 'Tech Giants', 'Investment Firms / VCs', 'Multinationals', 'Public Sector / NGOs', 'B2B SaaS', 'Financial Services'];

  // Form validation hooks
  const emailValidation = useEmailValidation(formData.email);
  const nameValidation = useRequiredValidation(formData.fullName, 'Full name');
  const citiesValidation = useRequiredValidation(formData.cities, 'Preferred cities');
  const languagesValidation = useRequiredValidation(formData.languages, 'Languages');

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tier }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.removeItem('jobping_signup_form'); // Clear saved data on success
        const redirectUrl = result.redirectUrl || `/signup/success?tier=${tier}`;
        router.push(redirectUrl);
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, tier, router]);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step === 4 && formData.gdprConsent && !loading) {
          handleSubmit();
        }
      }
      // Escape to go back
      if (e.key === 'Escape' && step > 1) {
        e.preventDefault();
        setStep(step - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData.gdprConsent, loading, handleSubmit]);

  // Announce validation errors to screen readers
  useEffect(() => {
    if (emailValidation.error) {
      announce(emailValidation.error, 'assertive');
    }
  }, [emailValidation.error, announce]);


  const toggleArray = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  const selectAllRoles = (careerPath: string) => {
    const career = CAREER_PATHS.find(c => c.value === careerPath);
    if (career) {
      setFormData({...formData, roles: career.roles});
    }
  };

  const clearAllRoles = () => {
    setFormData({...formData, roles: []});
  };

  // Load form data from localStorage on mount (error recovery)
  useEffect(() => {
    const saved = localStorage.getItem('jobping_signup_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load saved form data:', e);
      }
    }
  }, []);

  // Save form data to localStorage on change (error recovery)
  useEffect(() => {
    localStorage.setItem('jobping_signup_form', JSON.stringify(formData));
  }, [formData]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 enhanced-grid opacity-30" aria-hidden="true" />
      <motion.div
        className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"
        animate={prefersReduced ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-20 left-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
        animate={prefersReduced ? { scale: 1, opacity: 0.3 } : { scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: prefersReduced ? 0 : Infinity }}
        aria-hidden="true"
      />

      <div className="relative container-page max-w-4xl py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center sm:mb-16"
        >
          {tier === 'premium' && (
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-4 py-1 text-xs font-semibold text-brand-200">
              <BrandIcons.Star className="h-3.5 w-3.5" />
              Premium selected · €5/mo
            </span>
          )}

          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-200">
            Onboarding
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
            Tell us where to send your first matches
          </h1>
          <p className="mt-3 text-base text-zinc-300 sm:text-lg">
            We only ask for the essentials so we can filter internships and graduate roles you can actually land.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-300 sm:text-base">
            {Copy.REASSURANCE_ITEMS.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5"
              >
                <BrandIcons.Check className="h-4 w-4 text-brand-200" />
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400 sm:text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-brand-200">
              <BrandIcons.Target className="h-4 w-4 text-brand-300" />
              {isLoadingStats ? (
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/15" />
              ) : (
                `${activeJobs} active jobs this week`
              )}
            </span>
            {!isLoadingStats && totalUsers && parseInt(totalUsers.replace(/\D/g, ''), 10) > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <BrandIcons.Users className="h-4 w-4 text-brand-300" />
                {`${totalUsers}+ students on JobPing`}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <BrandIcons.Clock className="h-4 w-4 text-brand-300" />
              First drop arrives within 48 hours
            </span>
          </div>
          {!isLoadingStats && statsStale && (
            <p className="mt-4 text-xs text-amber-300 sm:text-sm">
              Live stats are temporarily unavailable — showing a typical week until fresh data syncs.
            </p>
          )}
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between mb-3 px-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {i < step ? '' : i}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-zinc-400">
                  {i === 1 ? 'Basics' : i === 2 ? 'Preferences' : 'Career'}
                </span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-center"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ARIA Live Region for form validation */}
        {Announcement}

        {/* Form Container */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 md:p-12 shadow-glow-strong">
          <AnimatePresence mode="wait">
            {/* Step 1: Basics */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 sm:space-y-10"
              >
                <div>
                  <h2 className="text-3xl font-black text-white mb-2 text-shadow-sm">Let's get started</h2>
                  <p className="text-zinc-300">Tell us about yourself</p>
                </div>

                {/* GDPR Consent - MOVED TO STEP 1 (Required) */}
                <div className="bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 border-2 border-brand-500/30 rounded-xl p-6">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.gdprConsent}
                      onChange={(e) => setFormData({...formData, gdprConsent: e.target.checked})}
                      className="mt-1 w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer"
                      required
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">
                        I agree to receive job recommendations via email *
                      </p>
                      <p className="text-sm text-zinc-400">
                        By checking this box, you consent to receive personalized job matches and agree to our{' '}
                        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">
                          Privacy Policy
                        </a>
                        {' '}and{' '}
                        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">
                          Terms of Service
                        </a>
                        . You can unsubscribe at any time.
                      </p>
                    </div>
                  </label>
                  {!formData.gdprConsent && step === 1 && (
                    <FormFieldError error="GDPR consent is required to continue" />
                  )}
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-base font-bold text-white mb-3">Full Name *</label>
                  <input
                    ref={formRefs.fullName}
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    onBlur={() => {
                      if (!formData.fullName.trim() && formData.fullName.length > 0) {
                        announce('Full name is required', 'polite');
                      } else if (formData.fullName.trim().length > 0) {
                        announce('Full name is valid', 'polite');
                      }
                    }}
                    className={`w-full px-5 py-4 bg-black/40 border-2 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg ${
                      formData.fullName ? (nameValidation.isValid ? 'border-green-500/50' : 'border-zinc-700') : 'border-zinc-700'
                    }`}
                    placeholder="John Smith"
                    autoComplete="name"
                    aria-invalid={formData.fullName.length > 0 && !nameValidation.isValid}
                    aria-describedby={formData.fullName.length > 0 ? 'fullName-error' : undefined}
                  />
                  {formData.fullName.length > 0 && (
                    <>
                      {nameValidation.isValid ? (
                        <FormFieldSuccess message="Looks good!" />
                      ) : (
                        <FormFieldError error={nameValidation.error} id="fullName-error" />
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-base font-bold text-white mb-2">Email *</label>
                  <p className="text-sm text-zinc-400 mb-3">We’ll email your first set within 48 hours.</p>
                  <input
                    ref={formRefs.email}
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    onBlur={() => {
                      if (emailValidation.error) {
                        announce(emailValidation.error, 'assertive');
                      } else if (emailValidation.isValid) {
                        announce('Email address is valid', 'polite');
                      }
                    }}
                    className={`w-full px-5 py-4 bg-black/40 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg ${
                      formData.email ? (emailValidation.isValid ? 'border-green-500/50' : emailValidation.error ? 'border-red-500/50' : 'border-zinc-700') : 'border-zinc-700'
                    }`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={formData.email.length > 0 && !emailValidation.isValid}
                    aria-describedby={formData.email.length > 0 ? 'email-error' : undefined}
                  />
                  {formData.email.length > 0 && (
                    <>
                      {emailValidation.isValid ? (
                        <FormFieldSuccess message="Email looks good!" />
                      ) : (
                        <FormFieldError error={emailValidation.error} id="email-error" />
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">
                    Preferred Cities * <span className="text-zinc-400 font-normal">(Select up to 3)</span>
                  </label>
                  <p className="text-sm text-zinc-400 mb-4">Choose up to 3 cities where you'd like to work</p>
                  
                  {/* Interactive Europe Map */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6 sm:mb-8 md:mb-10"
                  >
                    <EuropeMap
                      selectedCities={formData.cities}
                      onCityClick={(city) => {
                        if (formData.cities.length < 3 || formData.cities.includes(city)) {
                          setFormData({...formData, cities: toggleArray(formData.cities, city)});
                          if (formData.cities.length === 0 && !formData.cities.includes(city)) {
                            announce(`Selected ${city}. ${formData.cities.length + 1} of 3 cities selected.`, 'polite');
                          } else if (formData.cities.includes(city)) {
                            announce(`Deselected ${city}. ${formData.cities.length - 1} of 3 cities selected.`, 'polite');
                          }
                        }
                      }}
                      maxSelections={3}
                      className="w-full"
                    />
                  </motion.div>

                  {/* Mobile-friendly city chips */}
                  <div className="grid grid-cols-2 gap-2 sm:hidden">
                    {CITIES.map(city => {
                      const isSelected = formData.cities.includes(city);
                      const isDisabled = !isSelected && formData.cities.length >= 3;
                      return (
                        <motion.button
                          key={city}
                          type="button"
                          onClick={() => {
                            if (isDisabled) {
                              announce('Maximum cities selected. Deselect one to choose another.', 'polite');
                              return;
                            }
                            const nextCities = toggleArray(formData.cities, city);
                            setFormData({
                              ...formData,
                              cities: nextCities
                            });
                            if (nextCities.length > formData.cities.length) {
                              announce(`Selected ${city}. ${nextCities.length} of 3 cities selected.`, 'polite');
                            } else {
                              announce(`Deselected ${city}. ${nextCities.length} of 3 cities selected.`, 'polite');
                            }
                          }}
                          whileTap={{ scale: 0.97 }}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500/15 text-white shadow-glow-subtle'
                              : isDisabled
                                ? 'border-zinc-800 bg-zinc-900/40 text-zinc-500 cursor-not-allowed'
                                : 'border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-zinc-500'
                          }`}
                          disabled={isDisabled}
                        >
                          <span>{city}</span>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-brand-200' : 'text-zinc-500'}`}>
                            {isSelected ? 'Selected' : 'Tap'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {formData.cities.length >= 3 && (
                    <p className="mt-2 text-xs text-amber-400 sm:hidden">Maximum 3 cities selected. Deselect one to choose another.</p>
                  )}

                  {/* City Buttons Grid - REMOVED (redundant with map) */}
                  {/* Map is sufficient for city selection */}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-400">{formData.cities.length}/3 selected</p>
                    {formData.cities.length > 0 && citiesValidation.isValid && (
                      <FormFieldSuccess message={`${formData.cities.length} city${formData.cities.length > 1 ? 'ies' : ''} selected`} />
                    )}
                  </div>
                  {formData.cities.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-300">{formData.cities.join(', ')}</p>
                  )}
                  {formData.cities.length === 0 && step === 1 && (
                    <FormFieldError error="Please select at least one city" />
                  )}
                  {formData.cities.length >= 3 && (
                    <p className="text-xs text-amber-400 mt-1 hidden sm:block">Maximum 3 cities selected. Deselect one to choose another.</p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Languages (Professional Level) *</label>
                  <p className="text-sm text-zinc-400 mb-4">Select languages you can use professionally</p>
                  <LanguageSelector
                    languages={LANGUAGES}
                    selected={formData.languages}
                    onChange={(lang) => {
                      setFormData({...formData, languages: toggleArray(formData.languages, lang)});
                      if (formData.languages.length === 0) {
                        announce(`Selected ${lang}. ${formData.languages.length + 1} language selected.`, 'polite');
                      }
                    }}
                  />
                  {formData.languages.length > 0 && languagesValidation.isValid && (
                    <FormFieldSuccess message={`${formData.languages.length} language${formData.languages.length > 1 ? 's' : ''} selected`} />
                  )}
                  {formData.languages.length === 0 && step === 1 && (
                    <FormFieldError error="Please select at least one language" />
                  )}
                </div>

                <motion.button
                  onClick={() => setStep(2)}
                  disabled={!formData.fullName || !formData.email || formData.cities.length === 0 || formData.languages.length === 0 || !formData.gdprConsent}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary w-full text-xl py-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Continue to Preferences →
                </motion.button>
              </motion.div>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#12002b]/40 to-purple-600/15 px-5 py-6 sm:px-8 sm:py-8">
                  <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-28 left-12 h-56 w-56 bg-purple-600/20 blur-[120px]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,106,255,0.15),transparent_55%)]" />
                  <div className="relative z-10 space-y-8 sm:space-y-10">
                    <div>
                      <h2 className="text-3xl font-black text-white mb-2">Your preferences</h2>
                      <p className="text-zinc-200">Help us match you perfectly</p>
                      <p className="text-sm text-zinc-300 mt-1">These fields improve the quality of your first 5 jobs.</p>

                      {/* Progress Helper */}
                      <div className="mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 p-4 shadow-glow-subtle">
                        <h3 className="text-sm font-bold text-white/80 mb-2">Required for next step:</h3>
                        <div className="space-y-1 text-sm">
                          <div className={`flex items-center gap-2 ${formData.experience ? 'text-brand-200' : 'text-zinc-300'}`}>
                            <span className={`w-2 h-2 rounded-full ${formData.experience ? 'bg-brand-400' : 'bg-zinc-500'}`}></span>
                            Professional Experience
                          </div>
                          <div className={`flex items-center gap-2 ${formData.visaStatus ? 'text-brand-200' : 'text-zinc-300'}`}>
                            <span className={`w-2 h-2 rounded-full ${formData.visaStatus ? 'bg-brand-400' : 'bg-zinc-500'}`}></span>
                            Visa Status
                          </div>
                          <div className={`flex items-center gap-2 ${formData.entryLevelPreferences.length > 0 ? 'text-brand-200' : 'text-zinc-300'}`}>
                            <span className={`w-2 h-2 rounded-full ${formData.entryLevelPreferences.length > 0 ? 'bg-brand-400' : 'bg-zinc-500'}`}></span>
                            Entry Level Preferences ({formData.entryLevelPreferences.length}/1+ selected)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-white mb-3">Target Start Date *</label>
                      <p className="text-sm text-zinc-200 mb-4">When are you available to start?</p>
                  <CalendarPicker
                    value={formData.startDate}
                    onChange={(date) => setFormData({...formData, startDate: date})}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>

                    <div>
                      <label className="block text-base font-bold text-white mb-3">Professional Experience *</label>
                      <p className="text-sm text-zinc-200 mb-4">How much professional experience do you have?</p>
                  <div className="mt-10 md:mt-12">
                    <ExperienceTimeline
                      selected={formData.experience}
                      onChange={(exp) => setFormData({...formData, experience: exp})}
                    />
                  </div>
                </div>

                    <div>
                      <label className="block text-base font-bold text-white mb-3">Work Environment</label>
                      <p className="text-sm text-zinc-200 mb-4">Where would you like to work?</p>
                  <WorkEnvironmentSelector
                    selected={formData.workEnvironment}
                    onChange={(env) => setFormData({...formData, workEnvironment: toggleArray(formData.workEnvironment, env)})}
                  />
                </div>

                    <div>
                      <label className="block text-base font-bold text-white mb-3">Work Authorization *</label>
                      <p className="text-sm text-zinc-200 mb-3">Select your work authorization status in the EU/UK</p>
                  <div className="space-y-2">
                    {[
                      'EU citizen',
                      'EEA citizen (Iceland, Liechtenstein, Norway)',
                      'Swiss citizen',
                      'UK citizen',
                      'Dual EU & UK citizenship',
                      'Student Visa (EU)',
                      'Student Visa (Non-EU)',
                      'Non-EU (require sponsorship)',
                      'Non-UK (require sponsorship)'
                    ].map(visa => (
                      <motion.button
                        key={visa}
                        type="button"
                        onClick={() => setFormData({...formData, visaStatus: visa})}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full px-5 py-4 rounded-xl border-2 transition-all font-medium text-left ${
                          formData.visaStatus === visa
                            ? 'border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {visa}
                      </motion.button>
                    ))}
                  </div>
                </div>

                    <div>
                      <label className="block text-base font-bold text-white mb-3">Entry Level Preference *</label>
                      <p className="text-sm text-zinc-200 mb-4">What type of roles are you looking for?</p>
                  <EntryLevelSelector
                    selected={formData.entryLevelPreferences}
                    onChange={(pref) => setFormData({...formData, entryLevelPreferences: toggleArray(formData.entryLevelPreferences, pref)})}
                  />
                  {formData.entryLevelPreferences.length > 0 && (
                    <p className="text-sm text-zinc-200 mt-4">
                      <span className="font-bold text-brand-200">{formData.entryLevelPreferences.length}</span> selected
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Target Companies</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COMPANIES.map(company => (
                      <motion.button
                        key={company}
                        type="button"
                        onClick={() => setFormData({...formData, targetCompanies: toggleArray(formData.targetCompanies, company)})}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-left text-sm ${
                          formData.targetCompanies.includes(company)
                            ? 'border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {company}
                      </motion.button>
                    ))}
                  </div>
                </div>

                    <div className="flex gap-4 pt-4">
                      <motion.button
                        onClick={() => setStep(1)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-secondary flex-1 py-5 text-lg"
                      >
                        ← Back
                      </motion.button>
                      <motion.button
                        onClick={() => setStep(3)}
                        disabled={!formData.experience || !formData.visaStatus || formData.entryLevelPreferences.length === 0}
                        whileHover={{ scale: 1.02 }}
                        className={`relative flex-1 py-6 sm:py-7 text-xl sm:text-2xl font-black uppercase tracking-wide rounded-2xl overflow-hidden transition-all ${
                          !formData.experience || !formData.visaStatus || formData.entryLevelPreferences.length === 0
                            ? 'opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-400'
                            : 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-glow-signup hover:shadow-glow-medium hover:scale-105'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        {(!formData.experience || !formData.visaStatus || formData.entryLevelPreferences.length === 0)
                          ? 'Complete Required Fields'
                          : 'Continue to Career Path →'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Career Path */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#130433]/45 to-purple-600/15 px-5 py-6 sm:px-8 sm:py-8">
                  <div className="pointer-events-none absolute -top-24 left-6 h-48 w-48 rounded-full bg-purple-600/25 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-28 right-0 h-56 w-56 bg-brand-500/25 blur-[120px]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_60%)]" />
                  <div className="relative z-10 space-y-8 sm:space-y-10">
                    <div>
                      <h2 className="text-3xl font-black text-white mb-2">Your career path</h2>
                      <p className="text-zinc-200">What type of roles interest you?</p>

                      {/* Progress Helper */}
                      <div className="mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 p-4 shadow-glow-subtle">
                        <h3 className="text-sm font-bold text-white/80 mb-2">Required for next step:</h3>
                        <div className="space-y-1 text-sm">
                          <div className={`flex items-center gap-2 ${formData.careerPath ? 'text-brand-200' : 'text-zinc-300'}`}>
                            <span className={`w-2 h-2 rounded-full ${formData.careerPath ? 'bg-brand-400' : 'bg-zinc-500'}`}></span>
                            Career Path Selection
                          </div>
                          <div className={`flex items-center gap-2 ${formData.roles.length > 0 ? 'text-brand-200' : 'text-zinc-300'}`}>
                            <span className={`w-2 h-2 rounded-full ${formData.roles.length > 0 ? 'bg-brand-400' : 'bg-zinc-500'}`}></span>
                            Role Selection ({formData.roles.length}/1+ selected)
                          </div>
                        </div>
                      </div>
                    </div>

                <div>
                  <label className="block text-base font-bold text-white mb-4">Select Your Career Path *</label>
                  <p className="text-sm text-zinc-400 mb-6">Choose the career path that interests you most</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CAREER_PATHS.map(path => (
                      <motion.button
                        key={path.value}
                        type="button"
                        onClick={() => {
                          const newCareer = CAREER_PATHS.find(c => c.value === path.value);
                          if (newCareer) {
                            const validRoles = formData.roles.filter(role => newCareer.roles.includes(role));
                            setFormData({...formData, careerPath: path.value, roles: validRoles});
                          }
                        }}
                        whileHover={{ scale: 1.02, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative px-6 py-6 rounded-2xl border-2 transition-all text-left overflow-hidden group ${
                          formData.careerPath === path.value
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/15 shadow-glow-signup'
                            : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60'
                        }`}
                      >
                        {/* Background gradient on select */}
                        {formData.careerPath === path.value && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                        
                        <div className="relative flex items-start gap-4">
                          {/* Large emoji icon */}
                          <motion.div
                            className={`text-4xl sm:text-5xl ${
                              formData.careerPath === path.value ? 'scale-110' : ''
                            }`}
                            animate={formData.careerPath === path.value ? { scale: 1.1 } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {path.emoji}
                          </motion.div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-lg mb-1 ${
                              formData.careerPath === path.value ? 'text-white' : 'text-zinc-200'
                            }`}>
                              {path.label}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <BrandIcons.Briefcase className="w-3.5 h-3.5" />
                              <span>{path.roles.length} roles available</span>
                            </div>
                          </div>
                          
                          {/* Selection indicator */}
                          {formData.careerPath === path.value && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow-subtle"
                            >
                              <BrandIcons.Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        
                        {/* Glow effect on hover */}
                        {formData.careerPath !== path.value && (
                          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-purple-600/0 group-hover:from-brand-500/5 group-hover:to-purple-600/5 transition-all duration-300" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const selectedCareer = CAREER_PATHS.find(c => c.value === formData.careerPath);
                  if (!selectedCareer) return null;
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-purple-600/5"
                    >
                      <label className="block text-lg font-black text-white mb-4">
                        <span className="text-2xl mr-2">{selectedCareer.emoji}</span>
                        {selectedCareer.label} Roles
                        <span className="text-zinc-400 font-normal text-base ml-2">(Select at least one - required)</span>
                      </label>

                      {/* Select All / Clear All Controls */}
                      <div className="flex gap-2 mb-4">
                        <motion.button
                          type="button"
                          onClick={() => selectAllRoles(formData.careerPath)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-glow-subtle hover:shadow-glow-medium"
                          title={`Select all ${selectedCareer.roles.length} roles in ${selectedCareer.label}`}
                        >
                          Select All {selectedCareer.roles.length} Roles
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={clearAllRoles}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-semibold rounded-lg transition-colors"
                          title="Clear all selected roles"
                        >
                          Clear All
                        </motion.button>
                      </div>

                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedCareer.roles.map((role: string, idx: number) => (
                            <motion.button
                              key={role}
                              type="button"
                              onClick={() => setFormData({...formData, roles: toggleArray(formData.roles, role)})}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              whileHover={{ scale: 1.02, x: 2 }}
                              whileTap={{ scale: 0.98 }}
                              className={`px-4 py-3.5 rounded-xl border-2 transition-all font-semibold text-left text-sm relative overflow-hidden ${
                                formData.roles.includes(role)
                                  ? 'border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                  : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80'
                              }`}
                            >
                              {formData.roles.includes(role) && (
                                <motion.div
                                  layoutId="selected-role"
                                  className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-purple-600/10 -z-10"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                />
                              )}
                              <span className="flex items-center justify-between">
                                {role}
                                {formData.roles.includes(role) && (
                                  <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                    <div className="flex gap-4 pt-6">
                      <motion.button
                        onClick={() => setStep(2)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-secondary flex-1 py-5 text-lg"
                        disabled={loading}
                      >
                        ← Back
                      </motion.button>
                      <motion.button
                        onClick={() => setStep(4)}
                        disabled={!formData.careerPath || formData.roles.length === 0}
                        whileHover={{ scale: loading ? 1 : 1.03 }}
                        whileTap={{ scale: loading ? 1 : 0.97 }}
                        className="relative flex-1 py-6 sm:py-7 text-xl sm:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-2xl overflow-hidden"
                        style={{
                          background: loading ? 'linear-gradient(to right, #6366F1, #7C3AED, #8B5CF6)' : 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)',
                          boxShadow: '0 0 60px rgba(99,102,241,0.8), 0 20px 60px -18px rgba(99,102,241,0.9), inset 0 1px 0 rgba(255,255,255,0.3)',
                          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {!loading && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{
                              x: ['-200%', '200%']
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 1,
                              ease: "easeInOut"
                            }}
                          />
                        )}
                        <span className="relative z-10 text-white flex items-center justify-center gap-3">
                          {loading ? (
                            <>
                              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Finding Matches...</span>
                            </>
                          ) : (
                            <>
                              <span>→</span>
                              <span>{formData.careerPath && formData.roles.length === 0 ? 'Select Roles to Finish' : 'Complete Signup'}</span>
                              <motion.span
                                animate={{ x: [0, 4, 0] }}
                                transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                              >
                                →
                              </motion.span>
                            </>
                          )}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Matching Preferences */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#0d0425]/45 to-purple-600/15 px-5 py-6 sm:px-8 sm:py-8">
                  <div className="pointer-events-none absolute -top-28 right-8 h-52 w-52 rounded-full bg-brand-500/25 blur-[120px]" />
                  <div className="pointer-events-none absolute -bottom-24 left-6 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(136,84,255,0.12),transparent_60%)]" />
                  <div className="relative z-10 space-y-8 sm:space-y-10">
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-white mb-2 text-shadow-sm">Additional Preferences</h2>
                      <p className="text-zinc-200 mb-4">Optional - helps us match you even better</p>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (formData.gdprConsent) {
                            handleSubmit();
                          } else {
                            const gdprCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
                            if (gdprCheckbox) {
                              gdprCheckbox.focus();
                              gdprCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-brand-300 hover:text-brand-200 text-sm font-semibold underline"
                      >
                        Skip Optional Fields →
                      </motion.button>
                    </div>

                    {/* Industry Preferences */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white">Industry Preferences</h3>
                      <p className="text-sm text-zinc-200">Select industries you're interested in (optional)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {INDUSTRIES.map((industry) => (
                          <motion.button
                            key={industry}
                            type="button"
                            onClick={() => setFormData({...formData, industries: toggleArray(formData.industries, industry)})}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-3 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
                              formData.industries.includes(industry)
                                ? 'border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white'
                                : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80'
                            }`}
                          >
                            {industry}
                          </motion.button>
                        ))}
                      </div>
                      {formData.industries.length > 0 && (
                        <p className="text-sm text-zinc-200">
                          <span className="font-bold text-brand-200">{formData.industries.length}</span> industries selected
                        </p>
                      )}
                    </div>

                {/* Company Size Preference */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white"> Company Size Preference</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {COMPANY_SIZES.map((size) => (
                      <motion.button
                        key={size.value}
                        type="button"
                        onClick={() => setFormData({...formData, companySizePreference: size.value})}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-4 rounded-xl border-2 transition-all font-semibold text-left ${
                          formData.companySizePreference === size.value
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-glow-subtle'
                            : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{size.emoji}</span>
                          <span className="font-bold">{size.label}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Career Keywords */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Career Keywords</h3>
                  <p className="text-sm text-zinc-400">Describe what you're looking for in your own words (optional)</p>
                  <p className="text-xs text-zinc-400">Examples: "customer-facing", "data-driven", "creative problem-solving", "client interaction", "analytical work"</p>
                  <textarea
                    value={formData.careerKeywords}
                    onChange={(e) => setFormData({...formData, careerKeywords: e.target.value})}
                    placeholder="e.g., customer-facing roles, data-driven positions, creative problem-solving, client interaction..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-600 bg-zinc-900/70 text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-colors resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <FormFieldHelper 
                    characterCount={formData.careerKeywords.length}
                    maxLength={200}
                  />
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Skills & Technologies</h3>
                  <p className="text-sm text-zinc-400">Select skills you have or want to develop (optional)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {COMMON_SKILLS.map((skill) => (
                      <motion.button
                        key={skill}
                        type="button"
                        onClick={() => setFormData({...formData, skills: toggleArray(formData.skills, skill)})}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg border-2 transition-all font-medium text-xs ${
                          formData.skills.includes(skill)
                            ? 'border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white'
                            : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80'
                        }`}
                      >
                        {skill}
                      </motion.button>
                    ))}
                  </div>
                  {formData.skills.length > 0 && (
                    <p className="text-sm text-zinc-400">
                      <span className="font-bold text-brand-400">{formData.skills.length}</span> skills selected
                    </p>
                  )}
                </div>


                <div className="flex gap-4 pt-6">
                  <motion.button
                    onClick={() => setStep(3)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-secondary flex-1 py-5 text-lg"
                  >
                    ← Back
                  </motion.button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.03 }}
                    whileTap={{ scale: loading ? 1 : 0.97 }}
                    className="relative flex-1 py-6 sm:py-7 text-xl sm:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-2xl overflow-hidden"
                    style={{
                      background: loading ? 'linear-gradient(to right, #6366F1, #7C3AED, #8B5CF6)' : 'linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)',
                      boxShadow: '0 0 60px rgba(99,102,241,0.8), 0 20px 60px -18px rgba(99,102,241,0.9), inset 0 1px 0 rgba(255,255,255,0.3)',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? (
                      <>
                        <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Finding Matches...</span>
                      </>
                    ) : (
                      <>
                        <span>→</span>
                        <span>Find my matches</span>
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                        >
                          →
                        </motion.span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust Signals - PROMINENT */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-6 py-3 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
            <span className="text-sm font-bold text-zinc-300">
              {isLoadingStats ? (
                <span className="inline-block w-24 h-4 bg-zinc-600/20 rounded animate-pulse"></span>
              ) : (
                `${activeJobs} active early-career roles`
              )}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-sm text-zinc-400">Updated daily</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 px-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No CV required</span>
            </div>
            <span className="text-zinc-700">·</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Unsubscribe anytime</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}


