import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import {
  performEnhancedAIMatching,
  generateRobustFallbackMatches,
  logMatchSession,
  type UserPreferences,
} from '@/Utils/jobMatching';
import { sendMatchedJobsEmail, sendWelcomeEmail } from '@/Utils/email';
import { EmailVerificationOracle } from '@/Utils/emailVerification';
import { normalizeCareerPath } from '@/scrapers/types';

// Test mode helper
const isTestMode = () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

// Validation Schema
const TallyWebhookSchema = z.object({
  eventId: z.string(),
  eventType: z.literal('FORM_RESPONSE'),
  createdAt: z.string(),
  formId: z.string(),
  responseId: z.string(),
  data: z.object({
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
      value: z.union([z.string(), z.array(z.string()), z.null()]).optional()
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
        from: (table: string) => ({
          select: (columns?: string) => ({
            eq: (column: string, value: any) => ({
              single: () => Promise.resolve({ data: null, error: null })
            }),
            gte: (column: string, value: any) => ({
              order: (column: string, options?: any) => ({
                limit: (count: number) => Promise.resolve({ data: [], error: null })
              })
            }),
            limit: (count: number) => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null })
          }),
          upsert: (data: any) => Promise.resolve({ data: null, error: null }),
          insert: (data: any) => Promise.resolve({ data: null, error: null }),
          update: (data: any) => ({
            eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
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
function extractUserData(fields: NonNullable<TallyWebhookData['data']>['fields']) {
  console.log('🧪 Test mode: Extracting user data from fields:', fields);
  
  const userData: Record<string, string | string[] | boolean> = { 
    email: ''
  };
  
  fields.forEach((field: any) => {
    if (!field.value) return;
    
    const key = field.key.toLowerCase();
    console.log(`🧪 Test mode: Processing field ${key} with value:`, field.value);
    
    // Map Tally form fields to your actual database columns
    if (key.includes('name')) {
      userData.full_name = Array.isArray(field.value) ? field.value[0] : field.value;
    } else if (key.includes('email')) {
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
      userData.career_path = normalizeCareerPath(field.value);
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

  console.log('🧪 Test mode: Final user data:', userData);
  return userData;
}

export async function POST(req: NextRequest) {
  // Test endpoint for email verification testing
  const url = new URL(req.url);
  if (url.searchParams.get('test') === 'email-verification') {
    return await handleEmailVerificationTest(req);
  }

  // PRODUCTION: Rate limiting for webhook endpoint
  // Skip rate limiting in test mode
  if (!isTestMode()) {
    const rateLimitResult = await getProductionRateLimiter().middleware(req, 'webhook-tally');
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  try {
    // Parse and validate
    const rawPayload = await req.json();
    
    // Handle cases where data might be undefined
    if (!rawPayload || !rawPayload.data) {
      console.warn('Webhook received without data field:', rawPayload);
      return NextResponse.json({ 
        error: 'Invalid webhook payload: missing data field',
        received: rawPayload 
      }, { status: 400 });
    }
    
    const payload = TallyWebhookSchema.parse(rawPayload);
    
    if (payload.eventType !== 'FORM_RESPONSE') {
      return NextResponse.json({ message: 'Event type not handled' });
    }

    const supabase = getSupabaseClient();
    console.log('🧪 Test mode: Supabase client created successfully');
    
    const userData = extractUserData(payload.data?.fields || []);
    console.log('🧪 Test mode: User data extracted:', userData);
    
    if (!userData.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email as string)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    console.log(`Processing submission for: ${userData.email}`);

    // Check if user exists
    console.log('🧪 Test mode: Checking if user exists...');
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('email, created_at, email_verified, verification_token')
      .eq('email', userData.email)
      .single();
    
    console.log('🧪 Test mode: User check result:', { existingUser, fetchError });

    const isNewUser = !existingUser;

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.log('🧪 Test mode: Fetch error that will be thrown:', fetchError);
      throw fetchError;
    }

    // If user exists and is already verified, skip verification
    if (existingUser && (existingUser as any).email_verified) {
      console.log(`User ${userData.email} already verified, skipping verification`);
    }

    // Generate verification token for new users
    let verificationToken = null;
    if (isNewUser) {
      console.log('🧪 Test mode: Generating verification token for new user...');
      try {
        verificationToken = EmailVerificationOracle.generateVerificationToken();
        console.log(`Generated verification token for new user: ${userData.email}`);
      } catch (tokenError) {
        console.error('❌ Token generation failed:', tokenError);
        // Use a fallback token for tests
        verificationToken = 'test-verification-token-' + Date.now();
      }
    }

    // Upsert user - UPDATED FOR ACTUAL SCHEMA
    const now = new Date().toISOString();
    const userRecord: any = {
      ...userData,
      // Handle arrays properly for your actual database schema
      languages_spoken: Array.isArray(userData.languages_spoken) ? userData.languages_spoken : (userData.languages_spoken ? [userData.languages_spoken] : []),
      company_types: Array.isArray(userData.company_types) ? userData.company_types : (userData.company_types ? [userData.company_types] : []),
      career_path: normalizeCareerPath(userData.career_path as string | string[] | null | undefined),
      target_cities: Array.isArray(userData.target_cities) ? userData.target_cities : (userData.target_cities ? [userData.target_cities] : []),
      roles_selected: userData.roles_selected, // This is JSONB in your schema
      updated_at: now,
      email_verified: isNewUser ? (process.env.JOBPING_PILOT_TESTING === '1' ? true : false) : ((existingUser as any)?.email_verified || false),
      verification_token: isNewUser ? verificationToken : ((existingUser as any)?.verification_token || null),
      active: true,
      subscription_active: false,
      ...(isNewUser && { created_at: now })
    };

    console.log('Upserting user with data:', {
      email: userRecord.email,
      full_name: userRecord.full_name,
      email_verified: userRecord.email_verified,
      languages_spoken: userRecord.languages_spoken,
      company_types: userRecord.company_types,
      career_path: userRecord.career_path,
      roles_selected: userRecord.roles_selected,
      target_cities: userRecord.target_cities,
      work_authorization: userRecord.work_authorization,
      work_environment: userRecord.work_environment,
      professional_experience: userRecord.professional_experience,
      target_employment_start_date: userRecord.target_employment_start_date
    });

    console.log('🧪 Test mode: Performing user upsert...');
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(userRecord, { onConflict: 'email' });

    console.log('🧪 Test mode: Upsert result:', { upsertError });

    if (upsertError) {
      console.error('User upsert failed:', upsertError);
      throw upsertError;
    }

    // Send verification email for new users
    if (isNewUser && verificationToken) {
      if (isTestMode()) {
        console.log('🧪 Test mode: Skipping verification email sending');
        return NextResponse.json({ 
          success: true, 
          message: 'User registered successfully (test mode)',
          email: userData.email,
          requiresVerification: true,
          testMode: true
        });
      }
      
      try {
        await EmailVerificationOracle.sendVerificationEmail(
          userData.email as string,
          verificationToken,
          userData.full_name as string || 'there'
        );
        
        console.log(`📧 Verification email sent to: ${userData.email}`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Please check your email to verify your account',
          email: userData.email,
          requiresVerification: true
        });
      } catch (emailError) {
        console.error(`❌ Verification email failed for ${userData.email}:`, emailError);
        // Continue with the process even if email fails
      }
    }

    // Generate matches for verified users only
    let matches: any[] = [];
    let matchType: 'ai_success' | 'fallback' | 'ai_failed' = 'ai_failed';
    let jobs: any[] = [];

    // Skip AI matching and email sending in test mode for faster response
    if (isTestMode()) {
      console.log('🧪 Test mode: Skipping AI matching and email sending for faster response');
      return NextResponse.json({ 
        success: true, 
        message: 'User registered successfully (test mode)',
        email: userData.email,
        matchesGenerated: 0,
        requiresVerification: isNewUser,
        testMode: true
      });
    }

    // Generate matches for new users (Phase 1: Welcome email with exactly 5 matches)
    if (isNewUser) {
      console.log(`New user: ${userData.email}. Generating initial 5 matches...`);
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data: fetchedJobs } = await supabase
        .from('jobs')
        .select('*')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50); // Get more jobs to ensure we have enough for matching

      if (fetchedJobs && fetchedJobs.length > 0) {
        jobs = fetchedJobs;
        
        try {
          const openai = getOpenAIClient();
          const aiResult = await performEnhancedAIMatching(jobs, userData as unknown as UserPreferences, openai);
          matches = aiResult.matches;
          matchType = 'ai_success';
          
          if (!matches || matches.length === 0) {
            matchType = 'fallback';
            matches = generateRobustFallbackMatches(jobs, userData as unknown as UserPreferences);
          }
          
          // Ensure exactly 5 matches for new users (Phase 1)
          matches = matches.slice(0, 5);
          console.log(`🎯 Generated ${matches.length} initial matches for new user ${userData.email}`);
        } catch (aiError) {
          console.error(`❌ AI matching failed for ${userData.email}:`, aiError);
          matchType = 'ai_failed';
          matches = generateRobustFallbackMatches(jobs, userData as unknown as UserPreferences);
          matches = matches.slice(0, 5); // Ensure exactly 5 matches even in fallback
        }
      }
    }
    // Generate matches for existing verified users (updates, etc.)
    else if (existingUser && (existingUser as any).email_verified) {
      console.log(`Verified user update: ${userData.email}. Generating matches...`);
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data: fetchedJobs } = await supabase
        .from('jobs')
        .select('*')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      if (fetchedJobs && fetchedJobs.length > 0) {
        jobs = fetchedJobs;
        
        try {
          const openai = getOpenAIClient();
          const aiResult = await performEnhancedAIMatching(jobs, userData as unknown as UserPreferences, openai);
          matches = aiResult.matches;
          matchType = 'ai_success';
          
          if (!matches || matches.length === 0) {
            matchType = 'fallback';
            matches = generateRobustFallbackMatches(jobs, userData as unknown as UserPreferences);
          }
        } catch (aiError) {
          console.error(`❌ AI matching failed for ${userData.email}:`, aiError);
          matchType = 'ai_failed';
          matches = generateRobustFallbackMatches(jobs, userData as unknown as UserPreferences);
        }
      }
    }

    // Log match session
    try {
      await logMatchSession(
        userData.email as string,
        matchType,
        matches.length
      );
    } catch (logError) {
      console.error(`❌ Match session logging failed for ${userData.email}:`, logError);
    }

    // Send welcome email for new users
    if (isNewUser) {
      try {
        await sendWelcomeEmail({
          to: userData.email as string,
          userName: userData.full_name as string,
          matchCount: matches.length
        });
        console.log(`📧 Welcome email sent to: ${userData.email}`);
      } catch (emailError) {
        console.error(`❌ Welcome email failed for ${userData.email}:`, emailError);
      }
    }

    // Send matched jobs email if matches were generated
    if (matches.length > 0) {
      try {
        await sendMatchedJobsEmail({
          to: userData.email as string,
          jobs: matches,
          userName: userData.full_name as string,
          subscriptionTier: 'free', // New users start as free
          isSignupEmail: true
        });
        console.log(`📧 Matched jobs email sent to: ${userData.email}`);
        
        // Set initial tracking fields for new users
        if (isNewUser) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              last_email_sent: new Date().toISOString(),
              email_count: 1,
              email_phase: 'welcome',
              onboarding_complete: false
            })
            .eq('email', userData.email);
          
          if (updateError) {
            console.error(`❌ Failed to update tracking fields for new user ${userData.email}:`, updateError);
          } else {
            console.log(`✅ Set initial tracking fields for new user ${userData.email}`);
          }
        }
      } catch (emailError) {
        console.error(`❌ Matched jobs email failed for ${userData.email}:`, emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: isNewUser ? 'User registered successfully' : 'User updated successfully',
      email: userData.email,
      matchesGenerated: matches.length,
      requiresVerification: isNewUser && !((existingUser as any)?.email_verified || false)
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('❌ Tally webhook validation error:', error.issues);
      return NextResponse.json({
        error: 'Invalid webhook payload structure',
        details: error.issues
      }, { status: 400 });
    }
    
    console.error('❌ Tally webhook internal error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      fullError: error
    });
    
    return NextResponse.json({
      error: 'Registration failed',
      details: error instanceof Error ? error.message : JSON.stringify(error)
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
      const token = EmailVerificationOracle.generateVerificationToken();
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