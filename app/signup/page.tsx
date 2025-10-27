'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams?.get('tier') as 'free' | 'premium' | null;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeJobs, setActiveJobs] = useState('9,769');
  const [tier] = useState<'free' | 'premium'>(tierParam === 'premium' ? 'premium' : 'free');
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
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.activeJobsFormatted) {
          setActiveJobs(data.activeJobsFormatted);
        }
      })
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome'];
  
  const LANGUAGES = ['English', 'French', 'German', 'Italian', 'Dutch', 'Spanish', 'Arabic', 'Portuguese'];
  
  // NEW CONSTANTS FOR BETTER MATCHING
  const INDUSTRIES = [
    'Technology', 'Finance', 'Consulting', 'Healthcare', 'Retail', 'Manufacturing', 
    'Energy', 'Media', 'Education', 'Government', 'Non-profit', 'Real Estate', 
    'Transportation', 'Automotive', 'Fashion', 'Food & Beverage', 'Travel', 'Other'
  ];
  
  const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup (1-50)', emoji: '🚀' },
    { value: 'scaleup', label: 'Scale-up (50-500)', emoji: '📈' },
    { value: 'enterprise', label: 'Enterprise (500+)', emoji: '🏢' },
    { value: 'any', label: 'Any Size', emoji: '🌟' }
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
      emoji: '📊', 
      roles: ['Business Analyst', 'Associate Consultant', 'Junior Consultant', 'Strategy Analyst', 'Consulting Intern', 'Junior Business Analyst', 'Transformation Analyst', 'Management Consulting Intern', 'Growth Consultant', 'Business Analyst Trainee', 'Junior Associate', 'Strategy Consultant', 'Digital Transformation Analyst', 'Operations Excellence Consultant', 'Business Strategy Intern']
    },
    { 
      value: 'finance', 
      label: 'Finance & Investment', 
      emoji: '💰', 
      roles: ['Financial Analyst', 'Finance Intern', 'Investment Banking Analyst', 'Risk Analyst', 'Audit Associate', 'Finance Trainee', 'FP&A Analyst', 'Credit Analyst', 'Investment Analyst', 'Junior Accountant', 'Corporate Finance Analyst', 'M&A Analyst', 'Treasury Analyst', 'Junior Tax Associate', 'Finance Graduate']
    },
    { 
      value: 'sales', 
      label: 'Sales & Client Success', 
      emoji: '🎯', 
      roles: ['Sales Development Representative (SDR)', 'Business Development Representative (BDR)', 'Inside Sales Representative', 'Account Executive', 'Business Development Associate', 'Sales Trainee', 'Customer Success Associate', 'Revenue Operations Analyst', 'Sales Operations Analyst', 'Graduate Sales Programme', 'Business Development Intern', 'Channel Sales Associate', 'Account Development Representative', 'Junior Sales Executive', 'Client Success Manager']
    },
    { 
      value: 'marketing', 
      label: 'Marketing & Growth', 
      emoji: '🚀', 
      roles: ['Marketing Intern', 'Social Media Intern', 'Digital Marketing Assistant', 'Marketing Coordinator', 'Growth Marketing Intern', 'Content Marketing Intern', 'Brand Assistant', 'Marketing Assistant', 'Junior Marketing Associate', 'Email Marketing Trainee', 'SEO/SEM Intern', 'Trade Marketing Intern', 'Marketing Graduate Programme', 'Junior B2B Marketing Coordinator', 'Marketing Campaign Assistant']
    },
    { 
      value: 'data', 
      label: 'Data & Analytics', 
      emoji: '📈', 
      roles: ['Data Analyst', 'Junior Data Analyst', 'Analytics Intern', 'Business Intelligence Intern', 'Data Analyst Trainee', 'Junior Data Scientist', 'Data Science Trainee', 'Junior Data Engineer', 'BI Engineer Intern', 'Analytics Associate', 'Data Analytics Graduate', 'Insights Analyst', 'Junior BI Developer', 'Data Assistant', 'Research & Analytics Intern']
    },
    { 
      value: 'operations', 
      label: 'Operations & Supply Chain', 
      emoji: '⚙️', 
      roles: ['Operations Analyst', 'Supply Chain Analyst', 'Logistics Analyst', 'Procurement Analyst', 'Operations Intern', 'Inventory Planner', 'Operations Coordinator', 'Supply Chain Trainee', 'Logistics Planning Graduate', 'Demand Planning Intern', 'Operations Management Trainee', 'Fulfilment Specialist', 'Sourcing Analyst', 'Process Improvement Analyst', 'Supply Chain Graduate']
    },
    { 
      value: 'product', 
      label: 'Product & Innovation', 
      emoji: '💡', 
      roles: ['Associate Product Manager (APM)', 'Product Analyst', 'Product Management Intern', 'Junior Product Manager', 'Product Operations Associate', 'Product Designer', 'UX Intern', 'Product Research Assistant', 'Innovation Analyst', 'Product Development Coordinator', 'Product Marketing Assistant', 'Product Owner Graduate', 'Assistant Product Manager', 'Product Strategy Intern', 'Technical Product Specialist']
    },
    { 
      value: 'tech', 
      label: 'Tech & Engineering', 
      emoji: '💻', 
      roles: ['Software Engineer Intern', 'Cloud Engineer Intern', 'DevOps Engineer Intern', 'Data Engineer Intern', 'Systems Analyst', 'IT Support Analyst', 'Application Support Analyst', 'Technology Analyst', 'QA/Test Analyst', 'Platform Engineer Intern', 'Cybersecurity Analyst', 'IT Operations Trainee', 'Technical Consultant', 'Solutions Engineer Graduate', 'IT Business Analyst']
    },
    { 
      value: 'sustainability', 
      label: 'Sustainability & ESG', 
      emoji: '🌱', 
      roles: ['ESG Intern', 'Sustainability Strategy Intern', 'Junior ESG Analyst', 'Sustainability Graduate Programme', 'ESG Data Analyst Intern', 'Corporate Responsibility Intern', 'Environmental Analyst', 'Sustainability Reporting Trainee', 'Climate Analyst', 'Sustainable Finance Analyst', 'ESG Assurance Intern', 'Sustainability Communications Intern', 'Junior Impact Analyst', 'Sustainability Operations Assistant', 'Green Finance Analyst']
    },
    { 
      value: 'unsure', 
      label: 'Not Sure Yet / General', 
      emoji: '🤔', 
      roles: ['Graduate Trainee', 'Rotational Graduate Program', 'Management Trainee', 'Business Graduate Analyst', 'Entry Level Program Associate', 'Future Leaders Programme', 'General Analyst', 'Operations Graduate', 'Commercial Graduate', 'Early Careers Program', 'Project Coordinator', 'Business Operations Analyst', 'Emerging Leaders Associate', 'Corporate Graduate Programme', 'Generalist Trainee']
    },
  ];

  const COMPANIES = ['Global Consulting Firms', 'Startups / Scaleups', 'Tech Giants', 'Investment Firms / VCs', 'Multinationals', 'Public Sector / NGOs', 'B2B SaaS', 'Financial Services'];

  const selectedCareer = CAREER_PATHS.find(c => c.value === formData.careerPath);


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

  const handleSubmit = async () => {
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
        router.push('/signup/success');
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 enhanced-grid opacity-30" aria-hidden="true" />
      <motion.div
        className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-20 left-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
        aria-hidden="true"
      />

      <div className="relative container-page max-w-4xl py-12 sm:py-20">
        {/* Header - DRAMATIC & LOUD */}
        <motion.div 
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1
          }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          {/* Large JobPing with graduation cap */}
          <motion.div 
            className="inline-flex items-center justify-center gap-4 sm:gap-5 mb-6"
            animate={{ 
              scale: [1, 1.05, 1],
              y: [0, -8, 0]
            }}
            transition={{ 
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 3,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          >
            <svg
              className="w-12 h-12 sm:w-14 sm:h-14 text-white flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l10 5-10 5L2 8l10-5z" />
              <path d="M22 10v4" />
              <path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
            </svg>
            <div className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-purple-50 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(139,92,246,0.8)]" style={{
              filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.6))'
            }}>
              JobPing
            </div>
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            Join 1,000+ Students Getting Their Dream Roles
          </h1>
          <p className="text-zinc-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-4">
            Fill out once. Get your first matches in 48 hours. Zero spam.
          </p>
          {tier === 'premium' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block bg-gradient-to-r from-brand-500 to-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm mb-2 shadow-[0_0_20px_rgba(99,102,241,0.6)]"
            >
              ✨ Premium Plan Selected - 10 roles on signup + 15 roles per week
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-brand-500 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2 rounded-full shadow-lg"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            {activeJobs} active roles • Updated daily
          </motion.div>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between mb-3 px-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.6)]' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {i < step ? '✓' : i}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-zinc-400">
                  {i === 1 ? 'Basics' : i === 2 ? 'Preferences' : 'Career'}
                </span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
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
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 md:p-12 shadow-[0_0_80px_rgba(99,102,241,0.3)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Basics */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-white mb-2">Let's get started</h2>
                  <p className="text-zinc-400">Tell us about yourself</p>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-base font-bold text-white mb-3">Full Name *</label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-5 py-4 bg-black/40 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-base font-bold text-white mb-3">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-4 bg-black/40 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">
                    Preferred Cities * <span className="text-zinc-500 font-normal">(Select up to 3)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {CITIES.map(city => (
                      <motion.button
                        key={city}
                        type="button"
                        onClick={() => {
                          if (formData.cities.length < 3 || formData.cities.includes(city)) {
                            setFormData({...formData, cities: toggleArray(formData.cities, city)});
                          }
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-3.5 rounded-xl border-2 transition-all font-semibold text-sm ${
                          formData.cities.includes(city)
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/60'
                        }`}
                      >
                        {city}
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">{formData.cities.length}/3 selected</p>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Languages (Professional Level) *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LANGUAGES.map(lang => (
                      <motion.button
                        key={lang}
                        type="button"
                        onClick={() => setFormData({...formData, languages: toggleArray(formData.languages, lang)})}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-3.5 rounded-xl border-2 transition-all font-semibold text-sm ${
                          formData.languages.includes(lang)
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/60'
                        }`}
                      >
                        {lang}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  onClick={() => setStep(2)}
                  disabled={!formData.fullName || !formData.email || formData.cities.length === 0 || formData.languages.length === 0}
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
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-white mb-2">Your preferences</h2>
                  <p className="text-zinc-400">Help us match you perfectly</p>

                  {/* Progress Helper */}
                  <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <h3 className="text-sm font-bold text-zinc-300 mb-2">Required for next step:</h3>
                    <div className="space-y-1 text-sm">
                      <div className={`flex items-center gap-2 ${formData.experience ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.experience ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                        Professional Experience
                      </div>
                      <div className={`flex items-center gap-2 ${formData.visaStatus ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.visaStatus ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                        Visa Status
                      </div>
                      <div className={`flex items-center gap-2 ${formData.entryLevelPreferences.length > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.entryLevelPreferences.length > 0 ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                        Entry Level Preferences ({formData.entryLevelPreferences.length}/1+ selected)
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Target Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-5 py-4 bg-black/40 border-2 border-zinc-700 rounded-xl text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Professional Experience *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['0', '6 months', '1 year', '1-2 years', '2 years', '3+ years'].map(exp => (
                      <motion.button
                        key={exp}
                        type="button"
                        onClick={() => setFormData({...formData, experience: exp})}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-3.5 rounded-xl border-2 transition-all font-semibold ${
                          formData.experience === exp
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {exp}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Work Environment</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Office', 'Hybrid', 'Remote'].map(env => (
                      <motion.button
                        key={env}
                        type="button"
                        onClick={() => setFormData({...formData, workEnvironment: toggleArray(formData.workEnvironment, env)})}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-3.5 rounded-xl border-2 transition-all font-semibold ${
                          formData.workEnvironment.includes(env)
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {env}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Work Authorization *</label>
                  <div className="space-y-2">
                    {[
                      'EU citizen',
                      'UK citizen',
                      'Dual EU & UK citizenship',
                      'Non-EU (require sponsorship)',
                      'Non-UK (require sponsorship)',
                      'Student Visa'
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
                  <div className="grid grid-cols-2 gap-3">
                    {['Internship', 'Graduate Programmes', 'Entry Level', 'Not sure yet'].map(pref => (
                      <motion.button
                        key={pref}
                        type="button"
                        onClick={() => setFormData({...formData, entryLevelPreferences: toggleArray(formData.entryLevelPreferences, pref)})}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-5 py-4 rounded-xl border-2 transition-all font-semibold ${
                          formData.entryLevelPreferences.includes(pref)
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {pref}
                      </motion.button>
                    ))}
                  </div>
                  {formData.entryLevelPreferences.length > 0 && (
                    <p className="text-sm text-zinc-400 mt-2">
                      <span className="font-bold text-brand-400">{formData.entryLevelPreferences.length}</span> selected
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
                        ? 'opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-500'
                        : 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:shadow-[0_0_40px_rgba(99,102,241,0.8)] hover:scale-105'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {(!formData.experience || !formData.visaStatus || formData.entryLevelPreferences.length === 0)
                      ? 'Complete Required Fields'
                      : 'Continue to Career Path →'}
                  </motion.button>
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
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-white mb-2">Your career path</h2>
                  <p className="text-zinc-400">What type of roles interest you?</p>

                  {/* Progress Helper */}
                  <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <h3 className="text-sm font-bold text-zinc-300 mb-2">Required for next step:</h3>
                    <div className="space-y-1 text-sm">
                      <div className={`flex items-center gap-2 ${formData.careerPath ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.careerPath ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                        Career Path Selection
                      </div>
                      <div className={`flex items-center gap-2 ${formData.roles.length > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.roles.length > 0 ? 'bg-green-400' : 'bg-zinc-500'}`}></span>
                        Role Selection ({formData.roles.length}/1+ selected)
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-4">Select Your Career Path *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CAREER_PATHS.map(path => (
                      <motion.button
                        key={path.value}
                        type="button"
                        onClick={() => {
                          const newCareer = CAREER_PATHS.find(c => c.value === path.value);
                          if (newCareer) {
                            // Only keep roles that belong to the newly selected career path
                            const validRoles = formData.roles.filter(role => newCareer.roles.includes(role));
                            setFormData({...formData, careerPath: path.value, roles: validRoles});
                          }
                        }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-5 py-5 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                          formData.careerPath === path.value
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/15 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                            : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{path.emoji}</span>
                          <div className="flex-1">
                            <div className={`font-bold text-base ${formData.careerPath === path.value ? 'text-white' : 'text-zinc-200'}`}>
                              {path.label}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">{path.roles.length} roles</div>
                          </div>
                          {formData.careerPath === path.value && (
                            <div className="text-brand-400 text-2xl">✓</div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {selectedCareer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-purple-600/5"
                  >
                    <label className="block text-lg font-black text-white mb-4">
                      <span className="text-2xl mr-2">{selectedCareer.emoji}</span>
                      {selectedCareer.label} Roles
                      <span className="text-zinc-500 font-normal text-base ml-2">(Select at least one - required)</span>
                    </label>

                    {/* Select All / Clear All Controls */}
                    <div className="flex gap-2 mb-4">
                      <motion.button
                        type="button"
                        onClick={() => selectAllRoles(formData.careerPath)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-[0_0_8px_rgba(99,102,241,0.3)] hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                        title={`Select all ${selectedCareer.roles.length} roles in ${selectedCareer.label}`}
                      >
                        ✅ Select All {selectedCareer.roles.length} Roles
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={clearAllRoles}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-semibold rounded-lg transition-colors"
                        title="Clear all selected roles"
                      >
                        🗑️ Clear All
                      </motion.button>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCareer.roles.map((role, idx) => (
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
                                <span className="text-brand-400 ml-2">✓</span>
                              )}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    {formData.roles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 pt-4 border-t border-zinc-700"
                      >
                        <p className="text-sm text-zinc-400">
                          <span className="font-bold text-brand-400">{formData.roles.length} role{formData.roles.length > 1 ? 's' : ''}</span> selected
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

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
                          <span>🎯</span>
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
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-black text-white mb-2">Additional Preferences</h2>
                  <p className="text-zinc-400">Optional - helps us match you even better</p>
                </div>

                {/* Industry Preferences */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">🏢 Industry Preferences</h3>
                  <p className="text-sm text-zinc-400">Select industries you're interested in (optional)</p>
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
                    <p className="text-sm text-zinc-400">
                      <span className="font-bold text-brand-400">{formData.industries.length}</span> industries selected
                    </p>
                  )}
                </div>

                {/* Company Size Preference */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">📊 Company Size Preference</h3>
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
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
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
                  <h3 className="text-xl font-bold text-white">🎯 Career Keywords</h3>
                  <p className="text-sm text-zinc-400">Describe what you're looking for in your own words (optional)</p>
                  <p className="text-xs text-zinc-500">Examples: "customer-facing", "data-driven", "creative problem-solving", "client interaction", "analytical work"</p>
                  <textarea
                    value={formData.careerKeywords}
                    onChange={(e) => setFormData({...formData, careerKeywords: e.target.value})}
                    placeholder="e.g., customer-facing roles, data-driven positions, creative problem-solving, client interaction..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-700 bg-zinc-900/60 text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none transition-colors resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-zinc-500">{formData.careerKeywords.length}/200 characters</p>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">💻 Skills & Technologies</h3>
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

                {/* GDPR Consent */}
                <div className="bg-zinc-900/60 border-2 border-zinc-700 rounded-xl p-6">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.gdprConsent}
                      onChange={(e) => setFormData({...formData, gdprConsent: e.target.checked})}
                      className="mt-1 w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer"
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
                    disabled={loading || !formData.gdprConsent}
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
                        <span>🚀</span>
                        <span>Get My 10 Roles</span>
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
              {activeJobs} active early-career roles
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-sm text-zinc-400">Updated daily</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 px-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No CV required</span>
            </div>
            <span className="text-zinc-700">•</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No spam</span>
            </div>
            <span className="text-zinc-700">•</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Cancel anytime</span>
            </div>
            <span className="text-zinc-700">•</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>GDPR compliant</span>
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
