'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/components/ui/useReducedMotion';
import { BrandIcons } from '@/components/ui/BrandIcons';
import Button from '@/components/ui/Button';
import { FormFieldError, FormFieldSuccess } from '@/components/ui/FormFieldFeedback';
import { useEmailValidation, useRequiredValidation } from '@/hooks/useFormValidation';
import EuropeMap from '@/components/ui/EuropeMap';
import { showToast } from '@/lib/toast';
import { useStats } from '@/hooks/useStats';

const CAREER_PATHS = [
  { value: 'finance', label: 'Finance & Investment', emoji: '💰' },
  { value: 'tech', label: 'Tech & Engineering', emoji: '💻' },
  { value: 'strategy', label: 'Strategy & Consulting', emoji: '📊' },
  { value: 'marketing', label: 'Marketing & Growth', emoji: '📱' },
  { value: 'sales', label: 'Sales & Client Success', emoji: '💬' },
  { value: 'operations', label: 'Operations & Supply Chain', emoji: '⚙️' },
  { value: 'data', label: 'Data & Analytics', emoji: '📈' },
  { value: 'product', label: 'Product & Innovation', emoji: '🚀' },
];

const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Belfast', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw'];

export function SignupFormFree() {
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

  // Form validation hooks
  const emailValidation = useEmailValidation(formData.email);
  const nameValidation = useRequiredValidation(formData.fullName, 'Full name');
  const citiesValidation = useRequiredValidation(formData.cities, 'Preferred cities');

  // Fetch job count when both cities and career path are selected
  useEffect(() => {
    const fetchJobCount = async () => {
      if (formData.cities.length > 0 && formData.careerPath) {
        setIsLoadingJobCount(true);
        try {
          const response = await fetch('/api/preview-matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cities: formData.cities,
              careerPath: formData.careerPath,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setJobCount(data.count || 0);
          } else {
            setJobCount(null);
          }
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

  const toggleArray = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  const shouldShowError = (fieldName: string, hasValue: boolean, isValid: boolean) => {
    return touchedFields.has(fieldName) && hasValue && !isValid;
  };

  const isFormValid = 
    formData.cities.length > 0 && 
    formData.careerPath && 
    emailValidation.isValid && 
    nameValidation.isValid;

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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-zinc-400">
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
        </motion.div>

        {/* Single-Step Form Container - Simplified Design */}
        <div className="rounded-2xl sm:rounded-3xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-500/5 via-black/50 to-brand-500/5 p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(126,97,255,0.2)] backdrop-blur-xl">
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

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!isFormValid) {
                setTouchedFields(new Set(['cities', 'careerPath', 'email', 'fullName']));
                return;
              }
              
              setIsSubmitting(true);
              setError('');

              try {
                const response = await fetch('/api/signup/free', {
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
                  setError('You\'ve already tried Free! Want 10 more jobs this week? Upgrade to Premium for 15 jobs/week (3x more).');
                  setIsSubmitting(false);
                  return;
                }

                if (!response.ok) {
                  throw new Error(data.error || 'Signup failed');
                }

                // Show success animation
                setShowSuccess(true);
                showToast.success('Account created! Finding your matches...');
                
                // Redirect after animation
                setTimeout(() => router.push('/matches'), 2500);

              } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
                setIsSubmitting(false);
              }
            }} className="space-y-8">
              
              {/* Cities Selection with Map - KEPT AS REQUESTED */}
              <div>
                <label id="cities-label" htmlFor="cities-field" className="block text-base font-bold text-white mb-3">
                  Preferred Cities * <span className="text-zinc-400 font-normal text-sm">(Select up to 3)</span>
                </label>
                <p className="text-sm text-zinc-400 mb-3">
                  Choose up to 3 cities where you'd like to work. Click on the map to select.
                </p>
                
                {/* Interactive Europe Map - KEPT */}
                <motion.div
                  id="cities-field"
                  aria-labelledby="cities-label"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4 sm:mb-6 hidden sm:block"
                  onBlur={() => setTouchedFields(prev => new Set(prev).add('cities'))}
                >
                  <EuropeMap
                    selectedCities={formData.cities}
                    onCityClick={(city) => {
                      if (formData.cities.length < 3 || formData.cities.includes(city)) {
                        setFormData({...formData, cities: toggleArray(formData.cities, city)});
                        setTouchedFields(prev => new Set(prev).add('cities'));
                      }
                    }}
                    maxSelections={3}
                    className="w-full"
                  />
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
                        onClick={() => {
                          if (!isDisabled) {
                            setFormData({...formData, cities: toggleArray(formData.cities, city)});
                            setTouchedFields(prev => new Set(prev).add('cities'));
                          }
                        }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/15 text-white'
                            : isDisabled
                              ? 'border-zinc-800 bg-zinc-900/40 text-zinc-500 cursor-not-allowed'
                              : 'border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-zinc-600'
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

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-400">{formData.cities.length}/3 selected</p>
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
                      onClick={() => {
                        setFormData(prev => ({ ...prev, careerPath: path.value }));
                        setTouchedFields(prev => new Set(prev).add('careerPath'));
                      }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        formData.careerPath === path.value
                          ? 'border-brand-500 bg-brand-500/15 shadow-[0_0_20px_rgba(126,97,255,0.3)]'
                          : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-xl mb-1">{path.emoji}</div>
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
                >
                  {isLoadingJobCount ? (
                    <p className="text-sm text-zinc-400">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent mr-2" />
                      Checking available jobs...
                    </p>
                  ) : jobCount !== null ? (
                    <p className="text-sm text-zinc-400">
                      ✨ Based on your selections, we found{' '}
                      <span className="text-brand-400 font-semibold">{jobCount.toLocaleString()}</span>{' '}
                      {jobCount === 1 ? 'job' : 'jobs'} in {formData.cities.join(' and ')}
                    </p>
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
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      setTouchedFields(prev => new Set(prev).add('email'));
                    }}
                    placeholder="you@example.com"
                    className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-zinc-700"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
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
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, fullName: e.target.value }));
                      setTouchedFields(prev => new Set(prev).add('fullName'));
                    }}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-zinc-700"
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
                  {isSubmitting ? 'Finding Your Matches...' : 'Show Me My 5 Matches →'}
                </Button>
                
                <p className="text-xs text-center text-zinc-500 mt-4">
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
                className="rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/10 via-black/80 to-brand-500/10 p-12 max-w-md text-center backdrop-blur-xl"
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
                  className="text-zinc-400 mb-6"
                >
                  Finding your perfect matches...
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
