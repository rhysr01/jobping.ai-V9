import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { asyncHandler } from '@/lib/errors';
import { getCompanyLogo } from '@/lib/companyLogos';
import { extractCountryFromLocation, getCountryFlag } from '@/lib/countryFlags';

// Cache for 1 hour
let cachedCompanies: Array<{ name: string; logoPath: string; locations: string[] }> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000;

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const GET = asyncHandler(async (req: NextRequest) => {
  const now = Date.now();
  
  if (cachedCompanies && now - lastFetch < CACHE_DURATION) {
    return NextResponse.json({ 
      companies: cachedCompanies,
      cached: true 
    });
  }

  const supabase = getDatabaseClient();
  
  // Get distinct companies from sent jobs with their locations
  const { data, error } = await supabase
    .from('jobs')
    .select('company, company_name, location, city, country')
    .eq('is_active', true)
    .eq('is_sent', true)
    .not('company', 'is', null)
    .not('company', 'eq', '');

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`);
  }

  // Group by company and collect unique locations
  const companyData = new Map<string, { count: number; locations: Set<string> }>();
  
  data?.forEach((job) => {
    const companyName = (job.company_name || job.company || '').trim();
    if (!companyName) return;
    
    // Extract country from location, city, or country field
    let country = '';
    if (job.country) {
      country = job.country;
    } else if (job.location) {
      country = extractCountryFromLocation(job.location);
    } else if (job.city) {
      // Try to get country from city
      const cityCountry = extractCountryFromLocation(job.city);
      if (cityCountry) country = cityCountry;
    }
    
    if (!companyData.has(companyName)) {
      companyData.set(companyName, { count: 0, locations: new Set() });
    }
    
    const company = companyData.get(companyName)!;
    company.count++;
    if (country) {
      company.locations.add(country);
    }
  });

  // Only include companies we have logos for, sorted by frequency
  const companiesWithLogos = Array.from(companyData.entries())
    .map(([name, data]) => {
      const logo = getCompanyLogo(name);
      if (!logo) return null;
      
      // Convert locations set to array and get flags
      const locations = Array.from(data.locations)
        .map(country => ({
          country,
          flag: getCountryFlag(country)
        }))
        .filter(loc => loc.flag) // Only include countries we have flags for
        .map(loc => loc.flag);
      
      return {
        name: logo.name,
        logoPath: logo.logoPath,
        count: data.count,
        locations
      };
    })
    .filter((c): c is { name: string; logoPath: string; count: number; locations: string[] } => c !== null)
    .sort((a, b) => b.count - a.count) // Sort by frequency
    .slice(0, 30) // Limit to top 30
    .map(({ name, logoPath, locations }) => ({ name, logoPath, locations })); // Remove count

  cachedCompanies = companiesWithLogos;
  lastFetch = now;

  return NextResponse.json({ 
    companies: companiesWithLogos,
    count: companiesWithLogos.length,
    cached: false 
  });
});

