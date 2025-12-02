import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { asyncHandler } from '@/lib/errors';
import { getCompanyLogo } from '@/lib/companyLogos';
import { extractCountryFromLocation, getCountryFlag, COUNTRY_FLAGS } from '@/lib/countryFlags';

// Cache for 1 hour
let cachedCompanies: Array<{ name: string; logoPath: string }> | null = null;
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

  // Group by company and count frequency
  const companyData = new Map<string, number>();
  
  data?.forEach((job) => {
    const companyName = (job.company_name || job.company || '').trim();
    if (!companyName) return;
    
    companyData.set(companyName, (companyData.get(companyName) || 0) + 1);
  });

  // Debug: Log total companies found
  console.log(`[Companies API] Found ${companyData.size} unique companies in database`);
  
  // Map database companies to logos
  const dbCompaniesWithLogos = Array.from(companyData.entries())
    .map(([name, count]) => {
      const logo = getCompanyLogo(name);
      if (!logo) {
        // Debug: Log companies without logos (first 10)
        if (Array.from(companyData.keys()).indexOf(name) < 10) {
          console.log(`[Companies API] No logo found for: "${name}"`);
        }
        return null;
      }
      
      return {
        name: logo.name,
        logoPath: logo.logoPath,
        count
      };
    })
    .filter((c): c is { name: string; logoPath: string; count: number } => c !== null)
    .sort((a, b) => b.count - a.count); // Sort by frequency

  // If we have companies from DB, use those (up to 30)
  // Otherwise, show all available logos as fallback
  let companiesWithLogos: Array<{ name: string; logoPath: string }>;
  
  if (dbCompaniesWithLogos.length > 0) {
    companiesWithLogos = dbCompaniesWithLogos
      .slice(0, 30)
      .map(({ name, logoPath }) => ({ name, logoPath }));
  } else {
    // Fallback: Show all available logos if no DB matches
    const { getAllCompanyLogos } = await import('@/lib/companyLogos');
    companiesWithLogos = getAllCompanyLogos()
      .slice(0, 30)
      .map(logo => ({ name: logo.name, logoPath: logo.logoPath }));
    console.log(`[Companies API] No DB matches found, showing ${companiesWithLogos.length} available logos as fallback`);
  }

  console.log(`[Companies API] Returning ${companiesWithLogos.length} companies with logos`);

  cachedCompanies = companiesWithLogos;
  lastFetch = now;

  return NextResponse.json({ 
    companies: companiesWithLogos,
    count: companiesWithLogos.length,
    totalCompaniesInDb: companyData.size,
    cached: false 
  });
});

