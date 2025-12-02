import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { asyncHandler } from '@/lib/errors';
import { extractCountryFromLocation, getCountryFlag, COUNTRY_FLAGS } from '@/lib/countryFlags';

// Cache for 1 hour
let cachedCountries: Array<{ country: string; flag: string; count: number }> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000;

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const GET = asyncHandler(async (req: NextRequest) => {
  const now = Date.now();
  
  if (cachedCountries && now - lastFetch < CACHE_DURATION) {
    return NextResponse.json({ 
      countries: cachedCountries,
      cached: true 
    });
  }

  const supabase = getDatabaseClient();
  
  // Get all jobs to extract countries
  const { data, error } = await supabase
    .from('jobs')
    .select('location, city, country')
    .eq('is_active', true)
    .eq('is_sent', true);

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  // Collect unique countries
  const countryCounts = new Map<string, number>();
  
  data?.forEach((job) => {
    let country = '';
    
    // Priority: country field > location field > city field
    if (job.country) {
      const normalizedCountry = job.country.trim();
      const countryKey = Object.keys(COUNTRY_FLAGS).find(
        key => key.toLowerCase() === normalizedCountry.toLowerCase()
      );
      country = countryKey || normalizedCountry;
    } else if (job.location) {
      country = extractCountryFromLocation(job.location);
    } else if (job.city) {
      country = extractCountryFromLocation(job.city);
    }
    
    // Only count countries we have flags for
    if (country && getCountryFlag(country)) {
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    }
  });

  // Convert to array and sort by count
  const dbCountries = Array.from(countryCounts.entries())
    .map(([country, count]) => ({
      country,
      flag: getCountryFlag(country),
      count
    }))
    .filter(c => c.flag) // Only include countries with flags
    .sort((a, b) => b.count - a.count); // Sort by frequency

  // If we have countries from DB, use those
  // Otherwise, show all available countries from signup form as fallback
  let countries: Array<{ country: string; flag: string; count: number }>;
  
  if (dbCountries.length > 0) {
    countries = dbCountries;
  } else {
    // Fallback: Show all available countries from signup form
    countries = Object.entries(COUNTRY_FLAGS)
      .map(([country, flag]) => ({
        country,
        flag,
        count: 0 // No count since no jobs yet
      }))
      .sort((a, b) => a.country.localeCompare(b.country)); // Alphabetical order
    console.log(`[Countries API] No DB countries found, showing ${countries.length} available countries as fallback`);
  }

  console.log(`[Countries API] Found ${countries.length} countries with ${data?.length || 0} total jobs`);

  cachedCountries = countries;
  lastFetch = now;

  return NextResponse.json({ 
    countries,
    count: countries.length,
    cached: false 
  });
});

