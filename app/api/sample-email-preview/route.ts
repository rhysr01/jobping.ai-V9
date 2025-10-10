/**
 * API endpoint to get real jobs for email preview
 * Returns actual jobs from database with curated match reasons
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/Utils/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch 5 high-quality recent jobs from popular cities
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('job_hash, title, company, location, description, job_url, source')
      .eq('status', 'active')
      .or('location.ilike.%London%,location.ilike.%Berlin%,location.ilike.%Amsterdam%,location.ilike.%Paris%,location.ilike.%Madrid%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error || !jobs || jobs.length === 0) {
      console.error('No jobs found for preview:', error);
      return NextResponse.json({ error: 'No jobs found' }, { status: 404 });
    }
    
    // Create sample matches with WOW-style reasons
    const matches = jobs.map((job, idx) => ({
      job: {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description?.substring(0, 200) + '...',
        job_url: job.job_url
      },
      match_score: idx === 0 ? 92 : (88 - idx * 3), // Descending scores
      match_reason: generateWOWReason(job, idx)
    }));
    
    return NextResponse.json({
      success: true,
      matches,
      userName: 'Alex'
    });
    
  } catch (error) {
    console.error('Sample email preview error:', error);
    return NextResponse.json({
      error: 'Failed to generate preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateWOWReason(job: any, index: number): string {
  const reasons = [
    `Perfect location match for London/Berlin. ${job.company} is hiring entry-level analysts RIGHT NOW. Apply before this closes!`,
    `You asked for ${job.location} roles — this just posted 2 days ago. ${job.company} has an excellent grad program (rated 4.5/5 by students).`,
    `This ${job.title.toLowerCase()} role matches your Finance background. ${job.company} promotes from within (70% of managers started as grads).`,
    `Remote-friendly + Europe-based. ${job.company} lets you work from ${job.location} OR remote. Rare combo!`,
    `Entry-level perfect. ${job.company} specifically wants recent grads. You're not overqualified, you're exactly what they need.`
  ];
  
  return reasons[index] || reasons[0];
}

