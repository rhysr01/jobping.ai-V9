'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BrandIcons } from '@/components/ui/BrandIcons';
import WorkEnvironmentSelector from '@/components/ui/WorkEnvironmentSelector';
import ExperienceTimeline from '@/components/ui/ExperienceTimeline';
import EntryLevelSelector from '@/components/ui/EntryLevelSelector';
import LanguageSelector from '@/components/ui/LanguageSelector';
import CalendarPicker from '@/components/ui/CalendarPicker';
import EuropeMap from '@/components/ui/EuropeMap';

function PreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const email = searchParams?.get('email');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    cities: [] as string[],
    languages: [] as string[],
    startDate: '',
    experience: '',
    workEnvironment: [] as string[],
    visaStatus: '',
    entryLevelPreferences: [] as string[],
    targetCompanies: [] as string[],
    careerPath: '',
    roles: [] as string[],
  });

  const CITIES = ['Dublin', 'London', 'Paris', 'Amsterdam', 'Manchester', 'Birmingham', 'Belfast', 'Madrid', 'Barcelona', 'Berlin', 'Hamburg', 'Munich', 'Zurich', 'Milan', 'Rome', 'Brussels', 'Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw'];
  const LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Polish', 'Swedish', 'Danish', 'Finnish', 'Czech', 'Romanian', 'Hungarian', 'Greek', 'Arabic'];
  const COMPANIES = ['Global Consulting Firms', 'Startups / Scaleups', 'Tech Giants', 'Investment Firms / VCs', 'Multinationals', 'Public Sector / NGOs', 'B2B SaaS', 'Financial Services'];

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid access token. Please use the link from your email.');
      setLoading(false);
      return;
    }

    // Verify token and load user data
    fetch(`/api/preferences?token=${token}&email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUserData(data.user);
          setFormData({
            cities: data.user.target_cities || [],
            languages: data.user.languages || [],
            startDate: data.user.start_date || '',
            experience: data.user.experience || '',
            workEnvironment: data.user.work_environment || [],
            visaStatus: data.user.visa_status || '',
            entryLevelPreferences: data.user.entry_level_preference || [],
            targetCompanies: data.user.company_types || [],
            careerPath: data.user.professional_expertise || '',
            roles: data.user.roles || [],
          });
        } else {
          setError(data.error || 'Failed to load preferences');
        }
      })
      .catch(err => {
        const errorMessage = 'Unable to load preferences. Please check your connection and try again.';
        setError(errorMessage);
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [token, email]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          ...formData
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorMessage = result.error || 'Unable to save preferences. Please check your information and try again.';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Unable to connect. Please check your internet connection and try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleArray = (arr: string[], value: string) => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading preferences...</div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Link href="/" className="text-brand-400 hover:text-brand-300 underline">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="container-page max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black mb-2">Update Your Preferences</h1>
          <p className="text-zinc-400">Keep your job matches relevant to your goals</p>
        </motion.div>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-green-500/10 border-2 border-green-500/50 rounded-xl text-green-400"
          >
            Preferences saved successfully!
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="glass-card rounded-3xl p-8 space-y-8">
          {/* Cities */}
          <div>
            <label className="block text-base font-bold text-white mb-3">
              Preferred Cities <span className="text-zinc-400 font-normal">(Select up to 3)</span>
            </label>
            <EuropeMap
              selectedCities={formData.cities}
              onCityClick={(city) => {
                if (formData.cities.length < 3 || formData.cities.includes(city)) {
                  setFormData({...formData, cities: toggleArray(formData.cities, city)});
                }
              }}
              maxSelections={3}
              className="w-full mb-4"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-base font-bold text-white mb-3">Languages</label>
            <LanguageSelector
              languages={LANGUAGES}
              selected={formData.languages}
              onChange={(lang) => setFormData({...formData, languages: toggleArray(formData.languages, lang)})}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-base font-bold text-white mb-3">Target Start Date</label>
            <CalendarPicker
              value={formData.startDate}
              onChange={(date) => setFormData({...formData, startDate: date})}
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block text-base font-bold text-white mb-3">Professional Experience</label>
            <ExperienceTimeline
              selected={formData.experience}
              onChange={(exp) => setFormData({...formData, experience: exp})}
            />
          </div>

          {/* Work Environment */}
          <div>
            <label className="block text-base font-bold text-white mb-3">Work Environment</label>
            <WorkEnvironmentSelector
              selected={formData.workEnvironment}
              onChange={(env) => setFormData({...formData, workEnvironment: toggleArray(formData.workEnvironment, env)})}
            />
          </div>

          {/* Entry Level */}
          <div>
            <label className="block text-base font-bold text-white mb-3">Entry Level Preference</label>
            <EntryLevelSelector
              selected={formData.entryLevelPreferences}
              onChange={(pref) => setFormData({...formData, entryLevelPreferences: toggleArray(formData.entryLevelPreferences, pref)})}
            />
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              className="w-full bg-gradient-to-r from-brand-500 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </motion.button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-zinc-400 hover:text-white underline">
            Return to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading preferences...</div>
      </div>
    }>
      <PreferencesContent />
    </Suspense>
  );
}

