'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cities: [] as string[],
    languages: [] as string[],
    startDate: '',
    experience: '',
    workEnvironment: [] as string[],
    visaStatus: '',
    entryLevelPreference: '',
    targetCompanies: [] as string[],
    careerPath: '',
    roles: [] as string[],
  });

  const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome'];
  
  const LANGUAGES = ['English', 'French', 'German', 'Italian', 'Dutch', 'Spanish', 'Arabic', 'Portuguese'];
  
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

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        {/* Header with Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="text-5xl sm:text-6xl md:text-7xl font-black mb-4 bg-gradient-to-b from-white via-purple-50 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(139,92,246,0.6)]">
            JobPing
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
            Join 1,000+ Students Finding Their Dream Roles
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Fill out once. Get 10 hand-picked roles in 48 hours. Zero spam.
          </p>
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
                  <label className="block text-base font-bold text-white mb-3">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-5 py-4 bg-black/40 border-2 border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all text-lg"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-3">Email *</label>
                  <input
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
                        onClick={() => formData.cities.length < 3 || formData.cities.includes(city) ? setFormData({...formData, cities: toggleArray(formData.cities, city)}) : null}
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
                        onClick={() => setFormData({...formData, entryLevelPreference: pref})}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-5 py-4 rounded-xl border-2 transition-all font-semibold ${
                          formData.entryLevelPreference === pref
                            ? 'border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {pref}
                      </motion.button>
                    ))}
                  </div>
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
                    disabled={!formData.experience || !formData.visaStatus || !formData.entryLevelPreference}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex-1 py-5 text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Continue →
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
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-4">Select Your Career Path *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CAREER_PATHS.map(path => (
                      <motion.button
                        key={path.value}
                        type="button"
                        onClick={() => setFormData({...formData, careerPath: path.value, roles: []})}
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
                  >
                    <label className="block text-base font-bold text-white mb-4">
                      {selectedCareer.label} Roles <span className="text-zinc-500 font-normal">(Select what interests you)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCareer.roles.map(role => (
                        <motion.button
                          key={role}
                          type="button"
                          onClick={() => setFormData({...formData, roles: toggleArray(formData.roles, role)})}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-left text-sm ${
                            formData.roles.includes(role)
                              ? 'border-brand-500 bg-brand-500/15 text-white'
                              : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600'
                          }`}
                        >
                          {role}
                        </motion.button>
                      ))}
                    </div>
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
                    onClick={handleSubmit}
                    disabled={!formData.careerPath || loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="btn-primary flex-1 py-5 text-xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide shadow-[0_12px_40px_rgba(99,102,241,0.6)]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                        Finding Matches...
                      </span>
                    ) : (
                      'Get My 10 Roles'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trust Signals */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            9,769 active early-career roles • Updated daily
          </div>
          <p className="text-xs text-zinc-600">
            No CV required • No spam • Cancel anytime • GDPR compliant
          </p>
        </motion.div>
      </div>
    </div>
  );
}
