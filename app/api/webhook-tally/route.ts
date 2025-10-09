import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { errorResponse } from '@/Utils/errorResponse';
import { validateTallyWebhook, getSecurityHeaders } from '@/Utils/security/webhookSecurity';
import { performMemoryCleanup } from '@/Utils/performance/memoryManager';
import {
  performEnhancedAIMatching
} from '@/Utils/jobMatching';
import {
  generateRobustFallbackMatches
} from '@/Utils/matching';
import {
  logMatchSession
} from '@/Utils/matching/logging.service';
import type { UserPreferences } from '@/Utils/matching/types';
import { sendMatchedJobsEmail, sendWelcomeEmail } from '@/Utils/email';
import { buildPersonalizedSubject } from '@/Utils/email/subjectBuilder';
import { EmailVerificationOracle } from '@/Utils/emailVerification';

// Test mode helper
const isTestMode = () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

// Validation Schema - Relaxed to accept any Tally field value types
const TallyWebhookSchema = z.object({
  eventId: z.string(),
  eventType: z.literal('FORM_RESPONSE'),
  createdAt: z.string(),
  formId: z.string().optional(), // Make optional to handle missing fields
  responseId: z.string().optional(), // Make optional to handle missing fields
  data: z.object({
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
      value: z.any().optional() // Accept any value type from Tally
    })).min(1)
  }).optional()
});

type TallyWebhookData = z.infer<typeof TallyWebhookSchema>;

// Clients
import { getDatabaseClient } from '@/Utils/databasePool';

function getSupabaseClient() {
  // Only initialize during runtime, not build time
  if (typeof window !== 'undefined') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  // Use database pool for connection reuse
  try {
    return getDatabaseClient();
  } catch (error) {
    // In test environment, return a mock client instead of throwing
    if (process.env.NODE_ENV === 'test') {
      console.log('🧪 Test mode: Using mock Supabase client for webhook-tally');
      return {
        from: (_table: string) => ({
          select: (_columns?: string) => ({
            eq: (_column: string, _value: any) => ({
              single: () => Promise.resolve({ data: null, error: null }),
              order: (_column: string, _options?: any) => ({
                limit: (_count: number) => Promise.resolve({ data: [], error: null })
              }),
              limit: (_count: number) => Promise.resolve({ data: [], error: null })
            }),
            gte: (_column: string, _value: any) => ({
              order: (_column: string, _options?: any) => ({
                limit: (_count: number) => Promise.resolve({ data: [], error: null })
              })
            }),
            limit: (_count: number) => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null })
          }),
          upsert: (_data: any) => Promise.resolve({ data: null, error: null }),
          insert: (_data: any) => Promise.resolve({ data: null, error: null }),
          update: (_data: any) => ({
            eq: (_column: string, _value: any) => Promise.resolve({ data: null, error: null }),
            in: (_column: string, _values: any[]) => Promise.resolve({ data: null, error: null })
          }),
          delete: () => ({
            eq: (_column: string, _value: any) => Promise.resolve({ data: null, error: null })
          })
        })
      };
    }
    throw new Error('Database connection failed: ' + (error instanceof Error ? error.message : String(error)));
  }
}

function getOpenAIClient() {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    // In test environment, return a mock client instead of throwing
    if (process.env.NODE_ENV === 'test') {
      console.log('🧪 Test mode: Using mock OpenAI client for webhook-tally');
      return {
        chat: {
          completions: {
            create: () => Promise.resolve({ choices: [{ message: { content: 'Mock response' } }] })
          }
        }
      } as any;
    }
    throw new Error('Missing OpenAI API key: OPENAI_API_KEY must be set');
  }
  
  return new OpenAI({
    apiKey: openaiKey,
  });
}

