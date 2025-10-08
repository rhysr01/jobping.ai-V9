/**
 * Email Personalization Blocks
 * Dynamic content generation based on user behavior and preferences
 */

import { createClient } from '@supabase/supabase-js';
import { EmailJobCard } from './types';

export interface PersonalizationContext {
  userName?: string;
  subscriptionTier: 'free' | 'premium';
  engagementScore: number;
  preferredJobTypes: string[];
  savedCompanies: string[];
  recentActivity: any[];
  location: string;
  careerPath: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export interface PersonalizationBlock {
  type: 'greeting' | 'top_matches' | 'saved_companies' | 'fresh_internships' | 'career_insight' | 'call_to_action';
  content: string;
  priority: number;
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Generate personalized greeting based on context
 */
export function generatePersonalizedGreeting(context: PersonalizationContext): string {
  const { userName, timeOfDay, engagementScore, subscriptionTier } = context;
  
  const timeGreetings = {
    morning: ['Good morning', 'Morning', 'Rise and shine'],
    afternoon: ['Good afternoon', 'Afternoon', 'Hope you\'re having a great day'],
    evening: ['Good evening', 'Evening', 'Hope you had a productive day']
  };

  const baseGreeting = timeGreetings[timeOfDay][Math.floor(Math.random() * timeGreetings[timeOfDay].length)];
  const name = userName ? `, ${userName}` : '';
  
  if (subscriptionTier === 'premium') {
    return `${baseGreeting}${name}! ⭐ Your premium job matches are ready.`;
  } else if (engagementScore >= 70) {
    return `${baseGreeting}${name}! 🎯 Your personalized matches are here.`;
  } else {
    return `${baseGreeting}${name}! 👋 Here are your latest job opportunities.`;
  }
}

/**
 * Generate "Top 5 for your skills" block
 */
export function generateTopMatchesBlock(
  jobCards: EmailJobCard[], 
  context: PersonalizationContext
): PersonalizationBlock {
  const topMatches = jobCards.slice(0, 5);
  const { preferredJobTypes, engagementScore } = context;
  
  let content = '';
  
  if (preferredJobTypes.length > 0) {
    const jobTypeText = preferredJobTypes.slice(0, 2).join(' and ');
    content = `<div class="personalization-block">
      <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">🎯 Top 5 ${jobTypeText} roles for you</h3>
      <p style="color: #E5E5E5; margin-bottom: 20px;">Hand-picked based on your skills and preferences:</p>
    </div>`;
  } else if (engagementScore >= 60) {
    content = `<div class="personalization-block">
      <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">⭐ Your top matches</h3>
      <p style="color: #E5E5E5; margin-bottom: 20px;">AI-selected opportunities based on your profile:</p>
    </div>`;
  } else {
    content = `<div class="personalization-block">
      <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">🚀 Fresh opportunities</h3>
      <p style="color: #E5E5E5; margin-bottom: 20px;">Latest jobs matching your criteria:</p>
    </div>`;
  }

  return {
    type: 'top_matches',
    content,
    priority: 1
  };
}

/**
 * Generate "New from saved companies" block
 */
export async function generateSavedCompaniesBlock(
  userEmail: string, 
  context: PersonalizationContext
): Promise<PersonalizationBlock | null> {
  try {
    const supabase = getSupabaseClient();

    // Get saved companies (from feedback or implicit signals)
    const { data: savedCompanies } = await supabase
      .from('match_logs')
      .select('job_context')
      .eq('user_email', userEmail)
      .eq('match_quality', 'positive')
      .eq('match_algorithm', 'user_feedback')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    if (!savedCompanies || savedCompanies.length === 0) {
      return null;
    }

    // Extract company names
    const companies = new Set<string>();
    savedCompanies.forEach(feedback => {
      const company = feedback.job_context?.company;
      if (company) {
        companies.add(company);
      }
    });

    if (companies.size === 0) {
      return null;
    }

    // Get new jobs from these companies
    const companyList = Array.from(companies);
    const { data: newJobs } = await supabase
      .from('jobs')
      .select('*')
      .in('company', companyList)
      .eq('is_sent', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(3);

    if (!newJobs || newJobs.length === 0) {
      return null;
    }

    const content = `<div class="personalization-block">
      <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">💼 New from companies you liked</h3>
      <p style="color: #E5E5E5; margin-bottom: 20px;">${newJobs.length} fresh opportunities from companies you've shown interest in:</p>
      ${newJobs.map(job => `
        <div style="background: #1A1A1A; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #00D4AA;">
          <div style="font-weight: 500; color: #FFFFFF; margin-bottom: 4px;">${job.title}</div>
          <div style="color: #E5E5E5; font-size: 14px; margin-bottom: 4px;">${job.company}</div>
          <div style="color: #A3A3A3; font-size: 12px;">📍 ${job.location}</div>
        </div>
      `).join('')}
    </div>`;

    return {
      type: 'saved_companies',
      content,
      priority: 2
    };

  } catch (error) {
    console.error('Error generating saved companies block:', error);
    return null;
  }
}

/**
 * Generate "Fresh internships" block
 */
export async function generateFreshInternshipsBlock(
  userEmail: string, 
  context: PersonalizationContext
): Promise<PersonalizationBlock | null> {
  try {
    const supabase = getSupabaseClient();

    // Check if user is interested in internships (based on profile or feedback)
    const { data: user } = await supabase
      .from('users')
      .select('entry_level_preference, career_path')
      .eq('email', userEmail)
      .single();

    const isInterestedInInternships = 
      user?.entry_level_preference === 'internship' ||
      user?.career_path?.some((path: string) => path.toLowerCase().includes('intern')) ||
      context.engagementScore < 50; // New users more likely to want internships

    if (!isInterestedInInternships) {
      return null;
    }

    // Get fresh internship opportunities
    const { data: internships } = await supabase
      .from('jobs')
      .select('*')
      .or('title.ilike.%intern%,title.ilike.%trainee%,title.ilike.%graduate%')
      .eq('is_sent', false)
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .limit(3);

    if (!internships || internships.length === 0) {
      return null;
    }

    const content = `<div class="personalization-block">
      <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">🎓 Fresh internships & graduate schemes</h3>
      <p style="color: #E5E5E5; margin-bottom: 20px;">${internships.length} new early-career opportunities posted this week:</p>
      ${internships.map(job => `
        <div style="background: #1A1A1A; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #00D4AA;">
          <div style="font-weight: 500; color: #FFFFFF; margin-bottom: 4px;">${job.title}</div>
          <div style="color: #E5E5E5; font-size: 14px; margin-bottom: 4px;">${job.company}</div>
          <div style="color: #A3A3A3; font-size: 12px;">📍 ${job.location}</div>
        </div>
      `).join('')}
    </div>`;

    return {
      type: 'fresh_internships',
      content,
      priority: 3
    };

  } catch (error) {
    console.error('Error generating fresh internships block:', error);
    return null;
  }
}

/**
 * Generate career insight block
 */
export function generateCareerInsightBlock(context: PersonalizationContext): PersonalizationBlock | null {
  const { preferredJobTypes, engagementScore, subscriptionTier } = context;

  // Only show insights to engaged users or premium users
  if (engagementScore < 40 && subscriptionTier !== 'premium') {
    return null;
  }

  const insights = [
    {
      title: "💡 Market Insight",
      content: "EU tech companies are hiring 23% more early-career roles this quarter compared to last year."
    },
    {
      title: "📈 Trending Skills",
      content: "AI/ML, Cloud Computing, and Data Analytics are the most in-demand skills for 2024."
    },
    {
      title: "🌍 Remote Opportunities",
      content: "67% of EU companies now offer hybrid or fully remote options for entry-level positions."
    },
    {
      title: "⚡ Quick Tip",
      content: "Companies respond 3x faster to applications submitted within 48 hours of job posting."
    }
  ];

  const randomInsight = insights[Math.floor(Math.random() * insights.length)];

  const content = `<div class="personalization-block">
    <h3 style="color: #00D4AA; font-size: 18px; margin-bottom: 16px;">${randomInsight.title}</h3>
    <p style="color: #E5E5E5; margin-bottom: 20px; background: #1F1F1F; padding: 16px; border-radius: 8px; border-left: 3px solid #00D4AA;">
      ${randomInsight.content}
    </p>
  </div>`;

  return {
    type: 'career_insight',
    content,
    priority: 4
  };
}

/**
 * Generate personalized call-to-action
 */
export function generatePersonalizedCTA(context: PersonalizationContext): PersonalizationBlock {
  const { subscriptionTier, engagementScore, preferredJobTypes } = context;

  let ctaText = '';
  let ctaUrl = 'https://getjobping.com/dashboard';

  if (subscriptionTier === 'premium') {
    ctaText = 'View All Premium Matches →';
    ctaUrl = 'https://getjobping.com/dashboard?premium=true';
  } else if (engagementScore >= 70) {
    ctaText = 'See More Matches →';
  } else if (preferredJobTypes.length > 0) {
    ctaText = `Find More ${preferredJobTypes[0]} Roles →`;
  } else {
    ctaText = 'Explore All Opportunities →';
  }

  const content = `<div style="text-align: center; margin: 32px 0;">
    <a href="${ctaUrl}" style="background: linear-gradient(135deg, #00D4AA 0%, #00A8CC 100%); color: #000000; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 500; display: inline-block; box-shadow: 0 4px 12px rgba(0,212,170,0.15); font-size: 15px;">
      ${ctaText}
    </a>
  </div>`;

  return {
    type: 'call_to_action',
    content,
    priority: 5
  };
}

/**
 * Get personalization context for user
 */
export async function getPersonalizationContext(userEmail: string): Promise<PersonalizationContext> {
  try {
    const supabase = getSupabaseClient();

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    // Get engagement score from recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: signals } = await supabase
      .from('implicit_signals')
      .select('*')
      .eq('user_email', userEmail)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const engagementScore = signals ? Math.min(100, signals.length * 5) : 0;

    // Get preferred job types from feedback
    const { data: feedback } = await supabase
      .from('match_logs')
      .select('job_context')
      .eq('user_email', userEmail)
      .eq('match_quality', 'positive')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const preferredJobTypes = new Set<string>();
    feedback?.forEach(f => {
      const title = f.job_context?.title?.toLowerCase() || '';
      if (title.includes('developer')) preferredJobTypes.add('developer');
      if (title.includes('analyst')) preferredJobTypes.add('analyst');
      if (title.includes('consultant')) preferredJobTypes.add('consultant');
      if (title.includes('manager')) preferredJobTypes.add('manager');
      if (title.includes('designer')) preferredJobTypes.add('designer');
    });

    // Get saved companies
    const savedCompanies = new Set<string>();
    feedback?.forEach(f => {
      const company = f.job_context?.company;
      if (company) savedCompanies.add(company);
    });

    // Determine time of day
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    return {
      userName: user?.full_name,
      subscriptionTier: user?.subscription_tier || 'free',
      engagementScore,
      preferredJobTypes: Array.from(preferredJobTypes),
      savedCompanies: Array.from(savedCompanies),
      recentActivity: signals || [],
      location: user?.target_cities?.[0] || 'EU',
      careerPath: user?.career_path || [],
      timeOfDay
    };

  } catch (error) {
    console.error('Error getting personalization context:', error);
    return {
      subscriptionTier: 'free',
      engagementScore: 0,
      preferredJobTypes: [],
      savedCompanies: [],
      recentActivity: [],
      location: 'EU',
      careerPath: [],
      timeOfDay: 'morning'
    };
  }
}

/**
 * Generate complete personalized email content
 */
export async function generatePersonalizedEmailContent(
  jobCards: EmailJobCard[],
  userEmail: string
): Promise<{
  greeting: string;
  blocks: PersonalizationBlock[];
  cta: PersonalizationBlock;
}> {
  const context = await getPersonalizationContext(userEmail);
  
  const greeting = generatePersonalizedGreeting(context);
  
  const blocks: PersonalizationBlock[] = [];
  
  // Add top matches block (always)
  blocks.push(generateTopMatchesBlock(jobCards, context));
  
  // Add saved companies block (if available)
  const savedCompaniesBlock = await generateSavedCompaniesBlock(userEmail, context);
  if (savedCompaniesBlock) {
    blocks.push(savedCompaniesBlock);
  }
  
  // Add fresh internships block (if relevant)
  const internshipsBlock = await generateFreshInternshipsBlock(userEmail, context);
  if (internshipsBlock) {
    blocks.push(internshipsBlock);
  }
  
  // Add career insight block (if appropriate)
  const insightBlock = generateCareerInsightBlock(context);
  if (insightBlock) {
    blocks.push(insightBlock);
  }
  
  // Sort blocks by priority
  blocks.sort((a, b) => a.priority - b.priority);
  
  const cta = generatePersonalizedCTA(context);
  
  return {
    greeting,
    blocks,
    cta
  };
}
