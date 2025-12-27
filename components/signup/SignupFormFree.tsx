'use client';

import { useState, useEffect, useCallback, useMemo, ChangeEvent, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/components/ui/useReducedMotion';
import { BrandIcons } from '@/components/ui/BrandIcons';
import Button from '@/components/ui/Button';
import { FormFieldError, FormFieldSuccess } from '@/components/ui/FormFieldFeedback';
import { useEmailValidation, useRequiredValidation } from '@/hooks/useFormValidation';
import { showToast } from '@/lib/toast';
import { useStats } from '@/hooks/useStats';
import { apiCall, apiCallJson, ApiError } from '@/lib/api-client';
import AriaLiveRegion from '@/components/ui/AriaLiveRegion';
import { trackEvent } from '@/lib/analytics';

// Code split EuropeMap for better performance
const EuropeMap = dynamic(() => import('@/components/ui/EuropeMap'), {
  loading: () => (
    <div className="w-full h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px] rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-300 text-sm">Loading map...</p>
      </div>
    </div>
  ),
  ssr: false, // Map is interactive, no need for SSR
});

const CAREER_PATHS = [
  { value: 'finance', label: 'Finance & Investment' },
  { value: 'tech', label: 'Tech & Engineering' },
  { value: 'strategy', label: 'Strategy & Consulting' },
  { value: 'marketing', label: 'Marketing & Growth' },
  { value: 'sales', label: 'Sales & Client Success' },
  { value: 'operations', label: 'Operations & Supply Chain' },
  { value: 'data', label: 'Data & Analytics' },
  { value: 'product', label: 'Product & Innovation' },
];

const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Belfast', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw'];

