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

// Extract user data with business rules - UPDATED FOR ACTUAL SCHEMA
function extractUserData(fields: NonNullable<TallyWebhookData['data']>['fields'], referrerUrl?: string) {
  console.log('🧪 Test mode: Extracting user data from fields:', fields);
  console.log('🧪 Test mode: Referrer URL:', referrerUrl);
  
  const userData: Record<string, string | string[] | boolean> = { 
    email: ''
  };
  
  fields.forEach((field: any) => {
    if (!field.value) return;
    
    const key = field.key.toLowerCase();
    const label = (field.label || '').toLowerCase();
    const type = (field.type || '').toLowerCase();
    console.log(`🧪 Test mode: Processing field ${key} with value:`, field.value);
    
    // Map Tally form fields to your actual database columns
    if (key.includes('name') || label.includes('name')) {
      userData.full_name = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('email') || label.includes('email') || type === 'input_email') {
      userData.email = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('location') || key.includes('cities')) {
      // Handle target cities as array (TEXT[] in database)
      if (Array.isArray(field.value)) {
        userData.target_cities = field.value.slice(0, 3); // Max 3 cities
      } else {
        userData.target_cities = [field.value];
      }
    } else if (key.includes('languages')) {
      // Handle languages as array (TEXT[] in database)
      if (Array.isArray(field.value)) {
        userData.languages_spoken = field.value;
      } else {
        userData.languages_spoken = [field.value];
      }
    } else if (key.includes('target_date') || key.includes('employment_start')) {
      userData.target_employment_start_date = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('experience') && !key.includes('level')) {
      // Professional experience level (0, 6 months, 1 year, etc.)
      userData.professional_experience = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('work') && (key.includes('preference') || key.includes('environment'))) {
      // How do you want to work? (Office, Hybrid, Remote)
      userData.work_environment = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('authorization') || key.includes('citizen')) {
      // Work authorization status
      userData.work_authorization = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('entry_level') || key.includes('level_preference')) {
      // Entry-level preference (Internship, Graduate Programme, etc.)
      userData.entry_level_preference = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('companies') || key.includes('target_companies')) {
      // Target companies (TEXT[] in database)
      if (Array.isArray(field.value)) {
        userData.company_types = field.value;
      } else {
        userData.company_types = [field.value];
      }
    } else if (key.includes('career_path') || key.includes('career')) {
      // Career path - normalize to canonical slugs (TEXT[] in database)
      userData.career_path = Array.isArray(field.value) ? field.value : [field.value];
    } else if (key.includes('roles') || key.includes('target_roles')) {
      // Roles selected (JSONB in database)
      if (Array.isArray(field.value)) {
        userData.roles_selected = field.value;
      } else {
        userData.roles_selected = [field.value];
      }
    } else if (key.includes('expertise') || key.includes('background')) {
      userData.professional_expertise = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('start_date') || key.includes('availability')) {
      userData.start_date = Array.isArray(field.value) ? field.value[0] : field.value;
    }
  });

  // Determine subscription tier based on referrer URL
  let subscriptionTier = 'free'; // default
  if (referrerUrl) {
    if (referrerUrl.includes('utm_campaign=premium') || referrerUrl.includes('campaign=premium')) {
      subscriptionTier = 'premium';
    } else if (referrerUrl.includes('utm_campaign=free') || referrerUrl.includes('campaign=free')) {
      subscriptionTier = 'free';
    }
  }
  
  userData.subscriptionTier = subscriptionTier;
  console.log('🧪 Test mode: Final user data:', userData);
  console.log('🧪 Test mode: Subscription tier determined:', subscriptionTier);
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
              to: userData.email,
              userName: userData.full_name || 'there',
              jobs: matchedJobs,
              isFirstEmail: true
            });
            
            console.log('✅ Welcome email with jobs sent successfully');
          } else {
            console.log('⚠️ No matches found, sending welcome email without jobs');
            await sendWelcomeEmail(userData.email, userData.full_name || 'there');
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
          await sendWelcomeEmail(userData.email, userData.full_name || 'there');
          
          return NextResponse.json({ 
            success: true,
            message: 'Profile updated, instant matching will be retried on next scheduled send',
            userId: userId
          });
        }
      } catch (matchError) {
        console.error('❌ Error during instant matching:', matchError);
        // Still return success for user creation, send welcome email without jobs
        await sendWelcomeEmail(userData.email, userData.full_name || 'there');
        
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
            subscriptionTier: 'free', // All new signups are free tier
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