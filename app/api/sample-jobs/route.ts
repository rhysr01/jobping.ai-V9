import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!url || !key) {
      return NextResponse.json([], { status: 200 });
    }

    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client
      .from('jobs')
      .select('title, company, location, job_type, created_at, remote_type')
      .eq('is_early_career', true)
      .or('remote_type.is.null,remote_type.eq("on_site")')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}