export default function SignupFormFree() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const prefersReduced = useReducedMotion();
  const { stats, isLoading: isLoadingStats } = useStats();
  
  const [formData, setFormData] = useState({
    cities: [] as string[],
    careerPath: '',
    email: '',
    fullName: '',
  });

  const [jobCount, setJobCount] = useState<number | null>(null);
  const [isLoadingJobCount, setIsLoadingJobCount] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Form validation hooks
  const emailValidation = useEmailValidation(formData.email);
  const nameValidation = useRequiredValidation(formData.fullName, 'Full name');
  const citiesValidation = useRequiredValidation(formData.cities, 'Preferred cities');

  // Memoized helper functions
  const toggleArray = useCallback((arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  }, []);

  const shouldShowError = useCallback((fieldName: string, hasValue: boolean, isValid: boolean) => {
    // Show error if:
    // 1. Field was touched (blurred at least once)
    // 2. Field has value AND is invalid
    // OR
    // 3. Field has value longer than 3 chars and is invalid (show during typing)
    
    if (fieldName === 'email' && hasValue && !isValid) {
      // For email, show error after @ is typed
      return formData.email.includes('@') && formData.email.length > 3;
    }
    
    if (fieldName === 'fullName' && hasValue && !isValid) {
      // For name, show error after 3 characters typed
      return formData.fullName.length > 3;
    }
    
    return touchedFields.has(fieldName) && hasValue && !isValid;
  }, [touchedFields, formData.email, formData.fullName]);

  // Track when user completes step 1 (cities + career path selected)
  useEffect(() => {
    if (formData.cities.length > 0 && formData.careerPath) {
      trackEvent('signup_step_completed', { 
        step: 1, 
        cities: formData.cities.length,
        career_path: formData.careerPath,
      });
    }
  }, [formData.cities.length, formData.careerPath]);

  // Fetch job count when both cities and career path are selected
  useEffect(() => {
    const fetchJobCount = async () => {
      if (formData.cities.length > 0 && formData.careerPath) {
        setIsLoadingJobCount(true);
        try {
          const data = await apiCallJson<{ count?: number }>('/api/preview-matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cities: formData.cities,
              careerPath: formData.careerPath,
            }),
          });
          setJobCount(data.count || 0);
        } catch (error) {
          console.error('Failed to fetch job count:', error);
          setJobCount(null);
        } finally {
          setIsLoadingJobCount(false);
        }
      } else {
        setJobCount(null);
      }
    };

    // Debounce the API call slightly to avoid too many requests
    const timeoutId = setTimeout(fetchJobCount, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.cities, formData.careerPath]);

  // Countdown and redirect on success
  useEffect(() => {
    if (showSuccess) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            router.push('/matches');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [showSuccess, router]);

  // Calculate form completion percentage
  const formProgress = useMemo(() => {
    let completed = 0;
    if (formData.cities.length > 0) completed++;
    if (formData.careerPath) completed++;
    if (formData.email && emailValidation.isValid) completed++;
    if (formData.fullName && nameValidation.isValid) completed++;
    return (completed / 4) * 100;
  }, [formData, emailValidation.isValid, nameValidation.isValid]);

  // Memoized computed values
  const isFormValid = useMemo(() => 
    formData.cities.length > 0 && 
    formData.careerPath && 
    emailValidation.isValid && 
    nameValidation.isValid,
    [formData.cities.length, formData.careerPath, emailValidation.isValid, nameValidation.isValid]
  );

  // Memoized event handlers
  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, email: e.target.value }));
    setTouchedFields(prev => new Set(prev).add('email'));
  }, []);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, fullName: e.target.value }));
    setTouchedFields(prev => new Set(prev).add('fullName'));
  }, []);

  const handleCityClick = useCallback((city: string) => {
    setFormData(prev => {
      if (prev.cities.length < 3 || prev.cities.includes(city)) {
        return { ...prev, cities: toggleArray(prev.cities, city) };
      }
      return prev;
    });
    setTouchedFields(prev => new Set(prev).add('cities'));
  }, [toggleArray]);

  const handleCityToggle = useCallback((city: string) => {
    setFormData(prev => {
      const isDisabled = !prev.cities.includes(city) && prev.cities.length >= 3;
      if (!isDisabled) {
        return { ...prev, cities: toggleArray(prev.cities, city) };
      }
      return prev;
    });
    setTouchedFields(prev => new Set(prev).add('cities'));
  }, [toggleArray]);

  const handleCareerPathChange = useCallback((pathValue: string) => {
    setFormData(prev => ({ ...prev, careerPath: pathValue }));
    setTouchedFields(prev => new Set(prev).add('careerPath'));
  }, []);

  const handleCitiesBlur = useCallback(() => {
    setTouchedFields(prev => new Set(prev).add('cities'));
  }, []);

  const handleFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    if (!isFormValid) {
      setTouchedFields(new Set(['cities', 'careerPath', 'email', 'fullName']));
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    // Track signup started
    trackEvent('signup_started', { tier: 'free' });

    try {
      const response = await apiCall('/api/signup/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName,
          preferred_cities: formData.cities,
          career_paths: [formData.careerPath],
          entry_level_preferences: ['graduate', 'intern', 'junior'],
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        trackEvent('signup_failed', { tier: 'free', error: 'already_exists' });
        setError('You\'ve already tried Free! Want 10 more jobs this week? Upgrade to Premium for 15 jobs/week (3x more).');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Track successful signup
      trackEvent('signup_completed', { 
        tier: 'free',
        cities: formData.cities.length,
        career_path: formData.careerPath,
      });

      // Show success animation
      setShowSuccess(true);
      setCountdown(3);
      showToast.success('Account created! Finding your matches...');

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : err instanceof Error 
          ? err.message 
          : 'Something went wrong. Please try again.';
      
      trackEvent('signup_failed', { 
        tier: 'free', 
        error: errorMessage 
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false); // Always reset submission state
    }
  }, [isFormValid, formData, router, isSubmitting]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-safe">
      {/* Simplified Background Effects */}
      <div className="absolute inset-0 enhanced-grid opacity-20" aria-hidden="true" />
      <motion.div
        className="absolute top-20 right-10 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl hidden sm:block"
        animate={prefersReduced ? { scale: 1, opacity: 0.2 } : { scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
        aria-hidden="true"
      />

      <div className="relative z-10 container-page max-w-4xl py-8 px-4 sm:py-12 sm:px-6 md:py-16">
        {/* Simplified Header - Quick Signup Focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200 mb-4">
            <BrandIcons.Zap className="h-3 w-3" />
            Quick Signup - 60 Seconds
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white">
            See 5 Perfect Matches Instantly
          </h1>
          <p className="mt-3 text-base sm:text-lg font-medium text-zinc-300 px-2">
            No email spam. No commitment. Just great jobs.
          </p>

          {/* Quick Stats - Simplified */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <BrandIcons.Zap className="h-4 w-4 text-brand-400" />
              Instant results
            </span>
            <span className="inline-flex items-center gap-2">
              <BrandIcons.Check className="h-4 w-4 text-brand-400" />
              Zero emails
            </span>
            <span className="inline-flex items-center gap-2">
              <BrandIcons.Clock className="h-4 w-4 text-brand-400" />
              Under 60 seconds
            </span>
          </div>

          {/* Progress Indicator */}
          {formProgress > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Progress</span>
                <span className="text-xs font-semibold text-brand-300">{Math.round(formProgress)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${formProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Single-Step Form Container - Simplified Design */}
        <div className="rounded-2xl sm:rounded-3xl border-2 border-brand-500/25 bg-gradient-to-br from-brand-500/4 via-black/50 to-brand-500/4 p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(109,90,143,0.15)] backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-center"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-8">
              {/* ARIA Live Region for form status updates */}
              <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true"
                className="sr-only"
              >
                {isLoadingJobCount && 'Searching for jobs...'}
                {jobCount !== null && !isLoadingJobCount && `Found ${jobCount} jobs matching your preferences`}
                {emailValidation.error && `Email error: ${emailValidation.error}`}
              </div>
              
              {/* Cities Selection with Map - KEPT AS REQUESTED */}
              <div>
                <label id="cities-label" htmlFor="cities-field" className="block text-base font-bold text-white mb-3">
                  Preferred Cities * <span className="text-zinc-300 font-normal text-sm">(Select up to 3)</span>
                </label>
                <p className="text-sm text-zinc-300 mb-3">
                  Choose up to 3 cities where you'd like to work. Click on the map to select.
                </p>
                
                {/* Interactive Europe Map - KEPT */}
                <motion.div
                  id="cities-field"
                  aria-labelledby="cities-label"
                  role="group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4 sm:mb-6 hidden sm:block"
                  onBlur={handleCitiesBlur}
                >
                  <Suspense fallback={
                    <div className="w-full h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px] rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center" aria-label="Loading city selection map">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
                        <p className="text-zinc-300 text-sm">Loading map...</p>
                      </div>
                    </div>
                  }>
                    <EuropeMap
                      selectedCities={formData.cities}
                      onCityClick={isSubmitting ? () => {} : handleCityClick}
                      maxSelections={3}
                      className="w-full"
                    />
                  </Suspense>
                </motion.div>

                {/* Mobile-friendly city chips */}
                <div className="grid grid-cols-2 gap-2 sm:hidden" role="group" aria-labelledby="cities-label">
                  {CITIES.map(city => {
                    const isSelected = formData.cities.includes(city);
                    const isDisabled = !isSelected && formData.cities.length >= 3;
                    return (
                      <motion.button
                        key={city}
                        type="button"
                        onClick={() => handleCityToggle(city)}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/15 text-white'
                            : isDisabled || isSubmitting
                              ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300 cursor-not-allowed'
                              : 'border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600'
                        }`}
                        disabled={isDisabled || isSubmitting}
                      >
                        <span>{city}</span>
                        <span className={`text-xs font-semibold ${isSelected ? 'text-brand-200' : 'text-zinc-300'}`}>
                          {isSelected ? 'Selected' : 'Tap'}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-300">{formData.cities.length}/3 selected</p>
                  {formData.cities.length > 0 && citiesValidation.isValid && (
                    <FormFieldSuccess message={`${formData.cities.length} ${formData.cities.length === 1 ? 'city' : 'cities'} selected`} id="cities-success" />
                  )}
                </div>
                {shouldShowError('cities', formData.cities.length === 0, citiesValidation.isValid) && (
                  <FormFieldError error="Please select at least one city." id="cities-error" />
                )}
              </div>

              {/* Career Path */}
              <div>
                <label className="block text-base font-bold text-white mb-3">
                  What's your career interest? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CAREER_PATHS.map((path) => (
                    <motion.button
                      key={path.value}
                      type="button"
                      onClick={() => handleCareerPathChange(path.value)}
                      whileTap={{ scale: 0.97 }}
                      disabled={isSubmitting}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        formData.careerPath === path.value
                          ? 'border-brand-500 bg-brand-500/12 shadow-[0_0_20px_rgba(109,90,143,0.2)]'
                          : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="font-medium text-xs text-white">{path.label}</span>
                    </motion.button>
                  ))}
                </div>
                {!formData.careerPath && touchedFields.has('careerPath') && (
                  <FormFieldError error="Please select a career interest." id="careerPath-error" />
                )}
              </div>

              {/* Job Count Preview */}
              {formData.cities.length > 0 && formData.careerPath && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-4"
                  role="status"
                  aria-live="polite"
                >
                  {isLoadingJobCount ? (
                    <>
                      <AriaLiveRegion level="polite">Checking available jobs in selected cities</AriaLiveRegion>
                      <p className="text-sm text-zinc-300">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mr-2" aria-hidden="true" />
                        Checking available jobs...
                      </p>
                    </>
                  ) : jobCount !== null ? (
                    <>
                      <AriaLiveRegion level="polite">
                        Found {jobCount.toLocaleString()} {jobCount === 1 ? 'job' : 'jobs'} in {formData.cities.join(' and ')}
                      </AriaLiveRegion>
                      <p className="text-sm text-zinc-300">
                        Based on your selections, we found{' '}
                        <span className="text-brand-400 font-semibold">{jobCount.toLocaleString()}</span>{' '}
                        {jobCount === 1 ? 'job' : 'jobs'} in {formData.cities.join(' and ')}
                      </p>
                    </>
                  ) : null}
                </motion.div>
              )}

              {/* Email and Name - Combined Section */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-base font-bold text-white mb-3">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={formData.email}
                    onChange={handleEmailChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-zinc-300 mt-2">
                    We won't email you. Ever.
                  </p>
                  {shouldShowError('email', !!formData.email, emailValidation.isValid) && (
                    <FormFieldError error={emailValidation.error || 'Invalid email'} id="email-error" />
                  )}
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-base font-bold text-white mb-3">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={formData.fullName}
                    onChange={handleNameChange}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {shouldShowError('fullName', !!formData.fullName, nameValidation.isValid) && (
                    <FormFieldError error={nameValidation.error || 'Name is required'} id="fullName-error" />
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !isFormValid}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Show Me My 5 Matches →'}
                </Button>
                
                <p className="text-xs text-center text-zinc-300 mt-4">
                  <span className="text-brand-400 font-semibold">Quick & Free</span> · No credit card required · Instant results
                </p>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Success Animation Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-500/8 via-black/80 to-brand-500/8 p-12 max-w-md text-center backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mb-6"
                >
                  <BrandIcons.CheckCircle className="h-20 w-20 text-brand-500 mx-auto" />
                </motion.div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-white mb-3"
                >
                  Account Created!
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-zinc-300 mb-6"
                >
                  Finding your perfect matches...
                </motion.p>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-zinc-300 text-sm"
                >
                  Redirecting in {countdown}s...
                </motion.p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.4, duration: 1.5 }}
                  className="h-2 bg-zinc-800 rounded-full overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.4, duration: 1.5 }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
