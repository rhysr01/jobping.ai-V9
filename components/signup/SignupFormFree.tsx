'use client';

import { useState } from 'react';
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
import * as Copy from '@/lib/copy';

type Step = 1 | 2;

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
  const [step, setStep] = useState<Step>(1);
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

  // Form validation hooks
  const emailValidation = useEmailValidation(formData.email);
  const nameValidation = useRequiredValidation(formData.fullName, 'Full name');
  const citiesValidation = useRequiredValidation(formData.cities, 'Preferred cities');

  const toggleArray = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  const shouldShowError = (fieldName: string, hasValue: boolean, isValid: boolean) => {
    return (touchedFields.has(fieldName) || step === 1) && hasValue && !isValid;
  };

  // STEP 1: Career Preferences
  if (step === 1) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden pb-safe">
        {/* Background Effects - Match original */}
        <div className="absolute inset-0 enhanced-grid opacity-30" aria-hidden="true" />
        <motion.div
          className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block"
          animate={prefersReduced ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
          aria-hidden="true"
        />
        <motion.div
          className="absolute bottom-20 left-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl hidden sm:block"
          animate={prefersReduced ? { scale: 1, opacity: 0.3 } : { scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: prefersReduced ? 0 : Infinity }}
          aria-hidden="true"
        />

        <div className="relative z-10 container-page max-w-5xl py-8 px-4 sm:py-16 sm:px-6 md:py-24">
          {/* Header - Match original style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center sm:mb-16 md:mb-20"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
              Free Signup
            </span>
            <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
              See 5 Perfect Matches in 60 Seconds
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-medium leading-relaxed text-zinc-100 px-2">
              No email spam. No commitment. Just great jobs.
            </p>

            {/* Reassurance Items */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-100">
              {Copy.REASSURANCE_ITEMS.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm"
                >
                  <BrandIcons.Check className="h-4 w-4 text-brand-300" />
                  {item}
                </span>
              ))}
            </div>

            {/* Stats Display */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-brand-100 backdrop-blur-sm">
                <BrandIcons.Target className="h-4 w-4 text-brand-300" />
                {isLoadingStats ? (
                  <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/15" />
                ) : (
                  `${stats?.activeJobs?.toLocaleString() || '12,748'} active jobs this week`
                )}
              </span>
              {!isLoadingStats && stats?.totalUsers && stats.totalUsers > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
                  <BrandIcons.Users className="h-4 w-4 text-brand-300" />
                  {`${stats.totalUsers.toLocaleString()}+ students on JobPing`}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
                <BrandIcons.Zap className="h-4 w-4 text-brand-300" />
                Instant matches, zero emails
              </span>
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-10 sm:mb-16">
            <div className="flex justify-between mb-3 sm:mb-4 px-1 sm:px-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-1 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all shadow-lg ${
                    i < step ? 'bg-green-500 text-white shadow-green-500/30' :
                    i === step ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]' :
                    'bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400'
                  }`}>
                    {i < step ? <BrandIcons.Check className="h-6 w-6" /> : i}
                  </div>
                  <span className="hidden sm:inline text-sm font-bold text-zinc-300">
                    {i === 1 ? 'Preferences' : 'Details'}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
              <motion.div 
                className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 2) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
            <div className="text-xs text-zinc-400 text-center mt-2">
              {Math.round((step / 2) * 100)}% complete
            </div>
          </div>

          {/* Form Container - Match original glass-card style */}
          <div className="glass-card rounded-2xl sm:rounded-3xl border-2 border-white/20 p-4 sm:p-6 md:p-8 lg:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Cities Selection with Map */}
              <div className="mb-8">
                <label id="cities-label" htmlFor="cities-field" className="block text-base font-bold text-white mb-3">
                  Preferred Cities * <span className="text-zinc-400 font-normal">(Select up to 3)</span>
                </label>
                <p className="text-sm text-zinc-400 mb-2">
                  Choose up to 3 cities where you'd like to work. Click on the map to select.
                </p>
                
                {/* Interactive Europe Map - Hidden on mobile */}
                <motion.div
                  id="cities-field"
                  aria-labelledby="cities-label"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 hidden sm:block"
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
                        className={`flex items-center justify-between rounded-xl border px-3 sm:px-4 py-3 sm:py-4 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/15 text-white shadow-glow-subtle'
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
              <div className="mb-8">
                <label className="block text-base font-bold text-white mb-3">
                  What's your career interest? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CAREER_PATHS.map((path) => (
                    <motion.button
                      key={path.value}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, careerPath: path.value }));
                        setTouchedFields(prev => new Set(prev).add('careerPath'));
                      }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        formData.careerPath === path.value
                          ? 'border-brand-500 bg-brand-500/15 shadow-glow-subtle'
                          : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-2xl mb-1">{path.emoji}</div>
                      <span className="font-medium text-sm text-white">{path.label}</span>
                    </motion.button>
                  ))}
                </div>
                {!formData.careerPath && touchedFields.has('careerPath') && (
                  <FormFieldError error="Please select a career interest." id="careerPath-error" />
                )}
              </div>

              <Button
                onClick={() => {
                  if (formData.cities.length > 0 && formData.careerPath) {
                    setStep(2);
                  } else {
                    setTouchedFields(prev => new Set([...prev, 'cities', 'careerPath']));
                  }
                }}
                disabled={formData.cities.length === 0 || !formData.careerPath}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Next: Enter Your Details →
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Contact Info
  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-safe">
      {/* Same background effects */}
      <div className="absolute inset-0 enhanced-grid opacity-30" aria-hidden="true" />
      <motion.div
        className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block"
        animate={prefersReduced ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
        aria-hidden="true"
      />

      <div className="relative z-10 container-page max-w-5xl py-8 px-4 sm:py-16 sm:px-6 md:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center sm:mb-16 md:mb-20"
        >
          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
            Almost there!
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-medium leading-relaxed text-zinc-100 px-2">
            We'll show you 5 perfect matches instantly. Zero emails sent.
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-10 sm:mb-16">
          <div className="flex justify-between mb-3 sm:mb-4 px-1 sm:px-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-1 sm:gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all shadow-lg ${
                  i < step ? 'bg-green-500 text-white shadow-green-500/30' :
                  i === step ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]' :
                  'bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400'
                }`}>
                  {i < step ? <BrandIcons.Check className="h-6 w-6" /> : i}
                </div>
                <span className="hidden sm:inline text-sm font-bold text-zinc-300">
                  {i === 1 ? 'Preferences' : 'Details'}
                </span>
              </div>
            ))}
          </div>
          <div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
            <motion.div 
              className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
          <div className="text-xs text-zinc-400 text-center mt-2">
            100% complete
          </div>
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
                className="glass-card elevation-3 p-12 max-w-md text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mb-6"
                >
                  <BrandIcons.CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
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
                    className="h-full bg-gradient-to-r from-brand-500 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.4, duration: 1.5 }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <div className="glass-card rounded-2xl sm:rounded-3xl border-2 border-white/20 p-4 sm:p-6 md:p-8 lg:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
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
            }}>
              <div className="space-y-6 mb-6">
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
                    className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation border-zinc-700"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    We won't email you. Ever. (Unless you upgrade to Premium)
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
                    className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation border-zinc-700"
                  />
                  {shouldShowError('fullName', !!formData.fullName, nameValidation.isValid) && (
                    <FormFieldError error={nameValidation.error || 'Name is required'} id="fullName-error" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !emailValidation.isValid || !nameValidation.isValid}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Finding Your Matches...' : 'Show Me My 5 Matches →'}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
              </div>
            </form>

            <p className="text-xs text-center text-zinc-500 mt-6">
              Based on: {formData.cities.join(', ')} · {CAREER_PATHS.find(p => p.value === formData.careerPath)?.label}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

