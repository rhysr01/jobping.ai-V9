/**
 * Background job to parse user CVs
 * Run this nightly or when new users sign up
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/Utils/supabase';
import { getCVParser } from '@/Utils/cv/parser.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const parser = getCVParser();
    
    // Get users with CVs that haven't been parsed yet
    const { data: users, error } = await supabase
      .from('users')
      .select('email, cv_url')
      .not('cv_url', 'is', null)
      .limit(50); // Process 50 per run
    
    if (error) {
      throw error;
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No CVs to parse' });
    }
    
    // Check which users already have parsed CV data
    const { data: existingCVData } = await supabase
      .from('user_cv_data')
      .select('user_email')
      .in('user_email', users.map(u => u.email));
    
    const existingEmails = new Set(existingCVData?.map(d => d.user_email) || []);
    const usersToProcess = users.filter(u => !existingEmails.has(u.email));
    
    console.log(`📄 Processing ${usersToProcess.length} CVs`);
    
    let parsed = 0;
    let failed = 0;
    
    for (const user of usersToProcess) {
      try {
        console.log(`Parsing CV for ${user.email}`);
        
        const cvData = await parser.parseCV(user.cv_url, user.email);
        
        if (cvData) {
          // Store parsed data
          await supabase
            .from('user_cv_data')
            .upsert({
              user_email: user.email,
              cv_data: cvData,
              cv_url: user.cv_url,
              parsed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            });
          
          parsed++;
          console.log(`✅ Parsed CV for ${user.email}`);
        } else {
          failed++;
          console.warn(`❌ Failed to parse CV for ${user.email}`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        console.error(`Error parsing CV for ${user.email}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      parsed,
      failed,
      total: usersToProcess.length
    });
    
  } catch (error) {
    console.error('CV parsing job failed:', error);
    return NextResponse.json({
      error: 'CV parsing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