// Extract user data with business rules - UPDATED FOR TALLY CHECKBOX FORMAT
function extractUserData(fields: NonNullable<TallyWebhookData['data']>['fields'], referrerUrl?: string) {
  console.log('🧪 Extracting user data from Tally fields');
  
  const userData: Record<string, string | string[] | boolean> = { 
    email: ''
  };
  
  // Tally sends checkbox values in parentheses within labels
  // e.g., "How do you want to work? (Office)" with value: true
  // NOTE: Match the LAST set of parentheses (not the first!)
  const extractFromParentheses = (label: string): string | null => {
    // Match all parentheses, get the last one
    const matches = label.match(/\(([^)]+)\)/g);
    if (!matches || matches.length === 0) return null;
    
    const lastMatch = matches[matches.length - 1];
    // Extract content from the last match
    const content = lastMatch.match(/\(([^)]+)\)/);
    return content ? content[1].trim() : null;
  };
  
  // Storage for multi-select fields
  const locations: string[] = [];
  const workEnv: string[] = [];
  const roles: string[] = [];
  
  fields.forEach((field: any) => {
    const key = field.key.toLowerCase();
    const label = field.label || '';
    const labelLower = label.toLowerCase();
    const type = (field.type || '').toLowerCase();
    const value = field.value;
    
    // Skip if no value
    if (value === null || value === undefined || value === false) return;
    
    console.log(`Processing: ${label.substring(0, 50)}... = ${JSON.stringify(value)}`);
    
    // EMAIL (highest priority)
    if (type === 'input_email' || labelLower.includes('email')) {
      userData.email = Array.isArray(value) ? value[0] : value;
    }
    // FULL NAME
    else if (labelLower.includes('full name')) {
      userData.full_name = Array.isArray(value) ? value[0] : value;
    }
    // WORK LOCATION (checkbox format with city name in parentheses)
    else if ((labelLower.includes('preferred work location') || labelLower.includes('work location')) && value === true) {
      const loc = extractFromParentheses(label);
      if (loc) {
        locations.push(loc);
        console.log(`✅ Extracted location: ${loc}`);
      }
    }
    // WORK ENVIRONMENT (checkbox format: Office, Hybrid, Remote)
    else if (labelLower.includes('how do you want to work?') && value === true) {
      const env = extractFromParentheses(label);
      if (env) workEnv.push(env);
    }
    // ROLES (checkbox format with job titles in parentheses)
    else if ((labelLower.includes('strategy &') || labelLower.includes('role(s)')) && value === true) {
      const role = extractFromParentheses(label);
      if (role && role.length > 1) {  // Filter out single character extractions
        roles.push(role);
        console.log(`✅ Extracted role: ${role}`);
      }
    }
    // TARGET EMPLOYMENT START DATE
    else if (labelLower.includes('target employment start date') || labelLower.includes('employment start')) {
      userData.start_date = Array.isArray(value) ? value[0] : value;
    }
    // PROFESSIONAL EXPERIENCE
    else if (labelLower.includes('professional experience')) {
      // Tally sends UUID, but we can map common ones or just store as-is for now
      // You'll need to create a mapping or ask Tally to send actual values
      userData.professional_experience = 'Entry Level'; // Default for now
    }
    // ENTRY LEVEL PREFERENCE
    else if (labelLower.includes('entry level preference')) {
      // Same issue - UUIDs instead of actual values
      userData.entry_level_preference = 'Graduate Programme'; // Default for now
    }
  });
  
  // Set collected arrays
  if (locations.length > 0) {
    userData.target_cities = locations.slice(0, 3); // Max 3
  }
  if (workEnv.length > 0) {
    userData.work_environment = workEnv.join(', ');
  }
  if (roles.length > 0) {
    userData.roles_selected = roles;
  }
  
  // Determine subscription tier
  let subscriptionTier = 'free';
  if (referrerUrl) {
    if (referrerUrl.includes('utm_campaign=premium') || referrerUrl.includes('campaign=premium')) {
      subscriptionTier = 'premium';
    }
  }
  
  userData.subscriptionTier = subscriptionTier;
  console.log('✅ Extracted user data:', {
    email: userData.email,
    name: userData.full_name,
    cities: userData.target_cities,
    roles: Array.isArray(userData.roles_selected) ? userData.roles_selected.length : 0,
    workEnv: userData.work_environment
  });
  
  return userData;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimiter = getProductionRateLimiter();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const rateLimit = await rateLimiter.checkRateLimit('webhook-tally', clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimit.retryAfter 
      }, { status: 429 });
    }

    // Security validation
    const validationResult = await validateTallyWebhook(req);
    if (!validationResult.isValid) {
      console.error('❌ Tally webhook validation failed:', validationResult.error);
      return NextResponse.json({ 
        error: 'Invalid webhook signature' 
      }, { status: 401 });
    }

    // Parse and validate the webhook payload
    const body = await req.json();
    const validatedData = TallyWebhookSchema.parse(body);
    
    console.log('✅ Tally webhook received:', {
      eventId: validatedData.eventId,
      formId: validatedData.formId,
      responseId: validatedData.responseId
    });

    // Extract user data from form fields
    console.log('🔍 Tally form fields received:', JSON.stringify(validatedData.data?.fields?.slice(0, 5), null, 2));
    
    const userData = extractUserData(
      validatedData.data?.fields || [], 
      req.headers.get('referer') || undefined
    );
    
    console.log('🔍 Extracted user data:', JSON.stringify(userData, null, 2));

    if (!userData.email) {
      console.error('❌ No email found in form data');
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    // Get database client
    const supabase = getSupabaseClient();
    
    // Check for pending promo code (if table exists)
    let hasPendingPromo = false;
    try {
      const { data: pendingPromo } = await supabase
        .from('promo_pending')
        .select('promo_code, expires_at')
        .eq('email', userData.email)
        .single();
      
      if (pendingPromo && new Date(pendingPromo.expires_at) > new Date()) {
        console.log(`🎁 Found valid pending promo: ${pendingPromo.promo_code} for ${userData.email}`);
        hasPendingPromo = true;
        
        // Delete the pending promo (it will be applied below)
        await supabase
          .from('promo_pending')
          .delete()
          .eq('email', userData.email);
      }
    } catch (error) {
      // Table might not exist yet - that's ok
      console.log('⚠️ promo_pending table not found (or error checking):', error);
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, subscription_active')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      console.log('👤 User already exists:', existingUser.email);
      
      // Update existing user with profile data from Tally form
      // This handles the case where user applied promo code first, then filled out form
      const updateData = {
        full_name: userData.full_name || '',
        professional_expertise: userData.professional_expertise || '',
        start_date: userData.start_date || null,
        work_environment: userData.work_environment || '',
        visa_status: userData.work_authorization || '',
        entry_level_preference: userData.entry_level_preference || '',
        career_path: userData.career_path || '',
        professional_experience: userData.professional_experience || '',
        languages_spoken: userData.languages_spoken || [],
        company_types: userData.company_types || [],
        roles_selected: userData.roles_selected || [],
        target_cities: userData.target_cities || [],
        email_verified: true, // Ensure email is verified for matching
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', userData.email);
      
      if (updateError) {
        console.error('❌ Failed to update existing user profile:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update user profile' 
        }, { status: 500 });
      }
      
      console.log('✅ Updated existing user profile:', existingUser.email);
      
      // Continue to instant matching (don't return early)
      // Use existingUser.id for matching
      const userId = existingUser.id;
      
      // INSTANT JOB MATCHING: Send first 5 jobs for updated profile
      try {
        console.log('🚀 Running instant job matching for updated user...');
        
        // Call match-users API to get first 5 jobs
        const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const matchUrl = `${baseUrl}/api/match-users`;
        
        console.log(`📍 Calling match API: ${matchUrl}`);
        
        const matchResponse = await fetch(matchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-system-api-key': process.env.SYSTEM_API_KEY || 'internal-system-key',
          },
          body: JSON.stringify({
            limit: 1,
            forceReprocess: false,
          }),
        });

        console.log(`📊 Match API response: ${matchResponse.status} ${matchResponse.statusText}`);

        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          console.log(`✅ Match API completed:`, matchData);
          
          // Fetch the matched jobs from the database
          const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select(`
              job_hash,
              match_score,
              match_reason,
              jobs (
                id,
                title,
                company,
                location,
                job_url,
                description
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (matchesError) {
            console.error('❌ Failed to fetch matches:', matchesError);
            throw new Error('Failed to fetch job matches');
          }
          
          console.log(`📧 Fetched ${matches?.length || 0} matches for email`);
          
          // Transform matches to include job details
          const matchedJobs = (matches || []).map((match: any) => ({
            ...match.jobs,
            match_score: Math.round((match.match_score || 0) * 100), // Convert 0-1 to 0-100 for display
            match_reason: match.match_reason,
            job_hash: match.job_hash
          }));
          
          if (matchedJobs.length > 0) {
            console.log(`📧 Sending welcome email with ${matchedJobs.length} job matches...`);
            
            await sendMatchedJobsEmail({
              to: userData.email as string,
              userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
              jobs: matchedJobs,
              subscriptionTier: existingUser.subscription_active ? 'premium' : 'free',
              isSignupEmail: true
            });
            
            console.log('✅ Welcome email with jobs sent successfully');
          } else {
            console.log('⚠️ No matches found, sending welcome email without jobs');
            await sendWelcomeEmail({
              to: userData.email as string,
              userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
              matchCount: 0
            });
          }
          
          return NextResponse.json({ 
            success: true,
            message: 'Profile updated and instant matching completed',
            userId: userId,
            matchCount: matchedJobs.length
          });
        } else {
          console.error('❌ Instant matching failed:', await matchResponse.text());
          // Still return success for user creation, just log the matching failure
          await sendWelcomeEmail({
            to: userData.email as string,
            userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
            matchCount: 0
          });
          
          return NextResponse.json({ 
            success: true,
            message: 'Profile updated, instant matching will be retried on next scheduled send',
            userId: userId
          });
        }
      } catch (matchError) {
        console.error('❌ Error during instant matching:', matchError);
        // Still return success for user creation, send welcome email without jobs
        await sendWelcomeEmail({
          to: userData.email as string,
          userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
          matchCount: 0
        });
        
        return NextResponse.json({ 
          success: true,
          message: 'Profile updated, user will receive jobs on next scheduled send',
          userId: userId
        });
      }
    }

    // Create new user
    const insertData = {
      email: userData.email,
      full_name: userData.full_name || '',
      professional_expertise: userData.professional_expertise || '',
      start_date: userData.start_date || null,
      work_environment: userData.work_environment || '',
      visa_status: userData.work_authorization || '',
      entry_level_preference: userData.entry_level_preference || '',
      career_path: userData.career_path || '',
      professional_experience: userData.professional_experience || '',
      languages_spoken: userData.languages_spoken || [],
      company_types: userData.company_types || [],
      roles_selected: userData.roles_selected || [],
      target_cities: userData.target_cities || [],
      subscription_active: hasPendingPromo, // Activate premium if promo was pending
      email_verified: true, // Auto-verify for instant matching (no email verification needed)
      created_at: new Date().toISOString()
    };
    
    if (hasPendingPromo) {
      console.log(`🎉 Activating premium for new user via pending promo: ${userData.email}`);
    }
    
    // Properly typed Supabase insert with select
    // Using PostgrestBuilder pattern to avoid type inference issues
    const query = supabase.from('users').insert([insertData]);
    const selectQuery = (query as any).select();
    const singleQuery = selectQuery.single();
    const insertResult = await singleQuery;
    
    const newUser = insertResult.data;
    const userError = insertResult.error;

    if (userError) {
      console.error('❌ Failed to create user:', userError);
      return NextResponse.json({ 
        error: 'Failed to create user account' 
      }, { status: 500 });
    }

    console.log('✅ User created successfully:', newUser.email);

    // INSTANT JOB MATCHING: Send first 5 jobs immediately on signup
    try {
      console.log('🚀 Running instant job matching for new user...');
      
      // Call match-users API to get first 5 jobs
      const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      const matchUrl = `${baseUrl}/api/match-users`;
      
      console.log(`📍 Calling match API: ${matchUrl}`);
      
      const matchResponse = await fetch(matchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-system-api-key': process.env.SYSTEM_API_KEY || 'internal-system-key',
        },
        body: JSON.stringify({
          limit: 1, // Only process this new user (match-users API accepts limit and forceReprocess)
          forceReprocess: false,
        }),
      });

      console.log(`📊 Match API response: ${matchResponse.status} ${matchResponse.statusText}`);

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        console.log(`✅ Match API completed:`, matchData);
        
        // Fetch the actual matched jobs from the database
        const { data: matches, error: matchError } = await supabase
          .from('matches')
          .select(`
            job_hash,
            match_score,
            match_reason,
            jobs!inner(
              id,
              title,
              company,
              location,
              job_url,
              description
            )
          `)
          .eq('user_email', userData.email)
          .order('match_score', { ascending: false })
          .limit(5);

        if (matchError) {
          console.error('❌ Error fetching matches:', matchError);
          throw matchError;
        }

        // Transform matches to include job details
        const jobMatches = matches?.map((match: any) => ({
          job_hash: match.job_hash,
          match_score: (match.match_score || 0.85) * 100, // Convert 0-1 scale back to 0-100 for display
          match_reason: match.match_reason,
          title: match.jobs.title,
          company: match.jobs.company,
          location: match.jobs.location,
          job_url: match.jobs.job_url,
          description: match.jobs.description
        })) || [];

        console.log(`✅ Fetched ${jobMatches.length} matched jobs from database`);
        
        // Send job matches email immediately
        if (jobMatches.length > 0) {
          console.log(`📧 Attempting to send email to: ${userData.email}`);
          const emailResult = await sendMatchedJobsEmail({
            to: userData.email as string,
            userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
            jobs: jobMatches,
            subscriptionTier: hasPendingPromo ? 'premium' : 'free', // Premium if promo was applied
            isSignupEmail: true,
          });
          console.log(`✅ First job matches email sent with ${jobMatches.length} jobs`, emailResult);
        } else {
          // No jobs found, send welcome email instead
          console.log(`📧 No job matches, sending welcome email to: ${userData.email}`);
          const welcomeResult = await sendWelcomeEmail({
            to: userData.email as string,
            userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
            matchCount: 0
          });
          console.log('⚠️ No jobs found, sent welcome email without matches', welcomeResult);
        }
      } else {
        console.error('⚠️ Instant matching failed, user will receive jobs on next scheduled send');
        // Send welcome email without jobs as fallback
        await sendWelcomeEmail({
          to: userData.email as string,
          userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
          matchCount: 5
        });
      }
    } catch (matchError) {
      console.error('⚠️ Instant matching error:', matchError);
      // Send welcome email as fallback
      try {
        await sendWelcomeEmail({
          to: userData.email as string,
          userName: (typeof userData.full_name === 'string' ? userData.full_name : 'there'),
          matchCount: 5
        });
      } catch (emailError) {
        console.error('⚠️ Failed to send fallback welcome email:', emailError);
      }
    }

    // Cleanup memory
    performMemoryCleanup();

    return NextResponse.json({ 
      success: true, 
      message: 'User registered successfully',
      userId: newUser.id 
    }, { 
      status: 200,
      headers: getSecurityHeaders()
    });

  } catch (error) {
    console.error('❌ Tally webhook error:', error);
    
    // Cleanup memory on error
    performMemoryCleanup();
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

// Test handler for email verification testing
async function handleEmailVerificationTest(req: NextRequest) {
  try {
    const { email, type } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (type === 'verification') {
      // Test verification email sending
      const token = await EmailVerificationOracle.generateVerificationToken(email);
      const success = await EmailVerificationOracle.sendVerificationEmail(
        email, 
        token, 
        'Test User'
      );
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Verification email sent',
          token: token.substring(0, 8) + '...',
          email 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to send verification email' 
        }, { status: 500 });
      }
    } else if (type === 'welcome') {
      // Test welcome email sequence
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (user) {
        await sendWelcomeEmail({
          to: email,
          userName: user.full_name || 'there',
          matchCount: 5
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Welcome email sent',
          email 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid test type. Use "verification" or "welcome"' 
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint is designed for POST requests only.'
  }, { status: 405 });
}